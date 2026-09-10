package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/alex-ironside/todo-witek/server/internal/api"
	"github.com/alex-ironside/todo-witek/server/internal/store"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	st, err := store.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer st.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := api.New(st, api.Config{SecureCookies: os.Getenv("COOKIE_SECURE") != "false"})
	httpSrv := &http.Server{
		Addr:              ":" + port,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}
	log.Printf("listening on :%s", port)
	log.Fatal(httpSrv.ListenAndServe())
}
