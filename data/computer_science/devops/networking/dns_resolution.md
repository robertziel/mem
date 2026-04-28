### DNS Resolution

**The query path — what happens when you visit `example.com`:**

| Step | Where | What |
|---|---|---|
| 1 | Browser | Check internal DNS cache |
| 2 | OS | Check `/etc/hosts`, then OS resolver cache |
| 3 | Local resolver / stub | Query configured recursive resolver |
| 4 | Recursive resolver | Cache hit? Return. Miss? Walk the tree |
| 5 | Root nameserver | "Ask the `.com` TLD" |
| 6 | TLD nameserver | "Ask the authoritative for `example.com`" |
| 7 | Authoritative nameserver | Return the actual records |
| 8 | Resolver caches result (per TTL) | Returns to OS / browser |

**Record types — what each does:**

| Type | Meaning | Example |
|---|---|---|
| `A` | Domain → IPv4 | `example.com → 93.184.216.34` |
| `AAAA` | Domain → IPv6 | `example.com → 2606:2800:220:1:248:1893:25c8:1946` |
| `CNAME` | Alias to another name | `www.example.com → example.com` |
| `MX` | Mail server (with priority) | `10 mail.example.com` |
| `TXT` | Free-form text | SPF / DKIM / domain-verification tokens |
| `NS` | Nameserver delegation | Points to authoritative servers |
| `SOA` | Start of authority — zone metadata | Serial, refresh, expire |
| `SRV` | Service location (host + port) | `_sip._tcp.example.com → 10 60 5060 sip.example.com` |
| `PTR` | Reverse DNS (IP → name) | `34.216.184.93.in-addr.arpa → example.com` |
| `CAA` | Certificate Authority Authorization | "Only Let's Encrypt may issue for this domain" |
| `DNSKEY` / `DS` / `RRSIG` | DNSSEC | Signed-record support |
| `ALIAS` / `ANAME` (provider-specific) | Apex CNAME-like | Route 53 ALIAS, Cloudflare CNAME-flattening |

**TTL — how long records are cached:**

| TTL | Use |
|---|---|
| 60 s | Fast propagation; high query volume; use during cutovers |
| 300 s (5 min) | Reasonable for active services |
| 3600 s (1 h) | Default for stable records |
| 86400 s (24 h) | Maximum sane upper bound |
| 0 / very low | Some providers ignore — minimum effective TTL varies |

> **Lower TTL before a planned migration**, raise it back after stable. Don't run permanently with TTL=60 — it costs everyone DNS queries.

**Resolver types:**

| Type | Use |
|---|---|
| **Stub resolver** | OS-level resolver in client; forwards to recursive |
| **Recursive resolver** | Walks the tree; caches results (your ISP, 8.8.8.8, 1.1.1.1) |
| **Authoritative server** | Owns the zone; answers queries about it |
| **Forwarding resolver** | Forwards to another resolver instead of recursing |

**Public recursive resolvers (worth knowing):**

| Provider | Address |
|---|---|
| Google | `8.8.8.8`, `8.8.4.4` |
| Cloudflare | `1.1.1.1`, `1.0.0.1` (privacy-focused) |
| Quad9 | `9.9.9.9` (security blocklist) |
| OpenDNS | `208.67.222.222` |

**DNS-over-HTTPS / DNS-over-TLS:**

| Protocol | Detail |
|---|---|
| **DoH** | DNS in HTTPS (port 443) — privacy + bypasses ISP filtering |
| **DoT** | DNS over TLS (port 853) |
| **DNSCrypt** | Older alternative |
| Default in modern browsers / OSes | Increasingly common |

**The CNAME-at-apex problem:**

| Issue | Detail |
|---|---|
| RFC says CNAME can't coexist with other records | Apex requires SOA + NS, so CNAME forbidden |
| Workarounds | **ALIAS** (Route 53) / **ANAME** / CNAME-flattening (Cloudflare) — synthesize A records |
| Symptom of doing it wrong | "Conflicting records" error from DNS provider |

**Common DNS-related TXT records:**

| Use | Format |
|---|---|
| **SPF** | `v=spf1 include:_spf.google.com -all` (allowed mail senders) |
| **DKIM** | `selector._domainkey.example.com` → public key |
| **DMARC** | `_dmarc.example.com` → policy |
| **Domain ownership** | "google-site-verification=…", "MS=…" |
| **CA constraints** | CAA record (separate type) |
| **MTA-STS** | TLS for mail |

**Debugging tools:**

| Tool | Use |
|---|---|
| `dig example.com` | Detailed query |
| `dig +short example.com` | Just the answer |
| `dig @8.8.8.8 example.com` | Query a specific resolver |
| `dig example.com ANY` | All record types (some servers refuse) |
| `dig +trace example.com` | Show resolution from root — fantastic for diagnosing |
| `dig -x 93.184.216.34` | Reverse lookup |
| `dig MX example.com` | Specific record type |
| `nslookup example.com` | Simpler, available everywhere |
| `host example.com` | Concise |
| `whois example.com` | Registration info, registrar, NS |
| `getent hosts example.com` | Use OS resolver path |
| `kdig` (knot-dig) | Modern alternative with DoT/DoH |
| `dog` (Rust dig replacement) | Pretty output |
| `dnsperf`, `dnsmasq` | Load + caching tools |

