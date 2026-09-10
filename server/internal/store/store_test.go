package store

import (
	"context"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	ctx := context.Background()
	container, err := postgres.Run(ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("todo_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("start postgres: %v", err)
	}
	t.Cleanup(func() { _ = container.Terminate(ctx) })

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}
	s, err := New(ctx, dsn)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	t.Cleanup(s.Close)
	return s
}

func mustUser(t *testing.T, s *Store, email string) User {
	t.Helper()
	u, err := s.CreateUser(context.Background(), email, "hash-"+email)
	if err != nil {
		t.Fatalf("create user %s: %v", email, err)
	}
	return u
}

func TestNewRejectsBadDSN(t *testing.T) {
	_, err := New(context.Background(), "postgres://nobody:nobody@127.0.0.1:1/none?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Fatal("expected connect/migrate error on bad DSN")
	}
}

func TestCreateUserAndLookup(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	u := mustUser(t, s, "a@example.com")
	if u.ID == "" || u.Email != "a@example.com" {
		t.Fatalf("unexpected user %+v", u)
	}

	got, hash, err := s.UserByEmail(ctx, "A@EXAMPLE.COM") // citext: case-insensitive
	if err != nil {
		t.Fatalf("user by email: %v", err)
	}
	if got.ID != u.ID {
		t.Fatalf("id mismatch: %s vs %s", got.ID, u.ID)
	}
	if hash != "hash-a@example.com" {
		t.Fatalf("hash mismatch: %q", hash)
	}
}

func TestCreateUserDuplicateEmail(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	mustUser(t, s, "dup@example.com")
	_, err := s.CreateUser(ctx, "DUP@example.com", "other")
	if err != ErrEmailTaken {
		t.Fatalf("want ErrEmailTaken, got %v", err)
	}
}

func TestUserByEmailNotFound(t *testing.T) {
	s := newTestStore(t)
	_, _, err := s.UserByEmail(context.Background(), "ghost@example.com")
	if err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestSessionLifecycle(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "sess@example.com")

	hash := []byte("0123456789abcdef0123456789abcdef")
	if err := s.CreateSession(ctx, u.ID, hash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("create session: %v", err)
	}
	got, err := s.UserBySession(ctx, hash)
	if err != nil {
		t.Fatalf("user by session: %v", err)
	}
	if got.ID != u.ID {
		t.Fatalf("session resolved wrong user")
	}
	if err := s.DeleteSession(ctx, hash); err != nil {
		t.Fatalf("delete session: %v", err)
	}
	if _, err := s.UserBySession(ctx, hash); err != ErrNotFound {
		t.Fatalf("want ErrNotFound after delete, got %v", err)
	}
	// Deleting a missing session is a no-op.
	if err := s.DeleteSession(ctx, hash); err != nil {
		t.Fatalf("delete missing session: %v", err)
	}
}

func TestExpiredSessionNotResolved(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "exp@example.com")
	hash := []byte("expiredexpiredexpiredexpired1234")
	if err := s.CreateSession(ctx, u.ID, hash, time.Now().Add(-time.Minute)); err != nil {
		t.Fatalf("create session: %v", err)
	}
	if _, err := s.UserBySession(ctx, hash); err != ErrNotFound {
		t.Fatalf("want ErrNotFound for expired, got %v", err)
	}
}

func TestSessionUnknownHash(t *testing.T) {
	s := newTestStore(t)
	if _, err := s.UserBySession(context.Background(), []byte("nope")); err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestTodoCreateListDefaults(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "todo@example.com")

	created, err := s.CreateTodo(ctx, u.ID, "buy milk", "prywatne", nil)
	if err != nil {
		t.Fatalf("create todo: %v", err)
	}
	if created.Done {
		t.Fatal("new todo should not be done")
	}
	if created.Reminders == nil || len(created.Reminders) != 0 {
		t.Fatalf("reminders should be empty slice, got %+v", created.Reminders)
	}
	if created.Position >= 0 {
		t.Fatalf("position should be negative (newest-first), got %v", created.Position)
	}

	list, err := s.ListTodos(ctx, u.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 || list[0].ID != created.ID {
		t.Fatalf("unexpected list %+v", list)
	}
}

func TestTodoWithReminders(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "rem@example.com")

	rems := []Reminder{{ID: "r1", RemindAt: 1000, Fired: false}, {ID: "r2", RemindAt: 2000, Fired: true}}
	created, err := s.CreateTodo(ctx, u.ID, "call mom", "sluzbowe", rems)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if len(created.Reminders) != 2 || created.Reminders[1].RemindAt != 2000 || !created.Reminders[1].Fired {
		t.Fatalf("reminders round-trip failed: %+v", created.Reminders)
	}
}

