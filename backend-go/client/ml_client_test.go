package client

import (
	"encoding/json"
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestUnknownValuesAreSentAsNullNotGuessed(t *testing.T) {
	b, _ := json.Marshal(newMLRequest(domain.ScoringInput{Referral: domain.ReferralRequest{ReferralID: "r", DiagnosisCode: "I10", Reason: "x"}}))
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	if v, present := m["dest_is_nearest"]; !present || v != nil {
		t.Fatalf("dest_is_nearest must be null: %v", v)
	}
	if v, present := m["stratum"]; !present || v != nil {
		t.Fatalf("stratum must be null, not a made-up default: %v", v)
	}
}
