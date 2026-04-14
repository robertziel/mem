### Puma Configuration for Rails

**What is Puma?**
Puma is a multi-threaded, multi-process HTTP server for Ruby. It is the default Rails server. Workers (processes) handle isolation and CPU parallelism. Threads handle concurrent requests within each worker.

**Basic configuration:**
```ruby
# config/puma.rb
max_threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
min_threads_count = ENV.fetch("RAILS_MIN_THREADS", max_threads_count).to_i
threads min_threads_count, max_threads_count

# Workers (forked processes) -- set to 0 for single-process mode
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i

# Port binding
port ENV.fetch("PORT", 3000)

# Or bind to Unix socket (faster for reverse proxy)
bind "unix:///tmp/puma.sock"

# Environment
environment ENV.fetch("RAILS_ENV", "development")

# PID file
pidfile ENV.fetch("PIDFILE", "tmp/pids/server.pid")
```

**Workers (processes) vs threads:**
```
Workers = OS-level processes (forked)
Threads = lightweight execution units within a worker

Request handling:
  Client --> Puma (main) --> Worker 1 (5 threads) --> handles up to 5 concurrent requests
                         --> Worker 2 (5 threads) --> handles up to 5 concurrent requests
                         --> Worker 3 (5 threads) --> handles up to 5 concurrent requests
  Total capacity: 3 workers * 5 threads = 15 concurrent requests
```

| Aspect | Workers (processes) | Threads |
|--------|-------------------|---------|
| Memory | Each gets full copy of app | Shared within process |
| CPU use | True parallelism (bypass GVL) | Limited by GVL for CPU work |
| Isolation | Crash in one doesn't affect others | Shared state, must be thread-safe |
| Best for | CPU-heavy apps, memory-rich servers | I/O-heavy apps (DB, HTTP calls) |

**preload_app! (copy-on-write memory savings):**
```ruby
# config/puma.rb
preload_app!

# What it does:
# - Loads the entire Rails app BEFORE forking workers
# - Workers share memory pages via OS copy-on-write (CoW)
# - Can reduce total memory by 30-50%

# IMPORTANT: must reconnect after fork
on_worker_boot do
  ActiveRecord::Base.establish_connection
  # Reconnect Redis, Elasticsearch, etc.
end

# Without preload_app!, each worker loads the app independently
# (slower boot, more memory, but simpler)
```

**Phased restart vs restart:**
```ruby
# Hot restart (SIGUSR2): restarts ALL workers at once
# - Brief downtime while new workers boot
# - Required if preload_app! is used (new code must be loaded before fork)
$ pumactl restart
$ kill -USR2 $(cat tmp/pids/server.pid)

# Phased restart (SIGUSR1): restarts workers one at a time
# - Zero downtime: old workers serve while new ones boot
# - Does NOT work with preload_app! (code loaded per-worker)
$ pumactl phased-restart
$ kill -USR1 $(cat tmp/pids/server.pid)
```

| Feature | `restart` (USR2) | `phased-restart` (USR1) |
|---------|-------------------|-------------------------|
| Downtime | Brief (all workers restart) | Zero (rolling restart) |
| Works with preload_app! | Yes | No |
| New code loaded | Before fork | Per worker |
| Use when | Using preload_app!, major changes | No preload_app!, routine deploys |

**Memory tuning:**
```ruby
# config/puma.rb

# Reduce idle threads to free memory
threads 1, 5  # min 1, max 5 (scale down when quiet)

# Worker killer (restart workers that use too much memory)
# Gemfile: gem "puma_worker_killer"
before_fork do
  PumaWorkerKiller.config do |config|
    config.ram = 1024            # total MB for all workers
    config.frequency = 60        # check every 60 seconds
    config.percent_usage = 0.90  # kill if > 90% of ram
    config.rolling_restart_frequency = 12 * 3600  # restart every 12h
  end
  PumaWorkerKiller.start
end

# MALLOC_ARENA_MAX: reduce glibc memory fragmentation (Linux)
# Set in environment: MALLOC_ARENA_MAX=2
# Or use jemalloc: LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
```

**WEB_CONCURRENCY sizing:**
```ruby
# Heroku formula (good starting point)
# WEB_CONCURRENCY = (Total RAM / RAM per worker) - 1
#
# Example: 512MB dyno, 150MB per worker
# WEB_CONCURRENCY = (512 / 150) - 1 = 2 workers
#
# Example: 2.5GB server, 200MB per worker
# WEB_CONCURRENCY = (2560 / 200) - 1 = 11 workers (cap at CPU count)

# CPU-bound apps: workers = number of CPU cores
# I/O-bound apps: workers = 1.5x CPU cores (threads do the heavy lifting)

# Check actual memory per worker:
$ ps aux | grep puma
# or
$ cat /proc/$(pidof puma)/status | grep VmRSS
```

**systemd service file:**
```ini
# /etc/systemd/system/puma.service
[Unit]
Description=Puma Rails Server
After=network.target

[Service]
Type=notify
WatchdogSec=10
User=deploy
WorkingDirectory=/var/www/myapp/current
ExecStart=/bin/bash -lc 'bundle exec puma -C config/puma.rb'
ExecReload=/bin/kill -USR2 $MAINPID
Restart=always
RestartSec=5
SyslogIdentifier=puma

Environment=RAILS_ENV=production
Environment=WEB_CONCURRENCY=3
Environment=RAILS_MAX_THREADS=5
Environment=MALLOC_ARENA_MAX=2

[Install]
WantedBy=multi-user.target
```

**Development vs production config:**
```ruby
# config/puma.rb (combined)
if ENV.fetch("RAILS_ENV", "development") == "development"
  # Single-mode: no workers, just threads (simpler debugging)
  threads 1, 1
  workers 0
  plugin :tmp_restart  # auto-restart on touch tmp/restart.txt
else
  threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
  threads threads_count, threads_count
  workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
  preload_app!

  on_worker_boot do
    ActiveRecord::Base.establish_connection
  end
end
```

**Nginx + Puma (production reverse proxy):**
```nginx
upstream puma {
  server unix:///tmp/puma.sock fail_timeout=0;
}

server {
  listen 80;
  server_name example.com;
  root /var/www/myapp/current/public;

  location / {
    try_files $uri @puma;
  }

  location @puma {
    proxy_pass http://puma;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Rule of thumb:** Set workers to the number of CPU cores (or less, depending on memory). Set threads to 5 for I/O-bound apps. Use `preload_app!` for memory savings via copy-on-write, but remember it prevents phased restarts. Total RAM must support (workers * per-worker memory). Always reconnect ActiveRecord in `on_worker_boot` when using preload. Use `MALLOC_ARENA_MAX=2` or jemalloc on Linux to reduce memory fragmentation.
