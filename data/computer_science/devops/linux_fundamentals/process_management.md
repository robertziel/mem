### Linux Process Management

**The hierarchy:**

| Concept | Detail |
|---|---|
| **PID** | Process ID — unique per process |
| **PPID** | Parent process ID |
| **PGID** | Process group ID (job control) |
| **SID** | Session ID |
| **UID / GID** | User / group |
| **`init`** (PID 1) | systemd / sysvinit / OpenRC — adopts orphans |

**Inspecting processes:**

| Command | Use |
|---|---|
| `ps aux` | Snapshot all processes — user, PID, %CPU, %MEM, command |
| `ps -ef` | Full-format with PPID column |
| `ps -ejH` | Process tree |
| `pstree -p` | Visual process tree with PIDs |
| `top` | Real-time (built-in) |
| `htop` | Real-time, friendlier |
| `btop` / `glances` | Modern alternatives |
| `pgrep -f nginx` | Find PIDs by name / pattern |
| `pgrep -u username` | By user |
| `pidof nginx` | Same idea, simpler |
| `lsof -p <PID>` | All files / sockets the process holds |
| `lsof -i :8080` | Who's using port 8080 |
| `ss -tlnp` / `netstat -tlnp` | Listening sockets with PID |
| `fuser /var/log/syslog` | Which process has this file open |
| `pmap <PID>` | Memory map |
| `strace -p <PID>` | Live syscall trace |
| `lsof +D /path` | Anything under this path |

**Signals — the standard set:**

| Signal | Number | Default | Use |
|---|---|---|---|
| `SIGHUP` | 1 | Terminate | Reload config (Nginx, sshd) |
| `SIGINT` | 2 | Terminate | Ctrl+C |
| `SIGQUIT` | 3 | Terminate + dump | Quit with core dump |
| `SIGKILL` | 9 | Kill (cannot be caught) | Force-kill, last resort |
| `SIGTERM` | 15 | Terminate (graceful) | **Default `kill`** — let app clean up |
| `SIGSTOP` | 19 | Stop (cannot be caught) | Pause |
| `SIGCONT` | 18 | Continue | Resume from stop |
| `SIGTSTP` | 20 | Stop | Ctrl+Z |
| `SIGUSR1` / `SIGUSR2` | 10 / 12 | Terminate | App-defined (e.g. log rotation) |
| `SIGCHLD` | 17 | Ignore | Child state change |
| `SIGPIPE` | 13 | Terminate | Wrote to closed pipe |

**Sending signals:**

| Command | Effect |
|---|---|
| `kill <PID>` | SIGTERM (default) |
| `kill -9 <PID>` | SIGKILL — can't be caught |
| `kill -HUP <PID>` | Reload config |
| `kill -USR1 <PID>` | App-specific (e.g., reopen log files) |
| `killall <name>` | Kill all by exact name |
| `pkill -f <pattern>` | Kill by pattern (full command line) |
| `pkill -u <user>` | Kill all of a user's processes |

**SIGTERM → SIGKILL discipline:**

| Step | Detail |
|---|---|
| 1 | `SIGTERM` first; let app do graceful shutdown |
| 2 | Wait grace period (10–30 s typical) |
| 3 | If still alive, `SIGKILL` |
| 4 | Always investigate why TERM didn't suffice |

> Many supervisors (systemd, K8s) do this dance for you (`TimeoutStopSec`, `terminationGracePeriodSeconds`).

**Process states (in `ps`):**

| Code | State | Meaning |
|---|---|---|
| `R` | Running | On CPU or runnable |
| `S` | Sleeping | Interruptible — waiting for an event |
| `D` | Uninterruptible sleep | Usually I/O (disk, NFS hang) — can't be killed cleanly |
| `T` | Stopped | Job control or debugger |
| `t` | Tracing stop | ptrace (debugger attached) |
| `Z` | Zombie | Terminated; parent hasn't `wait()`ed |
| `X` | Dead | Should never appear |
| `<` (modifier) | High priority | |
| `N` (modifier) | Low priority (niced) | |
| `s` (modifier) | Session leader | |
| `+` (modifier) | Foreground process group | |

**Zombies — the misunderstood state:**

| Concept | Detail |
|---|---|
| What | Process exited but parent hasn't reaped it |
| Resource cost | Tiny (just the PID + exit info) |
| Why bad | Pile-up exhausts the PID space; signals failure to handle SIGCHLD |
| Fix | Parent must `wait()` (or `waitpid()`); if parent dies, init reaps |
| Detect | `ps aux \| awk '$8 == "Z"'` or `top` Z column |

