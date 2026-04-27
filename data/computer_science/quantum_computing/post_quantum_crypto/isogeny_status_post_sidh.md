### Isogeny-Based Cryptography — Status After SIDH

**What it is:** The family of cryptographic schemes whose hard problem is **finding isogenies between supersingular elliptic curves** over finite fields. Once the promising "small keys, familiar math" PQ candidate — SIDH was the prospective compact KEM. In 2022 the Castryck-Decru attack collapsed SIDH and SIKE (NIST round-4). What survives: SQIsign (a signature) and CSIDH (a non-interactive key exchange), both niche.

**Math:** For a prime `p` (typically `p = 2^a · 3^b - 1`) consider **supersingular** elliptic curves over `F_{p^2}`. An **isogeny** is a non-constant rational map between curves that is also a group homomorphism. The isogeny graph of supersingular curves (edges = `ℓ`-isogenies) is a Ramanujan graph; computing paths between two given curves is believed hard.

Two flavors of hardness:
- **Supersingular Isogeny Path (SSI):** given `E, E'`, find an isogeny `φ: E → E'` of prescribed degree. Hard in general.
- **Class group action (CSIDH):** commutative isogeny action of the class group on ordinary / supersingular curves over `F_p`. Gives a Diffie-Hellman-like structure.

**SIDH (broken, 2022):** Jao-De Feo's Supersingular Isogeny Diffie-Hellman. Parties publish images of base-curve torsion points under secret isogenies. **Castryck-Decru (followed by Maino-Martindale and Robert)** showed that the **auxiliary torsion-point images** leak enough information to recover the secret isogeny in polynomial time via the Kani / genus-2 glue-and-split technique. SIKE (SIDH-based KEM, NIST round-4) was withdrawn.

The attack does **not** apply to schemes that do not reveal auxiliary torsion-point images — CSIDH and SQIsign, notably.

**Survivors:**

| Scheme | Type | Status | Sizes | Notes |
|---|---|---|---|---|
| SIDH / SIKE | KEM | broken (Castryck-Decru 2022) | — | withdrawn |
| CSIDH | NIKE | small-parameters broken (quantum); large `p` slow | 64-128 B | non-interactive DH-like |
| SQIsign | signature | surviving, NIST additional-signature finalist | ~200 B sig, ~100 B pk | very small but slow |
| B-SIDH / MD-SIDH | KEM variants | fragile after 2022 — limited use | — | mostly research |
| SQIsignHD / SQIsign2D | signature variants | post-2022 descendants, faster variants | similar sizes | under active research |

**CSIDH:** commutative, supports non-interactive Diffie-Hellman (unusual in the PQ space). Quantum subexponential-time attacks via Kuperberg's algorithm constrain parameter sizes; "CSIDH-512" is at best ~50 bits of post-quantum security on many analyses, so deployed parameter sets (CSIDH-2048 and beyond) pay a heavy performance cost.

**SQIsign:** *Short Quaternion and Isogeny Signature*. Produces **the smallest PQ signatures known** — under 200 bytes plus ~100-byte public key at level 1. Costs:
- Signing is **seconds** on a current CPU; verification is hundreds of milliseconds.
- Implementation is mathematically heavy — quaternion algebras, Deuring correspondence, Eichler orders.
- NIST added a second signature call in 2023 partly with SQIsign-like candidates in mind; it is being evaluated as an "additional" PQ signature beyond ML-DSA/FN-DSA/SLH-DSA.

```python
# liboqs (where enabled) — signature API parity with ML-DSA:
import oqs
if "SQIsign" in oqs.get_enabled_sig_mechanisms():
    with oqs.Signature("SQIsign") as s:
        pk = s.generate_keypair()
        sig = s.sign(b"compact PQ signature")
        print(len(pk), len(sig))      # ~100, <200 bytes
```
(Exact identifiers depend on liboqs build; SQIsign is classified as "disabled by default / experimental" in many releases.)

**Sizes comparison (signature):**

| Scheme | PK | Sig |
|---|---|---|
| SQIsign | ~100 B | <200 B |
| FN-DSA-512 (Falcon) | 897 B | ~660 B |
| ML-DSA-44 | 1312 B | 2420 B |
| SLH-DSA-128s | 32 B | ~7.9 KB |
| Ed25519 (classical) | 32 B | 64 B |

**Why isogenies look nothing like the others:** every other PQ family is broadly algebraic-linear (lattice vectors, linear codes, hash chains). Isogenies are deeply geometric — the hard problem lives in the structure of elliptic curves and quaternion algebras. This diversity is exactly why researchers keep working on the family despite the SIDH break: a lattice breakthrough would leave isogenies untouched.

**Pitfalls:**
- **SIDH is dead.** Do not reach for "SIKE" libraries; they are withdrawn. Any new deployment should use ML-KEM + HQC for KEMs.
- CSIDH performance is borderline at secure parameters; `O(seconds)` per key exchange at levels that resist Kuperberg.
- SQIsign implementations are still maturing; constant-time guarantees on quaternion-order arithmetic are under active work.
- The field is changing faster than the lattice / hash / code families — treat deployed isogeny crypto as experimental.

**Use cases (niche):**
- Bandwidth-obsessed signature deployments where <200-byte signatures outweigh the signing cost (blockchain contexts, attestations, embedded device identity).
- Academic / research deployments seeking non-lattice diversity.
- Hybrid signatures that combine a mature scheme with SQIsign for size savings on the additional factor.

**Rule of thumb:** Isogeny crypto is compact and mathematically elegant, but niche and fragile. Do not make it your default PQ primitive. Watch SQIsign as the survivor worth tracking.
