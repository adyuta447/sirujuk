package domain

import "testing"

func yes(b bool) *bool      { return &b }
func km(f float64) *float64 { return &f }
func hosp(kind string, spec ...string) *Hospital {
	return &Hospital{ID: "h", Name: "RS Contoh", Kind: kind, Class: "A", Specialization: spec}
}

func TestDestinationVerdictFollowsTheWorstCheckAndNeverGuesses(t *testing.T) {
	cases := map[string]struct {
		in   FitInput
		want string
	}{
		"specialist hospital serving the group, equipment unknown": {FitInput{Hospital: hosp("khusus", "Kardiovaskular"), DiagnosisGroup: "Kardiovaskular"}, "belum_terverifikasi"},
		"specialist hospital serving another group":                {FitInput{Hospital: hosp("khusus", "Kardiovaskular"), DiagnosisGroup: "Obstetri"}, "tidak_sesuai"},
		"general hospital: specialists unverified":                 {FitInput{Hospital: hosp("umum"), DiagnosisGroup: "Kardiovaskular"}, "belum_terverifikasi"},
		"diagnosis outside the table":                              {FitInput{Hospital: hosp("khusus", "Kardiovaskular")}, "belum_terverifikasi"},
		"hospital not in the directory":                            {FitInput{DiagnosisGroup: "Mata"}, "belum_terverifikasi"},
		"clinic with no recorded specialization":                   {FitInput{Hospital: hosp("klinik_utama"), DiagnosisGroup: "Mata"}, "belum_terverifikasi"},
		"assumed: suitable and available":                          {FitInput{Competency: "sesuai", Equipment: yes(true)}, "sesuai"},
		"assumed: partly suitable":                                 {FitInput{Competency: "sebagian", Equipment: yes(true)}, "sebagian"},
		"assumed: unsuitable beats an available kit":               {FitInput{Competency: "tidak", Equipment: yes(true)}, "tidak_sesuai"},
		"assumed: suitable but no equipment":                       {FitInput{Competency: "sesuai", Equipment: yes(false)}, "tidak_sesuai"},
		"assumption replaces what the directory says":              {FitInput{Hospital: hosp("khusus", "Kardiovaskular"), DiagnosisGroup: "Obstetri", Competency: "sesuai", Equipment: yes(true)}, "sesuai"},
	}
	for name, c := range cases {
		if got := AssessDestination(c.in); got.Verdict != c.want || got.AffectsScore || got.Basis == "" {
			t.Errorf("%s: got %+v, want %s", name, got, c.want)
		}
	}
}

func TestDistanceIsShownButNeverDecidesTheVerdict(t *testing.T) {
	near := AssessDestination(FitInput{Competency: "sesuai", Equipment: yes(true), DistanceKm: km(2)})
	far := AssessDestination(FitInput{Competency: "sesuai", Equipment: yes(true), DistanceKm: km(900)})
	if near.Verdict != "sesuai" || far.Verdict != "sesuai" || len(far.Checks) != 3 || far.Checks[2].Result != "info" {
		t.Fatalf("distance is a secondary, informational check: %+v %+v", near, far)
	}
}
