### ICMP (Internet Control Message Protocol)

**What ICMP does:**
- Network diagnostic and error reporting protocol
- Not for data transfer — for control messages between network devices
- Used by: ping, traceroute, "destination unreachable" errors
- Part of IP layer (no port numbers)

**Common ICMP message types:**
| Type | Name | Meaning |
|------|------|---------|
| 0 | Echo Reply | Response to ping |
| 3 | Destination Unreachable | Can't reach host/port/network |
| 5 | Redirect | Use a different route |
| 8 | Echo Request | Ping request |
| 11 | Time Exceeded | TTL expired (used by traceroute) |

**ping (ICMP Echo):**
```bash
ping -c 4 example.com
# PING example.com (93.184.216.34): 56 data bytes
# 64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=11.2 ms
# 64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=10.8 ms
# --- round-trip min/avg/max = 10.8/11.0/11.2 ms

# What it tells you:
# - Host is reachable
# - Round-trip time (latency)
# - Packet loss (if any replies missing)
# - TTL (how many hops)
```

**traceroute (ICMP Time Exceeded):**
```bash
traceroute example.com
# 1  router.local (10.0.1.1)  1.2 ms
# 2  isp-gw.net (203.0.113.1)  5.4 ms
# 3  cdn-edge.example.com (93.184.216.34)  11.0 ms

# Sends packets with increasing TTL (1, 2, 3, ...)
# Each router decrements TTL → when TTL=0, sends "Time Exceeded" back
# This reveals each hop in the path
```

**Troubleshooting with ICMP:**
| Symptom | Tool | Diagnosis |
|---------|------|-----------|
| "Is it up?" | `ping host` | Reachable? Latency? Packet loss? |
| "Where is it slow?" | `traceroute host` | Which hop has high latency? |
| "Is the port open?" | `ping` won't tell you | Use `telnet host port` or `nc -zv host port` |
| Ping works, app doesn't | — | Firewall blocking app port, not ICMP |
| Ping blocked | — | Many servers block ICMP (security); doesn't mean host is down |

**Security note:**
- Many firewalls block ICMP (especially Echo Request)
- AWS Security Groups: ICMP must be explicitly allowed
- Blocking ICMP can break Path MTU Discovery → fragmentation issues
- Best practice: allow ICMP from internal networks, block from public

**Rule of thumb:** ping for quick reachability check. traceroute to find where packets are getting stuck. ICMP can be blocked by firewalls — a failed ping doesn't always mean the host is down. Allow ICMP internally for diagnostics.
