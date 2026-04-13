### Linux Process Management

**Inspecting processes:**
- `ps aux` - snapshot of all processes (user, PID, CPU%, MEM%, command)
- `ps -ef` - full-format listing with PPID
- `top` / `htop` - real-time process monitor
- `pgrep -f pattern` - find PID by name/pattern
- `lsof -i :8080` - find process using a port
- `ss -tlnp` / `netstat -tlnp` - listening ports with PIDs

**Signals:**
- `kill PID` - send SIGTERM (graceful shutdown)
- `kill -9 PID` - send SIGKILL (force kill, no cleanup)
- `kill -HUP PID` - SIGHUP (reload config, e.g., Nginx)
- `killall name` - kill all processes by name
- `pkill -f pattern` - kill by pattern match

**Process states:**
- `R` - Running
- `S` - Sleeping (waiting for event)
- `D` - Uninterruptible sleep (usually I/O)
- `Z` - Zombie (terminated, parent hasn't waited)
- `T` - Stopped (e.g., Ctrl+Z)

**Background/foreground:**
- `command &` - run in background
- `Ctrl+Z` - suspend current process
- `bg` - resume in background
- `fg` - bring to foreground
- `jobs` - list background jobs
- `nohup command &` - survives terminal close
- `disown` - detach from shell

**systemd:**
- `systemctl start|stop|restart|status service`
- `systemctl enable|disable service` - auto-start on boot
- `journalctl -u service -f` - follow service logs
- `systemctl list-units --type=service` - list all services
- `systemctl daemon-reload` - reload after unit file changes

**Rule of thumb:** Use SIGTERM first, SIGKILL only as last resort. Use systemd for services, not nohup.
