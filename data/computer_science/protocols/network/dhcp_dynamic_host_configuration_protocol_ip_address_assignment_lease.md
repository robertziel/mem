### DHCP — Dynamic Host Configuration Protocol

**Definition:** **DHCP** automatically assigns IP addresses (and other network config) to devices joining a network. Eliminates manual IP configuration. Devices "discover" a server via broadcast and receive an IP, subnet mask, gateway, DNS, and lease duration via the **DORA** four-step exchange.

**Protocol essentials:**

| Property | Detail |
|---|---|
| Layer | Application (over UDP) |
| Ports | **67** (server), **68** (client) |
| Transport | UDP (broadcast) |
| Used for | IPv4 assignment + config |
| IPv6 equivalent | DHCPv6 (or SLAAC) |

**DORA — the four-step exchange:**

```
   Client                                DHCP Server
     │                                        │
     │ 1. DISCOVER (broadcast)                │
     │    "Anyone have an IP for me?"          │
     │ ──────────────────────────────────────►│
     │                                        │
     │ 2. OFFER                               │
     │    "Take 10.0.1.50 for 24 hours"        │
     │ ◄──────────────────────────────────────│
     │                                        │
     │ 3. REQUEST (broadcast)                 │
     │    "I'll take 10.0.1.50 from server X"  │
     │ ──────────────────────────────────────►│
     │                                        │
     │ 4. ACK                                  │
     │    "10.0.1.50 is yours, lease 24h"      │
     │ ◄──────────────────────────────────────│
```

**Why broadcast for steps 1 and 3:**

| Step | Why broadcast |
|---|---|
| DISCOVER | Client has no IP yet; doesn't know servers |
| REQUEST | Multiple servers might offer; broadcast tells all "I picked X" |
| OFFER / ACK | Server has client's MAC, can unicast (but often broadcast still) |

**What DHCP provides:**

| Parameter | Example | Purpose |
|---|---|---|
| **IP address** | `10.0.1.50` | Device's network address |
| **Subnet mask** | `255.255.255.0` (`/24`) | Network boundary |
| **Default gateway** | `10.0.1.1` | Router for external traffic |
| **DNS servers** | `10.0.1.2`, `8.8.8.8` | Name resolution |
| **NTP servers** | `pool.ntp.org` | Time sync |
| **Domain name** | `corp.example.com` | Search domain |
| **Lease time** | `86400` seconds (24 h) | How long the IP is valid |
| **MTU** | `1500` | Packet size |

**Lease lifecycle:**

| Phase | When | Behavior |
|---|---|---|
| Lease granted | T+0 | Client active |
| **T1 renewal** | 50% of lease | Client unicasts REQUEST to original server |
| **T2 renewal** | 87.5% of lease | If T1 failed, broadcast REQUEST |
| Lease expires | 100% | If renewals failed, restart DORA |
| Release | Voluntary | Client sends RELEASE before disconnect |

**Lease duration trade-offs:**

| Lease length | Pros | Cons |
|---|---|---|
| Short (15 min – 1 hr) | Reclaim IPs fast (guest WiFi) | More DHCP traffic |
| Medium (24 hr) | Balance | Default for many networks |
| Long (7+ days) | Less DHCP traffic | Slower IP reclamation |

**Static IP vs DHCP:**

| Property | **DHCP** | **Static** |
|---|---|---|
| Configuration | Automatic | Manual |
| IP changes | May change on renewal | Never |
| Management | Centralized | Error-prone at scale |
| Use for | Workstations, phones, laptops | Servers, printers, network devices |
| DHCP reservation | Same IP for known MAC | Static-like via DHCP |

**DHCP reservation — best of both:**

| Property | Detail |
|---|---|
| Bind specific IP to MAC address | Server-side config |
| Behaves like static for that device | But managed centrally |
| Easy to change at server | No on-device touch |
| Use for | Servers, printers — get same IP, but managed |

**DHCP relay agent:**

