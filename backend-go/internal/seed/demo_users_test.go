package seed

import (
	"context"
	"testing"

	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

func TestDemoUsersCanLogInPerRole(t *testing.T) {
	repo := repository.NewMemoryUsers("")
	emails, err := DemoUsers(context.Background(), repo)
	if err != nil || len(emails) != 4 {
		t.Fatalf("emails=%v err=%v", emails, err)
	}
	a := service.Authenticator{Users: repo}
	for _, e := range emails {
		u, ok, err := a.Verify(context.Background(), e, DemoPassword)
		if err != nil || !ok || !service.Roles[u.Role] || u.Hash != "" {
			t.Errorf("%s: ok=%v err=%v user=%+v", e, ok, err, u)
		}
	}
	if _, ok, _ := a.Verify(context.Background(), emails[0], "salah-salah-123"); ok {
		t.Error("wrong password must fail")
	}
}
