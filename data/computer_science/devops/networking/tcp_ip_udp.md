### TCP / IP / UDP — Transport Fundamentals

**Definition:** the **transport layer** of the Internet. **TCP** is connection-oriented, reliable, ordered — what HTTP, SSH, and databases run on. **UDP** is connectionless, unreliable, low-overhead — what DNS, video streaming, and gaming use. **IP** is the layer below both.

**TCP/IP stack — four layers:**

| Layer | Protocols | Concerns |
|---|---|---|
| **Application** | HTTP, SSH, DNS, SMTP, FTP | What you talk |
| **Transport** | TCP, UDP, QUIC | Reliable / unreliable delivery |
| **Network / Internet** | IP (IPv4, IPv6), ICMP | Routing across networks |
| **Link / Data Link** | Ethernet, Wi-Fi, ARP, MAC | Physical / local |

**TCP — connection-oriented + reliable:**

| Property | Detail |
|---|---|
| **3-way handshake** | SYN → SYN-ACK → ACK before data flows |
| **Reliability** | Retransmits lost packets, ordered delivery |
| **Flow control** | Sliding window; receiver advertises buffer |
| **Congestion control** | Slow start, congestion avoidance, fast retransmit |
| **Stream-oriented** | Bytes (not packets); app reassembles |
| **Connection state** | Maintained at both ends |
| **Used by** | HTTP, HTTPS, SSH, FTP, SMTP, databases |

**UDP — connectionless + best-effort:**

