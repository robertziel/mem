### IBM Qiskit — Transpiler and Pass Manager

**What it is:** The `PassManager` is the programmable pipeline that turns an abstract `QuantumCircuit` into one the target backend can actually run: basis-legal, connectivity-legal, and (optionally) heavily optimized. Modern Qiskit (1.x / 2.x) exposes two entry points: the preset builder `generate_preset_pass_manager` and the explicit `StagedPassManager` for custom flows.

**Two construction styles:**

| Style | Call | When |
|---|---|---|
| Preset | `generate_preset_pass_manager(optimization_level, backend=bk)` | 95% of real work — tuned stages, sensible defaults |
| Staged | `StagedPassManager(stages=[...])` with per-stage `PassManager`s | Research, custom layouts, benchmark harnesses |
| Flat | `PassManager([pass1, pass2, ...])` | One-off experiments, teaching |

**API shape:**
```python
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke

backend = FakeSherbrooke()
pm = generate_preset_pass_manager(
    optimization_level=2,
    backend=backend,
    seed_transpiler=42,          # pin stochastic passes (Sabre) for reproducibility
)
isa_circuit = pm.run(qc)         # returns a transpiled QuantumCircuit
```

**Optimization levels:**

| Level | Layout | Routing | Opt passes | Compile time | Typical 2Q-gate reduction |
|---|---|---|---|---|---|
| 0 | Trivial | Basic | none | ~ms | 0% (baseline) |
| 1 | VF2 (light) | Sabre (few trials) | 1Q merge | ~100ms | 10–30% |
| 2 | VF2 + Sabre | Sabre (more trials) | commutation cancel, 2Q block consolidate | ~seconds | 30–50% |
| 3 | Multi-trial Sabre | Multi-trial Sabre | full plugin opt, unitary resynthesis | ~seconds–minutes | 40–60% |

Level 3 is often **10× slower** than level 1 for only a few extra percent depth reduction — profile before using it in a tight outer loop.

**Staged pass manager:**
```python
from qiskit.transpiler import PassManager, StagedPassManager
from qiskit.transpiler.passes import VF2Layout, SabreSwap, Optimize1qGates

layout_pm       = PassManager([VF2Layout(coupling_map=backend.coupling_map)])
routing_pm      = PassManager([SabreSwap(coupling_map=backend.coupling_map)])
optimization_pm = PassManager([Optimize1qGates()])

spm = StagedPassManager(
    stages=['layout', 'routing', 'optimization'],
    layout=layout_pm, routing=routing_pm, optimization=optimization_pm,
)
out = spm.run(qc)
```

**Stages (canonical order):** `init → layout → routing → translation → optimization → scheduling`. Each is optional; preset managers fill them all.

**Reproducibility:**
`seed_transpiler` is mandatory for any run you want to re-produce — Sabre routing trials are stochastic and can differ by tens of SWAPs between identical calls. Set it at the preset level; it propagates into each stochastic sub-pass.

**Custom passes — common ones worth knowing:**
- `ALAPScheduleAnalysis` / `ASAPScheduleAnalysis` — time-ordering for pulse-level dynamics.
- `PadDynamicalDecoupling` — inserts DD sequences on idle qubits (cheap error mitigation).
- `UnitarySynthesis(plugin_config=...)` — plug in a KAK, QSD, or ML-based synthesizer.
- `RemoveBarriers` — strip user barriers (careful: they may have been load-bearing for scheduling).

**When to write a custom PM:**
- You want to inject DD between routing and translation.
- You're benchmarking a new layout algorithm.
- Preset levels waste time on passes that don't apply (e.g., pure Clifford circuits).

**Pitfalls:**
- Calling `transpile(qc, ...)` (the legacy top-level function) and a `PassManager` on the same circuit — the legacy call already ran a preset; the second pass may regress.
- Forgetting to pass `backend=` — without it, layout/routing stages skip, and your "transpiled" circuit is still abstract.
- Using `optimization_level=3` inside a training loop that calls `run` 10 000 times — total compile time dominates the quantum cost.

**Rule of thumb:** Default to preset level 1 during iteration, level 2 for real hardware runs, level 3 only for hero-number demos — and always pin `seed_transpiler`.
