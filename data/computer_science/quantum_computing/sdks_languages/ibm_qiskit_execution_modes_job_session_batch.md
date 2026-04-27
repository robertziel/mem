### IBM Qiskit Runtime — Execution Modes (Job, Session, Batch)

**What it is:** Three ways to submit primitive pubs to an IBM QPU, each with different queue, cost, and latency trade-offs. The `mode=` argument on `SamplerV2` / `EstimatorV2` picks which one.

**The three modes:**

| Mode | Construction | Queue behavior | Latency between pubs | QPU time billed | Best for |
|---|---|---|---|---|---|
| Single job | `EstimatorV2(mode=backend)` | Joins fair-share queue once per `.run()` | N/A (one shot) | Per-pub QPU time | Ad-hoc / one-off runs |
| Session | `with Session(backend=bk) as s: EstimatorV2(mode=s)` | Exclusive QPU window; skips queue between submissions | Milliseconds (reserved) | Wall-clock session duration | Low-latency optimization loops (VQE, QAOA) |
| Batch | `with Batch(backend=bk) as b: EstimatorV2(mode=b)` | Pubs queued together but executed back-to-back | Seconds–minutes | Sum of QPU times only | High-throughput sweeps, error-mitigation fan-out |

**API shape:**
```python
from qiskit_ibm_runtime import QiskitRuntimeService, Session, Batch, EstimatorV2

service = QiskitRuntimeService()
backend = service.backend("ibm_torino")

# 1) Single job — simplest
est = EstimatorV2(mode=backend)
job = est.run([(isa, H)])

# 2) Session — low-latency iterative loop (VQE)
with Session(backend=backend) as session:
    est = EstimatorV2(mode=session)
    for theta in optimizer_iterates():
        job = est.run([(isa, H, theta)])
        loss = job.result()[0].data.evs

# 3) Batch — throughput sweep
with Batch(backend=backend) as batch:
    est = EstimatorV2(mode=batch)
    jobs = [est.run([(isa, H, th)]) for th in theta_grid]
```

**Cost model:**
- **Job / Batch:** billed for actual QPU seconds consumed (shots × per-shot time).
- **Session:** billed for *session wall-clock time* from first-pub start to close — idle seconds inside the window **count against your quota**.

**Fair-share & idle timeout:**
- Sessions have a per-plan **idle timeout** (often ~5 min without a new pub). Exceed it and the session closes; new pubs queue normally.
- Sessions also have a **max duration** (e.g., 8 h on premium, less on open).
- Batch has no exclusive window — it releases the QPU between pubs, so other users slot in, and cost is strictly what you used.

**When to pick which:**

| Situation | Mode |
|---|---|
| VQE / QAOA optimizer: 50–500 quick iterations, need <1 s between | **Session** |
| Parameter sweep: 10 000 independent evaluations, don't care about latency | **Batch** |
| One-off benchmarking run | **Single job** |
| ZNE with 3 noise factors per θ (many correlated pubs) | **Batch** |
| Hardware qubit characterization (burst of short circuits) | **Session** |

**Batch vs. Session — the key intuition:** Session reserves the *machine*; Batch reserves your place in line for a cluster of pubs but releases the machine between them. Session wins when the classical-loop latency between pubs is the bottleneck. Batch wins when total wall clock doesn't matter and you just want many pubs done cheaply.

**Pitfalls:**
- Opening a session for a single `.run()` call — you'll be billed for the idle seconds around it.
- Leaving a session open during a long classical step (e.g., a 30-s SciPy optimizer call) — QPU sits idle on your dime.
- Treating `Batch` like `Session` and expecting millisecond latency between pubs — batch pubs can have queue gaps.
- Forgetting the `with` block — unclosed sessions keep billing until timeout.

**Rule of thumb:** Use **Session** only when inter-pub latency matters (iterative optimizers); use **Batch** for everything else involving >1 pub (cheaper per shot, queue-fair); use a plain single-job `.run()` for isolated submissions.