| Property | Detail |
|---|---|
| **No handshake** | Send and forget |
| **No reliability** | Packets may drop, duplicate, reorder |
| **Low overhead** | 8-byte header (vs TCP's 20+) |
| **Datagram-oriented** | Discrete packets |
| **Faster** | No congestion control overhead |
| **Used by** | DNS, video streaming, gaming, VoIP, DHCP, NTP, QUIC |

**TCP vs UDP — side by side:**

| Feature | **TCP** | **UDP** |
|---|---|---|
| Connection | 3-way handshake first | None — fire and forget |
| Reliability | **Guaranteed** | Best-effort |
| Ordering | Yes | No |
| Speed | Slower | Faster |
| Header overhead | 20–60 bytes | 8 bytes |
| Congestion control | Yes | No |
| Use case | Web, API, DB, file transfer | DNS, streaming, gaming, VoIP |
| Multicast | No | Yes |

**TCP 3-way handshake:**

```
   Client                    Server
     │                        │
     │  SYN (seq=x)           │
     │ ─────────────────────►│
     │                        │
     │  SYN-ACK (seq=y, ack=x+1)│
     │ ◄─────────────────────│
     │                        │
     │  ACK (ack=y+1)         │
     │ ─────────────────────►│
     │                        │
     │  Data flows...         │
```

**TCP state machine — common states:**

| State | Detail |
|---|---|
| `LISTEN` | Server waiting for connections |
| `SYN_SENT` | Client sent SYN |
| `SYN_RECEIVED` | Server got SYN, sent SYN-ACK |
| `ESTABLISHED` | Connection up, data flowing |
| `FIN_WAIT_1/2` | Closing initiator side |
| `CLOSE_WAIT` | Other side wants to close |
| `TIME_WAIT` | Wait 2× MSL after close (catch late packets) |
| `CLOSED` | No connection |

**TCP congestion control — algorithms:**

| Algorithm | Detail |
|---|---|
| **Slow start** | Exponential growth until threshold |
| **Congestion avoidance** | Linear growth past threshold |
| **Fast retransmit** | Resend on 3 duplicate ACKs |
| **Fast recovery** | Halve cwnd, then linear (don't restart slow start) |
| **CUBIC** | Default in Linux since 2005 |
| **BBR** (Google) | Bottleneck Bandwidth + RTT — modern, low-latency |

**Ports:**

| Range | Use |
|---|---|
| **0–1023** | Well-known (root-only on Linux) |
| **1024–49151** | Registered |
| **49152–65535** | Ephemeral (client-side, OS-assigned) |

**Common well-known ports:**

| Port | Service |
|---|---|
| 22 | SSH |
| 25 | SMTP |
| 53 | DNS (UDP + TCP) |
| 80 | HTTP |
| 443 | HTTPS / QUIC (HTTP/3) |
| 587 | SMTP (submission) |
| 3306 | MySQL |
| 5432 | Postgres |
| 6379 | Redis |
| 8080 | HTTP alt |
| 9092 | Kafka |
| 27017 | MongoDB |

**Sockets and addressing:**

| Concept | Detail |
|---|---|
| **Socket** | (IP + port) — endpoint identifier |
| **TCP connection** | Tuple: (src IP, src port, dst IP, dst port) |
| **5-tuple** | Above + protocol |
| **Listening socket** | (0.0.0.0:80) — accept any source |
| **Connected socket** | Both endpoints filled |

**MTU (Maximum Transmission Unit):**

| Network | Typical MTU |
|---|---|
| Ethernet | 1500 bytes |
| Jumbo frames | 9000 bytes |
| PPPoE / DSL | 1492 bytes |
| Internet "safe" | 1280 (IPv6 minimum) |
| **MSS** (max segment size) | MTU - 40 (TCP/IP headers) |
| Path MTU discovery | ICMP-based, often broken |

**IP — IPv4 vs IPv6:**

| Property | IPv4 | IPv6 |
|---|---|---|
| Address space | 4.3 billion | 3.4 × 10^38 |
| Address format | 32-bit (192.168.1.1) | 128-bit (2001:db8::1) |
| NAT | Common | Less needed (huge address space) |
| Header | Variable | Fixed 40 bytes |
| Auto-config | DHCP usually | SLAAC built-in |
| Adoption | Dominant | Growing (~40% global) |

**Common IPv4 ranges:**

| Range | Use |
|---|---|
| `10.0.0.0/8` | Private (RFC 1918) |
| `172.16.0.0/12` | Private |
| `192.168.0.0/16` | Private |
| `127.0.0.0/8` | Loopback |
| `169.254.0.0/16` | Link-local |
| `224.0.0.0/4` | Multicast |
| `100.64.0.0/10` | CGNAT (carrier-grade) |

**Diagnostic tools:**

| Tool | What |
|---|---|
| `ping` | ICMP echo |
| `traceroute` / `tracert` | Hop-by-hop |
| `mtr` | Continuous traceroute |
| `dig` / `nslookup` | DNS resolution |
| `ss` / `netstat` | Active connections |
| `tcpdump` | Packet capture |
| `Wireshark` | Visual packet analyzer |
| `nmap` | Port scanning |
| `nc` (netcat) | Manual TCP/UDP testing |
| `iperf3` | Bandwidth testing |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `TIME_WAIT` accumulating on server | Run out of ephemeral ports |
| Disabling Nagle's algorithm carelessly | More small packets |
| Path MTU black holes (ICMP blocked) | Stuck connections |
| TCP reset (RST) confused for clean close | Different semantics |
| UDP for "important" traffic without app-level reliability | Data loss |
| Assuming IPv4-only | Increasingly broken |
| Ignoring `SO_REUSEADDR` | "Address already in use" after restart |
| `listen` backlog too small | New connections refused |

**Modern transport — QUIC + HTTP/3:**

| Property | Detail |
|---|---|
| Built on UDP | Yes |
| Always encrypted (TLS 1.3) | Yes |
| Independent streams | No head-of-line blocking |
| Connection migration | Survives WiFi → cellular |
| 1-RTT or 0-RTT handshake | Faster than TCP+TLS |
| Used for HTTP/3 | Increasingly default |

**Cross-references:**

- HTTP / HTTPS / TLS: [tls_*.md](../../web_security/tls_https_cipher_suites_certificate_validation.md)
- QUIC / HTTP/3: [quic_http3_*.md](../../protocols/network/quic_http3_http_udp_multiplexing_zero_rtt.md)
- DNS resolution: [dns_*.md](../../protocols/network/dns_resolution_a_aaaa_cname_mx_records.md)
- Network performance: [network_performance_*.md](network_performance_latency_throughput_packet_loss.md)

**Rule of thumb:** **TCP for reliable delivery (web, APIs, DBs); UDP for speed-over-reliability (DNS, streaming, gaming).** Most DevOps and app work is TCP-based. **QUIC + HTTP/3** is replacing TCP for HTTP — built on UDP but adds reliability + always-on TLS + connection migration. Know `tcpdump`, `ss`, `dig`, `traceroute` for debugging.
