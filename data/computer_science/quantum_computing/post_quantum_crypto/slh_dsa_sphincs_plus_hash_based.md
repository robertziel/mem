### SLH-DSA (SPHINCS+) — Stateless Hash-Based Signature

**What it is:** NIST FIPS 205 digital signature, derived from SPHINCS+. Stateless (no counter to track), relies only on the security of a hash function — no algebraic structure to cryptanalyze. The conservative backstop for when you do not trust lattice or code-based assumptions.

**Math:** Builds on three hash-based primitives.
- **WOTS+** (Winternitz one-time signature): sign one message with one key pair, derived by hashing.
- **FORS** (Forest of Random Subsets): few-time signature for the bottom layer; signs a hash digest by revealing Merkle authentication paths.
- **Hypertree:** a tree of Merkle trees; each layer authenticates the next via WOTS+. The root is the public key.

Each signature reveals enough nodes to verify the FORS instance plus the authentication path up the hypertree.

**Parameter families:**

| Set | Hash | Variant | Public key | Signature | Sign time |
|---|---|---|---|---|---|
| SLH-DSA-SHA2-128s | SHA-256 | small | 32 B | ~7.9 KB | slow |
| SLH-DSA-SHA2-128f | SHA-256 | fast | 32 B | ~17 KB | fast |
| SLH-DSA-SHA2-192s | SHA-256 | small | 48 B | ~16 KB | slow |
| SLH-DSA-SHA2-256s | SHA-256 | small | 64 B | ~29 KB | slow |
| SLH-DSA-SHA2-256f | SHA-256 | fast | 64 B | ~49 KB | fast |
| SLH-DSA-SHAKE-* | SHAKE256 | — | same as above | same | same |

**`s` (small) vs. `f` (fast):** The `s` variants have taller hypertrees with fewer WOTS+ chains per layer — smaller signatures but much slower signing (seconds). The `f` variants invert the trade — tens of milliseconds to sign but ~2-3× larger signatures.

**Code snippet (liboqs):**
```python
import oqs

with oqs.Signature("SLH-DSA-SHA2-128s") as signer:
    pk = signer.generate_keypair()
    # signing is deliberately slow; only do it for rare events
    sig = signer.sign(b"firmware v2.1 root-of-trust")

print(len(pk), len(sig))        # 32, ~7856

with oqs.Signature("SLH-DSA-SHA2-128s") as verifier:
    assert verifier.verify(b"firmware v2.1 root-of-trust", sig, pk)
```

**Why "conservative":** the only assumption is that the underlying hash (SHA-256 or SHAKE256) has second-preimage resistance roughly matching its output size. No lattices, no codes, no elliptic curves, no polynomial structure. If SHA-256 falls, most of cryptography falls too — the trust is already diffused.

**Trade-off against lattice signatures:**

| Property | SLH-DSA-128s | ML-DSA-65 | FN-DSA-512 |
|---|---|---|---|
| Signature size | ~8 KB | ~3.3 KB | ~700 B |
| Public key | 32 B | ~2 KB | ~900 B |
| Sign (ms, single core) | ~500 ms | <1 ms | ~1 ms |
| Verify | ~5 ms | <1 ms | <1 ms |
| Assumption | hash preimage | M-LWE + M-SIS | NTRU |

**Crypto-agility fallback:** deploy SLH-DSA in roles where signatures are minted rarely but must be trusted for decades:
- firmware signing and secure-boot root of trust;
- OS package / software update roots;
- long-lived notarization / timestamping anchors;
- certificate-authority root keys (not leaf certs — those would cost too much bandwidth).

**Pitfalls:**
- **Signature size dominates:** a certificate chain or X.509 leaf with SLH-DSA is 10-50× larger than ML-DSA. Do not put it in TLS handshakes.
- Signing is CPU-heavy — hundreds of thousands of hash compressions. Do not sign per-request.
- Stateless means **safe to use across replicas** without coordination — unlike XMSS / LMS. This is the whole point.
- Deterministic nonces come from `sk_prf || opt_rand || message`; protect against fault injection by hedging with randomness.

**Rule of thumb:** Use SLH-DSA where you would once have used an "offline, air-gapped, ceremony-signed" key — root CAs, firmware roots, long-term anchors. It is the most conservative option available; the trade is bandwidth.
