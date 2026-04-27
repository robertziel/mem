### HQC — Hamming Quasi-Cyclic Code-Based KEM

**What it is:** Hamming Quasi-Cyclic, a code-based key-encapsulation mechanism selected by NIST in 2025 as the **backup** to ML-KEM in the PQC portfolio. Provides a second hard-problem family (coding theory rather than lattices) so a breakthrough against Module-LWE does not collapse all key agreement at once.

**Math:** Security reduces to the **Syndrome Decoding Problem** in quasi-cyclic (QC) codes — given `s = H·e` for a random parity-check matrix `H` (with QC structure) and a small-weight `e`, recover `e`. More precisely, HQC is built from:
- A random QC-code over `F_2` with fixed block length `n` (a prime chosen so `X^n - 1 / (X - 1)` is irreducible).
- A second "hidden" linear code `C` with an efficient decoder (Reed-Muller concatenated with Reed-Solomon — a BCH-like code for error correction).
- Encapsulation encrypts a message `m` by computing `u = r1 · h + r2` and `v = m·G + r3 + s·r1` for short-weight `r1, r2, r3`, where `s = x + h·y` is the public key.

Decryption subtracts and runs the public decoder for `C`. Security is IND-CCA2 via the HHK (Hofheinz-Hövelmanns-Kiltz) Fujisaki-Okamoto variant.

**Parameter sets:**

| Set | n | NIST level | Public key | Ciphertext | Shared secret |
|---|---|---|---|---|---|
| HQC-128 | 17 669 | 1 | 2249 B | 4497 B | 64 B |
| HQC-192 | 35 851 | 3 | 4522 B | 9042 B | 64 B |
| HQC-256 | 57 637 | 5 | 7245 B | 14 485 B | 64 B |

Keys and ciphertexts are ~3-5× larger than ML-KEM at equivalent security levels.

**Encapsulation / decapsulation:**
```python
import oqs

with oqs.KeyEncapsulation("HQC-128") as receiver:
    pk = receiver.generate_keypair()

    with oqs.KeyEncapsulation("HQC-128") as sender:
        ct, ss_send = sender.encap_secret(pk)

    ss_recv = receiver.decap_secret(ct)
    assert ss_send == ss_recv
    print(len(pk), len(ct))            # 2249, 4497
```

**Why a backup:** Module-LWE (ML-KEM) and NTRU (FN-DSA) both sit in the lattice family. A novel cryptanalytic advance — quantum dual-lattice sieving improvements, a BKZ speedup, an unforeseen ring-structure attack — could weaken many lattice primitives at once. HQC rests on a **structurally different** problem (decoding random QC codes) that has survived since the 1970s McEliece lineage.

**HQC vs. ML-KEM:**

| Property | ML-KEM-768 | HQC-192 |
|---|---|---|
| Hard problem | Module-LWE | QC syndrome decoding |
| Public key | 1184 B | 4522 B |
| Ciphertext | 1088 B | 9042 B |
| Keygen | ~microseconds | ~milliseconds |
| Encap/decap | ~microseconds | ~hundreds of microseconds |
| NIST role | default KEM | backup KEM |

**HQC vs. Classic McEliece:** Classic McEliece uses *binary Goppa* codes with huge public keys (~1 MB). HQC uses *random QC codes* — much smaller keys, at the price of a somewhat less-studied problem. Both are code-based; HQC is the practical deployment choice for the backup slot.

**Pitfalls:**
- HQC has a **non-zero decryption failure rate** by design — the IND-CCA2 FO transform handles this by rejecting failure-inducing ciphertexts, but implementers must not branch on failure.
- Code-based KEMs have historically been vulnerable to **decoding-oracle** side channels; constant-time BCH decoding is essential. Reaction attacks against early code KEMs gave a warning.
- Larger bandwidth means HQC inside TLS ClientHello can cross MTU boundaries; expect packet fragmentation.
- HQC is newer as a standard than ML-KEM — implementations are less mature, and fewer audited open-source libraries exist.

**Use case:** deploy HQC in dual-KEM hybrids alongside ML-KEM (plus a classical KEX) when the threat model wants independence from lattice assumptions — long-lived archival encryption, highly sensitive government / financial channels, "harvest now, decrypt later" mitigation where you want belt-and-braces.

**Rule of thumb:** Use HQC in hybrid where lattice-only risk is unacceptable. If bytes and microseconds both matter more than hedging, stay with ML-KEM.
