### Ruby / Rails Recruitment — Common Questions Index

31 stock questions Polish/EU Ruby-on-Rails recruiters lean on. Each topic has a dedicated cheatsheet — search by the keyword.

**See also:**
- [Master interview overview](recruitment_interview_master_overview.md) — coverage across all tracks
- [AI/ML interview topics](recruitment_ai_ml_interview_topics.md)
- [Frontend interview topics](recruitment_frontend_interview_topics.md)

**Topic list (31):**

| # | Topic | # | Topic |
|---:|---|---:|---|
| 1 | SOLID principles | 17 | DDD |
| 2 | CSRF | 18 | REST meaning |
| 3 | What is Rack | 19 | DRY |
| 4 | Strong parameters | 20 | DDT (data-driven testing) |
| 5 | Single table inheritance | 21 | Immutable data |
| 6 | Polymorphic associations | 22 | Language types (Ruby / JS) |
| 7 | Callbacks | 23 | Load / Require / Include / Extend |
| 8 | `scope` vs `self.method` | 24 | Lambda vs proc |
| 9 | Session management | 25 | REST API vs GraphQL |
| 10 | App server vs web server | 26 | Indexes on large tables |
| 11 | N+1 & eager loading | 27 | Indexes pros / cons |
| 12 | PUT vs PATCH | 28 | NoSQL vs SQL |
| 13 | Big-O basics | 29 | Microservices pitfalls |
| 14 | Frozen strings | 30 | Scaling for high traffic |
| 15 | String vs symbol | 31 | Garbage collector |
| 16 | Event sourcing | | |

**Frequency by interview round:**

| Tier | Topics | Why |
|---|---|---|
| **Drill** (asked almost always) | SOLID · DRY · REST · N+1 · Strong params · CSRF · Polymorphic associations · STI · Sessions · Indexes pros/cons | Stock first-round questions across recruiters |
| **Likely** (mid-round) | Callbacks lifecycle · `scope` vs class methods · Lambda vs proc · Microservices pitfalls · Scaling · GC · `includes` / `preload` / `eager_load` differences | Senior screening signals |
| **Differentiator** (senior) | Event sourcing · DDD · Big-O on hot paths · Service objects · App server vs web server (Puma internals) · GraphQL vs REST trade-offs | Architectural depth — wins offers |

**Cross-cutting (shows up alongside Ruby/Rails for full-stack roles):**

| Topic | File hint |
|---|---|
| HTML5 `img srcset` | `frontend/web_fundamentals/` |
| Web workers | `frontend/web_fundamentals/` |
| Popular Rails gems | `ruby/rails/features/common_ruby_gems...` |

**Where each topic lives in the corpus:**

| Cluster | Path |
|---|---|
| Ruby language (frozen strings, symbols, lambda/proc, GC, load/require) | `ruby/core/` |
| Rails framework (Rack, callbacks, STI, polymorphic, sessions, strong params) | `ruby/rails/` |
| Database (indexes, NoSQL vs SQL, eager loading) | `database_engineering/`, `ruby/rails/activerecord/` |
| Patterns (SOLID, DRY, DDD, event sourcing, REST) | `design_patterns/`, `api_design/` |
| Microservices / scaling | `microservices/`, `system_design_hld_high_level_design/` |

**Rule of thumb:** **drill the Drill tier the week before, refresh the Likely tier the day before, glance at the Differentiator tier on the morning of.** Don't try to cram all 31 — recruiters re-ask the same first-round questions; deep mastery of the Drill tier beats shallow coverage of all 31.
