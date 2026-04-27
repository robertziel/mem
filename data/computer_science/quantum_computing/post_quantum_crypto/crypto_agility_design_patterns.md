### Cryptographic Agility — Design Patterns for Swappable Primitives

**What it is:**
An application design discipline where cryptographic primitives (KEMs, signatures, AEADs, hashes) are **never** hard-coded in call sites, but selected through a versioned ciphersuite identifier carried in the data itself. The app can rotate RSA → ECDSA → ML-DSA without redeploying call sites, and can *verify* old data while *producing* new data under a different algorithm. Without it, PQ migration degenerates into an archaeology dig across every service.

**Threat agility defends against:**
- CRQC making the current algorithm obsolete.
- An implementation CVE (a parameter-set class break, like XMSS-leaf reuse) forcing emergency rotation.
- Regulator mandating a different FIPS profile mid-deployment.

**Core pattern — ciphersuite ID tagged with every artifact:**
```
artifact := suite_id || algo_params || payload
suite_id := u32 registered code; e.g.
  0x01 = AES-256-GCM + HKDF-SHA256 + X25519MLKEM768 + ML-DSA-65
  0x02 = AES-256-GCM + HKDF-SHA384 + X25519          + ECDSA-P256
```
Every verifier dispatches on `suite_id`. Every producer stamps it. No call site ever names an algorithm by string.

**Indirection layer (sketch, Rust-ish pseudocode):**
```rust
trait Kem {
    fn keygen(&self, rng: &mut dyn Rng) -> (PubKey, SecKey);
    fn encap(&self, pk: &PubKey, rng: &mut dyn Rng) -> (Ct, SharedSecret);
    fn decap(&self, sk: &SecKey, ct: &Ct) -> Result<SharedSecret>;
}

struct Suite { id: u32, kem: &'static dyn Kem, sig: &'static dyn Sig, aead: &'static dyn Aead }

fn encrypt(suite: &Suite, plaintext: &[u8], peer_pk: &PubKey) -> Vec<u8> {
    let mut out = suite.id.to_be_bytes().to_vec();        // tag first
    let (ct, ss) = suite.kem.encap(peer_pk, &mut OsRng);
    let nonce = random_nonce();
    let aead_ct = suite.aead.seal(&derive_key(&ss), &nonce, plaintext);
    out.extend(ct); out.extend(nonce); out.extend(aead_ct);
    out
}

fn decrypt(sk_bundle: &SecKeyBundle, blob: &[u8]) -> Result<Vec<u8>> {
    let id = u32::from_be_bytes(blob[0..4].try_into()?);
    let suite = SUITE_REGISTRY.get(id).ok_or(Err::UnknownSuite)?;
    let sk = sk_bundle.for_suite(id).ok_or(Err::NoKeyForSuite)?;
    // ... decap + open ...
}
```
No call site names `Kyber` or `ECDSA`; the registry is the only place with concrete types.

**Algorithm-negotiation surfaces:**
| Surface | Mechanism |
|---|---|
| Transport (TLS, SSH, IPsec) | Protocol-defined negotiation (`NamedGroup`, `signature_algorithms`). |
| Message layer (COSE, JOSE, CMS, PGP) | `alg` header per message; recipient decodes by tag. |
| At-rest blobs (field-level crypto, envelope-wrapped KEKs) | Length-prefixed `suite_id` as the first bytes of the ciphertext. |
| Signed releases / SBOMs | Detached sig file with explicit `alg:` metadata; verify-all-accepted-sigs pattern. |

**Runtime key-format detection:**
```yaml
# Keys stored with self-describing tag
- kid: user-42-sig-2026
  alg: ML-DSA-65           # serialized enum
  created: 2026-03-11
  material: base64url(pq_public_key)
- kid: user-42-sig-2023
  alg: ECDSA-P256
  created: 2023-05-01
  material: base64url(ec_public_key)
```
Verifiers iterate keys, match by `alg` compatible with the artifact's `suite_id`, and accept if any verifies. Signers pick the newest non-deprecated key.

**Versioned ciphersuite registry — rules:**
1. IDs are **append-only**. Never reuse, never mutate.
2. Each ID names an exact tuple — not a family. `AES-256-GCM + HKDF-SHA256` is one suite; `AES-256-GCM + HKDF-SHA384` is another.
3. A `deprecated` flag lets producers stop issuing but verifiers keep accepting (data already out there needs verifying forever, or until re-encrypted).
4. A `forbidden` flag is stronger — verifiers reject. Use only after a class break.

**Pitfalls:**
- **Hidden hard-codes**: a helper like `sha256(x)` scattered through 400 files is a hidden hash algorithm pin. Route through a `Hash::default()` that honors the current suite.
- **Oracle on negotiation**: letting the attacker pick the *weakest* algorithm you support. Enforce a per-tenant policy minimum (e.g., "this tenant requires PQ in the suite").
- **Key-reuse across suites**: the same long-term signing key under ECDSA and ML-DSA is tempting but opens cross-protocol attacks. Generate fresh PQ keys at suite introduction.
- **Serialization drift**: an agile system with inconsistent framing (some call sites prefix lengths, some don't) creates parser gadgets. Centralize the framing with the suite tag.
- **Rollback**: let a client advertise acceptance of deprecated suites and you open a downgrade path. Keep accept-lists tight and log every fallback.
- **Config-driven agility without a registry**: letting ops flip algorithms by env var without a versioned ID produces data no one can decrypt three years later.

**Migration pattern:**
1. Freeze current call sites; add tagging to new artifacts.
2. Stand up the registry; assign IDs for current + target suites.
3. Ship a reader that accepts both; ship a writer that still produces the old for one deployment cycle.
4. Flip the writer. Monitor verifier hit rate on the new suite.
5. Mark the old suite deprecated. Schedule re-encryption of at-rest data.
6. Mark forbidden once no production reads it.

**Rule of thumb:** If you can't answer "what algorithm does this ciphertext use?" by reading its first 4 bytes, you don't have crypto agility — you have crypto debt waiting for a CVE to collect the interest.