func TestTodoListNewestFirst(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "order@example.com")

	first, _ := s.CreateTodo(ctx, u.ID, "first", "prywatne", nil)
	time.Sleep(2 * time.Millisecond)
	second, _ := s.CreateTodo(ctx, u.ID, "second", "prywatne", nil)

	list, err := s.ListTodos(ctx, u.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 2 || list[0].ID != second.ID || list[1].ID != first.ID {
		t.Fatalf("want newest-first [%s,%s], got %+v", second.ID, first.ID, list)
	}
}

func TestTodoUpdatePartial(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "upd@example.com")
	created, _ := s.CreateTodo(ctx, u.ID, "original", "prywatne", nil)

	newTitle := "changed"
	done := true
	updated, err := s.UpdateTodo(ctx, u.ID, created.ID, TodoUpdate{Title: &newTitle, Done: &done})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Title != "changed" || !updated.Done {
		t.Fatalf("update not applied: %+v", updated)
	}
	if updated.Category != "prywatne" {
		t.Fatalf("untouched field changed: %+v", updated)
	}
	if !updated.UpdatedAt.After(created.UpdatedAt) {
		t.Fatalf("updated_at not bumped: %v vs %v", updated.UpdatedAt, created.UpdatedAt)
	}

	// Update reminders + category only.
	cat := "sluzbowe"
	rems := []Reminder{{ID: "x", RemindAt: 42, Fired: false}}
	updated2, err := s.UpdateTodo(ctx, u.ID, created.ID, TodoUpdate{Category: &cat, Reminders: &rems})
	if err != nil {
		t.Fatalf("update2: %v", err)
	}
	if updated2.Category != "sluzbowe" || len(updated2.Reminders) != 1 || updated2.Reminders[0].RemindAt != 42 {
		t.Fatalf("update2 wrong: %+v", updated2)
	}
	if updated2.Title != "changed" {
		t.Fatalf("title should persist from prior update: %+v", updated2)
	}
}

func TestTodoUpdateNotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "updnf@example.com")
	title := "x"
	_, err := s.UpdateTodo(ctx, u.ID, "00000000-0000-0000-0000-000000000000", TodoUpdate{Title: &title})
	if err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestTodoDelete(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "del@example.com")
	created, _ := s.CreateTodo(ctx, u.ID, "temp", "prywatne", nil)

	if err := s.DeleteTodo(ctx, u.ID, created.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := s.DeleteTodo(ctx, u.ID, created.ID); err != ErrNotFound {
		t.Fatalf("want ErrNotFound on second delete, got %v", err)
	}
}

func TestReorder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "reorder@example.com")
	a, _ := s.CreateTodo(ctx, u.ID, "a", "prywatne", nil)
	b, _ := s.CreateTodo(ctx, u.ID, "b", "prywatne", nil)
	c, _ := s.CreateTodo(ctx, u.ID, "c", "prywatne", nil)

	if err := s.ReorderTodos(ctx, u.ID, []string{c.ID, a.ID, b.ID}); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	list, _ := s.ListTodos(ctx, u.ID)
	byID := map[string]float64{}
	for _, td := range list {
		byID[td.ID] = td.Position
	}
	if byID[c.ID] != 0 || byID[a.ID] != 1 || byID[b.ID] != 2 {
		t.Fatalf("positions wrong: c=%v a=%v b=%v", byID[c.ID], byID[a.ID], byID[b.ID])
	}
}

func TestReorderEmpty(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "reorderempty@example.com")
	if err := s.ReorderTodos(ctx, u.ID, nil); err != nil {
		t.Fatalf("reorder empty: %v", err)
	}
}

// Owner-scoping: user B can never see or mutate user A's todo.
func TestOwnerScopingIsolation(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	alice := mustUser(t, s, "alice@example.com")
	bob := mustUser(t, s, "bob@example.com")
	aliceTodo, _ := s.CreateTodo(ctx, alice.ID, "alice secret", "prywatne", nil)

	bobList, _ := s.ListTodos(ctx, bob.ID)
	if len(bobList) != 0 {
		t.Fatalf("bob sees alice's todos: %+v", bobList)
	}

	title := "hijack"
	if _, err := s.UpdateTodo(ctx, bob.ID, aliceTodo.ID, TodoUpdate{Title: &title}); err != ErrNotFound {
		t.Fatalf("bob updated alice's todo: %v", err)
	}
	if err := s.DeleteTodo(ctx, bob.ID, aliceTodo.ID); err != ErrNotFound {
		t.Fatalf("bob deleted alice's todo: %v", err)
	}
	// Bob reordering with alice's id must not touch alice's row.
	if err := s.ReorderTodos(ctx, bob.ID, []string{aliceTodo.ID}); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	aliceList, _ := s.ListTodos(ctx, alice.ID)
	if len(aliceList) != 1 || aliceList[0].Position != aliceTodo.Position {
		t.Fatalf("alice's todo position changed by bob: %+v", aliceList)
	}
}

