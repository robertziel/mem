### Observability — Shot Cost and Error-Bar Tracking

**What it is:** Structured logging and tracing of every quantum primitive invocation: how many shots it consumed, how long it ran, what error bars the returned `PrimitiveResult.metadata` quotes, and what it cost in dollars or seconds of QPU time. Quantum workloads have a unique failure mode — silent drift in result quality — that only metrics catch. Without observability you learn your experiment degraded when the paper reviewers reject your plots.

**What to emit per primitive call:**

| Metric | Source | Why it matters |
|---|---|---|
| shots | `options.default_shots` or `result[i].data.*.num_shots` | Direct cost driver |
| usage seconds | `result.metadata["usage"]["seconds"]` (Runtime) | Billable QPU time |
| stddev / error bars | `result[i].metadata["stddev"]` (Estimator) | Drift detection over runs |
| backend calibration hash | `hash(backend.properties().last_update_date)` | Links results to a calibration window |
| session id, job id | `session.session_id`, `job.job_id` | Correlate across Runtime logs |

**Wrap `SamplerV2` in a context manager that logs:**
```python
import time, logging, contextlib
from qiskit_ibm_runtime import SamplerV2, Session, QiskitRuntimeService

log = logging.getLogger("qobs")

@contextlib.contextmanager
def traced_sampler(backend, shots):
    service = QiskitRuntimeService()
    with Session(backend=backend) as session:
        sampler = SamplerV2(session=session)
        sampler.options.default_shots = shots
        t0 = time.monotonic()
        try:
            yield sampler
        finally:
            wall = time.monotonic() - t0
            # PrimitiveResult.metadata holds usage after a .run(...).result() call
            last = getattr(sampler, "_last_result", None)
            usage = last.metadata.get("usage", {}) if last else {}
            log.info(
                "sampler.done backend=%s session=%s wall_s=%.2f shots=%d qpu_s=%.3f",
                backend.name, session.session_id, wall, shots, usage.get("seconds", 0.0),
            )

with traced_sampler(backend="ibm_sherbrooke", shots=4096) as sampler:
    result = sampler.run([qc]).result()
    sampler._last_result = result      # stash for the context manager to read
```

**OpenTelemetry integration (spans per job, attributes for shots/cost):**
```python
from opentelemetry import trace
tracer = trace.get_tracer("qiskit.runtime")

with tracer.start_as_current_span("sampler.run") as span:
    job = sampler.run([qc])
    result = job.result()
    usage = result.metadata.get("usage", {})
    span.set_attribute("qc.backend", backend.name)
    span.set_attribute("qc.shots", 4096)
    span.set_attribute("qc.job_id", job.job_id())
    span.set_attribute("qc.qpu_seconds", usage.get("seconds", 0.0))
    span.set_attribute("qc.num_pubs", len(result))
```
Export to Jaeger / Tempo / Honeycomb with the standard OTLP exporter; drill into slow sessions by `qc.qpu_seconds` or wide-error-bar runs by `qc.stddev`.

**Error-bar monitoring (Estimator):**
```python
for pub_result in estimator_result:
    ev = pub_result.data.evs
    stddev = pub_result.data.stds
    log.info("ev=%.4f ± %.4f", ev, stddev)
    if stddev > threshold:
        log.warning("high variance — more shots or error mitigation required")
```
Alert when rolling-median `stddev` for a fixed circuit + shot count increases week-over-week — that's a calibration-drift signal.

**Pitfalls:**
- **PII in job metadata.** `hub/group/project` fields are fine; user tokens in log lines are catastrophic — redact before structured logging.
- **Cardinality explosion.** Don't emit a metric per circuit pub; aggregate over the job (sum shots, max stddev).
- **Runtime `usage` is seconds, not shots.** Different backends have different shots-per-second throughput; track both to spot queue- vs compute-bound jobs.
- **Session TTL.** A leaked `Session` bills idle time on some plans; always use `with Session(...)` or an explicit `.close()`.
- **Estimator vs Sampler metadata shapes differ.** Estimator returns `stds`; Sampler returns raw `num_shots` on the bitarray. Don't share parsing code.

**Rule of thumb:** Every primitive call should emit one structured log line with `{backend, shots, qpu_seconds, stddev, job_id}` — that's all you need to answer "why did my fidelity drop this week" without re-running the experiment.
