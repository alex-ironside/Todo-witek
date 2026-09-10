package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2 parameters. Tunable, but these are the secure-by-default floor
// (OWASP argon2id guidance): 64 MiB memory, 3 iterations, parallelism 2.
type Params struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

// DefaultParams is the argon2id configuration used for new hashes.
var DefaultParams = Params{
	Memory:      64 * 1024,
	Iterations:  3,
	Parallelism: 2,
	SaltLength:  16,
	KeyLength:   32,
}

// ErrInvalidHash is returned when an encoded hash is malformed.
var ErrInvalidHash = errors.New("auth: invalid encoded hash")

// ErrIncompatibleVersion is returned when the argon2 version does not match.
var ErrIncompatibleVersion = errors.New("auth: incompatible argon2 version")

// HashPassword derives an argon2id hash and returns it in the standard PHC
// string format, self-describing so Verify needs no external parameters.
func HashPassword(password string) string {
	return DefaultParams.hash(password)
}

func (p Params) hash(password string) string {
	salt := make([]byte, p.SaltLength)
	_, _ = rand.Read(salt)
	key := argon2.IDKey([]byte(password), salt, p.Iterations, p.Memory, p.Parallelism, p.KeyLength)
	b64 := base64.RawStdEncoding
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.Memory, p.Iterations, p.Parallelism,
		b64.EncodeToString(salt), b64.EncodeToString(key),
	)
}

// VerifyPassword reports whether password matches the PHC-encoded argon2id
// hash. The comparison is constant-time. A malformed hash is an error, not a
// silent false, so a corrupt row is never mistaken for a wrong password.
func VerifyPassword(password, encoded string) (bool, error) {
	params, salt, key, err := decode(encoded)
	if err != nil {
		return false, err
	}
	other := argon2.IDKey([]byte(password), salt, params.Iterations, params.Memory, params.Parallelism, params.KeyLength)
	return subtle.ConstantTimeCompare(key, other) == 1, nil
}

func decode(encoded string) (Params, []byte, []byte, error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" {
		return Params{}, nil, nil, ErrInvalidHash
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return Params{}, nil, nil, ErrInvalidHash
	}
	if version != argon2.Version {
		return Params{}, nil, nil, ErrIncompatibleVersion
	}
	var p Params
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.Memory, &p.Iterations, &p.Parallelism); err != nil {
		return Params{}, nil, nil, ErrInvalidHash
	}
	b64 := base64.RawStdEncoding
	salt, err := b64.DecodeString(parts[4])
	if err != nil {
		return Params{}, nil, nil, ErrInvalidHash
	}
	key, err := b64.DecodeString(parts[5])
	if err != nil {
		return Params{}, nil, nil, ErrInvalidHash
	}
	if p.Iterations < 1 || p.Parallelism < 1 || len(salt) == 0 || len(key) == 0 {
		return Params{}, nil, nil, ErrInvalidHash
	}
	p.SaltLength = uint32(len(salt))
	p.KeyLength = uint32(len(key))
	return p, salt, key, nil
}
