package domain

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
)

// LayerOf maps a model reason code to the indicator layer it comes from. The model has four layers; P10 (the historical
// 10th percentile of narrative similarity) is a term inside the narrative layer, so it is not a layer of its own.
var LayerOf = map[string]string{
	"NS_ABOVE_PEER_P95":              "ns",
	"HHI_HIGH_CONCENTRATION":         "hhi",
	"FACILITY_AVAILABLE_PER_SISRUTE": "sisrute",
	"NARRATIVE_GENERIC":              "narrative",
	"COMPETENCE_MISMATCH":            "competence",
}

var layerLabel = map[string]string{
	"ns":         "Rujukan keluhan ringan (NS)",
	"hhi":        "Konsentrasi rumah sakit tujuan (HHI)",
	"sisrute":    "Alat/SDM tersedia di faskes asal (SISRUTE)",
	"narrative":  "Kesesuaian narasi (NLP dan P10)",
	"competence": "Kompetensi RS tujuan",
}

// LayerShare is one indicator layer's part of the model's evidence for a referral.
type LayerShare struct {
	Layer        string  `json:"layer"`
	Label        string  `json:"label"`
	Code         string  `json:"code"`         // the model's reason code behind it
	Contribution float64 `json:"contribution"` // coefficient x term of the logistic regression, as the model reported it
	Share        float64 `json:"share"`        // percent of all positive contributions
}

// Breakdown explains a score. It comes only from what the model reported, never from weights chosen here, so it
// cannot disagree with the prediction. Source says which report: "model" is the ML service's own decomposition of the
// logit (intercept + contributions = logit); "turunan" is derived from the reasons when the model sent none.
type Breakdown struct {
	Layers    []LayerShare `json:"layers"`
	Dominant  string       `json:"dominant,omitempty"` // layer with the largest share
	Summary   string       `json:"summary"`
	Basis     string       `json:"basis"`
	Source    string       `json:"source"`
	Intercept *float64     `json:"intercept,omitempty"`
	Logit     *float64     `json:"logit,omitempty"`
}

// mlIndicators is the part of the ML service's indicators this package reads.
type mlIndicators struct {
	MaxCategory string `json:"max_category"` // the model's ceiling for this referral, which any cut-offs applied later must keep
	Breakdown   *struct {
		Items []struct {
			Key          string  `json:"key"`
			Label        string  `json:"label"`
			Contribution float64 `json:"contribution"`
			SharePct     float64 `json:"share_pct"`
		} `json:"items"`
		Intercept float64 `json:"intercept"`
		Logit     float64 `json:"logit"`
	} `json:"breakdown"`
}

func readIndicators(raw json.RawMessage) (m mlIndicators) {
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &m)
	}
	return m
}

// MaxCategory is the ceiling the model set for this referral ("" = none).
func MaxCategory(raw json.RawMessage) string { return readIndicators(raw).MaxCategory }

const breakdownBasis = "Kontribusi adalah koefisien x nilai suku pada model regresi logistik; hanya suku yang menaikkan risiko (di atas 0,05) yang dihitung. Model dilatih pada data sintetis: ini penjelasan atas model, bukan bukti pelanggaran."

// Explain builds the breakdown of a decision. The layers come from the model's own breakdown when it sent one, else
// from the reasons; the sentence about the category is always written here, from the cut-offs the backend applied
// (the model's own sentence would contradict them once the national cut-offs differ from 50 and 80).
func (d RiskDecision) Explain() *Breakdown {
	b := d.fromModel()
	if b == nil {
		b = d.fromReasons()
	}
	b.Summary = d.categorySentence()
	if len(b.Layers) > 0 && b.Layers[0].Share > 0 {
		b.Summary += fmt.Sprintf(" Faktor terbesar: %s (%.0f%%).", strings.SplitN(b.Layers[0].Label, ":", 2)[0], b.Layers[0].Share)
	} else {
		b.Summary += " Tidak ada indikator yang menaikkan risiko di atas ambang laporan model."
	}
	return b
}

func (d RiskDecision) fromModel() *Breakdown {
	m := readIndicators(d.Indicators).Breakdown
	if m == nil || len(m.Items) == 0 {
		return nil
	}
	b := &Breakdown{Layers: []LayerShare{}, Basis: breakdownBasis, Source: "model", Intercept: &m.Intercept, Logit: &m.Logit}
	for _, it := range m.Items {
		b.Layers = append(b.Layers, LayerShare{Layer: it.Key, Label: it.Label, Contribution: it.Contribution, Share: it.SharePct})
	}
	sort.SliceStable(b.Layers, func(i, j int) bool { return b.Layers[i].Contribution > b.Layers[j].Contribution })
	if b.Layers[0].Share > 0 {
		b.Dominant = b.Layers[0].Layer
	}
	return b
}

func (d RiskDecision) fromReasons() *Breakdown {
	var layers []LayerShare
	sum := 0.0
	for _, r := range d.Reasons {
		if layer, ok := LayerOf[r.Code]; ok && r.Contribution > 0 {
			layers = append(layers, LayerShare{Layer: layer, Label: layerLabel[layer], Code: r.Code, Contribution: r.Contribution})
			sum += r.Contribution
		}
	}
	for i := range layers {
		layers[i].Share = math.Round(layers[i].Contribution/sum*1000) / 10
	}
	sort.SliceStable(layers, func(i, j int) bool { return layers[i].Contribution > layers[j].Contribution })
	b := &Breakdown{Layers: layers, Basis: breakdownBasis, Source: "turunan"}
	if b.Layers == nil {
		b.Layers = []LayerShare{}
	}
	if len(layers) > 0 {
		b.Dominant = layers[0].Layer
	}
	return b
}

func (d RiskDecision) categorySentence() string {
	var s string
	switch {
	case d.Decision == "red" && d.RedFrom > 0:
		s = fmt.Sprintf("Merah: skor %.0f mencapai batas merah %.0f.", d.Score, d.RedFrom)
	case d.Decision == "yellow" && d.RedFrom > 0:
		s = fmt.Sprintf("Kuning: skor %.0f di antara batas kuning %.0f dan merah %.0f.", d.Score, d.YellowFrom, d.RedFrom)
	case d.Decision == "green" && d.YellowFrom > 0:
		s = fmt.Sprintf("Hijau: skor %.0f di bawah batas kuning %.0f.", d.Score, d.YellowFrom)
	default:
		s = fmt.Sprintf("Kategori %s, skor %.0f.", d.Decision, d.Score)
	}
	if c := MaxCategory(d.Indicators); c != "" && d.Decision == c {
		s += " Dibatasi sampai " + map[string]string{"yellow": "kuning", "green": "hijau"}[c] + ": hanya kompetensi RS tujuan yang menonjol, dan aturan kompetensi masih draf."
	}
	if d.ModelCategory == "red" && d.Decision == "yellow" {
		s += " Model menilai merah, tetapi kebijakan backend menurunkannya ke kuning karena kurang lapisan indikator yang mendukung."
	}
	return s
}
