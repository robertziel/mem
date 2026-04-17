### Code-Based KEMs — Classic McEliece, BIKE, Niederreiter

**What it is:** Key-encapsulation schemes whose security rests on **syndrome decoding** of linear error-correcting codes. The oldest PQ family — McEliece (1978) predates LWE by three decades and has survived essentially unbroken. The Achilles heel is public-key size.

**Math:** Security assumption is the **general syndrome decoding problem**: given a random parity-check matrix `H` and a syndrome `s = H·e`, find a small-weight error `e`. NP-hard in general; best algorithms are *information-set decoding* (Prange, Stern, Dumer, May-Ozerov, BJMM) with exponential complexity.

A code-based KEM hides a code with an efficient decoder behind a scrambled matrix representation.

**Classic McEliece (1978 / NIST round-4 finalist):**
- Picks a binary **Goppa code** `C ⊆ F_2^n` with efficient Patterson decoder.
- Public key: scrambled generator `G' = S · G · P` (random invertible `S`, permutation `P`).
- Ciphertext: a Niederreiter-style syndrome of a random low-weight error `e`.
- Decapsulation: unpermutate, Goppa-decode, derive shared secret by hashing `e`.

**Niederreiter (1986):** Dual formulation of McEliece — sends syndromes instead of noisy codewords. Ciphertext is shorter; the two schemes are security-equivalent. All modern implementations (including Classic McEliece the NIST candidate) are really Niederreiter variants.

**BIKE (Bit-Flipping Key Encapsulation):** Uses **QC-MDPC** codes (quasi-cyclic moderate-density parity-check) with a bit-flipping iterative decoder. Public key is a single polynomial over `F_2[X]/(X^r - 1)` — much smaller than McEliece's matrix, but decoding has a non-zero failure rate that must be carefully bounded.

**Sizes at NIST level 1:**

| Scheme | Public key | Ciphertext | Keygen | Encap | Decap |
|---|---|---|---|---|---|
| Classic McEliece mceliece348864 | 261 120 B (255 KB) | 96 B | slow (seconds) | <1 µs | ~microseconds |
| BIKE-1 | 1541 B | 1573 B | ~milliseconds | ~hundreds of µs | ~milliseconds |
| HQC-128 | 2249 B | 4497 B | ~ms | <ms | <ms |
| ML-KEM-512 (lattice, for comparison) | 800 B | 768 B | µs | µs | µs |

Classic McEliece level-5 parameter sets reach **1 MB** public keys. Ciphertexts are tiny (under 200 bytes) — so the symmetry is inverted vs. lattice KEMs.

**Why McEliece is so trusted:** 47+ years of public cryptanalysis against Goppa codes has moved the attack bar only marginally. Information-set decoding costs have improved by small constant factors, not asymptotics. Classical and quantum complexity differ by only a square-root-ish Grover factor inside ISD.

```python
import oqs

# Classic McEliece — tiny ciphertext, enormous public key.
with oqs.KeyEncapsulation("Classic-McEliece-348864") as r:
    pk = r.generate_keypair()
    with oqs.KeyEncapsulation("Classic-McEliece-348864") as s:
        ct, ss = s.encap_secret(pk)
    ss2 = r.decap_secret(ct)
    print(len(pk), len(ct))        # 261120, 96
```

**Attacks, past and present:**

| Attack | Target | Effect |
|---|---|---|
| Information-set decoding (Prange → BJMM) | generic | exponential, best known for random codes |
| Support Splitting (Sendrier) | weak code families | distinguishes some structured codes from random; does not break Goppa |
| Structural attacks on QC codes | BIKE / HQC | constrain parameter choice; successfully avoided at standardized levels |
| Reaction / side-channel decoding oracle | any code KEM with failures | historically devastating; CCA transforms and constant-time decoders required |

**Achilles heel — key sizes:**
- Classic McEliece public keys (hundreds of KB to 1 MB) do not fit in a TLS ClientHello, will blow past UDP MTU, and cost real money at internet scale. The redeeming feature is **tiny ciphertexts**, so once keys are established (long-lived, rotated rarely) steady-state bandwidth is cheap.
- BIKE and HQC (QC codes) trade some cryptanalytic maturity for much smaller keys — BIKE public keys are ~1.5 KB at level 1. BIKE was a NIST round-4 candidate but did not advance to standardization; HQC was selected as the code-based backup.
- Niederreiter-only designs that send syndromes instead of noisy codewords save on ciphertext bytes but do not change the key-size picture.

**Use cases:**
- Static, long-lived KEM keys published via out-of-band distribution (software-update root, signed pinset, stapled cert extension). Classic McEliece's tiny ciphertexts then dominate steady-state cost.
- Hybrid deployments where a code-based KEM hedges against lattice breaks (this is the HQC niche).
- High-assurance environments willing to pay bandwidth for decades of cryptanalytic track record.

**Pitfalls:**
- Implementation side-channels (decoding-oracle attacks) have sunk multiple code-based schemes historically; constant-time and failure-rejection must be correct.
- McEliece key storage on embedded devices is a real constraint — plan HSM or streamed access.
- QC variants (BIKE, HQC) have non-negligible decoding failure rates; the FO transform must be applied correctly, and failure signals must not leak.

**Rule of thumb:** Classic McEliece for paranoia-level long-term assurance and static keys; HQC for practical code-based KEM deployment (NIST backup slot). Avoid writing your own decoder.
