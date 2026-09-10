package main

import (
	"context"
	"flag"
	"log"
	"os"

	"github.com/alex-ironside/todo-witek/server/internal/auth"
	"github.com/alex-ironside/todo-witek/server/internal/store"
)

// seed-user creates a login (there is no public signup). The password comes
// from SEED_PASSWORD, never an argument, so it does not leak into shell history
// or the process list.
func main() {
	email := flag.String("email", "", "user email")
	flag.Parse()
	password := os.Getenv("SEED_PASSWORD")
	if *email == "" || password == "" {
		log.Fatal("usage: seed-user -email <email>, with SEED_PASSWORD and DATABASE_URL set")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	st, err := store.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer st.Close()

	u, err := st.CreateUser(context.Background(), *email, auth.HashPassword(password))
	if err != nil {
		log.Fatalf("create user: %v", err)
	}
	log.Printf("created user %s (%s)", u.Email, u.ID)
}
