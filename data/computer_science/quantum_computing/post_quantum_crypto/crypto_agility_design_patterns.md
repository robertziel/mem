### Cryptographic Agility — Design Patterns for Swappable Primitives

**Definition:** an application discipline where cryptographic primitives (KEMs, signatures, AEADs, hashes) are **never hard-coded at call sites** but selected through a versioned **ciphersuite ID** carried inside the data itself. Verifiers dispatch on the tag; producers stamp it.

> **One-line litmus test:** if you can't answer "what algorithm does this ciphertext use?" by reading its first 4 bytes, you don't have crypto agility — you have crypto debt waiting for a CVE to collect the interest.

**Threats it defends against:**

| Threat | Without agility | With agility |
|---|---|---|
| CRQC obsoletes current algorithm | Re-deploy every call site, archaeology dig | Add a new suite ID to registry; flip writers |
| Class-break CVE in a parameter set (e.g., XMSS leaf reuse) | Emergency global patch, downtime | Mark old suite `forbidden`, ship new ID |
| Regulator mandates new FIPS profile mid-deployment | Re-engineer crypto layer | Configure tenant policy minimum |
| Slow rollout while old data still verifies | Choose between breaking verification or freezing migration | Producer flips, verifier accepts both |

**Core pattern — `(suite_id, params, payload)`:**

```
artifact = u32 suite_id || algo-specific framing || payload
```

| Suite ID | Tuple | Posture |
|---|---|---|
| `0x01` | AES-256-GCM + HKDF-SHA256 + X25519MLKEM768 + ML-DSA-65 | PQ-hybrid, current target |
| `0x02` | AES-256-GCM + HKDF-SHA384 + X25519 + ECDSA-P256 | Classical only, deprecated soon |
| `0x03` | ChaCha20-Poly1305 + HKDF-SHA256 + ML-KEM-768 + ML-DSA-65 | PQ-only, mobile-friendly |

> Each ID names an **exact tuple**, not a family. `AES-256-GCM + HKDF-SHA256` and `AES-256-GCM + HKDF-SHA384` are different suites.

**Indirection layer — what each piece owns:**

| Component | Role | Touches concrete crypto? |
|---|---|---|
| Trait/interface (`Kem`, `Sig`, `Aead`, `Hash`) | Algorithm-agnostic contract | No |
| Suite struct | Bundles `(id, kem, sig, aead, hash)` | Yes — but only **once**, in the registry |
| Suite registry | `id → Suite` lookup | Yes — single place with concrete types |
| Producer call sites | `encrypt(suite, plaintext, peer_pk)` | **No** — never names an algorithm |
| Verifier call sites | `decrypt(blob)` reads `suite_id` from first bytes | **No** — dispatches via registry |
| Default-suite policy | Per-tenant / per-env "use this id" | Configuration only |

**Negotiation surfaces — where the suite is chosen:**

| Surface | Mechanism |
|---|---|
| Transport (TLS, SSH, IPsec) | Protocol-defined: `supported_groups`, `signature_algorithms`, KEX list |
| Message layer (COSE, JOSE, CMS, PGP) | `alg` header per message |
| At-rest blobs (field-level, envelope KEKs) | Length-prefixed `suite_id` first bytes of ciphertext |
| Signed artifacts (releases, SBOMs, attestations) | Detached signature with `alg:` metadata; verify-any-accepted pattern |
| Tokens (JWT, PASETO) | Header `alg` claim; reject `none` and unexpected algorithms |

**Self-describing keys (registry rules):**

```yaml
- kid: user-42-sig-2026
  alg: ML-DSA-65         # serialized enum
  created: 2026-03-11
  material: base64url(pk)
- kid: user-42-sig-2023
  alg: ECDSA-P256        # legacy still verifies
  created: 2023-05-01
  material: base64url(pk)
```

| Behavior | Rule |
|---|---|
| Verify | Iterate stored keys; accept if **any** valid match for the artifact's `suite_id` |
| Sign | Pick the **newest non-deprecated** key whose `alg` is in the active suite |
| Rotate | Add new `kid` first; deprecate the old one only after producer cutover |

**Registry policy (append-only, versioned):**

| Rule | Why |
|---|---|
| IDs are **append-only**, never reused, never mutated | A reused ID makes old data un-decryptable or, worse, decryptable wrongly |
| Each ID = exact tuple, not a family | "Whichever AES" is not a stable contract |
| `deprecated` flag — producers stop, verifiers continue | At-rest data lives forever (or until re-encrypted) |
| `forbidden` flag — verifiers reject | Use only after a class break |
| Per-tenant policy minimum | "This tenant requires PQ in the suite" enforced at writer + reader |

**Migration pattern (gradual cutover):**

| Step | Action | Risk if skipped |
|---|---|---|
| 1 | Freeze call sites — route through indirection layer | Anything else is mocking real agility |
| 2 | Assign suite IDs for current + target suites | Without IDs in the data, you can't tell future readers what's what |
| 3 | Ship a **reader** that accepts old + new | Skip → existing data fails to verify |
| 4 | Ship a writer still producing the old for one cycle | Skip → if the new writer has a bug, you've already corrupted prod data |
| 5 | Flip the writer to the new suite | Monitor verifier hit rate — should approach 100% on new ID |
| 6 | Mark old suite `deprecated`; schedule at-rest re-encryption | Skip → permanent dependency on legacy suite |
| 7 | Mark old suite `forbidden` once no production reads it | Without this, downgrade attacks remain possible |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Scattered helpers like `sha256(x)` | Hidden algorithm pin — agility lies. Route through `Hash::default()` honoring the current suite |
| Negotiation oracle | Attacker picks the **weakest** suite you accept. Enforce per-tenant minimums |
| Reusing a long-term signing key across PQ + classical | Cross-protocol attacks. Generate fresh PQ keys at suite introduction |
| Inconsistent framing across call sites | Parser gadgets. Centralize framing with the suite tag |
| Downgrade rollback | Don't accept deprecated suites without explicit fallback log + alert |
| "Agility" via env var, no registry | Data produced today is undecryptable in three years |
| `JWT alg: none` accepted | Whole system relies on the verifier's algorithm whitelist — make it strict |
| In-band tag without integrity | Tag must be authenticated alongside ciphertext, not bare prefix |

**What "good" looks like:**

| Property | Test |
|---|---|
| Algorithm visible in artifact | `xxd artifact.bin \| head` shows the `suite_id` |
| Single registry update enables a new suite | Adding ML-DSA-87 = one new entry, no call-site changes |
| Verifier accepts old + new in parallel | Producer can flip without coordinating with reader fleet |
| Per-tenant minimum enforced | A regulated tenant can't be served weaker crypto by a misconfigured client |
| Deprecation auditable | Logs show every fallback to a deprecated suite |

**Rule of thumb:** **tag every artifact with a versioned suite ID; verifiers dispatch via a single registry; no call site ever names an algorithm.** Migration must be **read-then-write** (deploy new readers first, then flip writers, then deprecate). Treat the registry as **append-only** like a database migration. The PQ transition is the moment everyone discovers whether their crypto layer has agility or just *talks about* having it.
