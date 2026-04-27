### Execution Modes — Single Job vs Session vs Batch

**Pattern:** Every cloud-quantum stack exposes three fundamental ways to submit work, differing only in how the queue is *amortized* across related jobs. Matching execution mode to SLA (latency, throughput, cost) is an architectural decision, not a tuning knob — pick wrong and a 5-second variational step becomes a 5-minute one.

**Three modes:**
| Mode | Queue behavior | Latency/job | Best for |
|---|---|---|---|
| **Single job** | Re-queue every submit | tens of sec – minutes | one-shot circuits, demos |
| **Session** | Reserve QPU, back-to-back | < 1 s between jobs | variational loops (VQE, QAOA) |
| **Batch** | Group jobs, one fair-share slot | amortized; total ≈ single | parameter sweeps, Monte Carlo |

**When to use — single job:**
- Teaching, one-off benchmarks, asynchronous / fire-and-forget.
- Low-priority sweeps where queue time is acceptable.
- No optimization feedback depends on the previous result.

**When to use — session:**
- Variational loop: classical optimizer needs result `k` before submitting `k+1`.
- Iterative error mitigation (PEC with feedback).
- Interactive debugging against a real QPU.
- Anything with a "next submit depends on previous result" data dependency.

**When to use — batch:**
- Embarrassingly parallel sweeps (bond-length scans, QAOA angle grids).
- Shadow tomography (thousands of independent Clifford circuits).
- Large-scale benchmarks (RB, QV, CLOPS).
- You care about **total throughput**, not per-job latency.

**IBM Runtime example (all three):**
```python
from qiskit_ibm_runtime import QiskitRuntimeService, EstimatorV2, Session, Batch
service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)

# Single job — re-queues every call
est = EstimatorV2(mode=backend)
r1  = est.run([(isa, H, theta0)]).result()

# Session — low-latency burst, QPU held between submits
with Session(backend=backend) as sess:
    est = EstimatorV2(mode=sess)
    for k in range(100):
        r = est.run([(isa, H, theta)]).result()
        theta = update(theta, r[0].data.evs)

# Batch — parallel-safe, queue-amortized
with Batch(backend=backend) as bat:
    est = EstimatorV2(mode=bat)
    jobs = [est.run([(isa, H, t)]) for t in theta_grid]   # fire all
    results = [j.result() for j in jobs]                   # gather
```

**Cost / SLA cheatsheet:**
```
                 Latency      $/shot   Throughput  Fairness
Single job       high         baseline low         high
Session          very low     baseline med         low (holds QPU)
Batch            amortized    baseline very high   medium
```

**Trade-offs:**
- Session **holds** the QPU — queue-fair systems may charge walltime, not just shot-time; long idle gaps between submits waste budget.
- Batch jobs are **reordered** by the scheduler; don't rely on submission order for correctness.
- Single jobs pay full queue latency each time — 50 single jobs ≫ 1 batch of 50.

**Pitfalls:**
- Using single-job inside a variational loop — IBM queue latency (often minutes) dominates; 1000-iter VQE becomes impossible.
- Using Session for an embarrassingly-parallel sweep — wastes walltime serially, and other users can't share.
- Mixing Session and Batch in one script — the `mode=` argument is per-primitive; reusing across contexts throws.
- Forgetting to close a Session — charged until timeout (usually 15 min idle).

**Rule of thumb:** Variational loop → Session; parameter sweep → Batch; one-off circuit → single job — and never run a 100-iter VQE with single-job submits unless you enjoy watching the queue bar more than your optimizer's cost curve.
