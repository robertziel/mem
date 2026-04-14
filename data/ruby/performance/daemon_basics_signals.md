### Ruby Daemon Basics & Signal Handling

**What is a daemon:** A long-running background process that performs tasks continuously or on schedule, outside the request-response cycle.

**Basic daemon loop with signal handlers:**
```ruby
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

**Rule of thumb:** Always handle SIGTERM for graceful shutdown and SIGINT for Ctrl+C. Use SIGHUP for config reload and SIGUSR1/USR2 for custom actions. Keep your main loop simple: check a `@running` flag, process work, sleep, repeat. Always log what the daemon is doing.
