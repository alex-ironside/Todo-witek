package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/alex-ironside/todo-witek/server/internal/auth"
	"github.com/alex-ironside/todo-witek/server/internal/store"
)

func swapRandReader(r io.Reader) func() {
	orig := rand.Reader
	rand.Reader = r
	return func() { rand.Reader = orig }
}

func withURLParam(r *http.Request, key, val string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, val)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func newStore(t *testing.T) *store.Store {
	t.Helper()
	ctx := context.Background()
	container, err := postgres.Run(ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("todo_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).WithStartupTimeout(60*time.Second),
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
	st, err := store.New(ctx, dsn)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	t.Cleanup(st.Close)
	return st
}

type env struct {
	srv   *Server
	store *store.Store
	url   string
}

func setup(t *testing.T) *env {
	t.Helper()
	st := newStore(t)
	srv := New(st, Config{SecureCookies: false, SessionTTL: time.Hour})
	ts := httptest.NewServer(srv.Router())
	t.Cleanup(ts.Close)
	return &env{srv: srv, store: st, url: ts.URL}
}

func (e *env) seed(t *testing.T, email, password string) store.User {
	t.Helper()
	u, err := e.store.CreateUser(context.Background(), email, auth.HashPassword(password))
	if err != nil {
		t.Fatalf("seed %s: %v", email, err)
	}
	return u
}

func newClient(t *testing.T) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar: %v", err)
	}
	return &http.Client{Jar: jar}
}

func (e *env) login(t *testing.T, email, password string) *http.Client {
	t.Helper()
	c := newClient(t)
	resp := req(t, c, "POST", e.url+"/auth/login", map[string]string{"email": email, "password": password})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login %s: status %d", email, resp.StatusCode)
	}
	return c
}

func req(t *testing.T, c *http.Client, method, url string, body any) *http.Response {
	t.Helper()
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		r = bytes.NewReader(b)
	}
	request, err := http.NewRequest(method, url, r)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	resp, err := c.Do(request)
	if err != nil {
		t.Fatalf("do %s %s: %v", method, url, err)
	}
	return resp
}

// rawReq sends a body that is not valid JSON, to exercise decode-error paths.
func rawReq(t *testing.T, c *http.Client, method, url, body string) *http.Response {
	t.Helper()
	request, err := http.NewRequest(method, url, bytes.NewReader([]byte(body)))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	resp, err := c.Do(request)
	if err != nil {
		t.Fatalf("do %s %s: %v", method, url, err)
	}
	return resp
}

func decode(t *testing.T, resp *http.Response, v any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(v); err != nil {
		t.Fatalf("decode: %v", err)
	}
}

func TestHealthNeedsNoStore(t *testing.T) {
	srv := New(nil, Config{})
	ts := httptest.NewServer(srv.Router())
	defer ts.Close()
	resp := req(t, newClient(t), "GET", ts.URL+"/health", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("health status %d", resp.StatusCode)
	}
}

func TestAuthFlow(t *testing.T) {
	e := setup(t)
	e.seed(t, "a@example.com", "hunter2hunter2")

	// Malformed body -> 400.
	if resp := rawReq(t, newClient(t), "POST", e.url+"/auth/login", "{not json"); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("bad login body: status %d", resp.StatusCode)
	}
	// Unknown email -> 401.
	if resp := req(t, newClient(t), "POST", e.url+"/auth/login", map[string]string{"email": "ghost@example.com", "password": "x"}); resp.StatusCode != http.StatusUnauthorized {
		resp.Body.Close()
		t.Fatalf("unknown email: status %d", resp.StatusCode)
	}
	// Wrong password -> 401.
	if resp := req(t, newClient(t), "POST", e.url+"/auth/login", map[string]string{"email": "a@example.com", "password": "wrong"}); resp.StatusCode != http.StatusUnauthorized {
		resp.Body.Close()
		t.Fatalf("wrong password: status %d", resp.StatusCode)
	}

	// /auth/me without a cookie -> 401.
	if resp := req(t, newClient(t), "GET", e.url+"/auth/me", nil); resp.StatusCode != http.StatusUnauthorized {
		resp.Body.Close()
		t.Fatalf("me unauth: status %d", resp.StatusCode)
	}

	// Correct login -> 200 + session cookie; me works.
	c := e.login(t, "a@example.com", "hunter2hunter2")
	var me store.User
	decode(t, req(t, c, "GET", e.url+"/auth/me", nil), &me)
	if me.Email != "a@example.com" || me.ID == "" {
		t.Fatalf("me returned %+v", me)
	}

	// Logout -> 204, and the session no longer authenticates.
	if resp := req(t, c, "POST", e.url+"/auth/logout", nil); resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		t.Fatalf("logout status %d", resp.StatusCode)
	}
	if resp := req(t, c, "GET", e.url+"/auth/me", nil); resp.StatusCode != http.StatusUnauthorized {
		resp.Body.Close()
		t.Fatalf("me after logout: status %d", resp.StatusCode)
	}
	// Logout without a cookie is still 204.
	if resp := req(t, newClient(t), "POST", e.url+"/auth/logout", nil); resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		t.Fatalf("logout no cookie: status %d", resp.StatusCode)
	}

	// A garbage session cookie -> 401 (unknown session).
	c2 := newClient(t)
	req(t, c2, "POST", e.url+"/auth/logout", nil).Body.Close() // clears any state
	bad := newClient(t)
	badReq, _ := http.NewRequest("GET", e.url+"/auth/me", nil)
	badReq.AddCookie(&http.Cookie{Name: sessionCookie, Value: "not-a-real-token"})
	resp, err := bad.Do(badReq)
	if err != nil {
		t.Fatalf("bad cookie req: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("garbage cookie: status %d", resp.StatusCode)
	}
}

