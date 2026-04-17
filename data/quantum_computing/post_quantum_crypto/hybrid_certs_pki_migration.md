### Hybrid Certificates and PKI Migration — Dual-Signature X.509

**What it is:**
Mechanisms that let an X.509 certificate (or CRL, OCSP response, CMS message) carry **both** a classical signature (RSA/ECDSA) and a post-quantum signature (ML-DSA / Falcon / SLH-DSA) so legacy verifiers and PQ-aware verifiers both accept the same chain. Unlike TLS key exchange — where hybrid is a single concatenated secret — hybrid signatures are a PKI-wide format problem because every issuer, verifier, and revocation responder must agree on encoding.

**Threat:**
Shor breaks RSA and ECDSA signatures. A CRQC can forge certificates, CA signatures, TLS server auth, code-signing, and document signatures — not later, but **retroactively** for anything still being verified against a compromised root. Unlike HNDL, the migration window is bounded by the lifetime of your longest-lived trust anchor.

**Three cert-path variants:**
| Variant | How it works | Interoperability | Best for |
|---|---|---|---|
| **Separate-chain** | Issue two parallel certs (one classical, one PQ) under two parallel roots. Client picks by policy. | Highest (no format changes). | Early rollout, SSH, code-signing. |
| **Composite signature** (RFC draft-ietf-lamps-pq-composite-sigs) | Single signature field = concatenation of two signatures under a new composite OID. Verifier must validate both. | Medium (new OID, new verifier). | Future PKI after ecosystem catches up. |
| **Chameleon / alternative-extension** (ITU X.509 dual-sig, IETF draft-becker-guthrie-noncomposite) | Primary sig is classical, PQ sig sits in a non-critical `AltSignatureValue` extension with matching `AltSignatureAlgorithm` and `SubjectAltPublicKeyInfo`. Legacy verifiers ignore the extensions. | Highest (backward-compatible). | Transitional deployments, CA-hierarchy rollover. |

**Composite signature wire format (simplified):**
```
CompositeSignatureValue ::= SEQUENCE {
    classicalSig     BIT STRING,   -- ECDSA-P384
    postQuantumSig   BIT STRING    -- ML-DSA-65
}
-- OID: id-MLDSA65-ECDSA-P384-SHA512 (composite)
```
A composite-aware verifier requires **both** signatures to validate. A failure in either is a failure overall — this is the security property (neither algorithm alone suffices) but also the pitfall (double the bug surface).

**OpenSSL 3.5 hybrid leaf example (illustrative):**
```bash
# Generate dual keys
openssl genpkey -algorithm ML-DSA-65 -out leaf-pq.key
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-384 -out leaf-ec.key

# CSR signed with composite OID
openssl req -new -key leaf-ec.key -out leaf.csr \
    -addext "altSubjectPublicKey = $(openssl pkey -in leaf-pq.key -pubout | base64 -w0)" \
    -addext "altSignatureAlgorithm = ML-DSA-65"

# Issue with alt-signature extension (dual-sig mode)
openssl x509 -req -in leaf.csr -CA ca.crt -CAkey ca-ec.key \
    -altCAkey ca-pq.key -altSigAlg ML-DSA-65 -days 365 -out leaf.crt
```

**CA rollout phases:**
1. **Root dual-sig**: existing root re-issued with a PQ `AltSignatureValue`. No chain length change. Legacy clients ignore the alt extension; PQ clients validate both.
2. **Intermediate dual-sig**: sub-CA certs gain dual signatures. Test chain-building: many libraries cache intermediates by SKI — confirm the alt key hashes to a distinct `AltSubjectKeyIdentifier`.
3. **Leaf dual-sig**: subscribers get dual certs. Most breakage surfaces here (TLS libraries parsing unknown extensions, CT logs rejecting oversized certs).
4. **PQ-only root (parallel hierarchy)**: stand up a new root whose entire chain is ML-DSA, cross-sign with the dual-sig root so new clients can bootstrap trust.
5. **Classical sunset**: shrink `NotAfter` on classical-only certs; eventually refuse to issue them.

**Size impact — don't ignore it:**
| Signature | Public key | Signature | Notes |
|---|---|---|---|
| ECDSA P-256 | 64 B | ~72 B | baseline |
| RSA-3072 | 384 B | 384 B | baseline |
| ML-DSA-65 | 1952 B | 3309 B | main PQ sig pick |
| Falcon-512 | 897 B | ~666 B | small sig, floating-point pitfalls |
| SLH-DSA-128s | 32 B | ~7856 B | hash-based, conservative |
| Composite (ECDSA-P384 + ML-DSA-65) | ~2050 B | ~3400 B | typical dual-sig leaf |

CT log entry size, OCSP response size, and certificate-bundle flight in the TLS handshake all scale — budget for the larger messages up front (may push TLS records past MTU).

**Pitfalls:**
- **Chain-building caches** that index by SKI: hybrid certs have two keys; make sure your AIA / CT / HSTS pinning logic handles both.
- **Pinning** (HPKP-style, certificate pinning in mobile apps): a PQ key rotation invalidates pins. Move to SPKI pinning of the *classical half* only during transition, or drop pinning in favor of CT monitoring.
- Path validation libraries that silently skip unknown critical extensions — `AltSignatureValue` must be **non-critical** to preserve backward compatibility, but `keyUsage` semantics still have to apply to both keys.
- **CRL / OCSP responders** signed only with classical keys become the weak link. Dual-sign revocation responses the same way.
- HSM support: many HSMs don't yet expose ML-DSA — plan firmware path and re-key ceremony.
- Cross-signing loops: dual-sig root signs PQ-only root, PQ-only root signs dual-sig root — valid but opaque; keep chain discovery bounded.

**Migration pattern:**
1. Inventory every private key (see CBOM). Assign `classical-only` / `dual-sig` / `pq-only` label.
2. Stand up an offline PQ root CA and a dual-sig issuing CA in parallel to existing hierarchy.
3. Issue dual-sig leaves to non-public internal services first (mTLS fleet, CI signing).
4. Add PQ verification to clients — but keep classical verification as a fallback until the root inventory is fully dual-signed.
5. Cross-sign the new PQ root from the old classical root (and vice versa) for bootstrap.
6. Sunset classical-only roots once all peers handle dual-sig.

**Rule of thumb:** PKI migrates root-downward, verification-upward — you can only trust a PQ leaf as far up the chain as you have a PQ-signed anchor, so cross-sign early and don't let any single link in the trust chain be classical-only for code or cert-chain that has to outlive the CRQC window.
