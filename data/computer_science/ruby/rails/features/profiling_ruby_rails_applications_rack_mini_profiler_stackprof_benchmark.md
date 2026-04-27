### Profiling Ruby & Rails Applications

**Tool selection by symptom:**

| Symptom | Reach for | Why |
|---|---|---|
| "This page is slow" — request-level overview | `rack-mini-profiler` | Speed badge, SQL count + time, in-browser |
| Hot CPU loops, hidden algorithmic cost | `stackprof` + flame graph | Sampled CPU stack profiler, accurate hot-spot map |
| RAM growth / leak / GC pressure | `memory_profiler` | Per-gem / file / class allocation + retention report |
| Comparing two implementations | `benchmark-ips` | Iterations/sec with warmup + statistical comparison |
| Slow boot time, gem bloat | `derailed_benchmarks` | Per-gem memory at boot, perf:mem on endpoints |
| N+1 queries | `bullet` | Logs missing `includes` / unused eager-loads in dev |

**Tool quick reference:**

| Tool | Mode | Trigger | Output |
|---|---|---|---|
| rack-mini-profiler | Per-request, dev/admin-prod | append `?pp=flamegraph` / `?pp=profile-memory` / `?pp=profile-gc` to URL | Inline panel + drilldowns |
| stackprof | Block / process / endpoint | `StackProf.run(mode: :cpu, interval: 1000) { ... }` | Text report or flamegraph dump |
| memory_profiler | Block | `MemoryProfiler.report { ... }.pretty_print` | Allocated/retained by gem/file/class |
| benchmark-ips | Comparison | `Benchmark.ips { x.report(...); x.compare! }` | i/s + speedup ratios |
| Benchmark (stdlib) | One-shot timer | `Benchmark.measure { ... }` | user / system / total / real |
| derailed_benchmarks | CLI | `bundle exec derailed bundle:mem` / `perf:mem` / `perf:ips` | Boot mem per gem, endpoint perf |

**Stackprof modes:**

| Mode | Measures | Use for |
|---|---|---|
| `:cpu` | On-CPU time only | Tight CPU loops |
| `:wall` | Wall clock incl. I/O | Mixed CPU + DB / network |
| `:object` | Object allocations | Allocation-driven slowness |

Generate flamegraph: `stackprof --d3-flamegraph tmp/stackprof.dump > tmp/flame.html`.

**Reading a flame graph:**

| Axis | Meaning |
|---|---|
| X | Proportion of total time (wider = hotter) |
| Y | Call-stack depth (bottom = entry, top = leaf) |
| Wide plateaus | Real hot spots — start here |
| Narrow towers | Deep but fast — usually ignorable |

**Bottleneck-hunt workflow:**

| Step | Tool | What you're looking for |
|---|---|---|
| 1. Request overview | rack-mini-profiler | Slow SQL, high total time |
| 2. N+1 detection | bullet | Missing `includes` / `preload` / `eager_load` |
| 3. CPU hot spots | stackprof flame graph | Wide bars in user code |
| 4. Memory bloat | memory_profiler | High retained objects, suspect gems |
| 5. Boot overhead | derailed_benchmarks | Heavy gems at startup |
| 6. Verify fix | benchmark-ips | i/s before vs after |

**Production-safe profiling:**

| Concern | Approach |
|---|---|
| rack-mini-profiler in prod | Gate via `authorize_cb` to admins only |
| One-off endpoint profile | Wrap controller action in `StackProf.run` and render `.data` as JSON |
| Sampling overhead | `interval: 1000` (μs) is low impact; lower means more samples |

**Common fixes (after profiling tells you which):**

| Finding | Fix |
|---|---|
| N+1 in logs | `Model.includes(:assoc)` |
| Slow column scan | `add_index :table, :column` |
| Many small allocations in hot path | Replace `.map { ... }.select { ... }` with `filter_map` |
| Repeated computation across requests | `Rails.cache.fetch(key, expires_in: ...) { ... }` |
| Heavy gem at boot | Lazy-require, move to dev/test group, or replace |

**Rule of thumb:** **rack-mini-profiler first** for an end-to-end view, **stackprof + flame graph** for CPU detail, **memory_profiler** when retention looks wrong, **benchmark-ips** to confirm a fix is actually faster. Profile against production-like data volumes — small dev datasets hide the bottlenecks that bite at scale.