**Background / foreground / job control (shell-level):**

| Action | Command |
|---|---|
| Run in background | `cmd &` |
| Suspend foreground | `Ctrl+Z` |
| Resume in background | `bg` |
| Resume in foreground | `fg` (or `fg %1` for job 1) |
| List jobs | `jobs` |
| Survive terminal close | `nohup cmd &` (logs to `nohup.out`) |
| Detach from shell | `disown` (after `cmd &`) |
| Run inside `tmux` / `screen` | Persistent session, the modern answer |

**`nohup` vs `tmux` vs `systemd`:**

| Tool | Use |
|---|---|
| `nohup` | Quick "leave it running"; logs to `nohup.out`; minimal control |
| `tmux` / `screen` | Persistent shell session; reattach later; **best for interactive long-running** |
| `systemd` user/system unit | **Production services** — restart, logging, dependencies |
| `cron` / `systemd timers` | Scheduled jobs |
| `at` | One-shot future job |

**systemd basics:**

| Command | Use |
|---|---|
| `systemctl start \| stop \| restart \| status <svc>` | Control |
| `systemctl enable \| disable <svc>` | Auto-start on boot |
| `systemctl reload <svc>` | Reload config (sends SIGHUP if defined) |
| `systemctl daemon-reload` | After editing unit files |
| `systemctl list-units --type=service` | All services |
| `systemctl list-units --failed` | Just failed |
| `systemctl is-active <svc>` / `is-enabled` | Scriptable checks |
| `systemctl mask <svc>` | Prevent it from being started |
| `systemctl --user ...` | Per-user unit |
| `systemd-analyze blame` | Slow boot diagnosis |
| `systemd-cgls` / `systemd-cgtop` | Cgroup tree / live |

**Logs (journald):**

| Command | Use |
|---|---|
| `journalctl -u <svc>` | All logs for a service |
| `journalctl -u <svc> -f` | Follow live |
| `journalctl -u <svc> --since "1 hour ago"` | Time window |
| `journalctl -p err` | Priority filter (`emerg` / `alert` / `crit` / `err` / `warning` / `notice` / `info` / `debug`) |
| `journalctl -k` | Kernel only |
| `journalctl -b` | This boot |
| `journalctl --disk-usage` | Storage size |
| `journalctl --vacuum-size=2G` | Trim |

**Sample systemd unit:**

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My App
After=network.target

[Service]
Type=simple
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/bin/server
Restart=on-failure
RestartSec=5s
LimitNOFILE=65536
Environment=RACK_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

| Directive | Use |
|---|---|
| `Type` | `simple` (default), `forking`, `oneshot`, `notify`, `dbus` |
| `Restart` | `no` / `on-failure` / `always` / `on-abnormal` |
| `RestartSec` | Delay between restarts |
| `LimitNOFILE` | File descriptor limit |
| `Environment` | Env vars for the service |
| `User` / `Group` | Run as |
| `KillSignal` | Override default SIGTERM |
| `TimeoutStopSec` | Grace before SIGKILL |
| `WatchdogSec` | Restart if app doesn't ping watchdog |

**Resource limits — `ulimit` and friends:**

| Command | Use |
|---|---|
| `ulimit -a` | Show all current limits |
| `ulimit -n 65536` | Set soft limit on open file descriptors (current shell) |
| `ulimit -u <n>` | Max processes |
| `ulimit -v <KB>` | Virtual memory |
| `/etc/security/limits.conf` | PAM limits per user |
| systemd `LimitNOFILE=` | Service-level limit |
| `nice -n 19 cmd` | Lower CPU priority |
| `renice -n 5 -p <PID>` | Change priority of running |
| `ionice -c 3 cmd` | I/O priority (idle class) |
| `chrt -r -p 99 <PID>` | Real-time scheduling (use sparingly) |
| `taskset -c 0,1 cmd` | Pin to specific CPUs |

