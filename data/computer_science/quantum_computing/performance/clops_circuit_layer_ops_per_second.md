### CLOPS — Circuit Layer Operations Per Second

**What it is:**
CLOPS (Circuit Layer Operations Per Second) is a **throughput** metric: how many layers of a Quantum-Volume-style model circuit a device can execute per second, measured **end to end** including classical overhead (compilation, parameter update, classical communication, measurement readout, reset). Introduced by IBM in 2021 as a complement to QV, which measures fidelity but says nothing about speed.

**Definition:**
```
CLOPS = (M · K · S · D) / t_total
```
- `M` = # of templates (parameterized QV circuits), typically 100.
- `K` = # parameter updates per template, typically 10.
- `S` = shots per circuit, typically 100.
- `D` = depth (= QV width).
- `t_total` = wall-clock time including all classical overhead.

**What it captures vs. misses:**
| Metric | Captures | Misses |
|---|---|---|
| **Gate time** (e.g., 40 ns CNOT) | Physical gate speed | Compile, readout, reset, network |
| **Shots/second** | Per-circuit throughput | Parameter updates, variational loops |
| **CLOPS** | End-to-end throughput of variational workloads | Fidelity (use QV / EPLG) |
| **Time-to-solution** | What actually matters to users | Single-circuit latency only |

**Example — estimating CLOPS from a run:**
```python
import time
from qiskit.circuit.library import RealAmplitudes
from qiskit.primitives import StatevectorSampler
import numpy as np

M, K, S, D = 20, 5, 100, 4
sampler = StatevectorSampler()   # swap for real backend's sampler
ansatz = RealAmplitudes(num_qubits=D, reps=D)
ansatz.measure_all()
t0 = time.perf_counter()
for _ in range(M):
    for _ in range(K):
        theta = np.random.uniform(0, 2*np.pi, ansatz.num_parameters)
        sampler.run([(ansatz, theta)], shots=S).result()
dt = time.perf_counter() - t0
print(f"CLOPS ≈ {M*K*S*D / dt:.1f}")
```

**Why it matters:**
- **Variational workloads** (VQE, QAOA, QML training) issue millions of short circuits with small parameter updates; total runtime is dominated by classical pre/post-processing, not gate execution.
- **Queue + compile latency** can exceed gate time by 100–1000×; raw gate speed misleads on real workloads.
- **Dynamic circuits** and **mid-circuit measurement** add a new CLOPS axis: classical feedback latency.
- **Session / Runtime-style execution** (persistent process, cached compilation) can boost CLOPS 10–100× over one-shot job submission without touching hardware.

**Scaling with width `D`:**
By definition `CLOPS ∝ D`, so wider devices appear faster at fixed per-layer cost. To compare across widths, normalize: `CLOPS / D` gives a per-layer rate. Headline CLOPS numbers conflate width and speed — always read the width.

**Pitfalls:**
- **Apples-to-oranges across vendors:** IBM superconducting CLOPS (hundreds of thousands) and ion-trap CLOPS (hundreds) differ ~1000× but reflect very different physics; not a verdict on platform superiority.
- CLOPS ignores **fidelity** entirely — a device with `CLOPS = 10^5` and `QV = 8` produces lots of garbage fast.
- **Parameter-update model** is specific: CLOPS assumes you reuse a compiled template with new parameters. Non-parametric re-compilation workloads see far worse throughput.
- Classical infrastructure (network, SDK overhead) dominates; numbers can change 5× between SDK versions with no hardware change.

**When to care:**
- Designing variational / iterative workloads where wall-clock time per optimizer step matters.
- Comparing **managed runtime** vs. direct job submission.
- Budgeting cost on usage-billed systems (time × rate).
- Diagnosing whether a slow VQE is gate-bound or classical-stack-bound.

**Rule of thumb:** Look at CLOPS together with a fidelity metric (QV / EPLG / AQ); high CLOPS with low fidelity just means you generate noise faster, and pay particular attention to CLOPS if your algorithm closes a classical feedback loop around the quantum device.
