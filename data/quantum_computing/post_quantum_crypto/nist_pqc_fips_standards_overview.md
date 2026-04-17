### NIST PQC FIPS Standards — One-Page Map

**What it is:** The portfolio of post-quantum cryptographic primitives standardized by NIST after the 2016-2024 competition. All are designed to resist both classical and quantum adversaries (notably Shor's algorithm against RSA/ECC).

**The standards:**

| Standard | Name | Base name | Type | Math family | Status |
|---|---|---|---|---|---|
| FIPS 203 | ML-KEM | Kyber | KEM | Module-LWE lattice | Final (2024) |
| FIPS 204 | ML-DSA | Dilithium | Signature | Module-LWE + Module-SIS | Final (2024) |
| FIPS 205 | SLH-DSA | SPHINCS+ | Signature | Hash-based (stateless) | Final (2024) |
| FIPS 206 | FN-DSA | Falcon | Signature | NTRU lattice | Draft |
| — | HQC | HQC | KEM | Code-based (QC) | Selected as backup (2025) |

**Purpose of each:**

- **ML-KEM (FIPS 203)** — the default PQ key-encapsulation mechanism. Replaces RSA-OAEP, DH, and ECDH for establishing shared secrets in TLS, SSH, VPN handshakes.
- **ML-DSA (FIPS 204)** — the default PQ digital signature. Replaces RSA-PSS and ECDSA for code signing, X.509 certs, JWT, document signing. Balanced speed vs. size.
- **SLH-DSA (FIPS 205)** — hash-based signature backstop. Conservative security (reduces only to hash function preimage/collision resistance) but huge signatures. Use where signatures are rare but assurance matters.
- **FN-DSA (FIPS 206)** — compact lattice signature. Very small signatures (~700 B) but hard to implement in constant time. For bandwidth-constrained settings.
- **HQC (backup KEM)** — code-based alternative selected in 2025 to hedge against lattice breaks. Different hard problem from ML-KEM.

**Coverage map:**

```
                   ┌─── Key Establishment ──── ML-KEM (FIPS 203)  [default]
                   │                           HQC               [backup, code-based]
PQ Primitives ─────┤
                   │                           ML-DSA (FIPS 204) [default]
                   └─── Digital Signatures ──  FN-DSA (FIPS 206) [compact]
                                               SLH-DSA (FIPS 205)[conservative]
```

**Why two families of KEMs and three of signatures?** Crypto-agility. If a novel attack breaks lattice assumptions, HQC (code-based) and SLH-DSA (hash-based) remain. The hash-based option in particular has no algebraic structure to attack — only hash function security.

**At-a-glance sizing:**

| Primitive | Public key | Ciphertext / Sig | Typical replaces |
|---|---|---|---|
| ML-KEM-768 | 1184 B | 1088 B (ct) | ECDH / RSA-OAEP |
| HQC-192 | 4522 B | 9042 B (ct) | backup KEM role |
| ML-DSA-65 | 1952 B | 3309 B (sig) | ECDSA / RSA-PSS |
| FN-DSA-512 | 897 B | ~660 B (sig) | compact-signature uses |
| SLH-DSA-128s | 32 B | ~7.9 KB (sig) | firmware / CA roots |

**Hybrid deployments:** In TLS 1.3, ML-KEM is being rolled out as part of hybrid key agreements (e.g., `X25519MLKEM768`). Classical + PQ in parallel so a break in either still leaves one secret.

```python
# liboqs-python — enumerate enabled standards
import oqs
print("KEMs  :", [k for k in oqs.get_enabled_kem_mechanisms()
                  if k.startswith(("ML-KEM", "HQC"))])
print("Sigs  :", [s for s in oqs.get_enabled_sig_mechanisms()
                  if s.startswith(("ML-DSA", "SLH-DSA", "Falcon"))])
# Typical: ML-KEM-512/768/1024, HQC-128/192/256,
#          ML-DSA-44/65/87, SLH-DSA-*, Falcon-512/1024
```

**Pitfalls:**
- ML-KEM and ML-DSA share Module-LWE assumptions — a breakthrough cryptanalysis could hit both. That is why HQC and SLH-DSA exist.
- Drop-in replacement is not always possible; ML-KEM ciphertexts (~1 KB) and ML-DSA signatures (~2-4 KB) are much larger than ECC equivalents. Protocols with size constraints (DNSSEC, QUIC handshake) require rework.
- "Harvest now, decrypt later" makes KEM migration urgent for long-lived secrets even before CRQCs exist.

**Rule of thumb:** ML-KEM + ML-DSA are the defaults. Reach for SLH-DSA where conservative assumptions matter (firmware roots of trust), FN-DSA where bytes-on-the-wire matter, HQC as a lattice hedge.
