### Ruby Daemon: PID Files & Graceful Shutdown

**PID file management:**
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

**Graceful shutdown with in-flight work:**
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

**Forking daemon (double-fork technique):**
```ruby
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

**Rule of thumb:** Use PID files to prevent duplicate instances. Always check for stale PIDs from crashed processes. Use a Mutex to track in-flight work and set a shutdown timeout so you don't hang forever. Prefer systemd over the double-fork technique for modern deployments.
