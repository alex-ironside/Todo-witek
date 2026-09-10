package auth

import (
	"bytes"
	"testing"
)

func TestNewSessionTokenIsUniqueAndHashable(t *testing.T) {
	tok1, hash1 := NewSessionToken()
	tok2, hash2 := NewSessionToken()
	if tok1 == "" || tok2 == "" {
		t.Fatal("empty token")
	}
	if tok1 == tok2 {
		t.Fatal("two tokens collided — not random")
	}
	if bytes.Equal(hash1, hash2) {
		t.Fatal("two token hashes collided")
	}
	if len(hash1) != 32 {
		t.Fatalf("hash length = %d, want 32", len(hash1))
	}
}

func TestHashSessionTokenMatchesMintedHash(t *testing.T) {
	tok, hash := NewSessionToken()
	if !bytes.Equal(HashSessionToken(tok), hash) {
		t.Fatal("HashSessionToken did not reproduce the minted hash")
	}
	if bytes.Equal(HashSessionToken(tok+"x"), hash) {
		t.Fatal("different token produced the same hash")
	}
}
