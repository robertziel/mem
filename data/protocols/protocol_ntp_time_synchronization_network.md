### NTP (Network Time Protocol)

**What NTP does:**
- Synchronizes clocks across computers on a network
- Accuracy: typically within milliseconds over the internet
- Critical for: logging, certificates (TLS), Kerberos auth, distributed systems, cron jobs

**Why time sync matters in IT:**
| System | Time sensitivity | What breaks if clocks drift |
|--------|-----------------|---------------------------|
| TLS certificates | Seconds | Certificate validation fails |
| Kerberos auth | 5 minutes | Authentication rejected |
| Distributed DBs | Milliseconds | Ordering/consistency issues |
| Log correlation | Seconds | Can't correlate events across servers |
| Cron jobs | Seconds | Jobs fire at wrong times |
| Make/build tools | Seconds | File timestamps wrong, rebuild issues |

**How NTP works:**
```
[Stratum 0] — Atomic clocks, GPS receivers (reference clocks)
      ↓
[Stratum 1] — NTP servers directly connected to Stratum 0
      ↓
[Stratum 2] — NTP servers syncing from Stratum 1
      ↓
[Your server] — Syncs from Stratum 2 or 3 servers
```
- Client queries multiple NTP servers
- Calculates round-trip delay and clock offset
- Gradually adjusts clock (slewing) to avoid jumps

**Configuration:**
```bash
# chrony (modern, recommended for Linux)
# /etc/chrony.conf
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 169.254.169.123 prefer  # AWS time sync service

# Check sync status
chronyc tracking
chronyc sources

# systemd-timesyncd (simpler alternative)
timedatectl status
timedatectl set-ntp true
```

**Cloud time sync:**
| Cloud | Service | Address |
|-------|---------|---------|
| AWS | Amazon Time Sync | 169.254.169.123 |
| GCP | Google NTP | metadata.google.internal |
| Azure | Windows Time | time.windows.com |

**Rule of thumb:** Always enable NTP on every server (use chrony on Linux). Use your cloud provider's time sync service. Clock drift causes subtle, hard-to-debug issues in distributed systems. Time sync is infrastructure you never think about until it breaks.
