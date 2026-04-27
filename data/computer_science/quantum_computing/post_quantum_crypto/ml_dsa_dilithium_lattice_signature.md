### ML-DSA (Dilithium) — Module-LWE + Module-SIS Signature

**What it is:** NIST FIPS 204 digital signature, derived from CRYSTALS-Dilithium. The default post-quantum replacement for RSA-PSS and ECDSA in code signing, X.509 certificates, JWS/JWT, and document signing.

**Math:** Security rests on two lattice problems simultaneously.
- **M-LWE** hides the secret key: public key is `t = A·s1 + s2` for small `s1, s2`.
- **Module-SIS (M-SIS)** makes forgery hard: producing a short `z` with specific linear relations requires solving short-integer-solution in a module lattice.

Signing uses **Fiat-Shamir with aborts** (Lyubashevsky): generate a masking vector `y`, compute commitment `w = A·y`, derive challenge `c = H(μ || w1)` where `μ = H(pk || message)`, form response `z = y + c·s1`, and **reject** if any coefficient of `z` falls outside the safe range. Retry with fresh `y`. Rejection ensures `z` leaks no information about `s1`.

**Parameter sets:**

| Set | (k, l) | NIST level | Public key | Signature | Secret key |
|---|---|---|---|---|---|
| ML-DSA-44 | (4, 4) | 2 (AES-128-ish) | 1312 B | 2420 B | 2560 B |
| ML-DSA-65 | (6, 5) | 3 (AES-192) | 1952 B | 3309 B | 4032 B |
| ML-DSA-87 | (8, 7) | 5 (AES-256) | 2592 B | 4627 B | 4896 B |

Signatures are 2-4 KB — much larger than ECDSA's 64 B, but they sign and verify in microseconds on modern hardware.

**Signing snippet (liboqs):**
```python
import oqs

msg = b"release v1.2.3 binary sha256: ..."

with oqs.Signature("ML-DSA-65") as signer:
    pk = signer.generate_keypair()
    sk_export = signer.export_secret_key()
    sig = signer.sign(msg)                         # deterministic by default

with oqs.Signature("ML-DSA-65") as verifier:
    assert verifier.verify(msg, sig, pk)           # True
    assert not verifier.verify(msg + b"x", sig, pk)
```

**Verification cost:** `O(n log n)` polynomial NTT multiplies plus a SHAKE hash. A laptop does tens of thousands of verifies per second per core — faster than RSA-3072 verify in many benchmarks.

| Operation | ML-DSA-65 (AVX2 cycles) | Ed25519 | RSA-3072 |
|---|---|---|---|
| Sign | ~600 k | ~50 k | ~5 M |
| Verify | ~200 k | ~150 k | ~100 k |

**Deterministic vs. hedged signing:** FIPS 204 allows both. Deterministic derives nonces from `sk || message` (no RNG required, reproducible test vectors) but a fault-injection attack on the same message can leak the key. Hedged mixes in fresh randomness per signature — the modern recommendation for hostile environments.

**Pitfalls:**
- Rejection-sampling loop means signing latency has variance; typically 2-4 iterations on average, occasionally >10.
- Side channels on the rejection decision have been demonstrated (timing the loop count). Use constant-time rejection where hardware permits.
- Signatures are not length-deterministic for ML-DSA; always length-prefix or envelope when concatenating.
- Signature-size shock: CA/Browser Forum cert chains can balloon past TCP MSS. Plan fragmentation.

**Use cases:**
- X.509 PQ certificates, often as hybrid (ECDSA + ML-DSA composite).
- Signed software updates where signatures are checked once at install time.
- DNSSEC zone signing (though signature size is a real problem there).
- JWT / JWS and macaroon-style bearer tokens where signing throughput matters.
- Trust-anchor files and transparency logs, where verification is cheap and happens often.

**Composite with ECDSA (hybrid):** the current recommended migration path is a *composite* signature — two signatures concatenated, both must verify. This keeps the protocol working if either primitive is broken:

```
CompositeSig = ECDSA(sk_ecdsa, m) || ML-DSA(sk_mldsa, m)
verify(m, σ) ⇔ ECDSA_verify(...) ∧ ML-DSA_verify(...)
```

Draft-IETF composite-sigs and NIST SP 800-xx guidance formalize the encoding; X.509 extensions identify the hybrid key types.

**Rule of thumb:** ML-DSA-65 for level-3 deployments is the default pick; drop to -44 only when bytes really matter and level-2 is acceptable. ML-DSA over FN-DSA unless you need small signatures and can implement constant-time floating-point Gaussian sampling correctly.
