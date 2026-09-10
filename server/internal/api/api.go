// Package api is the HTTP surface: a chi router with session-cookie auth that
// mirrors the Firestore data-access contract the frontend already depends on.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/alex-ironside/todo-witek/server/internal/auth"
	"github.com/alex-ironside/todo-witek/server/internal/store"
)

const sessionCookie = "session"

// maxBodyBytes caps every request body so an unauthenticated client cannot
// exhaust memory with a giant JSON payload (e.g. a multi-GB login password).
const maxBodyBytes = 1 << 20

// maxReorderIDs caps a reorder request so one client cannot hold a pooled
// connection for a huge per-id UPDATE loop and starve everyone else.
const maxReorderIDs = 10000

// dummyHash is verified against when a login email is unknown, so an unknown
// email and a wrong password cost the same argon2 work — no user-enumeration
// via response timing.
var dummyHash = auth.HashPassword("user-enumeration-timing-equalizer")

// Config tunes cookie security and session lifetime.
type Config struct {
	SecureCookies bool
	SessionTTL    time.Duration
}

// Server holds the dependencies shared by every handler.
type Server struct {
	store *store.Store
	cfg   Config
}

// New builds a Server, defaulting the session lifetime to 30 days.
func New(st *store.Store, cfg Config) *Server {
	if cfg.SessionTTL == 0 {
		cfg.SessionTTL = 30 * 24 * time.Hour
	}
	return &Server{store: st, cfg: cfg}
}

// Router wires the routes. Todo routes and /auth/me sit behind requireAuth;
// login, logout and health are public.
func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", s.health)
	r.Post("/auth/login", s.login)
	r.Post("/auth/logout", s.logout)
	r.Group(func(r chi.Router) {
		r.Use(s.requireAuth)
		r.Get("/auth/me", s.me)
		r.Get("/todos", s.listTodos)
		r.Post("/todos", s.createTodo)
		r.Post("/todos/reorder", s.reorderTodos)
		r.Patch("/todos/{id}", s.patchTodo)
		r.Delete("/todos/{id}", s.deleteTodo)
	})
	return r
}

type ctxKey int

const userKey ctxKey = 0

func userFrom(ctx context.Context) store.User { return ctx.Value(userKey).(store.User) }

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	u, hash, err := s.store.UserByEmail(r.Context(), body.Email)
	if errors.Is(err, store.ErrNotFound) {
		_, _ = auth.VerifyPassword(body.Password, dummyHash)
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	ok, err := auth.VerifyPassword(body.Password, hash)
	if err != nil || !ok {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, tokenHash := auth.NewSessionToken()
	expires := time.Now().Add(s.cfg.SessionTTL)
	if err := s.store.CreateSession(r.Context(), u.ID, tokenHash, expires); err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	http.SetCookie(w, s.sessionCookie(token, expires))
	writeJSON(w, http.StatusOK, u)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		_ = s.store.DeleteSession(r.Context(), auth.HashSessionToken(c.Value))
	}
	http.SetCookie(w, s.expireCookie())
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, userFrom(r.Context()))
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(sessionCookie)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		u, err := s.store.UserBySession(r.Context(), auth.HashSessionToken(c.Value))
		if errors.Is(err, store.ErrNotFound) {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "internal error")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey, u)))
	})
}

func (s *Server) listTodos(w http.ResponseWriter, r *http.Request) {
	todos, err := s.store.ListTodos(r.Context(), userFrom(r.Context()).ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, todos)
}

func (s *Server) createTodo(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title     string           `json:"title"`
		Category  string           `json:"category"`
		Reminders []store.Reminder `json:"reminders"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	title := strings.TrimSpace(body.Title)
	if title == "" {
		writeErr(w, http.StatusBadRequest, "title required")
		return
	}
	if body.Category == "" {
		body.Category = "prywatne"
	}
	if !validCategory(body.Category) {
		writeErr(w, http.StatusBadRequest, "invalid category")
		return
	}
	todo, err := s.store.CreateTodo(r.Context(), userFrom(r.Context()).ID, title, body.Category, body.Reminders)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusCreated, todo)
}

func (s *Server) patchTodo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if uuid.Validate(id) != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	var body struct {
		Title     *string           `json:"title"`
		Category  *string           `json:"category"`
		Done      *bool             `json:"done"`
		Reminders *[]store.Reminder `json:"reminders"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Category != nil && !validCategory(*body.Category) {
		writeErr(w, http.StatusBadRequest, "invalid category")
		return
	}
	if body.Title != nil {
		title := strings.TrimSpace(*body.Title)
		if title == "" {
			writeErr(w, http.StatusBadRequest, "title required")
			return
		}
		body.Title = &title
	}
	todo, err := s.store.UpdateTodo(r.Context(), userFrom(r.Context()).ID, id, store.TodoUpdate{
		Title: body.Title, Category: body.Category, Done: body.Done, Reminders: body.Reminders,
	})
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, todo)
}

func (s *Server) deleteTodo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if uuid.Validate(id) != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	err := s.store.DeleteTodo(r.Context(), userFrom(r.Context()).ID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) reorderTodos(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderedIDs []string `json:"orderedIds"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if len(body.OrderedIDs) > maxReorderIDs {
		writeErr(w, http.StatusBadRequest, "too many ids")
		return
	}
	for _, id := range body.OrderedIDs {
		if uuid.Validate(id) != nil {
			writeErr(w, http.StatusBadRequest, "invalid id")
			return
		}
	}
	if err := s.store.ReorderTodos(r.Context(), userFrom(r.Context()).ID, body.OrderedIDs); err != nil {
		writeErr(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) sessionCookie(token string, expires time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		Secure:   s.cfg.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	}
}

func (s *Server) expireCookie() *http.Cookie {
	return &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.cfg.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	}
}

func validCategory(c string) bool { return c == "prywatne" || c == "sluzbowe" }

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
