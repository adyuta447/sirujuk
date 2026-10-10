package seed

import (
	"context"
	"testing"
)

func TestMockSisruteCoversFacilitiesDeterministically(t *testing.T) {
	a, b := MockSisrute(), MockSisrute()
	if len(a) == 0 {
		t.Fatal("no facilities")
	}
	available := 0
	for name, f := range a {
		if f != b[name] || f.AgeDays < 0 || f.AgeDays >= 60 {
			t.Fatalf("%s: not deterministic or age out of range: %+v", name, f)
		}
		if ok, _, _ := a.Availability(context.Background(), name); ok {
			available++
		}
	}
	if available == 0 || available == len(a) {
		t.Fatalf("expected a mix of available and unavailable, got %d of %d", available, len(a))
	}
}
