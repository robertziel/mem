### Linux Disk / Memory / CPU Diagnostics

**Cross-ref:** for process-level operations see [process_management.md](process_management.md). For TCP / FD / socket diagnostics see [file_descriptors_sockets_tcp_*.md](file_descriptors_sockets_tcp_fd_limits_ports.md).

**Triage order — the 60-second incident scan:**

| Step | Command | Looking for |
|---|---|---|
| 1 | `uptime` | Load average — high? |
| 2 | `free -h` | Memory exhausted / swapping? |
| 3 | `df -h` | Disk full? |
| 4 | `top -o %CPU` (or `htop`) | Which process is hot? |
| 5 | `iostat -x 1` | Disk I/O saturated? |
| 6 | `dmesg \| tail -50` | OOM kills, kernel errors? |
| 7 | `journalctl -p err -b` | Recent service errors |
| 8 | `ss -s` / `ss -tlnp` | Network connection state |

**CPU diagnostics:**

| Tool | Use |
|---|---|
| `top` / `htop` / `btop` | Real-time per-process CPU |
| `mpstat -P ALL 1` | Per-core utilization (% user / sys / iowait / idle) |
| `uptime` | Load averages (1, 5, 15 min) |
| `nproc` | CPU core count |
| `lscpu` | CPU model, sockets, threads |
| `pidstat 1` | Per-process CPU/IO/memory over time |
| `perf top` | CPU profiling (kernel + user) |
| `perf stat <cmd>` | Counters for one run |
| `time <cmd>` | User + system + wall time |
| `taskset -c 0,1 <cmd>` | Pin process to CPUs |
| `nice` / `renice` | Adjust scheduling priority |
| `chrt` | Real-time scheduling |

**Reading load average:**

| Load (1-min) | Cores | Reading |
|---|---|---|
| < cores | — | Healthy headroom |
| ≈ cores | — | Fully utilized |
| > 2× cores | — | Saturated; queue building |
| Load + `iowait` high | — | I/O bottleneck (not CPU) |
| Load high + `%idle` high | — | Processes blocked on something (often I/O) |

**Memory diagnostics:**

| Tool | Use |
|---|---|
| `free -h` | Total / used / free / available + swap |
| `cat /proc/meminfo` | Detailed breakdown |
| `vmstat 1` | Virtual memory stats over time (swapping, page faults) |
| `slabtop` | Kernel slab cache usage |
| `smem -t -k` | Per-process PSS (proportional set size) |
| `pmap -x <PID>` | Per-process memory map |
| `ps aux --sort=-%mem` | Top memory hogs |
| `dmesg \| grep -i kill` | OOM killer activity |
| `cat /proc/<PID>/status \| grep -i vm` | Per-process memory |

**`free -h` — what each column means:**

| Column | Meaning |
|---|---|
| `total` | Total physical memory |
| `used` | Memory in use by apps + kernel |
| `free` | Truly unused (often small — Linux uses free RAM for cache) |
| `shared` | tmpfs, shared memory |
| `buff/cache` | Page cache + buffers (reclaimable) |
| **`available`** | **What's actually available to apps** (free + reclaimable) |
| `swap used` | Swap activity = memory pressure |

> **Watch `available`, not `free`**. Linux uses idle RAM for cache; "free" near 0 is normal and good.

**Memory pressure signs:**

| Signal | Action |
|---|---|
| `available` < 10% of total | Investigate |
| Swap actively in use (`si`/`so` in vmstat) | Real pressure |
| Page faults rising | Same |
| OOM killer entries in `dmesg` | Already over the line |
| Thrashing (high paging, low throughput) | Critical |

**Disk diagnostics:**

| Tool | Use |
|---|---|
| `df -h` | Filesystem disk usage |
| `df -i` | Inode usage (often-overlooked failure mode) |
| `du -sh dir/` | Directory size summary |
| `du -h --max-depth=1 / 2>/dev/null \| sort -h` | Drill-down by depth |
| `ncdu` | Interactive disk usage explorer |
| `lsblk` | Block devices + partitions |
| `fdisk -l` / `parted -l` | Partition tables |
| `iostat -x 1` | Per-device I/O stats |
| `iotop` | Top processes by disk I/O |
| `sar -d 1` | Historical I/O stats |
| `lsof +D /path` | What's open under a path (disk-full troubleshooting) |
| `findmnt` | Mounted filesystems with options |
| `smartctl -a /dev/sda` | SMART health |
| `blktrace` | Block-device tracing (advanced) |

