package seed

import (
	"context"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

// DemoPassword is public (it is in docs/demo.md), so these accounts must never exist in production:
// main refuses DEMO_ACCOUNTS=true when APP_ENV=production.
const DemoPassword = "Demo-Sirujuk-2026!"

var demoUsers = []domain.User{
	{Email: "verifikator@demo.sirujuk.id", Nama: "Rina Verifikator (Demo)", Role: "verifikator"},
	{Email: "tkmkb@demo.sirujuk.id", Nama: "Dr. Budi TKMKB (Demo)", Role: "tkmkb"},
	{Email: "dinkes@demo.sirujuk.id", Nama: "Sari Dinkes (Demo)", Role: "dinkes"},
	{Email: "dokter@demo.sirujuk.id", Nama: "dr. Andi FKTP (Demo)", Role: "dokter", DoctorID: "d-001"},
}

// DemoAccounts returns one account per role, all with the given password.
func DemoAccounts(password string) ([]domain.User, error) {
	hash, err := service.HashPassword(password)
	if err != nil {
		return nil, err
	}
	out := make([]domain.User, len(demoUsers))
	for i, u := range demoUsers {
		u.Hash = hash
		out[i] = u
	}
	return out, nil
}

// DemoUsers creates the accounts with the public DemoPassword (local in-memory use) and returns their emails.
func DemoUsers(ctx context.Context, repo repository.UserRepository) ([]string, error) {
	users, err := DemoAccounts(DemoPassword)
	if err != nil {
		return nil, err
	}
	emails := make([]string, 0, len(users))
	for _, u := range users {
		if err := repo.Put(ctx, u); err != nil {
			return nil, err
		}
		emails = append(emails, u.Email)
	}
	return emails, nil
}
