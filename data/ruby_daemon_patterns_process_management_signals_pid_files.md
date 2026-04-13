### Ruby Daemon Patterns (Process Management, Signals, PID Files)

**What is a daemon:** A long-running background process that performs tasks continuously or on schedule, outside the request-response cycle.

**1. Basic daemon loop:**
```ruby
# Simple polling daemon
class WorkerDaemon
  def initialize
    @running = true
    @logger = Logger.new("log/worker.log")
  end

  def run
    @logger.info("Worker started (PID: #{Process.pid})")
    setup_signal_handlers

    while @running
      begin
        process_next_job
        sleep(1)  # poll interval
      rescue StandardError => e
        @logger.error("Error: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        sleep(5)  # back off on error
      end
    end

    @logger.info("Worker shutting down gracefully")
    cleanup
  end

  private

  def process_next_job
    job = JobQueue.next_pending
    return unless job

    @logger.info("Processing job #{job.id}")
    job.execute
    @logger.info("Completed job #{job.id}")
  end

  def cleanup
    # Release resources, finish current work
    @logger.info("Cleanup complete")
  end

  def setup_signal_handlers
    # SIGTERM — graceful shutdown (from kill, systemd, etc.)
    Signal.trap("TERM") { @running = false }

    # SIGINT — graceful shutdown (Ctrl+C)
    Signal.trap("INT") { @running = false }

    # SIGHUP — reload configuration
    Signal.trap("HUP") { reload_config }

    # SIGUSR1 — custom (e.g., print status)
    Signal.trap("USR1") { log_status }
  end

  def reload_config
    @logger.info("Reloading configuration")
    @config = YAML.load_file("config/worker.yml")
  end

  def log_status
    @logger.info("Status: running=#{@running}, pid=#{Process.pid}")
  end
end

WorkerDaemon.new.run
```

**2. PID file management:**
```ruby
class PidFile
  def initialize(path)
    @path = path
  end

  def write
    # Check if another instance is running
    if File.exist?(@path)
      old_pid = File.read(@path).strip.to_i
      if process_running?(old_pid)
        raise "Already running (PID: #{old_pid})"
      else
        # Stale PID file — previous process crashed
        File.delete(@path)
      end
    end

    File.write(@path, Process.pid.to_s)

    # Ensure PID file is cleaned up on exit
    at_exit { remove }
  end

  def remove
    File.delete(@path) if File.exist?(@path) && File.read(@path).strip.to_i == Process.pid
  end

  private

  def process_running?(pid)
    Process.kill(0, pid)  # signal 0 = check if process exists
    true
  rescue Errno::ESRCH    # no such process
    false
  rescue Errno::EPERM    # process exists but no permission
    true
  end
end

# Usage
pid_file = PidFile.new("tmp/pids/worker.pid")
pid_file.write
WorkerDaemon.new.run
```

**3. Graceful shutdown with in-flight work:**
```ruby
class GracefulWorker
  SHUTDOWN_TIMEOUT = 30  # seconds to wait for current job

  def initialize
    @running = true
    @current_job = nil
    @mutex = Mutex.new
  end

  def run
    setup_signals

    while @running
      job = fetch_next_job
      next(sleep(1)) unless job

      @mutex.synchronize { @current_job = job }

      begin
        job.execute
      ensure
        @mutex.synchronize { @current_job = nil }
      end
    end

    wait_for_current_job
  end

  private

  def setup_signals
    Signal.trap("TERM") do
      @running = false
      # Don't interrupt current job — let the loop finish
    end
  end

  def wait_for_current_job
    deadline = Time.now + SHUTDOWN_TIMEOUT

    while @mutex.synchronize { @current_job }
      if Time.now > deadline
        logger.warn("Shutdown timeout — abandoning current job")
        break
      end
      sleep(0.5)
    end
  end
end
```

**4. Forking daemon (background process):**
```ruby
# Daemonize the process (double-fork technique)
def daemonize
  # First fork — detach from terminal
  exit if fork

  # Create new session (detach from process group)
  Process.setsid

  # Second fork — prevent acquiring a terminal
  exit if fork

  # Redirect standard I/O
  $stdin.reopen("/dev/null")
  $stdout.reopen("log/daemon.log", "a")
  $stderr.reopen("log/daemon_error.log", "a")

  # Set working directory
  Dir.chdir("/")

  # Write PID file
  File.write("tmp/pids/daemon.pid", Process.pid.to_s)
end

# Modern alternative: use systemd instead of daemonizing
# systemd handles forking, PID tracking, log management, restart
```

**5. Systemd service (preferred for production):**
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

**6. Multi-process worker with master/child:**
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

**7. Using daemons gem:**
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

**8. Rails-integrated daemon with rake task:**
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

**Signal reference:**

| Signal | Default | Common use |
|--------|---------|-----------|
| SIGTERM | Terminate | Graceful shutdown |
| SIGINT | Terminate | Ctrl+C / graceful shutdown |
| SIGKILL | Kill (untrappable) | Force kill (last resort) |
| SIGHUP | Terminate | Reload config |
| SIGUSR1 | Nothing | Custom (log rotation, status) |
| SIGUSR2 | Nothing | Custom (restart, debug) |
| SIGTTIN | Nothing | Increase workers (Unicorn/Puma pattern) |
| SIGTTOU | Nothing | Decrease workers |

**Rule of thumb:** Use Sidekiq for most background processing — don't write custom daemons unless you have specific needs (polling external systems, long-lived connections, custom scheduling). When you do need a daemon: handle SIGTERM for graceful shutdown, use PID files to prevent duplicate instances, prefer systemd over self-daemonizing. Always log what the daemon is doing. Set shutdown timeouts — don't hang forever. For production: systemd > foreman > self-managed.
