### File Descriptors, Sockets, TCP — FD Limits, Ports, TIME_WAIT

**File descriptor (FD):** integer handle for any open I/O resource in Unix. "Everything is a file" — regular files, sockets, pipes, devices, signalfd, eventfd.

| FD | Default |
|---|---|
| 0 | `stdin` |
| 1 | `stdout` |
| 2 | `stderr` |
| 3+ | First open file/socket/etc. |

**FD limits — three layers:**

| Layer | Where | Check / set |
|---|---|---|
| Per-process soft limit | shell / systemd unit | `ulimit -n` (read), `ulimit -n 65536` (set) — limited by hard limit |
| Per-process hard limit | kernel | `ulimit -Hn` |
| System-wide | kernel | `cat /proc/sys/fs/file-max` (read) — `sysctl -w fs.file-max=2097152` |
| Per-user | `/etc/security/limits.conf` (PAM) | `* soft nofile 65536` |
| systemd unit | service file | `LimitNOFILE=1048576` |

> "Too many open files" = you hit one of the three. Almost always the per-process soft limit.

**Each network connection = one FD on each side.** A web server with 10 K concurrent connections needs `nofile` ≥ 10 K + headroom for files, sockets to backends, log handles, etc.

**Socket — what identifies it:**

| Field | Notes |
|---|---|
| Protocol | TCP / UDP / SCTP |
| Local IP | The interface bound to |
| Local port | 1–65535; < 1024 needs root |
| Remote IP | Peer (for connected sockets) |
| Remote port | Peer port |

A unique TCP connection is the **5-tuple** (protocol, local IP, local port, remote IP, remote port).

**TCP socket lifecycle:**

| Server | Client |
|---|---|
| `socket()` — create | `socket()` — create |
| `bind()` — assign IP:port | — |
| `listen()` — mark passive | — |
| `accept()` — blocks; returns new FD | `connect()` — 3-way handshake |
| `read/write` | `read/write` |
| `close()` | `close()` (4-way teardown) |

**TCP state machine (the parts that bite in production):**

```
Client                                     Server
   │ SYN ───────────────────►
   │                          ◄────── SYN_RCVD
   │ ESTABLISHED ◄── SYN+ACK
   │ ACK ─────────────────►       ESTABLISHED
   │     data ◄───►
   │ FIN ─────────────────►
   │ FIN_WAIT_1                    CLOSE_WAIT
   │           ◄── ACK
   │ FIN_WAIT_2
   │           ◄── FIN             LAST_ACK
   │ ACK ─────────────────►            CLOSED
   │ TIME_WAIT  (2 × MSL)
   │ CLOSED
```

**States that show up in `ss` / `netstat`:**

| State | Meaning | What to do if many |
|---|---|---|
| `LISTEN` | Server waiting for connections | Normal |
| `ESTABLISHED` | Active connection | Normal |
| `SYN_SENT` | Client waiting for SYN+ACK | Slow remote / firewall |
| `SYN_RECV` | Server got SYN, waiting for ACK | SYN flood / no completion → tune `tcp_synack_retries` |
| `FIN_WAIT_1` / `FIN_WAIT_2` | Closing — waiting for peer | Slow peer; check app-side `close()` discipline |
| `CLOSE_WAIT` | **Peer closed; you didn't.** App leak — missing `close()` | Fix the app |
| `LAST_ACK` | You closed; waiting for final ACK | Brief; if many → peer slow |
| `TIME_WAIT` | Just closed, waiting 2 × MSL | High count on busy clients/proxies — see below |
| `CLOSED` | Done | Normal |

**TIME_WAIT — what and why:**

| Property | Detail |
|---|---|
| Duration | 2 × MSL ≈ 60 s on Linux (`tcp_fin_timeout` is misnamed for this) |
| Purpose | Catch delayed packets from the dying connection so they don't poison a fresh one with the same 5-tuple |
| Pain | Each TIME_WAIT pins a 5-tuple; on the **client side** it can exhaust ephemeral ports |
| Mitigation (client) | `net.ipv4.tcp_tw_reuse=1` — safe; lets new connections reuse a TIME_WAIT socket whose 4-tuple won't collide |
| ~~Mitigation~~ | `tcp_tw_recycle` — **removed in Linux 4.12**; was unsafe behind NAT, don't enable on older kernels |
| Best fix | Connection pooling — reuse keep-alive connections instead of opening fresh ones |

**Ephemeral ports — the limit that surprises clients:**

| Property | Default (Linux) |
|---|---|
| Range | 32768–60999 |
| Tunable | `sysctl net.ipv4.ip_local_port_range="1024 65535"` |
| Limit | **Per-(local IP, remote IP, remote port) tuple**, not per machine |
| Practical max | ~28 K concurrent connections to **one** remote IP:port from one local IP |
| Ways past it | More client IPs, more dest IPs/ports, connection pooling, `SO_REUSEPORT`/`SO_REUSEADDR` for the right scenarios |

