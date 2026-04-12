### Disk, Memory, CPU Diagnostics

**Disk:**
- `df -h` - filesystem disk usage (human-readable)
- `du -sh dir/` - directory size summary
- `du -h --max-depth=1` - size of each subdirectory
- `lsblk` - list block devices and partitions
- `fdisk -l` - detailed partition info
- `iostat -x 1` - disk I/O stats per device (await, %util)
- `iotop` - top-like for disk I/O by process

**Memory:**
- `free -h` - total/used/free/available memory and swap
- `cat /proc/meminfo` - detailed memory breakdown
- `vmstat 1` - virtual memory stats (swapping, I/O, CPU)
- `slabtop` - kernel slab cache usage
- Available != Free. Linux uses free RAM for cache; "available" is what apps can use.

**CPU:**
- `top` / `htop` - real-time CPU usage per process
- `mpstat -P ALL 1` - per-core CPU utilization
- `uptime` - load averages (1, 5, 15 min)
- `nproc` - number of CPU cores
- Load average: 1.0 per core = fully utilized. Load > cores = overloaded.

**Network diagnostics:**
- `iftop` - real-time bandwidth per connection
- `nethogs` - bandwidth per process
- `sar -n DEV 1` - network interface stats

**Quick triage order:**
1. `uptime` - is load high?
2. `free -h` - is memory exhausted / swapping?
3. `df -h` - is disk full?
4. `top` - which process is consuming resources?
5. `iostat -x 1` - is disk I/O saturated?
6. `dmesg | tail` - any kernel errors (OOM killer)?

**Rule of thumb:** High load + low CPU = I/O bottleneck. High load + high CPU = compute bottleneck. OOM killer entries in dmesg = need more RAM or fix a leak.
