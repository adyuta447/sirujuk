package domain

type Doctor struct {
	ID        string `json:"id"`
	SIP       string `json:"sip"`
	STR       string `json:"str"`
	Specialty string `json:"specialty"`
	Active    bool   `json:"active"`
}
