### Hybrid TLS 1.3 Key Exchange — X25519MLKEM768 and Relatives

**What it is:**
A TLS 1.3 `supported_groups` value that concatenates a classical ECDH share with a post-quantum KEM ciphertext, deriving the handshake secret from **both**. The connection is secure if **either** primitive is unbroken — classical catches any PQ implementation flaw; PQ catches Shor. The draft-standardized codepoint `X25519MLKEM768` (0x11EC) has superseded the older `X25519Kyber768Draft00` (0x6399) as ML-KEM is the finalized NIST pick (FIPS 203).

**Threat it closes:**
Harvest-now-decrypt-later on the handshake. A pure-X25519 handshake recorded today yields its session key to a future CRQC; a hybrid handshake resists until *both* halves fall.

**Hybrid construction (TLS 1.3 `key_share`):**
```
client_share  = X25519_pub  ||  MLKEM768_pub       (1184 + 32 = 1216 bytes)
server_share  = X25519_pub  ||  MLKEM768_ct        (1088 + 32 = 1120 bytes)
shared_secret = X25519_ss   ||  MLKEM768_ss        (concatenation, then HKDF)
```
The shared secret feeds the normal TLS 1.3 key schedule unchanged — only the `NamedGroup` identifier and the share sizes are new.

**Named groups you will actually see:**
| Codepoint | Name | Status | Notes |
|---|---|---|---|
| 0x001D | `x25519` | universal | classical baseline |
| 0x0017 | `secp256r1` | universal | classical, FIPS-preferred |
| 0x11EC | `X25519MLKEM768` | IETF draft, finalized ML-KEM | the pick going forward |
| 0x6399 | `X25519Kyber768Draft00` | early browser deploy | deprecated; remove once peers upgrade |
| 0x639A | `SecP256r1MLKEM768` | FIPS-hybrid variant | when only NIST curves allowed |

**Fallback chain — offer in this order:**
```
X25519MLKEM768, X25519Kyber768Draft00, X25519, secp256r1
```
Servers pick the first mutually supported group. A hybrid-aware client that hits a legacy server silently falls back to classical; the TLS downgrade detection covers the channel but *not* the PQ property — log when fallback happens on HNDL-sensitive services.

**OpenSSL 3.5+ config example (`openssl.cnf`):**
```ini
[openssl_init]
ssl_conf = ssl_sect

[ssl_sect]
system_default = ssl_default_sect

[ssl_default_sect]
Groups = X25519MLKEM768:X25519:secp256r1
MinProtocol = TLSv1.3
CipherSuites = TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256
```

**nginx 1.27+ snippet:**
```nginx
ssl_protocols TLSv1.3;
ssl_conf_command Groups X25519MLKEM768:X25519:secp256r1;
ssl_conf_command Options KTLS;
```

**Handshake size impact:**
| Group | ClientHello `key_share` | ServerHello `key_share` | Extra vs X25519 |
|---|---|---|---|
| X25519 | 32 B | 32 B | — |
| X25519MLKEM768 | 1216 B | 1120 B | ~2.3 KB added |
| MLKEM1024-only | 1568 B | 1568 B | ~3 KB, no classical |

The extra kilobytes push ClientHello past one IP packet; initial-MTU fragmentation and middlebox misbehavior are the real-world failure modes.

**Client / library support outlook:**
- Chromium-family browsers negotiate hybrid by default for public origins.
- Firefox ships hybrid behind a pref.
- OpenSSL 3.5+, BoringSSL, Go `crypto/tls`, Rustls (via `rustls-post-quantum`), BouncyCastle implement `X25519MLKEM768`.
- Older TLS middleboxes (DPI, load balancers) may reject oversized ClientHello — test before rollout.

**Pitfalls:**
- **Don't ship PQ-only** on public endpoints. A single buggy ML-KEM impl kills your fleet; hybrid contains the blast radius.
- Sharing the same KEM ephemeral across connections — always generate a fresh ML-KEM keypair per handshake, same as ECDH.
- Assuming FIPS mode permits hybrids. Check the validated module's approved-algorithm list; some FIPS stacks require `SecP256r1MLKEM768` rather than X25519-based hybrids.
- Ignoring the downgrade. Classical-only fallback is invisible to end-users unless you emit a metric — add one.
- Forgetting session resumption: PSK-only resumption doesn't re-run the KEM; set `ssl_session_tickets off` or age tickets aggressively on HNDL-sensitive services.
- Path MTU: TCP segmentation usually handles it, but QUIC / UDP transports may see initial-packet amplification limits bite.

**Migration pattern:**
1. Enable hybrid alongside classical (server + client opt-in). Monitor handshake failure rate by group.
2. Promote hybrid to first-preference once failure rate < 0.01%.
3. Keep classical as fallback until ecosystem support is universal.
4. Only then consider PQ-only groups, and only for internal services where you control both ends.

**Rule of thumb:** Turn on `X25519MLKEM768` everywhere you can, prefer it first, keep `X25519` as a fallback — hybrid is free insurance against both Shor and any ML-KEM implementation bug you haven't found yet.
