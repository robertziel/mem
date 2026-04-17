### Transpilation and Circuit Optimization Passes

**What it is:** Transpilation is the process of rewriting a quantum circuit to (1) use only gates available on the target device, (2) respect its qubit connectivity, and (3) minimize depth / gate count / error. In Qiskit it is a pipeline of passes orchestrated by a `PassManager`.

**Four stages of the Qiskit transpiler:**

| Stage     | Purpose                                           | Example passes                          |
|-----------|---------------------------------------------------|-----------------------------------------|
| layout    | Pick initial logical → physical qubit mapping    | `VF2Layout`, `SabreLayout`, `TrivialLayout` |
| routing   | Insert SWAPs for nonadjacent 2Q gates             | `SabreSwap`, `BasicSwap`, `LookaheadSwap` |
| translation | Rewrite gates into device basis set             | `BasisTranslator`, `UnitarySynthesis`   |
| optimization | Reduce gate count / depth                      | `CommutativeCancellation`, `Optimize1qGates`, `ConsolidateBlocks` |

**Optimization levels (`optimization_level=0..3`):**

| Level | Meaning                                                                 |
|-------|-------------------------------------------------------------------------|
| 0     | No optimization; trivial layout; minimal SWAPs                          |
| 1     | Light optimization; merges adjacent 1Q rotations                        |
| 2     | Medium; noise-aware layout (VF2), commutation-based cancellation       |
| 3     | Heavy; multiple trials of Sabre routing, unitary resynthesis, plugin-driven heavy optimization |

Higher levels = longer compile time, typically fewer gates but not always (stochastic passes).

**Key optimization passes:**
- **CommutativeCancellation** — detects gates that commute and cancel (e.g., Rz·Rz′ on the same qubit merges; two adjacent CNOTs on the same pair cancel).
- **Optimize1qGates / Optimize1qGatesDecomposition** — fuses runs of single-qubit gates into one U gate, then re-decomposes into basis.
- **ConsolidateBlocks + UnitarySynthesis** — groups contiguous 2Q operations into unitary blocks and resynthesizes with minimum CNOTs (KAK).
- **CXCancellation** — cancels back-to-back CNOTs between the same pair.
- **TemplateOptimization** — matches known identity templates (e.g., H·Z·H = X).

**Qiskit — typical invocation:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import generate_preset_pass_manager
from qiskit_ibm_runtime.fake_provider import FakeKyiv

backend = FakeKyiv()
qc = QuantumCircuit(5)
qc.h(0)
for i in range(4): qc.cx(i, i+1)
qc.measure_all()

# Preset pass manager (preferred modern API)
pm = generate_preset_pass_manager(optimization_level=3, backend=backend)
transpiled = pm.run(qc)
print("depth:", transpiled.depth(), "ops:", transpiled.count_ops())

# Legacy single-call form (still supported)
t2 = transpile(qc, backend=backend, optimization_level=3)

# Custom pass manager
from qiskit.transpiler import PassManager
from qiskit.transpiler.passes import Optimize1qGates, CXCancellation
pm_custom = PassManager([Optimize1qGates(), CXCancellation()])
```

**Trade-offs:**
- Deep optimization can increase compile time from seconds to minutes.
- Stochastic passes (Sabre) — run multiple trials (`trials=N`) and keep best.
- Noise-aware layout (level 2+) improves fidelity more than gate count reduction on NISQ.

**Rule of thumb:** Use `optimization_level=3` with a specific backend for production runs; use level 1 during rapid iteration when you just want something that runs.
