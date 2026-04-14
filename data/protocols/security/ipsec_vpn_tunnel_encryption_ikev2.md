### IPsec & VPN (Virtual Private Network)

**What IPsec does:**
- Secure IP communication by encrypting and authenticating packets at the network layer
- Used for: site-to-site VPN, remote access VPN, network-level encryption
- Works at Layer 3 (network) — transparent to applications

**IPsec modes:**
| Mode | Encrypts | Use case |
|------|----------|----------|
| Transport | Only payload (header visible) | Host-to-host encryption |
| Tunnel | Entire packet (wrapped in new header) | Site-to-site VPN (standard) |

**IPsec protocols:**
| Protocol | Purpose |
|----------|---------|
| IKE (Internet Key Exchange) | Negotiate encryption keys and parameters |
| AH (Authentication Header) | Integrity + authentication (no encryption) |
| ESP (Encapsulating Security Payload) | Encryption + integrity + authentication |

**IKEv2 (modern key exchange):**
```
Phase 1: Establish secure channel between VPN peers (IKE SA)
Phase 2: Negotiate IPsec tunnel parameters (IPsec SA)
Result:  Encrypted tunnel between two endpoints
```

**AWS Site-to-Site VPN:**
```
[Corporate Office] ←IPsec tunnel→ [AWS VPN Gateway] → [VPC]

Two tunnels for redundancy (different AZs)
Supports: static routing or BGP dynamic routing
Bandwidth: up to 1.25 Gbps per tunnel
```

**WireGuard (modern VPN alternative):**
| Feature | IPsec | WireGuard | OpenVPN |
|---------|-------|-----------|---------|
| Complexity | High (many options) | Low (~4000 lines of code) | Medium |
| Performance | Good | Excellent (kernel-level) | Good |
| Setup | Complex config | Simple key exchange | Medium |
| Roaming | Poor | Excellent (handles IP changes) | Poor |
| Port | UDP 500, 4500 | UDP 51820 | UDP 1194 or TCP 443 |
| Encryption | Configurable (many ciphers) | Fixed (ChaCha20, Curve25519) | Configurable |

**VPN types:**
| Type | Connects | Use case |
|------|----------|----------|
| Site-to-Site | Office ↔ Cloud/Office | Connect corporate networks |
| Remote Access | Laptop → Corporate network | Work from home |
| Mesh VPN | Every node ↔ every node | Distributed teams (Tailscale, Nebula) |

**Modern alternatives to traditional VPN:**
- **Tailscale**: WireGuard-based mesh VPN, zero-config, identity-based
- **Cloudflare WARP/Zero Trust**: replace VPN with per-app access
- **AWS Client VPN**: managed OpenVPN-based remote access
- **Zero Trust Network Access (ZTNA)**: authenticate per request, not per network

**Rule of thumb:** IPsec for site-to-site VPN (AWS, corporate). WireGuard for modern, simple VPN (better performance, simpler config). Tailscale for team mesh VPN. Zero Trust (ZTNA) is replacing traditional VPN — authenticate per-app, not per-network.
