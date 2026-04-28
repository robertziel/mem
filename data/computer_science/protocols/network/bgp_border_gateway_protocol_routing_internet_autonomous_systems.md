### BGP — Border Gateway Protocol (Internet Routing)

**Definition:** **BGP** is the **routing protocol of the internet**. It routes traffic between **Autonomous Systems** (AS) — ISPs, cloud providers, large networks. Path-vector protocol where routers advertise reachable IP prefixes. Most developers never configure BGP directly, but should know it exists for **Direct Connect**, **multi-cloud**, and to understand **internet outages**.

**Core concepts:**

| Concept | Detail |
|---|---|
| **Autonomous System (AS)** | A network under one routing policy (ISP, cloud provider, large org) |
| **AS Number (ASN)** | Globally unique ID for an AS (e.g., AWS = 16509, Google = 15169) |
| **Prefix** | An IP CIDR block being announced |
| **AS path** | List of ASes a route passes through |
| **Peering** | Direct connection between two ASes |
| **Transit** | Paying ISP to reach the rest of the internet |
| **Path-vector** | Routers share full AS paths to prefixes |
| **Port** | TCP 179 |

**How BGP works (high-level):**

```
   AS 1 (ISP A)  ─eBGP→  AS 2 (ISP B)  ─eBGP→  AS 3 (AWS)
        │                       │                       │
   Knows: "10.0.0.0/8         Knows: I can             Knows: "172.31.0.0/16
   is reachable through        reach AS 1 and          is in my AS"
   AS 2 → AS 3"                AS 3"
```

| Step | Detail |
|---|---|
| 1. Each AS announces its prefixes | "I have 172.31.0.0/16" |
| 2. Neighbors propagate | Adding their AS to the path |
| 3. Routers receive multiple paths | Same prefix from different paths |
| 4. Best-path selection | By AS path length, policies, etc. |
| 5. Updates propagate | Slowly (minutes to converge) |

**eBGP vs iBGP:**

| Type | Between | Use |
|---|---|---|
| **eBGP** (external) | Different ASes | Internet routing, ISP peering, Direct Connect |
| **iBGP** (internal) | Within same AS | Distributing external routes inside your network |

**BGP path attributes (best-path selection):**

| Attribute | Used for | Priority |
|---|---|---|
| **Local preference** | Outbound preference (within AS) | Highest |
| **AS path length** | Shorter is better | Most common tiebreaker |
| **Origin type** | IGP > EGP > Incomplete | |
| **MED** (Multi-Exit Discriminator) | Suggested ingress path | Across same AS |
| **eBGP > iBGP** | External preferred | |
| **IGP metric** | Closest exit | Routing protocol of choice |
| **Router ID** | Final tiebreaker | Lowest wins |

**BGP vs OSPF:**

| Feature | **BGP** | **OSPF** |
|---|---|---|
| Scope | Inter-AS (internet) | Intra-AS (within your network) |
| Type | Path-vector | Link-state |
| Scale | Internet-scale | Thousands of routers |
| Metric | AS path + policies | Cost (bandwidth, etc.) |
| Convergence | Slow (minutes) | Fast (seconds) |
| Use case | ISP / WAN | Enterprise / data center |

**Why developers should know BGP:**

| Topic | Detail |
|---|---|
| **AWS Direct Connect** | Uses BGP to exchange routes between your network and AWS |
| **Multi-cloud** | BGP routes between AWS, GCP, Azure |
| **DDoS mitigation** | BGP-based traffic redirection (Cloudflare, AWS Shield) |
| **Internet outages** | BGP misconfigurations have caused famous outages |
| **Route leaks** | Misconfigured BGP can redirect traffic through wrong networks |
| **Anycast** | BGP advertises same prefix from many locations (CDN, DNS) |

**Famous BGP outages:**

| Incident | Detail |
|---|---|
| **Facebook 2021** (~6 hours) | BGP withdrawals → entire FB infra unreachable |
| **Cloudflare 2020** | Routing leak from a customer caused widespread issues |
| **Pakistan / YouTube 2008** | Pakistan blocked YouTube domestically; the route leaked globally |
| **AWS / Verizon 2019** | Route leak by Verizon impacted CloudFront, S3 |
| **MyEtherWallet 2018** | Stolen $150K via BGP route hijack |
| Many smaller ones | Route leaks happen daily, mostly unnoticed |

