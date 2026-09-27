package repository

import "context"

type ReferralRepository interface {
	Save(context.Context, []byte) error
}
