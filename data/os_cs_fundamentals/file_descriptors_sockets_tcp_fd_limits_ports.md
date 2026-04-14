### File Descriptors and Sockets

**File descriptors (FD):**
- Integer handle representing an open I/O resource in Unix
- Everything is a file: regular files, sockets, pipes, devices
- Default FDs: 0 = stdin, 1 = stdout, 2 = stderr

**FD limits:**
```bash
ulimit -n              # per-process soft limit (default often 1024)
ulimit -n 65536        # increase for current shell
cat /proc/sys/fs/file-max   # system-wide limit
```
- Each TCP connection = one FD
- Web server with 10K connections needs FD limit > 10K
- Hit the limit = "Too many open files" error

**Socket:**
- Endpoint for network communication
- Identified by: (protocol, local IP, local port, remote IP, remote port)

**TCP socket lifecycle (server):**
```
socket()    -> create socket
bind()      -> assign IP:port
listen()    -> mark as passive (accept connections)
accept()    -> block until client connects, return new FD for connection
read/write  -> exchange data
close()     -> terminate connection
```

**TCP socket lifecycle (client):**
```
socket()    -> create socket
connect()   -> establish connection (3-way handshake)
read/write  -> exchange data
close()     -> terminate connection (4-way teardown)
```

**Socket states:**
```
Client                          Server
SYN_SENT    ---SYN--->
            <--SYN+ACK---      SYN_RECEIVED
ESTABLISHED ---ACK--->         ESTABLISHED
            <--data-->
FIN_WAIT_1  ---FIN--->
            <--ACK---          CLOSE_WAIT
FIN_WAIT_2
            <--FIN---          LAST_ACK
TIME_WAIT   ---ACK--->         CLOSED
(wait 2*MSL)
CLOSED
```

**TIME_WAIT:**
- Socket stays in TIME_WAIT for 2 * MSL (~60 seconds)
- Prevents delayed packets from old connection being misinterpreted
- Problem: high-traffic server can exhaust ports
- Mitigation: `net.ipv4.tcp_tw_reuse = 1` (safe for clients)

**Ephemeral ports:**
- OS assigns temporary source port for outgoing connections
- Range: typically 32768-60999 (Linux)
- Limit: ~28K concurrent outgoing connections per destination IP
- Monitor: `ss -s` or `netstat -an | grep TIME_WAIT | wc -l`

**Useful commands:**
```bash
ss -tlnp              # listening TCP sockets with process
ss -tanp              # all TCP connections
lsof -i :8080         # who is using port 8080
lsof -p PID           # all FDs for a process
cat /proc/PID/fd      # FDs of a process (Linux)
```

**Connection pooling:**
- Reuse established connections (avoid handshake overhead)
- HTTP keep-alive, database connection pools (PgBouncer)
- Limit max connections to prevent FD exhaustion

**Rule of thumb:** Increase FD limits for servers handling many connections (`ulimit -n 65536`). Monitor TIME_WAIT count on high-traffic servers. Use connection pooling to reuse connections. Every connection costs a file descriptor.