**SYN backlog & accept queue:**

| Queue | Holds | Knob |
|---|---|---|
| SYN queue (incomplete handshakes) | Half-open conns waiting for ACK | `sysctl net.ipv4.tcp_max_syn_backlog` |
| Accept queue (completed, awaiting `accept()`) | Conns ready for the app | `listen(fd, backlog)` argument + `sysctl net.core.somaxconn` |
| Drops here look like | Slow `accept()` loops, undersized backlog | Increase `somaxconn` to 1024–8192 for busy servers |

**Useful commands:**

| Goal | Command |
|---|---|
| Listening TCP sockets with PID | `ss -tlnp` |
| All TCP connections | `ss -tanp` |
| Per-state summary | `ss -s` |
| Who holds port 8080 | `lsof -i :8080` |
| All FDs for a process | `lsof -p <PID>` |
| Same on Linux without lsof | `ls -l /proc/<PID>/fd` |
| Live FD count | `ls /proc/<PID>/fd \| wc -l` |
| TIME_WAIT count | `ss -tan state time-wait \| wc -l` |
| TCP retransmit / drop counters | `nstat -az \| grep -i retrans` |
| Port range | `sysctl net.ipv4.ip_local_port_range` |

**Common production problems and fixes:**

| Symptom | Likely cause | Fix |
|---|---|---|
| `EMFILE: too many open files` | Per-process FD limit | `ulimit -n` / `LimitNOFILE` |
| `ENFILE` | System-wide FD limit | `fs.file-max` |
| Many `CLOSE_WAIT` on app | App not calling `close()` after peer FIN | App bug — missing close in error path |
| Many `TIME_WAIT` on busy client | High connection churn | Connection pool / keep-alive; `tcp_tw_reuse=1` |
| `Cannot assign requested address` | Ephemeral port exhaustion | Pool, multiple source IPs, widen port range |
| `SYN flood` (many `SYN_RECV`) | Real flood OR backlog too small | `tcp_syncookies=1`, tune `tcp_max_syn_backlog`, `somaxconn` |
| Slow accepts | Accept queue overflowing | Increase `somaxconn` + `listen()` backlog |
| HTTP keep-alive not working | Proxy / LB stripping headers | Verify `Connection: keep-alive` end-to-end |

**Connection pooling — the universal fix:**

| Pool | Avoids |
|---|---|
| HTTP keep-alive | TCP handshake, TLS handshake, slow start, TIME_WAIT |
| DB connection pool (PgBouncer, RDS Proxy) | Per-request DB auth, connection-limit pressure |
| Sidekiq / app DB pool | Idle connections during low traffic |
| gRPC channel reuse | Same as HTTP keep-alive but for HTTP/2 streams |

**Per-FD memory cost (rough):**

| Resource | Roughly |
|---|---|
| TCP socket buffers | 16–256 KB per direction (`net.ipv4.tcp_rmem` / `tcp_wmem`) |
| Kernel struct sock | A few KB |
| App-side buffer | App-dependent |

> 1 M connections × few hundred KB each = serious RAM. Tune `tcp_rmem` / `tcp_wmem` for high-conn-count servers.

**Why FDs vs `select()` matters:**

| API | Scales with |
|---|---|
| `select` | O(N) on every call; FD set capped at `FD_SETSIZE` |
| `poll` | O(N) per call, no hard cap |
| **`epoll` (Linux)** / `kqueue` (BSD/macOS) / `IOCP` (Windows) | O(1) per event — what production servers use |
| `io_uring` (Linux 5.1+) | Async submission queue; lowest syscall overhead |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Setting `ulimit -n` in shell only | systemd units don't inherit shell limits — set `LimitNOFILE` in unit |
| Using `tcp_tw_recycle=1` (deleted in 4.12, was unsafe behind NAT) | Drops legit connections from NAT'd clients |
| Not closing FDs on error paths | `CLOSE_WAIT` pile-up |
| One DB connection per request, no pool | Hits both DB max-conn and ephemeral-port limit |
| Same `SO_REUSEADDR` confusion as `SO_REUSEPORT` | Read the man page — they're different |
| Forgetting accept-queue tuning | Drops under burst even with plenty of FDs |

**Rule of thumb:** **every TCP connection costs one FD per side.** Set per-process FD limit (`ulimit -n` / `LimitNOFILE`) **and** system-wide `fs.file-max` together. **Connection pooling fixes most port / TIME_WAIT pain.** **`epoll`/`kqueue`/`io_uring` over `select`/`poll`** for any server above thousands of connections. Many `CLOSE_WAIT` = your app forgot to `close()`. Many `TIME_WAIT` on a client = no keep-alive / no pool.