**Disk full triage:**

| Step | Command |
|---|---|
| 1 | `df -h` — which mount? |
| 2 | `df -i` — also check inodes |
| 3 | `du -h --max-depth=1 /var \| sort -h` — drill |
| 4 | Common culprits: `/var/log`, `/tmp`, journal, container layers, `/var/cache` |
| 5 | `lsof +L1` — files deleted but still held open (need restart of the holder) |

> "Disk shows free in `du` but full in `df`" usually means **deleted-but-open files** — restart the process holding them.

**`iostat -x 1` — key columns:**

| Column | Meaning |
|---|---|
| `r/s`, `w/s` | Reads / writes per second |
| `rkB/s`, `wkB/s` | Throughput |
| `await` | Avg total wait time per I/O (ms) |
| `r_await`, `w_await` | Read / write wait |
| `aqu-sz` | Avg queue depth |
| `%util` | % time device was busy (capped at 100% per device) |

| Pattern | Reading |
|---|---|
| `%util` > 80%, `await` rising | Saturated |
| `aqu-sz` > # virtual queues | Backlog growing |
| `await` >> service time | Tail latency / contention |

**Network diagnostics (light touch — see TCP cheatsheet for depth):**

| Tool | Use |
|---|---|
| `iftop` | Real-time bandwidth per connection |
| `nethogs` | Bandwidth per process |
| `sar -n DEV 1` | Network interface stats |
| `ss -s` | Socket summary |
| `ip -s link` | Per-interface counters |
| `ethtool eth0` | NIC speed / duplex |
| `mtr <host>` | Combined ping + traceroute |
| `tcpdump -nni eth0` | Packet capture |

**`vmstat 1` — Swiss-army:**

```
procs ---memory--------- ----swap-- ---io---- -system-- ----cpu-----
 r  b   swpd   free   buff   cache    si   so    bi    bo   in   cs us sy id wa st
 2  0      0   1500   2000  10000     0    0    50   100  500 1000 30 10 50 10  0
```

| Column | Meaning |
|---|---|
| `r` | Runnable processes (queue) |
| `b` | Blocked (typically I/O) |
| `si` / `so` | Swap in / out — **want both at 0** |
| `bi` / `bo` | Block in / out (disk) |
| `in` / `cs` | Interrupts / context switches |
| `us` / `sy` / `id` / `wa` / `st` | User / system / idle / iowait / steal |

| Reading | Means |
|---|---|
| High `wa` | I/O-bound |
| High `sy` | Kernel-heavy (heavy syscalls) |
| High `cs` | Context switching cost (too many threads?) |
| High `r` | CPU saturated |
| `st` > 0 | Hypervisor steal (noisy neighbor on shared host) |
| `si`/`so` > 0 | **Swapping — investigate now** |

**OOM killer investigation:**

| Step | Command |
|---|---|
| Confirm | `dmesg \| grep -i 'killed process'` |
| What got killed | `dmesg \| grep -A2 oom_reaper` |
| Per-cgroup | systemd: `journalctl -u <svc>` |
| Adjust score | `oom_score_adj -1000` (never kill) ... `1000` (kill first) |
| In containers | Exit code **137** = OOM killed |

