### Twelve-Factor App (Cloud-Native Principles)

12 principles for building SaaS / cloud-native applications.

| # | Factor | Principle | Rails example |
|---|--------|-----------|---------------|
| 1 | **Codebase** | One repo per app, many deploys | Git repo, branches for envs |
| 2 | **Dependencies** | Explicitly declare, don't rely on system | Gemfile + Bundler |
| 3 | **Config** | Store config in environment | `ENV["DATABASE_URL"]`, Rails credentials |
| 4 | **Backing services** | Treat DB, Redis, S3 as attached resources | `DATABASE_URL`, swap without code change |
| 5 | **Build, release, run** | Strict separation of stages | CI builds image, deploy runs it |
| 6 | **Processes** | Stateless, share-nothing | Sessions in Redis, not in memory |
| 7 | **Port binding** | Export service via port | Puma binds to `PORT` |
| 8 | **Concurrency** | Scale out via processes | Puma workers, Sidekiq workers |
| 9 | **Disposability** | Fast startup, graceful shutdown | Puma phased restart, SIGTERM handling |
| 10 | **Dev/prod parity** | Keep envs as similar as possible | Docker, same DB in dev and prod |
| 11 | **Logs** | Treat as event streams | Log to stdout, ship via Fluentd |
| 12 | **Admin processes** | Run one-off tasks as processes | `rails console`, `rake db:migrate` |

**Most commonly violated:**
- **#3 Config**: secrets hardcoded in code (use ENV or credentials)
- **#6 Processes**: storing sessions/uploads on local disk (use Redis/S3)
- **#11 Logs**: writing to log files instead of stdout

**Rule of thumb:** Twelve-Factor is the foundation of containerized, cloud-native applications. Stateless processes, config in environment, logs to stdout, backing services as URLs. If your app follows these, it runs anywhere (Docker, Heroku, K8s) with zero changes.
