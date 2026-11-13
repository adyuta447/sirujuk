package seed

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/sirujuk/backend-go/internal/repository"
)

const bpjsRows = `[
 {"referral_id":"93330524P000011","patient_name":"Peserta 1","doctor_id":"fktp-9333","origin_facility_id":"Puskesmas 9333",
  "origin_wilayah":"Kota Jakarta Pusat","destination_facility_id":"RS 23852","diagnosis_code":"E11","reason":"Rujuk lanjut",
  "reason_category":"clinical","clinical_narrative":"","issued_at":"2024-05-02T08:00:00+07:00",
  "context":{"stratum":"urban|puskesmas","n90":25,"ns90":0.4,"n180":40,"hhi180":5000,"to_dominant_dest":true,"dest_is_nearest":null}},
 {"referral_id":"93330524P000261","patient_name":"Peserta 2","doctor_id":"fktp-9333","origin_facility_id":"Puskesmas 9333",
  "origin_wilayah":"Kota Jakarta Pusat","destination_facility_id":"RS 23852","diagnosis_code":"I10","reason":"Rujuk lanjut",
  "reason_category":"clinical","clinical_narrative":"","issued_at":"2024-05-16T08:00:00+07:00","context":{}}
]`

func TestBPJSRowsKeepSourceAndHistory(t *testing.T) {
	path := filepath.Join(t.TempDir(), "seed.json")
	if err := os.WriteFile(path, []byte(bpjsRows), 0o600); err != nil {
		t.Fatal(err)
	}
	s := repository.NewMemoryStore()
	n, err := RunBPJS(s, path, nil)
	if err != nil || n != 2 || s.Count() != 2 {
		t.Fatalf("want 2 rows, got n=%d count=%d err=%v", n, s.Count(), err)
	}
	it, _ := s.Get("93330524P000011")
	if it.Source != BPJSSource || it.Synthetic {
		t.Fatalf("sample rows are real data with a source, not synthetic: %+v", it)
	}
	if c := it.Request.Context; c.N90 != 25 || c.NS90 == nil || *c.NS90 != 0.4 || c.DestIsNearest != nil {
		t.Fatalf("point-in-time history from the export must reach scoring unchanged: %+v", c)
	}
	if n, _ := RunBPJS(s, path, nil); n != 0 {
		t.Fatal("must not load twice into a store that has data")
	}
	if _, err := RunBPJS(repository.NewMemoryStore(), filepath.Join(t.TempDir(), "missing.json"), nil); err == nil {
		t.Fatal("a missing file must be an error, not an empty demo")
	}
}
