package auth

import (
	"strings"
	"testing"
)

func TestHashPasswordRoundTrip(t *testing.T) {
	hash := HashPassword("correct horse battery staple")
	if !strings.HasPrefix(hash, "$argon2id$v=19$m=65536,t=3,p=2$") {
		t.Fatalf("unexpected encoding: %s", hash)
	}
	ok, err := VerifyPassword("correct horse battery staple", hash)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !ok {
		t.Fatal("correct password did not verify")
	}
}

func TestVerifyRejectsWrongPassword(t *testing.T) {
	hash := HashPassword("s3cret")
	ok, err := VerifyPassword("s3cre7", hash)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if ok {
		t.Fatal("wrong password verified")
	}
}

func TestHashUsesUniqueSalt(t *testing.T) {
	if HashPassword("same") == HashPassword("same") {
		t.Fatal("two hashes of the same password are identical — salt not random")
	}
}

func TestVerifyRejectsMalformedHash(t *testing.T) {
	cases := []string{
		"",
		"not-a-hash",
		"$argon2id$v=19$m=65536,t=3,p=2$onlyfourparts",
		"$argon2i$v=19$m=65536,t=3,p=2$c2FsdA$aGFzaA",  // wrong variant
		"$argon2id$v=18$m=65536,t=3,p=2$c2FsdA$aGFzaA", // wrong version
		"$argon2id$v=19$bad-params$c2FsdA$aGFzaA",
		"$argon2id$vXX$m=65536,t=3,p=2$c2FsdA$aGFzaA",       // unparseable version field
		"$argon2id$v=19$m=65536,t=3,p=2$!!!$aGFzaA",         // bad base64 salt
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$!!!",         // bad base64 key
		"$argon2id$v=19$m=65536,t=0,p=2$c2FsdA$c2FsdHNhbHQ", // t=0 (argon2 panics without the guard)
		"$argon2id$v=19$m=65536,t=3,p=0$c2FsdA$c2FsdHNhbHQ", // p=0 (argon2 panics without the guard)
		"$argon2id$v=19$m=65536,t=3,p=2$c2FsdA$",            // empty key (nil-deref without the guard)
		"$argon2id$v=19$m=65536,t=3,p=2$$c2FsdHNhbHQ",       // empty salt
	}
	for _, c := range cases {
		ok, err := VerifyPassword("x", c)
		if ok {
			t.Fatalf("malformed hash verified as ok: %q", c)
		}
		if err == nil {
			t.Fatalf("malformed hash returned no error: %q", c)
		}
	}
}

func TestVerifyWrongVersionIsIncompatible(t *testing.T) {
	ok, err := VerifyPassword("x", "$argon2id$v=18$m=65536,t=3,p=2$c2FsdA$aGFzaA")
	if ok || err != ErrIncompatibleVersion {
		t.Fatalf("want ErrIncompatibleVersion, got ok=%v err=%v", ok, err)
	}
}
