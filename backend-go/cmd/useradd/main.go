// Command useradd writes login accounts to Firestore from your own machine, using your gcloud credentials.
//
//	SANDI='at-least-12-chars' go run ./cmd/useradd -project P -email a@b.id -nama "Full Name" -role verifikator
//	go run ./cmd/useradd -project P -demo     (4 demo accounts, one per role, with a random password printed once)
//	echo '[{"email":"a@b.id","nama":"Full Name","role":"dokter","hash":"scrypt:..."}]' | go run ./cmd/useradd -project P -import
//
// -import takes accounts whose passwords are already hashed (the AUTH_USERS format the frontend used to read).
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/mail"
	"os"
	"os/exec"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/seed"
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
	if u.Role == "dokter" && (u.DoctorID == "" || len(u.DoctorID) > 64) {
		return fmt.Errorf("a dokter account needs -doctor-id (the doctor_id used on referrals): %s", u.Email)
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
	doctorID := flag.String("doctor-id", "", "doctor_id on referrals this dokter account may see and answer (role dokter)")
	disable := flag.String("disable", "", "email of an existing account to disable (blocks login and any live session within ~30s)")
	enable := flag.String("enable", "", "email of a disabled account to enable again")
	demoPassword := flag.String("demo-password", "", "with -demo: use this password instead of a random one (for throwaway demo accounts only)")
	expiresIn := flag.Duration("expires-in", -1, "make the account(s) expire after this long, e.g. 72h. Default: 168h for -demo, never for others. 0 = never")
	demo := flag.Bool("demo", false, "create the 4 demo accounts (one per role) with a random password shown once")
	imp := flag.Bool("import", false, "read already-hashed accounts as a JSON array from stdin")
	flag.Parse()
	if *project == "" {
		log.Fatal("-project is required")
	}

	if *disable != "" || *enable != "" {
		setDisabled(*project, firstNonEmpty(*disable, *enable), *disable != "")
		return
	}

	var users []domain.User
	switch {
	case *demo:
		pw := *demoPassword
		if pw == "" {
			b := make([]byte, 12)
			if _, err := rand.Read(b); err != nil {
				log.Fatal(err)
			}
			pw = hex.EncodeToString(b)
		} else {
			fmt.Fprintln(os.Stderr, "WARNING: demo accounts with a chosen password are guessable; delete them after the demo.")
		}
		var err error
		if users, err = seed.DemoAccounts(pw); err != nil {
			log.Fatal(err)
		}
		if *demoPassword == "" {
			defer fmt.Printf("\nDemo password (shown once, not stored): %s\n", pw)
		}
	case *imp:
		if err := json.NewDecoder(os.Stdin).Decode(&users); err != nil {
			log.Fatalf("stdin is not a JSON array of accounts: %v", err)
		}
	default:
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
		users = []domain.User{{Email: *email, Nama: *nama, Role: *role, DoctorID: *doctorID, Hash: hash}}
	}

	if ttl := expiry(*expiresIn, *demo); ttl > 0 {
		at := time.Now().Add(ttl).UTC().Format(time.RFC3339)
		for i := range users {
			users[i].ExpiresAt = at
		}
		fmt.Printf("Accounts expire at %s\n", at)
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

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

// setDisabled flips the flag on an existing account and keeps everything else, including the password hash.
func setDisabled(project, email string, disabled bool) {
	repo := repository.NewFirestoreUsers(project, gcloudToken)
	ctx := context.Background()
	u, found, err := repo.Find(ctx, email)
	if err != nil || !found {
		log.Fatalf("account %s not found (err=%v)", email, err)
	}
	u.Disabled = disabled
	if err := repo.Put(ctx, u); err != nil {
		log.Fatalf("saving %s: %v", email, err)
	}
	fmt.Printf("%s disabled=%v\n", strings.ToLower(email), disabled)
}

// expiry picks the lifetime: an explicit -expires-in wins (0 = never); otherwise demo accounts get a week.
func expiry(flagValue time.Duration, demo bool) time.Duration {
	switch {
	case flagValue >= 0:
		return flagValue
	case demo:
		return 7 * 24 * time.Hour
	}
	return 0
}
