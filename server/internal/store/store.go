// Package store is the Postgres persistence layer for the Todo-witek backend.
// Every todo query is owner-scoped in SQL so one user can never read or mutate
// another's rows (reproducing the Firestore security rules).
package store

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// initSQL is the whole schema. It uses CREATE ... IF NOT EXISTS, so running it
// on every boot is an idempotent bootstrap, not a versioned migration system.
//
//go:embed migrations/0001_init.sql
var initSQL string

// ErrNotFound means the row does not exist or is not owned by the caller — the
// two are deliberately indistinguishable so ownership is never leaked.
var ErrNotFound = errors.New("store: not found")

// ErrEmailTaken is returned when creating a user whose email already exists.
var ErrEmailTaken = errors.New("store: email already registered")

// Reminder mirrors the FE reminder shape (src/types.ts).
type Reminder struct {
	ID       string `json:"id"`
	RemindAt int64  `json:"remindAt"`
	Fired    bool   `json:"fired"`
}

// Todo mirrors the Firestore todo document.
type Todo struct {
	ID        string     `json:"id"`
	OwnerID   string     `json:"ownerId"`
	Title     string     `json:"title"`
	Done      bool       `json:"done"`
	Reminders []Reminder `json:"reminders"`
	Position  float64    `json:"position"`
	Category  string     `json:"category"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// User is an authenticated account.
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// Store owns a pgx connection pool.
type Store struct {
	pool *pgxpool.Pool
}

// New connects to dsn, applies migrations, and returns a ready Store.
func New(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("store: connect: %w", err)
	}
	s := &Store{pool: pool}
	if err := s.migrate(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return s, nil
}

// Close releases the pool.
func (s *Store) Close() { s.pool.Close() }

func (s *Store) migrate(ctx context.Context) error {
	if _, err := s.pool.Exec(ctx, initSQL); err != nil {
		return fmt.Errorf("store: migrate: %w", err)
	}
	return nil
}

// CreateUser inserts a user with an already-hashed password.
func (s *Store) CreateUser(ctx context.Context, email, passwordHash string) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
		email, passwordHash,
	).Scan(&u.ID, &u.Email)
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrEmailTaken
		}
		return User{}, fmt.Errorf("store: create user: %w", err)
	}
	return u, nil
}

// UserByEmail returns the user and their stored password hash, or ErrNotFound.
func (s *Store) UserByEmail(ctx context.Context, email string) (User, string, error) {
	var u User
	var hash string
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrNotFound
	}
	if err != nil {
		return User{}, "", fmt.Errorf("store: user by email: %w", err)
	}
	return u, hash, nil
}

// CreateSession stores a session by its token hash.
func (s *Store) CreateSession(ctx context.Context, userID string, tokenHash []byte, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
		tokenHash, userID, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("store: create session: %w", err)
	}
	return nil
}

// UserBySession resolves a non-expired session to its user, or ErrNotFound.
func (s *Store) UserBySession(ctx context.Context, tokenHash []byte) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.token_hash = $1 AND s.expires_at > now()`, tokenHash,
	).Scan(&u.ID, &u.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("store: user by session: %w", err)
	}
	return u, nil
}

// DeleteSession revokes a session. Deleting a missing session is not an error.
func (s *Store) DeleteSession(ctx context.Context, tokenHash []byte) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("store: delete session: %w", err)
	}
	return nil
}

