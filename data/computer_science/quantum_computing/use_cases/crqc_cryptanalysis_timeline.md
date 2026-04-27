### CRQC — Cryptographically Relevant Quantum Computer Timeline Framework

**Problem:** Decide *when* to migrate cryptographic infrastructure to post-quantum (PQC) algorithms. The decision pivots on the arrival probability of a **CRQC** — a quantum computer capable of breaking RSA-2048 / ECC-256 in practical time via **Shor's algorithm**. Under-reacting = harvest-now-decrypt-later (HNDL) compromise of long-lived secrets; over-reacting = premature migration cost on immature PQC standards.

**Quantum formulation:** Break symmetric cipher `E_k` with `n`-bit key via Grover → `2^{n/2}` work. Break RSA-`N` via Shor → polynomial time in `log N`, but with large constants and deep circuits (phase estimation over modular exponentiation). A CRQC must provide:
- `~2×` the logical-qubit count of the public key in bits (with ancillas),
- deep circuits executing `O(log³ N)` Toffoli gates,
- error-corrected logical qubits, i.e., **thousands of physical qubits per logical qubit** with sub-threshold error rates.
Canonical resource estimate (Gidney–Ekerå 2021, updated since): ~2⁰⁷ million noisy physical qubits, ~8 hours, for RSA-2048.

**Expected speedup:** Exponential over GNFS (best classical factoring). For symmetric, only quadratic via Grover — meaning `AES-256` remains safe; `AES-128` drops to ~64-bit effective security (not catastrophic but below modern comfort).

**Key insight:** CRQC planning is a *risk-management* problem, not an engineering one. Classical cryptanalysis always existed as a tail risk; quantum cryptanalysis adds a new tail with a much steeper payoff for the attacker. The right framing is Mosca's inequality (see below): any secret whose confidentiality must outlive `CRQC_eta − migration_time` is *already* at harvest-now risk. Treat PQC migration like any other long-lead infrastructure project, not a reaction to a headline.

**Status 2026 (concept-level):** Verified advantages exist in domain X = small-scale Shor / factoring demos on toy numbers; *no CRQC exists*. Credible roadmaps (multiple vendors) project fault-tolerant breakthroughs on a decade-plus horizon — but expert probability distributions (Mosca-style surveys) carry a non-trivial mass on shorter timelines, enough to drive migration planning today. NIST PQC standards (ML-KEM / Kyber, ML-DSA / Dilithium, SLH-DSA / SPHINCS+, FN-DSA / Falcon) are finalized and rolling out in TLS / VPN / code-signing. Government mandates (NSM-10 in the US, ANSSI in France, BSI in Germany) set hard deadlines for public-sector migration; commercial timelines follow with a lag.

**Mosca inequality (decision core):**
```
# X = shelf-life of secret (years it must remain confidential)
# Y = migration time (years to retrofit crypto across fleet)
# Z = time until CRQC (years, uncertain distribution)
#
# If  X + Y > Z   →  you are already late; start migrating now.

def mosca_gap(shelf_life, migration_time, crqc_eta):
    return shelf_life + migration_time - crqc_eta   # > 0  ⇒ urgent

print(mosca_gap(shelf_life=15, migration_time=7, crqc_eta=18))   # +4 years late
```

**Asymmetric vs. symmetric under a CRQC:**
| Primitive | Classical security | Quantum impact | Post-quantum response |
|---|---|---|---|
| RSA / DH / ECC | hardness of factoring / DLP | **Shor — broken** | ML-KEM, ML-DSA, hash-sig |
| AES-128 | 128-bit brute force | Grover → ~64 bits | AES-256 |
| SHA-256 | 128-bit collision | Grover → ~85 bits collision | SHA-384 / SHA-512 |
| Hash-based signatures | 2nd-preimage | Grover, mild impact | keep, reparameterize |
| Lattice (LWE / NTRU) | hardness of SVP / LWE | no known poly-time attack | ML-KEM, ML-DSA build on this |

**Migration checklist (cryptographic bill of materials):** inventory every protocol negotiation (TLS, SSH, IKE, S/MIME), code-signing chain (firmware, OS updates, container registries), and long-lived ciphertext store (backups, archives, encrypted email). For each, record (a) algorithm, (b) key length, (c) rotation mechanism, (d) expected lifetime of protected data. The intersection "no rotation path" × "data outlives CRQC eta" is the urgent work.

**Scenario planning for CRQC eta (no dates, just structure):** *p10 case* — cryptanalytic breakthrough or algorithmic improvement accelerates Shor by `10×`, CRQC arrives well before current mid-case timelines; *p50 case* — steady progress matches mainstream vendor roadmaps; *p90 case* — fault-tolerant engineering stalls, CRQC arrives decades out; *tail case* — CRQC never materializes in practice. Any enterprise plan should survive all four — crypto agility, hybrid deployment, inventory hygiene are robust to all of them; specific vendor bets are not.

**Pitfalls:**
- **Hype-driven dates** ("CRQC by year X") are a category error — work with distributions, scenario-plan against 10 / 50 / 90 percentiles. Any single-point estimate is either too cautious or too aggressive by construction.
- **Hybrid deployment** (classical + PQC in parallel) is mandatory during transition; PQC standards themselves may see cryptanalytic updates. Falcon signature timing-side-channels and earlier SIDH breaks illustrate that PQC is not "set it and forget it".
- **Resource estimates move** — factor-of-10 improvements in gate synthesis, distillation overheads, and surface-code thresholds shift migration urgency yearly; treat the estimate as a pinned belief, not a fact. Subscribe to updated papers, not press releases.
- **HNDL risk** applies to any secret whose confidentiality outlives `CRQC_eta + migration_time` — long-lived corporate IP, medical records, government data, blockchain pre-commitments.
- **Crypto agility debt:** hard-coded crypto primitives in firmware, TLS libraries, IoT devices, and HSMs are the migration bottleneck, not the algorithm choice. Audit *now* what cannot be rotated later.
- **Symmetric over-reaction:** Grover's speedup on AES is overstated in policy discussions — doubling key length (AES-256) is sufficient and cheap; focus the budget on asymmetric/PKI.

**Rule of thumb:** Don't predict a date — plan against a CRQC-eta *distribution*. If `shelf_life + migration_time > CRQC_eta_p50`, you're already behind; start crypto-agility and PQC pilots now.
