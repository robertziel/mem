### XMSS and LMS — Stateful Hash-Based Signatures

**What it is:** A family of **stateful** Merkle-tree signature schemes standardized before the NIST PQC process — XMSS (RFC 8391) and LMS (RFC 8554). Pure hash-based security (no algebraic assumptions), small public keys, moderate signature sizes. The catch: the signer **must** track state — reusing a one-time sub-key breaks security catastrophically.

**Math:** Build a Merkle tree of height `h` whose leaves are hashes of one-time signature public keys. The root is the published public key.

- **WOTS+** (Winternitz, plus) — a one-time signature under a chosen hash chain; each leaf of the Merkle tree is one WOTS+ keypair.
- To sign message `m` at leaf index `i`: produce the WOTS+ signature, then attach the `h` Merkle authentication nodes needed to recompute the root.
- Verifier checks WOTS+, climbs the tree, compares root to public key.

**The state:** a counter `i` (next unused leaf). The signer persists this across invocations. Two signatures with the same `i` leak enough WOTS+ chain values that a forgery on any chosen message becomes possible — this is existential forgery by **counter reuse**.

**Variants:**

| Scheme | RFC | Structure | State size | Sig size (typical) |
|---|---|---|---|---|
| LMS | RFC 8554 | single Merkle tree | counter + seed | ~1-5 KB |
| HSS | RFC 8554 | hierarchy of LMS trees | per-layer counters | slightly larger |
| XMSS | RFC 8391 | single tree with bitmasks | counter + seed | ~2-3 KB |
| XMSS^MT | RFC 8391 | multi-tree XMSS | per-layer counters | 4-8 KB |

Hierarchical variants (HSS, XMSS^MT) grow the total number of signatures (e.g., `2^60`) without a single huge tree — each lower tree signs the next-higher tree's root.

**Comparison with SLH-DSA:**

| Property | LMS / XMSS (stateful) | SLH-DSA (stateless) |
|---|---|---|
| State | required | none |
| Signature size | ~1-5 KB | ~8-50 KB |
| Sign time | fast (one Merkle path) | slow (FORS + hypertree) |
| Max signatures | finite (e.g., `2^20 - 2^60`) | effectively unbounded |
| Risk model | operator error (state reuse) | cryptographic only |
| Standard | RFC 8391 / 8554, NIST SP 800-208 | FIPS 205 |

**Firmware-signing fit:** LMS/HSS is the **canonical** signature for secure boot and firmware updates.
- Keys live on a single air-gapped signer with durable persistent storage.
- The signer is provisioned once; the total number of firmware images over the product's lifetime is bounded (often `< 2^20`).
- Verifier code is trivial: hash chains and a Merkle tree walk — fits in a bootloader ROM.
- Pure hash security matches the "trust the chip's SHA engine, trust nothing else" stance.

The Bromium / NIST SP 800-208 recommendation formalizes LMS and XMSS for exactly this use case.

```python
# pyhsslms / pyxmss style pseudo-code
signer = LMS.load("fw-root.key")            # reads counter from durable state
sig    = signer.sign(firmware_image)        # advances counter, persists atomically
signer.save("fw-root.key")                  # fsync + rename — must be atomic
# Counter reuse is the cardinal sin. Any crash between sign() and save() must
# either leave the counter advanced or reliably replay the sign with the new counter.
```

**State-management discipline:**
- Persist the new counter **before** emitting the signature over the wire.
- Never copy the private key to another machine; a duplicated signer has already diverged state and each replica will reuse indices.
- Backups of the private key are dangerous unless you also rigorously ensure only one restore is ever used.
- Hardware HSMs with monotonic counters (TPM 2.0, PKCS#11 v3) are the safe home.

**Pitfalls:**
- **Counter reuse = total break.** The attack is not subtle — published tooling can forge a signature on an attacker-chosen message after observing two signatures at the same index.
- Multi-process or multi-host signing without a strict serialization/leasing layer will reuse counters.
- Fork-safety and crash-safety of the persistence layer must be audited (fsync, atomic rename, journaling).
- Signatures grow with tree height; picking `h` too large wastes bytes, too small caps lifetime.

**Use cases:**
- Secure boot / firmware root of trust (the classic fit).
- Long-lived code-signing anchors where the volume is predictable.
- Root-of-trust keys inside hardware security modules.

**Rule of thumb:** Pick LMS/XMSS only when you have strict single-signer state management — ideally inside an HSM. If you cannot guarantee that, choose SLH-DSA (stateless) even though signatures are larger.
