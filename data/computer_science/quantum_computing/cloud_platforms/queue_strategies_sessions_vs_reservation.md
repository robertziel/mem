### Queue Strategies — Fair-Share, Sessions, Reservations

**What it is:** Three distinct mechanisms for controlling *when* your circuit runs on a shared QPU. **Fair-share** is the default on-demand queue, ranked by recent consumption. **Sessions** grant a short exclusive window without pre-booking — great for iterative burst work. **Reservations** pre-book a long window at a fixed hourly rate, guaranteeing access. Picking the wrong one for a hybrid loop can 10x your latency or your bill.

**The three mechanisms compared:**

| Mechanism | Latency between pubs | Cost model | Access guarantee | Typical duration |
|---|---|---|---|---|
| Fair-share queue | Seconds to hours | Per-shot / per-second | None — position drifts | Per job |
| Session | 10 ms – few seconds | Wall-clock or per-pub + idle | Short priority window (~5–30 min) | Minutes to hours |
| Reservation | Sub-second (exclusive) | Hourly flat rate | Guaranteed window | 1 h – multi-day |

Fair-share priority is roughly `1 / (historical_usage + ε)` — new submissions from heavy users drop to the back; light users cut ahead. It is *not* FIFO; position is recomputed on each dispatch.

**Example — hybrid loop mechanism selection:**
```python
from qiskit_ibm_runtime import QiskitRuntimeService, Session, EstimatorV2

svc = QiskitRuntimeService()
backend = svc.backend("ibm_torino")

# Session pattern — appropriate when classical step is <5s
with Session(backend=backend, max_time="30m") as s:
    est = EstimatorV2(mode=s)
    theta = initial_params()
    for step in range(100):
        job = est.run([(isa, H, theta)])
        loss = job.result()[0].data.evs
        theta = optimizer_step(theta, loss)    # MUST be short

# Anti-pattern: long classical step inside session
# with Session(...) as s:
#     scipy_optimizer(callback=eval_fn)        # 2min between calls
# → pays for 2h wall clock, uses ~30s QPU. Use single-job submission instead.
```

**Decision rule — hybrid-loop workloads:**
- **1–10 optimizer iterations** → single-job on fair-share. Session setup cost isn't worth it.
- **10–100 iterations with <5s classical step** → session. Needed for sub-second inter-pub latency.
- **100+ iterations over multiple hours** → reservation. Session idle timeouts will bite.
- **Classical step > 30s** → **never** use session. Pay for batch or chain single jobs.

**Workload → mechanism matrix:**

| Workload | Choice | Why |
|---|---|---|
| One-shot benchmark, 100 circuits | Fair-share + Batch | No latency pressure; cheapest. |
| VQE, 200 iters, 50 ms classical | **Session** | Needs sub-second inter-pub. |
| QAOA grid sweep, 10 000 points | Fair-share + Batch | Parallel, latency irrelevant. |
| Conference-deadline repro run | **Reservation** | Queue risk is existential. |
| Nightly regression, 20 circuits | Fair-share | Predictable, low volume. |
| Calibration burst (100 short circuits) | **Session** | Low latency, short duration. |

**Session vs reservation break-even:** if `session_wall_time × session_rate > reservation_hours × hourly_rate`, reserve instead. A 3-hour VQE at ~$1.60/s session rate costs ~$17 280; the same 3-hour dedicated block at $2 000/h is $6 000. Sessions are priced *as-if* on-demand — when you burn hours of wall-clock, you leave money on the table vs a flat reservation.

**Session idle timeout — the silent killer:** most plans close sessions after ~5 min without a new pub. If your classical step ever spikes above that, the session closes mid-optimization; next pub re-queues and the iteration loop stalls. Log `session.status()` every iteration; set `max_time` conservatively.

**Pitfalls:**
- Session idle timeout silently kills loops mid-optimization — log session state every iteration.
- Reservations pin a specific backend ARN. If that hardware is down for maintenance, you lose the window; most providers don't refund.
- Fair-share position *degrades* after heavy use. Running 1000-circuit sweeps on a shared hub penalizes everyone in the hub for hours.
- Opening a session outside `with` → billing leaks until idle timeout. Always use context managers.
- Reservations don't skip calibration windows. Providers often re-calibrate every 1–4 hours; budget 10–15% of block for calibration downtime.
- Treating `Batch` like `Session` and expecting millisecond latency between pubs — batch pubs can have queue gaps.

**Rule of thumb:** Fair-share for one-off and parameter sweeps, sessions for iterative loops where the classical step stays under a few seconds, reservations only when fair-share queue risk or session wall-clock cost would exceed the hourly rate.