| Concept | Detail |
|---|---|
| DHCP uses broadcast | Doesn't cross routers |
| Relay agent forwards DHCP | Across subnet boundaries |
| Common in enterprise | One DHCP server for many subnets |
| Cisco / Linux: `ip helper-address` | Configure on router |

**DHCP options (extended config):**

| Option | Use |
|---|---|
| Option 1 | Subnet mask |
| Option 3 | Default gateway |
| Option 6 | DNS servers |
| Option 12 | Hostname |
| Option 15 | Domain name |
| Option 42 | NTP server |
| Option 51 | Lease time |
| Option 66 | TFTP server (PXE boot) |
| Option 67 | Boot file (PXE boot) |
| Option 121 | Classless static routes |

**In cloud (AWS VPC):**

| Property | Detail |
|---|---|
| DHCP handled automatically | No configure |
| Each VPC has DHCP options set | DNS, NTP servers |
| EC2 gets private IP via DHCP on launch | Single source of truth |
| **Elastic IP** | Static public IP (not DHCP) |
| **Custom DHCP options set** | Configure custom DNS, domain |
| Default | AmazonProvidedDNS + amazonaws.com search |

**Common debugging commands:**

```bash
# Linux
dhclient -v eth0           # request a new lease (verbose)
ip addr show eth0          # see assigned IP
cat /var/lib/dhcp/dhclient.leases   # lease history
journalctl -u systemd-networkd      # systemd-networkd logs

# macOS
sudo ipconfig getpacket en0   # show DHCP packet
sudo ipconfig set en0 BOOTP DHCP   # renew

# Windows
ipconfig /release
ipconfig /renew
ipconfig /all
```

**DHCP server software:**

| Software | Detail |
|---|---|
| **ISC DHCP / Kea** | Reference implementations |
| **dnsmasq** | Lightweight, common on home routers |
| **Microsoft DHCP Server** | Windows Server |
| **Cisco / Juniper / pfSense** | Network appliance |
| **AWS VPC** | Managed |
| **Linux NetworkManager** | Workstation |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| DHCP exhaustion attack | Malicious client requests all IPs (rogue DHCP defense) |
| Rogue DHCP server | Wrong DNS / gateway → MITM |
| No DHCP relay across subnets | Can't reach server |
| Too-short lease on busy network | Constant renewals burn CPU |
| Unmanaged DHCP overlap | Two servers, conflicting offers |
| Forgetting reservation table | Server reboots → reservations lost (if not persisted) |
| Ignoring lease pool size | Run out of IPs |

**Security considerations:**

| Concern | Defense |
|---|---|
| Rogue DHCP | DHCP snooping on switch |
| Starvation attack | Limit per-MAC requests |
| Fake servers (untrusted port) | DHCP authentication (rarely deployed) |
| MITM via wrong DNS | Use DoH / DoT for DNS sensitivity |
| Spoofed MAC | DHCP doesn't verify MAC |

**IPv6 alternatives:**

| Mechanism | Detail |
|---|---|
| **SLAAC** (Stateless Address Autoconfiguration) | Device generates own IP from prefix + MAC |
| **DHCPv6** | Stateful assignment (similar to DHCPv4) |
| **DHCPv6-PD** | Prefix delegation (router gets a /60 to subdivide) |
| Often combined | SLAAC + DHCPv6 for DNS |

**Cross-references:**

- TCP / IP / UDP fundamentals: [tcp_ip_*.md](../../devops/networking/tcp_ip_udp.md)
- DNS resolution: [dns_*.md](dns_resolution_a_aaaa_cname_mx_records.md)
- VPC + subnets: [vpc_subnets_*.md](../../devops/networking/vpc_subnets_security_groups.md)
- AWS VPC: [aws_vpc_*.md](../../devops/cloud_aws/aws_vpc_subnets_nat_gateway_peering_transit_gateway.md)

**Rule of thumb:** **DHCP for end-user devices** (workstations, phones, IoT — automatic, zero-touch). **Static IPs (or DHCP reservations) for servers and infrastructure**. Understanding **DORA** helps debug "no IP" connectivity issues. In **cloud environments**, DHCP is **managed by the platform** — focus on subnet sizing and DHCP options sets.
