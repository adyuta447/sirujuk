package service

import "context"

type Cache interface {
	Get(context.Context, string) ([]byte, error)
	Set(context.Context, string, []byte) error
}
