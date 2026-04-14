### Ruby Daemon: Systemd, Multi-Process Workers & Rails Integration

**Systemd service unit file (preferred for production):**
```ini
# /etc/systemd/system/myapp-worker.service
[Unit]
Description=MyApp Background Worker
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/myapp/current
ExecStart=/usr/local/bin/bundle exec ruby lib/worker_daemon.rb
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/www/myapp/shared/log/worker.log
StandardError=append:/var/www/myapp/shared/log/worker_error.log

# Graceful shutdown
KillSignal=SIGTERM
TimeoutStopSec=30

# Environment
EnvironmentFile=/var/www/myapp/shared/.env
Environment=RAILS_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Manage the service
sudo systemctl start myapp-worker
sudo systemctl stop myapp-worker     # sends SIGTERM
sudo systemctl restart myapp-worker
sudo systemctl status myapp-worker
sudo journalctl -u myapp-worker -f   # follow logs
```

**Multi-process worker with master/child pattern:**
```ruby
class MasterWorker
  def initialize(worker_count: 4)
    @worker_count = worker_count
    @workers = {}
    @running = true
  end

  def run
    setup_master_signals
    spawn_workers

    while @running
      # Wait for any child to exit
      pid, status = Process.wait2(-1, Process::WNOHANG)
      if pid
        @workers.delete(pid)
        logger.warn("Worker #{pid} exited (status: #{status.exitstatus})")
        spawn_worker if @running  # replace dead worker
      end
      sleep(1)
    end

    shutdown_workers
  end

  private

  def spawn_workers
    @worker_count.times { spawn_worker }
  end

  def spawn_worker
    pid = fork do
      setup_child_signals
      ChildWorker.new.run
    end
    @workers[pid] = Time.now
    logger.info("Spawned worker #{pid}")
  end

  def setup_master_signals
    Signal.trap("TERM") { @running = false }
    Signal.trap("INT") { @running = false }

    # TTIN/TTOU to adjust worker count dynamically
    Signal.trap("TTIN") { @worker_count += 1; spawn_worker }
    Signal.trap("TTOU") {
      @worker_count = [@worker_count - 1, 1].max
      if @workers.any?
        pid = @workers.keys.last
        Process.kill("TERM", pid)
      end
    }
  end

  def shutdown_workers
    @workers.each_key { |pid| Process.kill("TERM", pid) }
    # Wait for graceful shutdown with timeout
    deadline = Time.now + 30
    until @workers.empty? || Time.now > deadline
      pid, = Process.wait2(-1, Process::WNOHANG)
      @workers.delete(pid) if pid
      sleep(0.5)
    end
    # Force kill remaining
    @workers.each_key { |pid| Process.kill("KILL", pid) rescue nil }
  end
end
```

**Using daemons gem:**
```ruby
# Gemfile
gem 'daemons'

# bin/worker_ctl
require 'daemons'

Daemons.run_proc('my_worker',
  dir_mode: :normal,
  dir: 'tmp/pids',
  log_dir: 'log',
  log_output: true,
  backtrace: true,
  monitor: true       # auto-restart on crash
) do
  require_relative '../config/environment'  # load Rails
  WorkerDaemon.new.run
end

# Control:
# ruby bin/worker_ctl start
# ruby bin/worker_ctl stop
# ruby bin/worker_ctl restart
# ruby bin/worker_ctl status
```

**Rails-integrated daemon with rake task:**
```ruby
# lib/tasks/daemon.rake
namespace :daemon do
  desc "Start background worker"
  task worker: :environment do
    pid_file = PidFile.new("tmp/pids/worker.pid")
    pid_file.write

    worker = WorkerDaemon.new
    worker.run
  end
end

# Run: bundle exec rake daemon:worker
# Or with foreman/Procfile:
# worker: bundle exec rake daemon:worker
```

**Rule of thumb:** Use Sidekiq for most background processing — don't write custom daemons unless you have specific needs (polling external systems, long-lived connections, custom scheduling). For production: systemd > foreman > self-managed. Use TTIN/TTOU signals (Unicorn/Puma pattern) for dynamic worker scaling. The daemons gem handles PID files and daemonizing if you can't use systemd.
