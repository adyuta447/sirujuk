package guideline

import (
	"os"
	"testing"
)

const mlTable = "../../../ml-service/app/ml/data/kns144.tsv"

func TestEmbeddedListMatchesTheMLServiceTable(t *testing.T) {
	if _, err := os.Stat(mlTable); err != nil {
		t.Skip("ML table not in this checkout")
	}
	ml, err := Load(mlTable)
	if err != nil {
		t.Fatal(err)
	}
	emb := Embedded()
	if !emb.Known() || len(emb.codes) != len(ml.codes) {
		t.Fatalf("embedded list differs from the ML table: %d vs %d codes; refresh kns144.tsv", len(emb.codes), len(ml.codes))
	}
	for c := range ml.codes {
		if !emb.codes[c] {
			t.Fatalf("code %s is in the ML table but not embedded; refresh kns144.tsv", c)
		}
	}
	for c, txt := range ml.text {
		if emb.text[c] != txt {
			t.Fatalf("text of %s differs from the ML table; refresh kns144.tsv", c)
		}
	}
}