// An oversized body is rejected before auth, proving the MaxBytesReader cap.
func TestBodySizeLimitRejectsHugePayload(t *testing.T) {
	srv := New(nil, Config{})
	ts := httptest.NewServer(srv.Router())
	defer ts.Close()
	huge := strings.Repeat("a", maxBodyBytes+1024)
	resp := rawReq(t, newClient(t), "POST", ts.URL+"/auth/login",
		`{"email":"a@example.com","password":"`+huge+`"}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("oversized login body: status %d, want 400", resp.StatusCode)
	}
}

func TestTodosRequireAuth(t *testing.T) {
	e := setup(t)
	for _, tc := range []struct{ method, path string }{
		{"GET", "/todos"},
		{"POST", "/todos"},
		{"POST", "/todos/reorder"},
		{"PATCH", "/todos/00000000-0000-0000-0000-000000000000"},
		{"DELETE", "/todos/00000000-0000-0000-0000-000000000000"},
	} {
		resp := req(t, newClient(t), tc.method, e.url+tc.path, map[string]string{})
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("%s %s: status %d, want 401", tc.method, tc.path, resp.StatusCode)
		}
	}
}

func TestTodosCRUD(t *testing.T) {
	e := setup(t)
	e.seed(t, "crud@example.com", "password123456")
	c := e.login(t, "crud@example.com", "password123456")

	// Create with reminders.
	var created store.Todo
	decode(t, req(t, c, "POST", e.url+"/todos", map[string]any{
		"title":     "buy milk",
		"category":  "sluzbowe",
		"reminders": []map[string]any{{"id": "r1", "remindAt": 123, "fired": false}},
	}), &created)
	if created.Done || created.Position >= 0 || created.Category != "sluzbowe" || len(created.Reminders) != 1 {
		t.Fatalf("created wrong: %+v", created)
	}

	// Default category when omitted.
	var defCat store.Todo
	decode(t, req(t, c, "POST", e.url+"/todos", map[string]any{"title": "no category"}), &defCat)
	if defCat.Category != "prywatne" {
		t.Fatalf("default category = %q", defCat.Category)
	}

	// List returns both.
	var list []store.Todo
	decode(t, req(t, c, "GET", e.url+"/todos", nil), &list)
	if len(list) != 2 {
		t.Fatalf("list len %d", len(list))
	}

	// Validation 400s.
	for _, body := range []map[string]any{
		{"title": "   "},                    // empty after trim
		{"title": "x", "category": "bogus"}, // bad category
	} {
		resp := req(t, c, "POST", e.url+"/todos", body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("create %v: status %d, want 400", body, resp.StatusCode)
		}
	}
	if resp := rawReq(t, c, "POST", e.url+"/todos", "{bad"); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("create bad json: status %d", resp.StatusCode)
	}

	// Patch: toggle done + title.
	var patched store.Todo
	decode(t, req(t, c, "PATCH", e.url+"/todos/"+created.ID, map[string]any{"done": true, "title": "buy oat milk"}), &patched)
	if !patched.Done || patched.Title != "buy oat milk" || patched.Category != "sluzbowe" {
		t.Fatalf("patched wrong: %+v", patched)
	}

	// Patch validation.
	for _, body := range []map[string]any{
		{"category": "bogus"},
		{"title": "  "},
	} {
		resp := req(t, c, "PATCH", e.url+"/todos/"+created.ID, body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("patch %v: status %d, want 400", body, resp.StatusCode)
		}
	}
	if resp := rawReq(t, c, "PATCH", e.url+"/todos/"+created.ID, "{bad"); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("patch bad json: status %d", resp.StatusCode)
	}
	// Patch a malformed uuid -> 404.
	if resp := req(t, c, "PATCH", e.url+"/todos/not-a-uuid", map[string]any{"done": true}); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("patch bad uuid: status %d", resp.StatusCode)
	}
	// Patch a well-formed but nonexistent uuid -> 404.
	if resp := req(t, c, "PATCH", e.url+"/todos/11111111-1111-1111-1111-111111111111", map[string]any{"done": true}); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("patch missing: status %d", resp.StatusCode)
	}

	// Delete.
	if resp := req(t, c, "DELETE", e.url+"/todos/"+defCat.ID, nil); resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		t.Fatalf("delete status %d", resp.StatusCode)
	}
	if resp := req(t, c, "DELETE", e.url+"/todos/"+defCat.ID, nil); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("delete again: status %d", resp.StatusCode)
	}
	if resp := req(t, c, "DELETE", e.url+"/todos/not-a-uuid", nil); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("delete bad uuid: status %d", resp.StatusCode)
	}
}

func TestOwnerIsolation(t *testing.T) {
	e := setup(t)
	e.seed(t, "alice@example.com", "alicepassword1")
	e.seed(t, "bob@example.com", "bobpassword1234")
	alice := e.login(t, "alice@example.com", "alicepassword1")
	bob := e.login(t, "bob@example.com", "bobpassword1234")

	var aTodo store.Todo
	decode(t, req(t, alice, "POST", e.url+"/todos", map[string]any{"title": "alice secret"}), &aTodo)

	// Bob cannot see it.
	var bobList []store.Todo
	decode(t, req(t, bob, "GET", e.url+"/todos", nil), &bobList)
	if len(bobList) != 0 {
		t.Fatalf("bob sees %d todos", len(bobList))
	}
	// Bob cannot patch or delete it -> 404.
	if resp := req(t, bob, "PATCH", e.url+"/todos/"+aTodo.ID, map[string]any{"title": "hijack"}); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("bob patch: status %d", resp.StatusCode)
	}
	if resp := req(t, bob, "DELETE", e.url+"/todos/"+aTodo.ID, nil); resp.StatusCode != http.StatusNotFound {
		resp.Body.Close()
		t.Fatalf("bob delete: status %d", resp.StatusCode)
	}
	// Bob reordering alice's id must not move it.
	if resp := req(t, bob, "POST", e.url+"/todos/reorder", map[string]any{"orderedIds": []string{aTodo.ID}}); resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		t.Fatalf("bob reorder: status %d", resp.StatusCode)
	}
	var aList []store.Todo
	decode(t, req(t, alice, "GET", e.url+"/todos", nil), &aList)
	if len(aList) != 1 || aList[0].Position != aTodo.Position {
		t.Fatalf("alice's todo changed: %+v", aList)
	}
}

func TestReorder(t *testing.T) {
	e := setup(t)
	e.seed(t, "reorder@example.com", "reorderpass123")
	c := e.login(t, "reorder@example.com", "reorderpass123")

	ids := make([]string, 3)
	for i, title := range []string{"a", "b", "c"} {
		var td store.Todo
		decode(t, req(t, c, "POST", e.url+"/todos", map[string]any{"title": title}), &td)
		ids[i] = td.ID
	}
	order := []string{ids[2], ids[0], ids[1]}
	if resp := req(t, c, "POST", e.url+"/todos/reorder", map[string]any{"orderedIds": order}); resp.StatusCode != http.StatusNoContent {
		resp.Body.Close()
		t.Fatalf("reorder status %d", resp.StatusCode)
	}
	var list []store.Todo
	decode(t, req(t, c, "GET", e.url+"/todos", nil), &list)
	pos := map[string]float64{}
	for _, td := range list {
		pos[td.ID] = td.Position
	}
	if pos[ids[2]] != 0 || pos[ids[0]] != 1 || pos[ids[1]] != 2 {
		t.Fatalf("positions wrong: %v", pos)
	}

	// Bad json and a malformed id -> 400.
	if resp := rawReq(t, c, "POST", e.url+"/todos/reorder", "{bad"); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("reorder bad json: status %d", resp.StatusCode)
	}
	if resp := req(t, c, "POST", e.url+"/todos/reorder", map[string]any{"orderedIds": []string{"not-a-uuid"}}); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("reorder bad id: status %d", resp.StatusCode)
	}
	// Too many ids -> 400 (before any uuid validation or DB work).
	tooMany := make([]string, maxReorderIDs+1)
	for i := range tooMany {
		tooMany[i] = "x"
	}
	if resp := req(t, c, "POST", e.url+"/todos/reorder", map[string]any{"orderedIds": tooMany}); resp.StatusCode != http.StatusBadRequest {
		resp.Body.Close()
		t.Fatalf("reorder too many ids: status %d", resp.StatusCode)
	}
}

// withUser returns a request carrying an authenticated user in context, so a
// handler can be called directly (bypassing the router/middleware) to reach its
// store-error branch on a deliberately broken store.
func withUser(u store.User, body string) *http.Request {
	r := httptest.NewRequest("POST", "/", bytes.NewReader([]byte(body)))
	return r.WithContext(context.WithValue(r.Context(), userKey, u))
}

func TestHandlerStoreErrors(t *testing.T) {
	e := setup(t)
	u := e.seed(t, "err@example.com", "errpassword123")
	e.store.Close() // every subsequent store call now errors

	// requireAuth surfaces a store error as 500 (any cookie value reaches it).
	authReq := httptest.NewRequest("GET", e.url+"/auth/me", nil)
	authReq.AddCookie(&http.Cookie{Name: sessionCookie, Value: "whatever"})
	rec := httptest.NewRecorder()
	e.srv.requireAuth(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).ServeHTTP(rec, authReq)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("requireAuth store error: status %d", rec.Code)
	}

	// login surfaces the UserByEmail store error as 500.
	loginRec := httptest.NewRecorder()
	e.srv.login(loginRec, httptest.NewRequest("POST", "/auth/login", bytes.NewReader([]byte(`{"email":"err@example.com","password":"errpassword123"}`))))
	if loginRec.Code != http.StatusInternalServerError {
		t.Fatalf("login store error: status %d", loginRec.Code)
	}

	// Each authed handler surfaces its store error as 500.
	handlers := map[string]http.HandlerFunc{
		"list":    e.srv.listTodos,
		"create":  e.srv.createTodo,
		"reorder": e.srv.reorderTodos,
	}
	bodies := map[string]string{
		"list":    `{}`,
		"create":  `{"title":"x"}`,
		"reorder": `{"orderedIds":["11111111-1111-1111-1111-111111111111"]}`,
	}
	for name, h := range handlers {
		rec := httptest.NewRecorder()
		h(rec, withUser(u, bodies[name]))
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("%s store error: status %d", name, rec.Code)
		}
	}
	// patch and delete need a valid uuid to get past validation to the store.
	for name, h := range map[string]http.HandlerFunc{"patch": e.srv.patchTodo, "delete": e.srv.deleteTodo} {
		r := withUser(u, `{"done":true}`)
		r = withURLParam(r, "id", "11111111-1111-1111-1111-111111111111")
		rec := httptest.NewRecorder()
		h(rec, r)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("%s store error: status %d", name, rec.Code)
		}
	}
}

// TestLoginSessionInsertConflict covers login's CreateSession error branch with
// a real unique-violation: the rand source is pinned so the minted token hashes
// to a value already present in sessions, so the insert collides on the PK.
func TestLoginSessionInsertConflict(t *testing.T) {
	e := setup(t)
	u := e.seed(t, "collide@example.com", "collidepass123")

	fixed := bytes.Repeat([]byte{7}, auth.SessionTokenBytes)
	restore := swapRandReader(bytes.NewReader(append([]byte{}, fixed...)))
	defer restore()
	// Precompute the token+hash the pinned reader will produce, then occupy it.
	token, hash := auth.NewSessionToken()
	if err := e.store.CreateSession(context.Background(), u.ID, hash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("pre-insert session: %v", err)
	}
	_ = token
	// Re-pin so login mints the same token/hash and collides on insert.
	restore2 := swapRandReader(bytes.NewReader(append([]byte{}, fixed...)))
	defer restore2()

	rec := httptest.NewRecorder()
	e.srv.login(rec, httptest.NewRequest("POST", "/auth/login",
		bytes.NewReader([]byte(fmt.Sprintf(`{"email":%q,"password":%q}`, "collide@example.com", "collidepass123")))))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("login session conflict: status %d, want 500", rec.Code)
	}
}
