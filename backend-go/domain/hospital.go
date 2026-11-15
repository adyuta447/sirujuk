package domain

import "fmt"

// Hospital is one destination facility as the directory knows it.
type Hospital struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Wilayah        string   `json:"wilayah"`
	Kind           string   `json:"kind"`                     // umum | khusus | klinik_utama
	Class          string   `json:"class,omitempty"`          // as the directory gives it: A, B, Rujukan Nasional, ...
	Specialization []string `json:"specialization,omitempty"` // specialty groups a khusus hospital or clinic serves
	Source         string   `json:"source"`                   // where the record comes from; the demo directory is not an official register
}

// FitCheck is one line of the destination assessment. Result is ok, partial, fail, unknown or info.
type FitCheck struct {
	Name   string `json:"name"`
	Result string `json:"result"`
	Detail string `json:"detail"`
}

// DestinationFit says whether the destination suits the diagnosis. It is a rule-based assessment shown next to the
// model's score; it does not change the score, because the model was not trained with hospital competency.
type DestinationFit struct {
	Verdict      string     `json:"verdict"` // sesuai | sebagian | tidak_sesuai | belum_terverifikasi
	Checks       []FitCheck `json:"checks"`
	AffectsScore bool       `json:"affects_score"`
	Basis        string     `json:"basis"`
}

// FitInput holds what is known about the destination. The assumption fields exist for the what-if simulator: when set
// they replace what is known, and the check says so.
type FitInput struct {
	Hospital       *Hospital // nil = the destination is not in the directory
	DiagnosisGroup string    // "" = the diagnosis is not in the specialist table
	Competency     string    // assumption: sesuai | sebagian | tidak
	Equipment      *bool     // assumption: specialists and equipment available
	DistanceKm     *float64  // secondary factor, shown but never decisive
}

const fitBasis = "Aturan transparan atas jenis dan spesialisasi RS; bukan model dan tidak mengubah skor risiko. Ketersediaan dokter spesialis dan alat menunggu data SISRUTE."

func AssessDestination(in FitInput) DestinationFit {
	checks := []FitCheck{competencyCheck(in), availabilityCheck(in)}
	if in.DistanceKm != nil {
		checks = append(checks, FitCheck{Name: "Jarak (faktor sekunder)", Result: "info",
			Detail: fmt.Sprintf("%.0f km. Jarak tidak mengubah kesimpulan: RS yang lebih jauh bisa lebih tepat bila kompetensinya sesuai.", *in.DistanceKm)})
	}
	verdict := "sesuai"
	for _, want := range []string{"unknown", "partial", "fail"} { // the worst result wins
		for _, c := range checks {
			if c.Result == want {
				verdict = map[string]string{"unknown": "belum_terverifikasi", "partial": "sebagian", "fail": "tidak_sesuai"}[want]
			}
		}
	}
	return DestinationFit{Verdict: verdict, Checks: checks, Basis: fitBasis}
}

func competencyCheck(in FitInput) FitCheck {
	c := FitCheck{Name: "Kompetensi RS terhadap diagnosis", Result: "unknown"}
	switch in.Competency {
	case "sesuai":
		c.Result, c.Detail = "ok", "Asumsi simulasi: kompetensi sesuai kebutuhan pasien."
		return c
	case "sebagian":
		c.Result, c.Detail = "partial", "Asumsi simulasi: kompetensi sebagian sesuai."
		return c
	case "tidak":
		c.Result, c.Detail = "fail", "Asumsi simulasi: kompetensi tidak sesuai kebutuhan pasien."
		return c
	}
	h := in.Hospital
	switch {
	case in.DiagnosisGroup == "":
		c.Detail = "Diagnosis di luar tabel spesialis PPK: kecocokan spesialisasi tidak dinilai."
	case h == nil:
		c.Detail = "RS tujuan tidak ada di direktori: kompetensinya tidak diketahui."
	case h.Kind == "umum":
		c.Detail = fmt.Sprintf("RS umum%s: ketersediaan dokter spesialis %s belum terverifikasi.", classSuffix(h), in.DiagnosisGroup)
	case len(h.Specialization) == 0:
		c.Detail = "Spesialisasi RS ini tidak tercatat di direktori."
	case contains(h.Specialization, in.DiagnosisGroup):
		c.Result, c.Detail = "ok", fmt.Sprintf("%s melayani %s.", h.Name, in.DiagnosisGroup)
	default:
		c.Result, c.Detail = "fail", fmt.Sprintf("%s hanya melayani %s; diagnosis ini termasuk %s.", h.Name, join(h.Specialization), in.DiagnosisGroup)
	}
	return c
}

func availabilityCheck(in FitInput) FitCheck {
	c := FitCheck{Name: "Ketersediaan dokter spesialis dan alat", Result: "unknown", Detail: "Data SISRUTE belum tersambung: ketersediaan tidak diperiksa."}
	if in.Equipment != nil {
		if *in.Equipment {
			c.Result, c.Detail = "ok", "Asumsi simulasi: dokter spesialis dan alat tersedia."
		} else {
			c.Result, c.Detail = "fail", "Asumsi simulasi: dokter spesialis atau alat tidak tersedia."
		}
	}
	return c
}

func classSuffix(h *Hospital) string {
	if h.Class == "" {
		return ""
	}
	return " kelas " + h.Class
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

func join(list []string) string {
	out := ""
	for i, s := range list {
		if i > 0 {
			out += ", "
		}
		out += s
	}
	return out
}
