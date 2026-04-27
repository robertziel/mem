### ML-KEM (Kyber) — Module-LWE Key Encapsulation

**What it is:** NIST FIPS 203 key-encapsulation mechanism, derived from CRYSTALS-Kyber. Lets two parties establish a shared secret over an insecure channel, resisting both classical attackers and quantum adversaries running Shor's algorithm.

**Math:** Security reduces to **Module Learning With Errors (M-LWE)**. Given `(A, b = A·s + e)` for a matrix `A ∈ R_q^{k×k}` of polynomials over `R_q = Z_q[X]/(X^n + 1)` and small secret/error `s, e`, recover `s`. Kyber fixes `n = 256` and `q = 3329`; `k` varies by parameter set.

**Parameter sets:**

| Set | k | NIST level | Classical security ≈ | Public key | Ciphertext | Shared secret |
|---|---|---|---|---|---|---|
| ML-KEM-512 | 2 | 1 (AES-128) | ~128-bit | 800 B | 768 B | 32 B |
| ML-KEM-768 | 3 | 3 (AES-192) | ~192-bit | 1184 B | 1088 B | 32 B |
| ML-KEM-1024 | 4 | 5 (AES-256) | ~256-bit | 1568 B | 1568 B | 32 B |

Secret keys are larger (1.6 - 3.2 KB) because they bundle the public key plus a rejection seed.

**KEM interface:**

```
(pk, sk) ← KeyGen()
(ct, ss) ← Encap(pk)                # sender picks random coins
ss       ← Decap(sk, ct)            # receiver recovers same ss
```

`ss` is a 32-byte symmetric key, typically fed into HKDF then AES-GCM / ChaCha20-Poly1305.

**liboqs example:**
```python
import oqs

with oqs.KeyEncapsulation("ML-KEM-768") as receiver:
    pk = receiver.generate_keypair()

    with oqs.KeyEncapsulation("ML-KEM-768") as sender:
        ct, ss_send = sender.encap_secret(pk)      # sender derives shared secret

    ss_recv = receiver.decap_secret(ct)             # receiver derives same secret
    assert ss_send == ss_recv                       # 32-byte key for AEAD
```

**OpenSSL 3.5+ (hybrid TLS):**
```bash
openssl s_client -connect host:443 \
  -groups X25519MLKEM768:X25519:MLKEM768
```

**Why it's the fastest NIST KEM:** NTT-friendly modulus (`q = 3329`, `n = 256`) makes polynomial multiplication an `O(n log n)` number-theoretic transform. Operations stay in small integers; no bignum arithmetic. On a modern x86 core, ML-KEM-768 key-gen / encap / decap each take tens of microseconds — faster than classical ECDH in many implementations.

| Primitive | Key-gen (cycles, x86 AVX2) | Encap | Decap |
|---|---|---|---|
| ML-KEM-768 | ~30 k | ~40 k | ~35 k |
| X25519 (classical ECDH) | ~60 k | ~60 k | — |

**IND-CCA2 via FO transform:** The base "Kyber.CPAPKE" is only IND-CPA. Kyber wraps it in a Fujisaki-Okamoto transform: re-encrypt during decapsulation and compare. On mismatch, return a deterministic pseudo-random value derived from `sk || ct` (implicit rejection) rather than an explicit error — this closes timing side channels.

**Pitfalls:**
- Decapsulation **must** be constant-time and constant-memory-access: the KyberSlash timing attack (2024) exploited a non-constant-time divide in some implementations.
- Do not use raw `ss` as a cipher key; derive via KDF with context binding (include `pk`, `ct`, protocol label).
- Ciphertexts are ~30× larger than ECDH public keys. Plan for MTU / handshake fragmentation in TLS, QUIC, DNSSEC.
- Randomness quality is critical at encapsulation — a broken RNG leaks `ss` immediately.

**Rule of thumb:** ML-KEM-768 is the sweet spot and the de-facto default for hybrid TLS. Pick 512 only with strong size constraints and level-1 targets; 1024 for level-5 or long-lived (>30 year) secrets.