**Cgroups (Linux's resource control):**

| Concept | Detail |
|---|---|
| What | Per-process group resource limits (CPU, memory, IO, PIDs) |
| Used by | Docker, Kubernetes, systemd |
| Inspect | `systemd-cgtop`, `systemd-cgls`, `cat /sys/fs/cgroup/.../cpu.stat` |
| systemd creates per-service cgroup | `Slice=`, `MemoryMax=`, `CPUQuota=` |

**OOM (Out-Of-Memory) killer:**

| Concept | Detail |
|---|---|
| When | System is out of memory + can't swap |
| Picks victim | Highest `oom_score` |
| Adjust | `oom_score_adj` (`-1000` = never kill, `1000` = kill first) |
| Logs | `dmesg \| grep -i killed` or journalctl |
| Service-level | systemd `OOMScoreAdjust=` |
| Container | OOMKilled = exit code 137 |

**Tracing / debugging:**

| Tool | Use |
|---|---|
| `strace -p <PID>` | Trace syscalls of running process |
| `strace -e trace=open,read cmd` | Specific syscalls |
| `ltrace cmd` | Library calls |
| `gdb -p <PID>` | Attach debugger |
| `perf top -p <PID>` | CPU profiling |
| `bpftrace`, `bcc` tools | eBPF tracing (modern) |
| `pyspy`, `py-spy` (Python) | Sampling profiler |
| `pstack <PID>` / `gdb -ex 'thread apply all bt'` | Get stack trace |

**Scheduling priority:**

| Concept | Detail |
|---|---|
| Niceness | -20 (highest priority) … 19 (lowest); default 0 |
| Real-time scheduling | `SCHED_FIFO` / `SCHED_RR`; rare in apps |
| `cgroups v2 cpu.weight` | Modern weighted scheduling |

**Per-process info — `/proc/<PID>/`:**

| Path | Contents |
|---|---|
| `/proc/<PID>/cmdline` | Command line |
| `/proc/<PID>/environ` | Environment variables (NUL-separated) |
| `/proc/<PID>/status` | Human-readable status |
| `/proc/<PID>/io` | I/O accounting |
| `/proc/<PID>/limits` | Resource limits |
| `/proc/<PID>/maps` | Memory map |
| `/proc/<PID>/fd/` | Open file descriptors |
| `/proc/<PID>/cgroup` | Cgroup memberships |
| `/proc/<PID>/stack` | Kernel stack |
| `/proc/<PID>/task/` | Threads |

**Signal handling tips:**

| Tip | Detail |
|---|---|
| Apps must trap SIGTERM | Otherwise default kills immediately |
| SIGHUP commonly = reload | Document if your app does this |
| Forwarded signals | `tini` / `dumb-init` reap children + forward signals (containers) |
| Container PID 1 | Usually doesn't reap zombies — use a proper init |
| Don't trap SIGKILL or SIGSTOP | Impossible by design |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `kill -9` as a habit | Skips graceful shutdown; data loss possible |
| `nohup` for production services | No restart, no logging discipline |
| Running services as root | Privilege escalation surface |
| Ignoring zombie pile-up | Eventually exhausts PIDs |
| Not setting `LimitNOFILE` for high-conn servers | EMFILE crashes |
| Letting D-state processes accumulate | Usually a hung mount |
| `systemctl reload` without app implementing SIGHUP | Behaves like restart or nothing |
| `sudo killall sshd` | Just kicked yourself out |
| Forgotten daemon-reload after editing units | systemd uses old config |

**Useful checks during incident:**

| Goal | Command |
|---|---|
| Top CPU users | `top` then `P` (sort by CPU) |
| Top memory users | `top` then `M` (sort by mem) |
| Who's holding port 80 | `ss -tlnp \| grep ':80'` or `lsof -i :80` |
| Why disk is full | `du -sh /* 2>/dev/null \| sort -h` then drill in |
| What's flapping | `journalctl -u <svc> -f` |
| What changed recently | `last`, `journalctl --since "1 hour ago"` |
| Zombie count | `ps aux \| awk '$8 ~ /Z/' \| wc -l` |
| D-state processes | `ps aux \| awk '$8 ~ /D/'` |

**Cross-references:**

- File descriptors / TCP / TIME_WAIT: [file_descriptors_sockets_tcp_*.md](file_descriptors_sockets_tcp_fd_limits_ports.md)
- Shell scripting: [shell_scripting_bash_essentials.md](shell_scripting_bash_essentials.md)

**Rule of thumb:** **`SIGTERM` first, `SIGKILL` only as last resort** — and investigate why. **systemd for services, `tmux` for interactive long-running, `nohup` only for quick scripts.** When debugging: **`ps`, `lsof`, `ss`, `journalctl`** are the four tools that solve 80% of process-related incidents. **Always `daemon-reload` after editing unit files** — systemd doesn't auto-detect.
