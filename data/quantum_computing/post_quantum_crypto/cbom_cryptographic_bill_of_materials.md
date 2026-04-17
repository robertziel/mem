### CBOM — Cryptographic Bill of Materials (CycloneDX)

**What it is:**
A machine-readable inventory of every cryptographic asset in an application or organization: algorithms, key references, protocols, libraries, and the call sites that use them. CycloneDX introduced the `cryptographic-assets` component type (originally pushed by IBM's CBOM work) as an extension to SBOM. Think "SBOM for crypto" — a precondition to any post-quantum migration because you can't migrate what you haven't located.

**Threat it addresses:**
The **visibility gap**. Most PQ migrations fail not at the math but at scope: a forgotten service spraying RSA-1024 from a vendored lib in a sidecar on a platform the security team doesn't know about. CBOM is the discovery artifact that makes the blast radius concrete.

**What goes in a CBOM:**
| Asset type | Examples | Fields tracked |
|---|---|---|
| **algorithm** | AES-256-GCM, ML-KEM-768, ECDSA-P256 | name, OID, parameter set, NIST security level |
| **key** | KMS ARN, JWK kid, HSM slot | kid, size, usage (sign/encap), related cert |
| **protocol** | TLS 1.3, SSH-2, IKEv2, QUIC | version, cipher suites negotiated |
| **certificate** | X.509 leaf/CA | subject, issuer, sig algo, not-after, SAN |
| **library** | OpenSSL 3.5, BoringSSL, BouncyCastle | version, CPE, known CVEs |
| **related-crypto-material** | salt, IV policy, KDF params | param set, RFC, nonce reuse policy |

**Minimal CycloneDX CBOM (YAML-rendered):**
```yaml
bomFormat: CycloneDX
specVersion: "1.6"
version: 1
metadata:
  timestamp: 2026-04-17T00:00:00Z
  component:
    type: application
    name: payments-gateway
    version: 3.14.0
components:
  - type: cryptographic-asset
    bom-ref: alg-ecdsa-p256
    name: ECDSA-P256
    cryptoProperties:
      assetType: algorithm
      algorithmProperties:
        primitive: signature
        parameterSetIdentifier: secp256r1
        curve: P-256
        executionEnvironment: software-plain-ram
        nistQuantumSecurityLevel: 0        # broken by Shor
  - type: cryptographic-asset
    bom-ref: alg-mlkem-768
    name: ML-KEM-768
    cryptoProperties:
      assetType: algorithm
      algorithmProperties:
        primitive: kem
        parameterSetIdentifier: ML-KEM-768
        nistQuantumSecurityLevel: 3
  - type: cryptographic-asset
    bom-ref: key-tls-leaf-2026
    name: payments-gateway-tls-leaf
    cryptoProperties:
      assetType: related-crypto-material
      relatedCryptoMaterialProperties:
        type: public-key
        id: "sha256:7f...9a"
        algorithmRef: alg-ecdsa-p256
        state: active
        size: 256
        activationDate: 2026-01-15
        expirationDate: 2027-01-15
```

**How CBOMs get generated:**
| Source | Technique |
|---|---|
| Source code | AST scanners (Semgrep rules, Sonar crypto-plugin, IBM CBOMkit) for `javax.crypto`, `crypto/*`, `Cipher.getInstance(...)`. |
| Binaries | Symbol / string scan for `EVP_CIPHER_*`, `BCryptEncrypt`, `RSA_public_encrypt`. |
| Runtime | eBPF / ltrace hooks over libcrypto / BoringSSL; capture actual negotiated suites. |
| Config | Parse `openssl.cnf`, nginx/Apache, IPsec, SSH configs. |
| PKI | CT-log scrape of all issued certs for org domains; parse sig-algo field. |
| Cloud | KMS / HSM API enumeration for keys (AWS KMS key policies, GCP CMEK algorithm). |

Ship a nightly job that merges these into one canonical CBOM per service.

**Use CBOM as input to:**
1. **Prioritization**: rank services by `nistQuantumSecurityLevel: 0` assets weighted by data sensitivity.
2. **Policy enforcement**: CI rule rejects a build whose CBOM contains a forbidden algo (MD5, RC4, SHA-1 sign).
3. **Regulator attestation**: prove you know where RSA-2048 lives, when classical sunset arrives.
4. **Incident response**: "a flaw was found in Algorithm X" — query the CBOM, get the list of services in minutes.

**Pitfalls:**
- **Stale CBOM**: generated once at launch, never refreshed. Tie generation to CI/CD; treat divergence between CBOM and runtime as a defect.
- **Missing dynamically loaded crypto** (plugins, JIT, scripting-runtime imports). Runtime hooks are the only reliable source.
- **Confusing "has RSA in codebase" with "uses RSA at runtime"** — dead code inflates apparent risk. Cross-reference with runtime telemetry.
- **Only scanning first-party code** — vendored libs and transitive deps carry 80% of real crypto. Merge CBOMs from dependencies, don't just generate your own.
- Treating CBOM as a one-shot spreadsheet. It is a living dataset; wire it into the same CI that produces your SBOM.
- Omitting **protocol-level** assets and only listing algorithms — the cipher suite negotiated is the security-relevant configuration.

**Migration pattern:**
1. Generate CBOMs per service (CI step). Collect centrally.
2. Join against an internal "data sensitivity + retention" table.
3. Rank: high-retention services holding quantum-vulnerable algos jump to the front of the migration queue.
4. Each migration increments a CBOM field; a dashboard tracks fleet progress toward `nistQuantumSecurityLevel >= 3`.

**Rule of thumb:** You can't migrate what you can't enumerate — publish a CBOM per service and make CI fail closed on banned algorithms, or every PQ initiative will rediscover the same ten forgotten services in its fourth retrospective.
