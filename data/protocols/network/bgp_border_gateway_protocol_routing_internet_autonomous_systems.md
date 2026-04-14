### BGP (Border Gateway Protocol)

**What BGP does:**
- The routing protocol of the internet
- Routes traffic between Autonomous Systems (AS) — ISPs, cloud providers, large networks
- Path-vector protocol: routers share reachability info for IP prefixes
- Port 179 (TCP)

**How BGP works:**
```
AS 1 (ISP A) ←BGP→ AS 2 (ISP B) ←BGP→ AS 3 (AWS)
     |                    |                   |
 Knows: "10.0.0.0/8       Knows: "I can       Knows: "172.16.0.0/12
 is reachable through      reach both          is here"
 AS 2 → AS 3"             AS 1 and AS 3"
```

**Why developers should know BGP:**
- **AWS Direct Connect**: uses BGP to exchange routes between your network and AWS
- **Multi-cloud**: BGP routes between AWS and GCP/Azure
- **DDoS mitigation**: BGP-based traffic redirection (Cloudflare, AWS Shield)
- **Outages**: BGP misconfigurations cause internet outages (Facebook 2021, ~6 hours)
- **Route leaks**: misconfigured BGP can redirect traffic through wrong networks

**BGP in cloud (AWS):**
```
Corporate Data Center ←BGP over Direct Connect→ AWS VPC
  AS 65000                                        AS 64512

Your router advertises: "10.1.0.0/16 is at AS 65000"
AWS advertises: "172.31.0.0/16 is at AS 64512"
Both sides learn routes dynamically
```

**eBGP vs iBGP:**
| Type | Between | Use case |
|------|---------|----------|
| eBGP (external) | Different AS | Internet routing, ISP peering |
| iBGP (internal) | Same AS | Distributing external routes within your network |

**BGP vs OSPF:**
| Feature | BGP | OSPF |
|---------|-----|------|
| Scope | Inter-AS (internet) | Intra-AS (within your network) |
| Type | Path-vector | Link-state |
| Scale | Internet-scale | Thousands of routers |
| Metric | AS path, policies | Shortest path (cost) |
| Convergence | Slow (minutes) | Fast (seconds) |

**Rule of thumb:** BGP is the internet's routing protocol — you won't configure it directly unless working on network infrastructure. Know it exists for: Direct Connect, multi-cloud networking, understanding internet outages. OSPF for internal routing, BGP for external. BGP misconfigurations cause real outages — the Facebook 2021 incident is a famous example.
