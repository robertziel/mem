### TCP/IP, UDP

**TCP (Transmission Control Protocol):**
- Connection-oriented (3-way handshake: SYN -> SYN-ACK -> ACK)
- Reliable delivery: ordering, retransmission, flow control
- Congestion control (slow start, congestion avoidance)
- Used for: HTTP, SSH, databases, file transfer

**UDP (User Datagram Protocol):**
- Connectionless, no handshake
- No guaranteed delivery, ordering, or retransmission
- Low overhead, low latency
- Used for: DNS, video streaming, gaming, VoIP, DHCP

**TCP vs UDP:**
| Feature | TCP | UDP |
|---------|-----|-----|
| Connection | Established | None |
| Reliability | Guaranteed | Best effort |
| Ordering | Yes | No |
| Speed | Slower | Faster |
| Overhead | Higher | Lower |
| Use case | Web, API, DB | DNS, streaming |

**TCP/IP model layers:**
1. **Application** - HTTP, DNS, SSH, SMTP
2. **Transport** - TCP, UDP (ports)
3. **Network/Internet** - IP, ICMP, routing
4. **Link/Data Link** - Ethernet, ARP, MAC addresses

**Key concepts:**
- **Port** - 16-bit number identifying a service (0-65535)
- **Well-known ports** - 0-1023 (80=HTTP, 443=HTTPS, 22=SSH, 53=DNS)
- **Ephemeral ports** - 1024-65535 (client-side, OS-assigned)
- **Socket** - IP + port combination (e.g., 10.0.1.5:8080)
- **MTU** - Maximum Transmission Unit (usually 1500 bytes for Ethernet)

**Rule of thumb:** Use TCP when you need reliable delivery (APIs, databases). Use UDP when speed matters more than reliability (DNS, streaming). Most DevOps work is TCP-based.