**BGP in cloud (AWS Direct Connect):**

```
   Corporate Data Center           AWS VPC
     AS 65000                      AS 64512
        │                              │
        ├── eBGP over Direct Connect ──┤
        │                              │
   Advertises: 10.1.0.0/16 → AS 65000   Advertises: 172.31.0.0/16 → AS 64512
   Both sides learn routes dynamically
```

| Detail | Notes |
|---|---|
| Public ASNs | Buy from regional registry (ARIN, RIPE, etc.) |
| Private ASNs | 64512–65534 (16-bit), 4200000000–4294967294 (32-bit) — for internal use |
| AWS uses 64512 by default | Direct Connect Virtual Interface |
| Customer ASN | Pick from private range (or use public if you have one) |

**BGP route advertisements example:**

```
AS 64512 (AWS) advertises:  10.0.0.0/16  AS-PATH: 64512
                              ↓ to AS 65000

AS 65000 (your DC) advertises:  192.168.0.0/16  AS-PATH: 65000
                                  ↓ to AS 64512

Now AWS knows how to reach 192.168.0.0/16: via 65000
And your DC knows how to reach 10.0.0.0/16: via 64512
```

**Anycast — same prefix, many locations:**

```
   Cloudflare AS 13335 advertises 1.1.1.1/32 from:
     - SFO PoP
     - LHR PoP
     - SIN PoP
     - ... 200+ globally

   BGP routes user's request to closest PoP via shortest AS path.
   Used by: CDNs (Cloudflare, Fastly, AWS CloudFront), DNS roots, Google DNS (8.8.8.8), Quad9 (9.9.9.9)
```

| Property | Detail |
|---|---|
| Multiple servers, same IP | BGP picks closest |
| Stateless apps only | Connection might bounce on rerouting |
| Used heavily by CDNs and DNS | Speed of light + redundancy |

**Route leaks and hijacks:**

| Type | Detail |
|---|---|
| **Route leak** | Accidental: customer's announcement leaked beyond intended scope |
| **Route hijack** | Malicious: announce someone else's prefix |
| **Sub-prefix hijack** | Announce /24 when real owner has /22 — more specific wins |
| Defenses: **RPKI** | Cryptographically sign routes |
| Defenses: **AS-SET filtering** | Validate announcements |
| Defenses: **MANRS** | Industry best-practice initiative |

**Common pitfalls (operator-side):**

| Pitfall | Effect |
|---|---|
| No filters on announcements | Leak risk |
| Wrong prefix length | Less-specific ignored |
| Slow convergence assumed fast | Outages last minutes |
| Withdraw all prefixes accidentally | Whole network disappears (Facebook) |
| No RPKI signing | Hijacks succeed |
| `dampening` aggressive | Legit routes flap-suppressed |

**BGP communities — policy tagging:**

| Use | Detail |
|---|---|
| Mark route with attributes | E.g., "do not export to ISP X" |
| Commonly-used | "blackhole" (drop traffic to this prefix) |
| Standard format | `<ASN>:<value>` |
| Used heavily by ISPs | Customer signals routing intent |

**Cross-references:**

- TCP/IP fundamentals: [tcp_ip_*.md](../../devops/networking/tcp_ip_udp.md)
- AWS VPC + Direct Connect: [aws_vpc_*.md](../../devops/cloud_aws/aws_vpc_subnets_nat_gateway_peering_transit_gateway.md)
- DNS: [dns_*.md](dns_resolution_a_aaaa_cname_mx_records.md)
- Multi-region scaling: [scaling_high_traffic_*.md](../../system_design_hld_high_level_design/fundamentals/scaling_high_traffic_horizontal_caching_redis_cdn.md)

**Rule of thumb:** **BGP is the internet's routing protocol** — you won't configure it directly unless working on network infrastructure. Know it exists for **AWS Direct Connect**, **multi-cloud networking**, **CDN anycast**, and to understand **internet outages**. **OSPF for internal routing, BGP for external.** BGP misconfigurations cause real outages — **Facebook 2021** is the canonical example: a BGP withdraw made the whole company invisible to the internet.