// ListTodos returns the owner's todos, newest first (created_at desc), matching
// observeUserTodos. Callers re-sort by position client-side, as the FE does.
func (s *Store) ListTodos(ctx context.Context, ownerID string) ([]Todo, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, owner_id, title, done, reminders, position, category, created_at, updated_at
		 FROM todos WHERE owner_id = $1 ORDER BY created_at DESC`, ownerID,
	)
	if err != nil {
		return nil, fmt.Errorf("store: list todos: %w", err)
	}
	defer rows.Close()
	return collectTodos(rows)
}

// todoRows is the slice of pgx.Rows collectTodos needs; a fake implements it in
// tests to reach the iteration-error path a live query never produces.
type todoRows interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
}

func collectTodos(rows todoRows) ([]Todo, error) {
	todos := make([]Todo, 0)
	for rows.Next() {
		t, err := scanTodo(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: list todos rows: %w", err)
	}
	return todos, nil
}

// CreateTodo inserts a todo for ownerID with done=false and a strictly
// decreasing position (-unix_ms), so the newest sorts to the top like the FE.
func (s *Store) CreateTodo(ctx context.Context, ownerID, title, category string, reminders []Reminder) (Todo, error) {
	remJSON := marshalReminders(reminders)
	position := float64(-time.Now().UnixMilli())
	row := s.pool.QueryRow(ctx,
		`INSERT INTO todos (owner_id, title, done, reminders, position, category)
		 VALUES ($1, $2, false, $3::jsonb, $4, $5)
		 RETURNING id, owner_id, title, done, reminders, position, category, created_at, updated_at`,
		ownerID, title, remJSON, position, category,
	)
	return scanTodo(row)
}

// TodoUpdate carries optional fields; nil means "leave unchanged".
type TodoUpdate struct {
	Title     *string
	Category  *string
	Done      *bool
	Reminders *[]Reminder
}

// UpdateTodo applies a partial update to an owned todo, or ErrNotFound.
// owner_id is never changed. updated_at is always bumped.
func (s *Store) UpdateTodo(ctx context.Context, ownerID, id string, upd TodoUpdate) (Todo, error) {
	var remJSON any
	if upd.Reminders != nil {
		remJSON = marshalReminders(*upd.Reminders)
	}
	row := s.pool.QueryRow(ctx,
		`UPDATE todos SET
		   title     = COALESCE($3, title),
		   category  = COALESCE($4, category),
		   done      = COALESCE($5, done),
		   reminders = COALESCE($6::jsonb, reminders),
		   updated_at = now()
		 WHERE id = $1 AND owner_id = $2
		 RETURNING id, owner_id, title, done, reminders, position, category, created_at, updated_at`,
		id, ownerID, upd.Title, upd.Category, upd.Done, remJSON,
	)
	t, err := scanTodo(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Todo{}, ErrNotFound
	}
	return t, err
}

// DeleteTodo removes an owned todo, or ErrNotFound.
func (s *Store) DeleteTodo(ctx context.Context, ownerID, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM todos WHERE id = $1 AND owner_id = $2`, id, ownerID)
	if err != nil {
		return fmt.Errorf("store: delete todo: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ReorderTodos sets each id's position to its index, in one transaction.
// Only rows owned by ownerID are touched, so a foreign id is silently ignored
// (it updates zero rows) rather than reordering someone else's list.
func (s *Store) ReorderTodos(ctx context.Context, ownerID string, orderedIDs []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("store: reorder begin: %w", err)
	}
	defer tx.Rollback(ctx)
	return reorderInTx(ctx, tx, ownerID, orderedIDs)
}

// reorderTx is the slice of pgx.Tx reorderInTx needs; a fake implements it in
// tests to reach the commit-error path a live transaction never produces.
type reorderTx interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Commit(ctx context.Context) error
}

func reorderInTx(ctx context.Context, tx reorderTx, ownerID string, orderedIDs []string) error {
	for i, id := range orderedIDs {
		if _, err := tx.Exec(ctx,
			`UPDATE todos SET position = $1, updated_at = now() WHERE id = $2 AND owner_id = $3`,
			float64(i), id, ownerID,
		); err != nil {
			return fmt.Errorf("store: reorder update: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("store: reorder commit: %w", err)
	}
	return nil
}

type scannable interface {
	Scan(dest ...any) error
}

func scanTodo(row scannable) (Todo, error) {
	var t Todo
	var remBytes []byte
	if err := row.Scan(&t.ID, &t.OwnerID, &t.Title, &t.Done, &remBytes, &t.Position, &t.Category, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return Todo{}, err
	}
	if err := json.Unmarshal(remBytes, &t.Reminders); err != nil {
		return Todo{}, fmt.Errorf("store: decode reminders: %w", err)
	}
	return t, nil
}

// marshalReminders always succeeds: Reminder holds only string/int/bool fields,
// which json.Marshal cannot fail to encode. nil becomes an empty JSON array so
// the reminders column is never null.
func marshalReminders(reminders []Reminder) []byte {
	if reminders == nil {
		reminders = []Reminder{}
	}
	b, _ := json.Marshal(reminders)
	return b
}

func isUniqueViolation(err error) bool {
	var pgErr interface{ SQLState() string }
	if errors.As(err, &pgErr) {
		return pgErr.SQLState() == "23505"
	}
	return false
}
