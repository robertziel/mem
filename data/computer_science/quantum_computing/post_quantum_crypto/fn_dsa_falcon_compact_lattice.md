### FN-DSA (Falcon) — Compact NTRU-Lattice Signature

**What it is:** NIST FIPS 206 (draft) digital signature, derived from Falcon. An NTRU-lattice hash-and-sign scheme with the smallest PQ signatures of the NIST set (~700 B for level 1). The natural fit for bandwidth-constrained protocols — but its implementation has sharp edges.

**Math:** Security rests on **NTRU** and **Short Integer Solution over NTRU lattices (SIS-NTRU)**. A Falcon public key is a polynomial `h = g · f^{-1} mod (q, X^n + 1)` in `R_q = Z_q[X]/(X^n + 1)` for a small NTRU trapdoor `(f, g)`. Signing uses the trapdoor to sample a short vector `(s1, s2)` with `s1 + h·s2 = H(r || message)` — a lattice vector close to the target.

Sampling is done via the **Fast Fourier nearest-plane algorithm** over the NTRU tree: a recursive Gaussian sampler operating on a tree of LDL-decomposition data derived from the key. The output distribution is a discrete Gaussian whose statistical closeness to the "ideal" distribution is what lets the transcript reveal nothing about the trapdoor.

**Parameter sets:**

| Set | n | q | NIST level | Public key | Signature |
|---|---|---|---|---|---|
| FN-DSA-512 | 512 | 12289 | 1 | 897 B | ~666 B (avg) |
| FN-DSA-1024 | 1024 | 12289 | 5 | 1793 B | ~1280 B (avg) |

Signature sizes are **variable length** — encoded as a compressed Huffman-like stream of small integers plus a salt. Always length-prefix.

**Sign / verify interface (liboqs):**
```python
import oqs

msg = b"over-the-air update manifest v7"

with oqs.Signature("Falcon-512") as s:
    pk = s.generate_keypair()
    sig = s.sign(msg)

with oqs.Signature("Falcon-512") as v:
    assert v.verify(msg, sig, pk)

print("sig bytes:", len(sig))         # ~650-690 typically
```

**Size comparison:**

| Scheme | Sig | PK | Sig+PK |
|---|---|---|---|
| FN-DSA-512 | ~660 B | 897 B | ~1.6 KB |
| ML-DSA-44 | 2420 B | 1312 B | ~3.7 KB |
| Ed25519 | 64 B | 32 B | 96 B |
| SLH-DSA-128s | ~7.9 KB | 32 B | ~7.9 KB |

Falcon is the only PQ signature whose combined footprint fits in a single TCP segment alongside small payloads.

**Why it's tricky to implement:** signing requires **double-precision floating-point Gaussian sampling**. Problems:
- **Constant time** — most floating-point instructions leak via timing, caches, and denormal handling. Falcon specifies a bespoke integer-based Gaussian sampler (Karney, base sampler) to avoid floats on sensitive inputs — but the FFT tree traversal still uses floats.
- **Rounding model matters** — differences between IEEE 754 and alternative FPUs change the output distribution slightly, which can break statistical-distance bounds.
- **Power and EM side channels** have been demonstrated against naive samplers; countermeasures add cost.
- **No easy masking** — blinding techniques that work for lattice schemes over integers do not straightforwardly extend to float-based Gaussian sampling.

**When to use Falcon:**
- Embedded firmware images or OTA updates where a few kilobytes per signature matter.
- DNSSEC signed responses inside UDP MTU.
- Certificate transparency gossip / short authenticated messages.

**When to avoid it:**
- You do not have in-house cryptography engineering to audit constant-time sampling.
- You are in a fault-injection / physical-attack threat model without validated hardware.
- You only sign occasionally; ML-DSA is simpler and the size hit is acceptable.

**Pitfalls:**
- Keygen is expensive (solves an NTRU equation via tower-of-fields descent) — seconds on embedded CPUs. Amortized over the key's lifetime it is fine.
- Variable signature size complicates fixed-length formats; many wire protocols pad to a max.
- Compared to ML-DSA, the open-source constant-time implementations are fewer and newer.

**Rule of thumb:** Reach for FN-DSA when signature size is the hard constraint. Default to ML-DSA otherwise — the implementation risk in Falcon is real.
