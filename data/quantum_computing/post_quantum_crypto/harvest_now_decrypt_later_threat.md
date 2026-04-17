### Harvest Now, Decrypt Later (HNDL) — Store-and-Break Threat Model

**What it is:**
An adversary records encrypted traffic (or exfiltrates ciphertext at rest) *today*, stores it indefinitely, and decrypts it *later* once a cryptographically relevant quantum computer (CRQC) capable of running Shor's algorithm exists. Any secret whose confidentiality outlives the gap between "recorded" and "CRQC available" is already at risk — the attack has a hidden clock that started the day you sent the packet.

**Threat:**
- Classical KEMs (RSA, ECDH, DH) used in TLS/SSH/IPsec expose their session keys once Shor breaks the long-term key. Recorded sessions using `ECDHE` with `X25519` are not forward-secret against a future CRQC — the ephemeral private half can be recovered from the public half.
- Signed data (code signatures, document signatures, certificates) is *not* an HNDL target in the same way; forgery requires acting while the key is still trusted. HNDL is a **confidentiality** attack, not an integrity one.

**Who's in the blast radius:**
| Data class | Typical lifetime | HNDL risk |
|---|---|---|
| Session cookies, ephemeral chats | hours–days | negligible |
| Enterprise email, SaaS traffic | 3–10 years | moderate |
| Medical / PHI records | 20–70 years | **high** |
| Legal, M&A, diplomatic cables | 30+ years | **high** |
| Classified / SIGINT / state secrets | 50+ years | **critical** |
| Patents, trade secrets | 20+ years | high |
| Identity roots (birth records, SSN analogues) | lifetime | high |

**The Mosca inequality** — migrate before `X + Y > Z`:
```
X = how long your data must stay confidential
Y = how long migration to PQC takes (discover + pilot + roll)
Z = how long until a CRQC exists
```
If `X + Y ≥ Z`, you've already lost. Treat `Z` as a distribution, not a point estimate; plan against the lower tail.

**Decision tree — do I need to migrate *this channel* now?**
```
is confidentiality required > 10 years?
├── yes  → migrate to hybrid KEM now (X25519MLKEM768), PQ-only later
└── no   → is the channel recorded or routable by untrusted infra?
          ├── yes → hybrid KEM still recommended (low cost, future-proofs)
          └── no  → defer; track NIST / library support and revisit yearly
```

**Example — TLS 1.3 preference order for HNDL-sensitive services:**
```nginx
# Prefer hybrid PQ; fall back to classical only if peer lacks support.
ssl_protocols TLSv1.3;
ssl_conf_command Groups X25519MLKEM768:X25519:P-256;
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=63072000" always;
```

**Priorities (attack economics favor high-value, long-lived targets):**
1. **Long-lived bulk-encrypted archives** (medical EHRs, legal escrow, diplomatic cables). Fix at-rest KEK wrapping *first*.
2. **VPN / site-to-site tunnels** carrying those archives in motion. IPsec IKEv2 with PQ-hybrid (RFC 9370) is the pattern.
3. **Identity roots** (enterprise CAs, federation signing keys) — not HNDL per se, but the *signatures* authenticating the migration must survive too.
4. **Internal RPC between data-classification boundaries** — mTLS using hybrid groups.

**Pitfalls:**
- "We have TLS forward secrecy, so we're fine." Forward secrecy is **classical**; the ephemeral ECDH key is recoverable by Shor from the captured handshake.
- Assuming symmetric crypto is safe — AES-128 loses half its bits to Grover. Use **AES-256** for long-lived bulk data (GCM or AES-GCM-SIV), re-wrap legacy files.
- Treating HNDL as a future problem. The *recording* is happening now; migration lag (`Y`) is what you control.
- Mixing HNDL-sensitive and transient traffic on the same KEM policy — split by SNI / service class if possible.
- Ignoring backups and replicas. A decade of nightly snapshots under RSA-wrapped KEKs is an archive attacker's dream.

**Mitigations beyond PQC migration:**
- **Double-wrap** at-rest KEKs: hybrid (classical + ML-KEM) envelope encryption now, re-wrap on schedule.
- Shorten retention where policy allows — if you can legally delete it, HNDL becomes moot.
- Network-layer segmentation: don't let untrusted fiber carry HNDL-sensitive plaintext-after-TLS via legacy middleboxes.

**Rule of thumb:** If a captured byte today would embarrass you (or violate law) when printed in a newspaper in 2045, that byte's KEM is already your problem — migrate the channel to hybrid PQ before the data flows, not after.
