// Command useradd writes login accounts to Firestore from your own machine, using your gcloud credentials.
//
//	SANDI='at-least-12-chars' go run ./cmd/useradd -project P -email a@b.id -nama "Full Name" -role verifikator
//	echo '[{"email":"a@b.id","nama":"Full Name","role":"dokter","hash":"scrypt:..."}]' | go run ./cmd/useradd -project P -import
//
// -import takes accounts whose passwords are already hashed (the AUTH_USERS format the frontend used to read).
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/mail"
	"os"
	"os/exec"
	"strings"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

func gcloudToken(ctx context.Context) (string, error) {
	out, err := exec.CommandContext(ctx, "gcloud", "auth", "print-access-token").Output()
	return strings.TrimSpace(string(out)), err
}

func check(u domain.User) error {
	if _, err := mail.ParseAddress(u.Email); err != nil || len(u.Email) > 254 {
		return fmt.Errorf("invalid email %q", u.Email)
	}
	if u.Nama == "" || utf8.RuneCountInString(u.Nama) > 100 {
		return fmt.Errorf("invalid nama for %s", u.Email)
	}
	if !service.Roles[u.Role] {
		return fmt.Errorf("invalid role %q for %s", u.Role, u.Email)
	}
	if !service.ValidHash(u.Hash) {
		return fmt.Errorf("invalid hash for %s", u.Email)
	}
	return nil
}

func main() {
	project := flag.String("project", os.Getenv("FIRESTORE_PROJECT"), "GCP project holding the Firestore database")
	email := flag.String("email", "", "login email")
	nama := flag.String("nama", "", "display name (also recorded as the audit reviewer)")
	role := flag.String("role", "", "verifikator | tkmkb | dinkes | dokter")
	imp := flag.Bool("import", false, "read already-hashed accounts as a JSON array from stdin")
	flag.Parse()
	if *project == "" {
		log.Fatal("-project is required")
	}

	var users []domain.User
	if *imp {
		if err := json.NewDecoder(os.Stdin).Decode(&users); err != nil {
			log.Fatalf("stdin is not a JSON array of accounts: %v", err)
		}
	} else {
		pw := os.Getenv("SANDI")
		if pw == "" {
			fmt.Fprint(os.Stderr, "Password (min. 12 characters, visible while typing): ")
			pw, _ = bufio.NewReader(os.Stdin).ReadString('\n')
			pw = strings.TrimRight(pw, "\r\n")
		}
		if utf8.RuneCountInString(pw) < 12 {
			log.Fatal("password must be at least 12 characters")
		}
		hash, err := service.HashPassword(pw)
		if err != nil {
			log.Fatal(err)
		}
		users = []domain.User{{Email: *email, Nama: *nama, Role: *role, Hash: hash}}
	}

	for _, u := range users {
		if err := check(u); err != nil {
			log.Fatal(err)
		}
	}
	repo := repository.NewFirestoreUsers(*project, gcloudToken)
	for _, u := range users {
		if err := repo.Put(context.Background(), u); err != nil {
			log.Fatalf("saving %s: %v", u.Email, err)
		}
		fmt.Printf("saved %s (%s)\n", strings.ToLower(u.Email), u.Role)
	}
}