**eBPF tools (modern, when traditional tools aren't enough):**

| Tool | Use |
|---|---|
| `bpftrace` | One-liners for tracing (like awk for the kernel) |
| `bcc-tools` (`opensnoop`, `tcpconnect`, `execsnoop`, etc.) | Per-area traces |
| `bpftop` | Live eBPF program profiler |
| `runqlat` | Run-queue latency |
| `biolatency` | Block I/O latency histograms |
| `cachestat` | Page cache hit/miss |

**Profiling:**

| Tool | Use |
|---|---|
| `perf record` + `perf report` | Sampling CPU profile |
| `perf top` | Live |
| `flamegraph` (Brendan Gregg) | Visualize sampled stacks |
| `pyspy` (Python) / `py-spy` | Out-of-process Python sampler |
| `rbspy` (Ruby) | Same for Ruby |
| `async-profiler` (JVM) | Sampling profiler |
| `pprof` (Go) | Built-in profiler |

**Storage/ filesystem health:**

| Tool | Use |
|---|---|
| `smartctl -H /dev/sda` | Drive health |
| `nvme list` / `nvme smart-log` | NVMe drives |
| `mdadm --detail /dev/md0` | RAID array status |
| `zpool status` | ZFS health |
| `tune2fs -l /dev/sda1` | ext4 superblock info |
| `xfs_info /mountpoint` | xfs settings |

**Saturation rules of thumb:**

| Resource | Saturation indicator |
|---|---|
| **CPU** | Sustained run-queue length > 1.5 × cores |
| **Memory** | Swap activity OR `available` < 10% |
| **Disk** | `%util` > 80% with rising `await` |
| **Network** | `txqueuelen` overflows, retransmits rising |
| **TCP connections** | `time-wait` count near `tcp_max_tw_buckets`; ephemeral ports near range cap |
| **Inodes** | `df -i` near 100% |

**Pattern → likely cause:**

| Pattern | Likely cause |
|---|---|
| High load, low CPU, high `iowait` | Disk I/O bottleneck |
| High CPU, normal load | CPU-bound |
| Memory used + swap + slow | Memory leak / over-commit |
| Disk free in `du` but full in `df` | Deleted-but-open files |
| `available` low + cache big + no swap | Healthy — cache is reclaimable |
| Sudden context-switch spike | Lock contention / too many threads |
| OOM kill in `dmesg` | Bad memory limit; runaway process; leak |
| `iotop` shows kernel threads (`flush`, `kworker`) high | Heavy writes hitting filesystem |
| Network high + CPU low | I/O wait isn't shown on net; check `softirq` time |

**Resource limits:**

| Concern | Tool |
|---|---|
| Per-process limits | `ulimit -a`, `/etc/security/limits.conf` |
| systemd service limits | `LimitNOFILE`, `LimitNPROC`, `MemoryMax`, etc. |
| Cgroups | `systemd-cgtop`, `/sys/fs/cgroup/...` |
| Container limits | `docker stats`, K8s `kubectl top` |

**Quick reference — one command for everything:**

| Goal | Quickest |
|---|---|
| What's hot? | `top -o %CPU` |
| What's eating disk? | `ncdu /` |
| What's swapping? | `vmstat 1` (watch `si`/`so`) |
| What's holding port 80? | `ss -tlnp \| grep :80` |
| Disk full but `du` clean? | `lsof +L1` |
| OOM killed something? | `dmesg \| grep -i oom` |
| Network saturated? | `iftop` |
| Why is system slow? | `vmstat 1` + watch `wa` and `st` |
| Long-running query? | `pidstat 1` filtered to that PID |
| Unexpected new process? | `ps auxf` (tree view) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Reading "free" memory and panicking | Linux uses RAM for cache; check `available` instead |
| Killing a process holding deleted files | "Disk full" persists; you need to restart, not kill |
| Looking at CPU before checking I/O | High load with low CPU = I/O |
| Not checking inodes with `df -i` | "Disk full" with disk usage at 30% |
| Ignoring `%steal` on cloud VMs | Noisy neighbor explanation |
| Forgetting cgroup limits in containers | `top` shows host but limits are stricter |
| Only running one diagnostic | Best info comes from cross-correlating |

**Cross-references:**

- Process management + signals: [process_management.md](process_management.md)
- TCP / sockets / FDs: [file_descriptors_sockets_tcp_*.md](file_descriptors_sockets_tcp_fd_limits_ports.md)
- Container resource limits: [docker_resource_limits_*.md](../docker/docker_resource_limits_healthchecks.md)

**Rule of thumb:** **`uptime` → `free -h` → `df -h` → `top` → `iostat`** is the 60-second incident scan. **High load + low CPU = I/O bottleneck**; **swap activity = memory pressure** (look at `available`, not `free`); **disk full but `du` is clean → deleted-but-open files** (`lsof +L1`). On cloud VMs always glance at `%steal` — a noisy neighbor explains a lot.
