### ARP — Address Resolution Protocol (IP ↔ MAC)

**What it does:** maps IPv4 addresses to MAC (hardware) addresses on a local subnet. Required because Ethernet frames are forwarded by switches based on MAC, not IP.

| Layer | Detail |
|---|---|
| Operates between | Layer 2 (Data Link) ↔ Layer 3 (Network) |
| Scope | A single broadcast domain (subnet) |
| EtherType | `0x0806` |
| IPv6 equivalent | NDP (Neighbor Discovery Protocol) over ICMPv6 |

**The four-step exchange:**

| Step | Action | Frame type |
|---|---|---|
| 1 | Host A wants to send to `10.0.1.50` but doesn't know its MAC | — |
| 2 | A broadcasts: "Who has `10.0.1.50`? Tell `10.0.1.10`" | ARP Request (`ff:ff:ff:ff:ff:ff` dest) |
| 3 | `10.0.1.50` replies: "I'm at `AA:BB:CC:DD:EE:FF`" | ARP Reply (unicast back to A) |
| 4 | A caches the mapping; subsequent frames go directly | Ethernet unicast |

**ARP cache (neighbor table):**

| Command | Use |
|---|---|
| `arp -a` (BSD/macOS) | Show all entries |
| `ip neigh show` (Linux modern) | Same |
| `arp -d 10.0.1.50` | Delete cached entry |
| Default expiry | ~20 min (varies by OS / config) |
| Static entry | `arp -s ip mac` — survives expiry |

**Same subnet vs cross-subnet:**

| Destination | ARP target | Why |
|---|---|---|
| Same subnet (`10.0.1.x`) | Destination's MAC directly | Frame can travel L2 to it |
| Different subnet (`10.0.2.x`) | **Default gateway's** MAC | Gateway routes the IP packet onward |

> Cross-subnet traffic always ARPs the **gateway**, then the gateway re-frames the packet with the next-hop MAC.

**ARP packet shape:**

| Field | Meaning |
|---|---|
| Hardware type | Ethernet = 1 |
| Protocol type | IPv4 = 0x0800 |
| Hardware addr length | 6 (MAC) |
| Protocol addr length | 4 (IPv4) |
| Opcode | 1 = request, 2 = reply, 3 = RARP request, 4 = RARP reply |
| Sender MAC + IP | Asker |
| Target MAC + IP | Asked-about |

**Variants & related protocols:**

| Protocol | Purpose |
|---|---|
| **ARP** | IPv4 → MAC |
| **Gratuitous ARP** (announcement) | "I have this IP" — used after DHCP, IP migration, or for failover |
| **Proxy ARP** | Router answers on behalf of another host (rare today) |
| **RARP** | MAC → IP (deprecated; replaced by DHCP / BOOTP) |
| **Inverse ARP (InARP)** | Frame Relay specific |
| **NDP** | IPv6 equivalent — uses ICMPv6 multicast |

**Gratuitous ARP — common uses:**

| Scenario | Detail |
|---|---|
| Host gets new IP | Broadcasts to update neighbors' caches |
| Failover (HA pair) | New active host announces it now owns the VIP |
| Spotting duplicate IPs | Reply to your own ARP confirms uniqueness |
| Software-defined networking | Updates after VM migration |

**ARP spoofing / poisoning (attack):**

| Attack | Detail |
|---|---|
| Mechanism | Attacker sends fake ARP replies: "10.0.1.1 (gateway) is at `ATTACKER_MAC`" |
| Effect | Traffic for the gateway goes to the attacker (man-in-the-middle) |
| Variant | Sequential or burst flooding to evict legitimate entries |
| Visibility | Hard — local traffic, no central log |
| Defenses | Static ARP entries for critical hosts; **Dynamic ARP Inspection (DAI)** on managed switches; per-port DHCP snooping; 802.1X NAC; segmentation |
| Detection tools | `arpwatch`, `arpalert`, IDS rules |
| At Layer 7 | TLS / HTTPS protects content even if ARP is poisoned |

**Cloud environments:**

| Concern | Detail |
|---|---|
| ARP is **abstracted** by virtual networking | AWS VPC, GCP VPC, Azure VNet handle L2 internally |
| You can't manipulate ARP tables on cloud VMs effectively | OS still has them; cloud overlay handles real delivery |
| Cross-AZ traffic | Routed at L3 in cloud overlays — no inter-AZ ARP |
| Floating IPs / VIP failover | Cloud APIs (Elastic IP move, AWS Network Load Balancer) replace gratuitous ARP |
| K8s pod networking | CNI plugin (Calico / Cilium / Flannel) handles L2/L3 internals — usually no ARP awareness needed |

**Diagnosing ARP issues (when on real networks):**

| Symptom | Likely cause |
|---|---|
| Can ping gateway but not beyond | Gateway routing issue, not ARP |
| Can't ping a host on same subnet | ARP failed; check MAC visibility, switch port state |
| Two hosts claim same IP | Duplicate IP — gratuitous ARP storm; check DHCP |
| `arp -a` shows `(incomplete)` | ARP request unanswered; firewall, host down, wrong subnet mask |
| `ping` works briefly then stops | ARP cache may have expired and re-resolution is failing intermittently |
| ARP entries flapping | ARP poisoning OR an HA failover loop |

**Useful checks:**

| Command | Purpose |
|---|---|
| `ip neigh show` | Linux ARP cache |
| `arp -a` | macOS / BSD ARP cache |
| `arp -d <ip>` | Flush specific entry |
| `tcpdump -ni <iface> arp` | Watch ARP traffic |
| `arping <ip>` | Force-ARP a host (Linux) |
| `ip link set <iface> arp off / on` | Disable/enable ARP per interface |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Stale ARP cache after host IP change | Connections fail until cache expires |
| Misconfigured subnet mask | Hosts ARP off-subnet IPs incorrectly |
| Same MAC on two machines (cloning) | ARP confusion → flapping connectivity |
| Gratuitous ARP rate-limited by some switches | Failover takes longer than expected |
| Trusting ARP for security | It's broadcast + unauthenticated — never security-critical |

**Cross-references:**

- TCP / TIME_WAIT / sockets: [file_descriptors_sockets_tcp_*.md](../../os_cs_fundamentals/file_descriptors_sockets_tcp_fd_limits_ports.md)
- Zero-trust networking (modern alternative to subnet-based trust): [zero_trust_network_security.md](../../devops/security/zero_trust_network_security.md)

**Rule of thumb:** **ARP maps IP → MAC inside one subnet**. Cross-subnet → ARP the **gateway's** MAC first. **Invisible in cloud** (overlay handles it). Useful real-world debug: "**can ping gateway but not beyond**" is routing, not ARP; "**can't ping same-subnet host**" usually IS ARP. Don't trust ARP for security — use TLS at the application layer.
