package store

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

type fakeRows struct {
	remaining int
	err       error
}

func (f *fakeRows) Next() bool {
	if f.remaining > 0 {
		f.remaining--
		return true
	}
	return false
}

func (f *fakeRows) Scan(dest ...any) error {
	if p, ok := dest[4].(*[]byte); ok {
		*p = []byte("[]")
	}
	return nil
}

func (f *fakeRows) Err() error { return f.err }

func TestCollectTodosHappy(t *testing.T) {
	got, err := collectTodos(&fakeRows{remaining: 2})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 rows, got %d", len(got))
	}
}

func TestCollectTodosIterationError(t *testing.T) {
	_, err := collectTodos(&fakeRows{remaining: 0, err: errors.New("connection lost")})
	if err == nil {
		t.Fatal("want error surfaced from rows.Err()")
	}
}

type fakeTx struct {
	execErr   error
	commitErr error
}

func (f *fakeTx) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, f.execErr
}

func (f *fakeTx) Commit(context.Context) error { return f.commitErr }

func TestReorderInTxCommitError(t *testing.T) {
	err := reorderInTx(context.Background(), &fakeTx{commitErr: errors.New("commit failed")}, "owner", []string{"id"})
	if err == nil {
		t.Fatal("want commit error")
	}
}

func TestReorderInTxExecError(t *testing.T) {
	err := reorderInTx(context.Background(), &fakeTx{execErr: errors.New("exec failed")}, "owner", []string{"id"})
	if err == nil {
		t.Fatal("want exec error")
	}
}
