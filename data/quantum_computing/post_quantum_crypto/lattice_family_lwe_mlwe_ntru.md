### Lattice Cryptography Family — LWE, Ring-LWE, Module-LWE, NTRU

**What it is:** The family of hard problems underpinning most of the NIST PQC winners (ML-KEM, ML-DSA, FN-DSA). All boil down to "find short vectors in a lattice" or "distinguish structured noise from uniform" — problems with decades of cryptanalysis, worst-case-to-average-case reductions in some cases, and the best known balance of speed and size.

**The core problems:**

| Problem | Setting | Parameters | Used by |
|---|---|---|---|
| LWE | vectors over `Z_q` | dimension `n`, error width `σ` | early schemes (Regev) |
| Ring-LWE | `Z_q[X]/(X^n+1)` | degree `n`, modulus `q` | NewHope, early Kyber |
| Module-LWE | `R_q^k = (Z_q[X]/(X^n+1))^k` | `(n, k, q)` | ML-KEM, ML-DSA |
| NTRU | `R_q = Z_q[X]/(X^n+1)` with invertible small `f, g` | `(n, q)` | FN-DSA, Classic NTRU |

**LWE (Regev 2005):** Given `(A, b = A·s + e mod q)`, distinguish `b` from uniform. Security is based on the worst-case hardness of approximate Shortest Vector Problem (SVP) on general lattices. Too slow for practice at real parameters — `A` is a full `n × n` matrix of independent integers, ~MB-sized.

**Ring-LWE:** Replace `Z_q^n` with the polynomial ring `R_q`. Now `A` is a single polynomial, saving a factor of `n` in key size and giving a NTT-friendly multiplication structure. Security reduces to approximate SVP on *ideal* lattices — a somewhat narrower class, but still believed hard.

**Module-LWE:** A compromise. Work in `R_q^k` for small `k ≥ 2`. Retains most of the efficiency of Ring-LWE but spreads structure across a `k × k` module, believed to resist any attack that exploits "full ring" structure. This is why Kyber/Dilithium (M-LWE) are preferred by NIST over pure Ring-LWE designs.

**NTRU (Hoffstein-Pipher-Silverman 1996):** Work in `R_q` with a structured public key `h = g · f^{-1}`. Finding `(f, g)` is believed hard (NTRU problem). Admits very compact keys and hash-and-sign signatures (Falcon). Slightly different flavor of assumption than LWE — there are known "overstretched NTRU" parameter regimes that subexponential-attack, so parameter choice matters.

```python
# toy M-LWE sample (pedagogical; not secure)
import numpy as np
n, k, q = 256, 3, 3329                      # Kyber-768 shape
A = np.random.randint(0, q, size=(k, k, n))       # k x k matrix of polys
s = np.random.randint(-2, 3, size=(k, n))         # small secret
e = np.random.randint(-2, 3, size=(k, n))         # small error
# poly-vector product mod (X^n + 1) and mod q  (omitted for brevity)
# b = A @ s + e  — distinguishing b from uniform is the M-LWE problem.
```

**Known attacks:**

| Attack | What it does | Cost (rough) |
|---|---|---|
| BKZ with block size β | Lattice reduction; gives increasingly short vectors as β grows | `2^{0.292 β}` classical, `2^{0.265 β}` quantum (sieving) |
| Primal attack | Embed LWE sample, reduce, recover short `s` | dominant analysis for M-LWE |
| Dual attack | Find short vector in dual lattice to distinguish `b` from uniform | competitive with primal |
| Lattice sieving | Fastest known algorithm for SVP at large β | exponential in dimension |
| Arora-Ge (algebraic) | Linearize if noise is very small | only breaks unrealistic parameter regimes |
| Hybrid MITM | Combine enumeration on part of the secret with reduction | matters for sparse / ternary secrets |

For Kyber-768 / Dilithium-level-3 the estimated security margin is ~180 bits against the best known lattice attacks — comfortably above the NIST level-3 target.

**Why NIST leaned lattice:** four reasons.
1. **Performance:** NTT-friendly rings make polynomial multiplication `O(n log n)`; schemes run in microseconds.
2. **Small keys and ciphertexts** relative to code-based alternatives (Classic McEliece's 1 MB public keys are unusable for most protocols).
3. **Mature analysis:** Regev-style reductions, plus 20+ years of sieving literature, give reasonably tight concrete security estimates.
4. **Flexibility:** the same ring admits KEM (ML-KEM), Fiat-Shamir signature (ML-DSA), and hash-and-sign signature (FN-DSA).

**Parameter tuning dials:** any concrete lattice scheme picks values along these axes.

| Dial | Effect as it grows |
|---|---|
| dimension `n` | security up, key/ciphertext size up |
| modulus `q` | bigger noise budget, mild security loss |
| noise width `σ` / η | security up, correctness (decryption success) down |
| module rank `k` | moves between Ring-LWE (`k=1`) and plain LWE (`k=n`) |
| ring choice `X^n + 1` vs. `X^n - 1` | affects available algebra attacks |

**Pitfalls:**
- Different attacks can exploit *structural* features (ring, module, ideal) not present in plain LWE. Parameter sets build in a margin, but the field moves.
- **Decryption failure rate** is non-zero for some schemes; IND-CCA2 wrapping is essential.
- Constant-time implementation of NTT, Gaussian sampling, and rejection sampling is subtle — lattice schemes have been repeatedly broken by timing side channels (KyberSlash, various Falcon attacks), not by the math.
- "Overstretched" parameter regimes for NTRU (large `q / n`) admit subexponential attacks. Stay inside standardized sets.

**Rule of thumb:** Module-LWE is the current practical sweet spot — fast, compact, and structurally hedged against ring-specific attacks. Use NTRU variants where size beats everything else. Keep at least one non-lattice primitive (hash-based signatures, code-based KEM) in your crypto-agility plan.
