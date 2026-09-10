package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
)

// SessionTokenBytes is the entropy of a session token (256 bits).
const SessionTokenBytes = 32

// NewSessionToken mints a fresh session token. The returned string is the
// opaque bearer token to hand the client (in an httpOnly cookie); the returned
// hash is what gets stored server-side, so a leaked database never yields a
// usable token. Look a token up later with HashSessionToken.
func NewSessionToken() (token string, hash []byte) {
	raw := make([]byte, SessionTokenBytes)
	_, _ = rand.Read(raw)
	token = base64.RawURLEncoding.EncodeToString(raw)
	sum := sha256.Sum256([]byte(token))
	return token, sum[:]
}

// HashSessionToken returns the server-side lookup key for a client-presented
// token. Same input always yields the same 32-byte hash.
func HashSessionToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}