func TestNewRejectsUnparseableDSN(t *testing.T) {
	if _, err := New(context.Background(), "://not a dsn"); err == nil {
		t.Fatal("expected parse error on malformed DSN")
	}
}

// scanTodo must surface a decode error if the reminders column ever holds
// bytes that are not a JSON array (a defensive path the schema prevents).
type badReminderRow struct{}

func (badReminderRow) Scan(dest ...any) error {
	if p, ok := dest[4].(*[]byte); ok {
		*p = []byte("{ not json")
	}
	return nil
}

func TestScanTodoBadReminders(t *testing.T) {
	if _, err := scanTodo(badReminderRow{}); err == nil {
		t.Fatal("expected decode error for malformed reminders JSON")
	}
}

// A closed pool makes every DB call fail, exercising the error-wrap branch of
// each operation without needing to break Postgres itself.
func TestOperationsOnClosedPool(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "closed@example.com")
	todo, _ := s.CreateTodo(ctx, u.ID, "x", "prywatne", nil)
	hash := []byte("closedclosedclosedclosedclosed12")

	s.Close()

	if _, err := s.CreateUser(ctx, "new@example.com", "h"); err == nil {
		t.Error("CreateUser: want error on closed pool")
	}
	if _, _, err := s.UserByEmail(ctx, "x@example.com"); err == nil {
		t.Error("UserByEmail: want error")
	}
	if err := s.CreateSession(ctx, u.ID, hash, time.Now().Add(time.Hour)); err == nil {
		t.Error("CreateSession: want error")
	}
	if _, err := s.UserBySession(ctx, hash); err == nil {
		t.Error("UserBySession: want error")
	}
	if err := s.DeleteSession(ctx, hash); err == nil {
		t.Error("DeleteSession: want error")
	}
	if _, err := s.ListTodos(ctx, u.ID); err == nil {
		t.Error("ListTodos: want error")
	}
	if _, err := s.CreateTodo(ctx, u.ID, "y", "prywatne", nil); err == nil {
		t.Error("CreateTodo: want error")
	}
	title := "z"
	if _, err := s.UpdateTodo(ctx, u.ID, todo.ID, TodoUpdate{Title: &title}); err == nil {
		t.Error("UpdateTodo: want error")
	}
	if err := s.DeleteTodo(ctx, u.ID, todo.ID); err == nil {
		t.Error("DeleteTodo: want error")
	}
	if err := s.ReorderTodos(ctx, u.ID, []string{todo.ID}); err == nil {
		t.Error("ReorderTodos: want error")
	}
}

// An invalid UUID in the ordered list makes the in-transaction UPDATE fail on
// the uuid cast, exercising the tx.Exec error branch of ReorderTodos.
func TestReorderInvalidIDErrors(t *testing.T) {
	s := newTestStore(t)
	u := mustUser(t, s, "reorderbad@example.com")
	if err := s.ReorderTodos(context.Background(), u.ID, []string{"not-a-uuid"}); err == nil {
		t.Fatal("want error for invalid uuid in reorder")
	}
}

// A todo row whose reminders column holds a JSON object (not an array) makes
// scanTodo's decode fail mid-iteration, exercising ListTodos' error branch.
func TestListTodosDecodeErrorSurfaces(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	u := mustUser(t, s, "baddata@example.com")
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO todos (owner_id, title, reminders, position, category)
		 VALUES ($1, 'corrupt', '{"x":1}'::jsonb, -1, 'prywatne')`, u.ID,
	); err != nil {
		t.Fatalf("seed bad row: %v", err)
	}
	if _, err := s.ListTodos(ctx, u.ID); err == nil {
		t.Fatal("want decode error from malformed reminders row")
	}
}

func TestListEmptyOwner(t *testing.T) {
	s := newTestStore(t)
	u := mustUser(t, s, "empty@example.com")
	list, err := s.ListTodos(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if list == nil || len(list) != 0 {
		t.Fatalf("want empty non-nil slice, got %+v", list)
	}
}