**Common interview / debugging scenarios:**

| Symptom | Likely cause |
|---|---|
| "DNS works on one device, not another" | Local cache; flush with `sudo dscacheutil -flushcache` (mac) / `resolvectl flush-caches` (Linux) / `ipconfig /flushdns` (Windows) |
| "Just changed DNS, still broken" | TTL — wait or query authoritative directly |
| "Works on my laptop, fails in cloud VM" | VPC DNS rules; private vs public hosted zones |
| "Email going to spam" | SPF / DKIM / DMARC misconfigured |
| "Some users see old IP" | Resolvers cache aggressively; ISPs can override TTL |
| Different answer per region | GeoDNS / split-horizon |
| Apex domain points wrong | CNAME at apex — use ALIAS instead |

**Split-horizon DNS:**

| Concept | Detail |
|---|---|
| Same name, different answer based on caller | Internal vs external |
| Inside corp network → internal IP | `db.example.com → 10.0.1.5` |
| Outside → public IP or NXDOMAIN | `db.example.com → not found` |
| Implementations | Route 53 private hosted zone, BIND views |

**GeoDNS / latency-based / weighted routing:**

| Routing policy | Detail |
|---|---|
| Simple | One answer always |
| Weighted | Round-robin between IPs with weights |
| Latency-based | Lowest-latency endpoint per resolver location |
| Geolocation | Per-country / region rules |
| Geoproximity | Distance-based with bias |
| Failover | Active/passive with health checks |
| Multi-value answer | Up to 8 values; client picks |

**DNSSEC — signed records:**

| Concept | Detail |
|---|---|
| Cryptographic signatures on records | Prevents spoofing / cache poisoning |
| Chain of trust | Parent zone signs child's keys |
| Records | DNSKEY, RRSIG, DS, NSEC/NSEC3 |
| Status | Optional; ~5–10% of zones |
| Validation | Done by recursive resolvers |
| Tradeoff | More complex zone management |

**DNS for Kubernetes / cloud:**

| Concept | Detail |
|---|---|
| **CoreDNS** | Default in modern K8s; pluggable |
| Service discovery | `<service>.<namespace>.svc.cluster.local` |
| Pod DNS | `<ip>.<namespace>.pod.cluster.local` |
| Headless service | `<service>.<namespace>` returns pod IPs |
| **Route 53** | AWS managed DNS |
| **Cloud DNS** (GCP) | Same niche |
| **Cloudflare DNS** | CDN integration |

**Health-check-based DNS failover:**

| Pattern | Detail |
|---|---|
| Active/passive | Primary IP; switch to backup if health check fails |
| Active/active | Multiple IPs; remove failed ones |
| Caveat | DNS TTL bounds failover time — 5-min TTL = 5-min RPO at minimum |
| Better fast-failover | LB-level health checks (ALB / NLB / Anycast) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Long TTL on records you're about to change | Stale answers everywhere |
| CNAME at apex | Provider rejects or behaves unexpectedly |
| TTL 0 always | Wasteful; some resolvers override anyway |
| No SPF / DKIM / DMARC | Email lands in spam |
| Letting registrar's auto-DNS take over | Custom records lost |
| `127.0.0.1` in `/etc/hosts` overriding production | Confusing local-only failures |
| DNSSEC misconfigured | Validating resolvers refuse the zone |
| Using `nslookup` for advanced debugging | `dig` is the right tool |

**Quick checklist:**

| Check | Pass? |
|---|---|
| Multiple geographically diverse NS | ✅ |
| TTL appropriate (low for active services, sensible for stable) | ✅ |
| SPF / DKIM / DMARC for email domains | ✅ |
| CAA record restricting cert issuance | ✅ |
| ALIAS / ANAME for apex pointing to CDN / LB | ✅ |
| Lower TTL ahead of planned changes | ✅ |
| Health checks + failover for critical services | ✅ |
| `dig +trace` works (no broken delegation) | ✅ |

**Cross-references:**

- TLS / cert management: [tls_certificate_management.md](../security/tls_certificate_management.md)
- CDN basics: [cdn_content_delivery_network_*.md](cdn_content_delivery_network_cloudfront_edge_cache.md)
- Service discovery (gRPC / K8s): [k8s_*.md](../kubernetes/k8s_architecture_control_plane_etcd_kubelet.md)

**Rule of thumb:** **`A` for apex (or ALIAS), `CNAME` for subdomains**, **lower TTL before changes**. **`dig +trace`** is the right tool for "DNS isn't working" — it shows you the entire delegation chain. **SPF + DKIM + DMARC + CAA** are the boring records that matter most for security and deliverability.
