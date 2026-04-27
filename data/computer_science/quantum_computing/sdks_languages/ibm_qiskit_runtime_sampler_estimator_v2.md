### IBM Qiskit Runtime — SamplerV2 & EstimatorV2 Primitives

**What they are:** Primitives are the standard IBM Runtime entry points for executing circuits on simulators or real QPUs. `SamplerV2` returns measurement outcomes (bitstring counts, per-classical-register); `EstimatorV2` returns expectation values `⟨ψ|H|ψ⟩` for supplied observables. V2 replaced V1 in 2024 with a new "pub" (primitive unit of work) shape that enables batched parameter sweeps and array-valued observables.

**Pub shape:**

| Primitive | Pub tuple | Result fields |
|---|---|---|
| `SamplerV2` | `(circuit, parameter_values?, shots?)` | `.data.<creg>.get_counts()`, `.data.<creg>.get_bitstrings()` |
| `EstimatorV2` | `(circuit, observables, parameter_values?, precision?)` | `.data.evs`, `.data.stds`, `.data.ensemble_standard_error` |

Observables use `ObservablesArray` (any shape-broadcastable collection of `SparsePauliOp` / Pauli strings). Parameters use `BindingsArray` (an N-dimensional sweep of parameter vectors). Shapes broadcast NumPy-style.

**API shape:**
```python
from qiskit_ibm_runtime import EstimatorV2, SamplerV2
from qiskit.quantum_info import SparsePauliOp
import numpy as np

H = SparsePauliOp.from_list([('ZZ', 1.0), ('XI', 0.3), ('IX', 0.3)])
thetas = np.linspace(0, np.pi, 11).reshape(11, 1)        # sweep of 11 parameter vectors

est = EstimatorV2(mode=backend)                          # or Session / Batch
job = est.run([(isa_circuit, H, thetas)])                # one pub, shape (11,)
result = job.result()                                    # PrimitiveResult
pub_res = result[0]                                      # PubResult
evs = pub_res.data.evs                                   # shape (11,)
stds = pub_res.data.stds
```

**Sampler V2 counts access:**
```python
samp = SamplerV2(mode=backend)
pub_res = samp.run([(isa_circuit, thetas)], shots=4096).result()[0]
counts = pub_res.data.meas.get_counts()                  # 'meas' = default creg name
```
The attribute on `.data` is the **classical register name**, not a fixed key — `measure_all()` creates a register called `meas`; named registers show up as `pub_res.data.<your_name>`.

**V1 → V2 breaking differences:**

| Aspect | V1 | V2 |
|---|---|---|
| Input | circuits + obs + params as parallel lists | list of **pubs** (tuples) |
| Obs shape | flat list per circuit | `ObservablesArray` (any shape) |
| Params shape | flat 2D list | `BindingsArray` (any shape) |
| Precision | `shots=` only | `precision=` or `shots=` (Estimator picks shots) |
| Result | list-of-lists | `PrimitiveResult` (indexable per-pub) |
| ISA input | optional | **mandatory** — circuits must be already transpiled for the target |

**Precision vs. shots:** `EstimatorV2` lets you set `precision=0.01` (target std error) instead of raw shots — the runtime picks shots per observable group. Pass `shots=` only when you specifically want a fixed budget.

**Why EstimatorV2 > manual counts:** EstimatorV2 auto-groups commuting Pauli terms into shared measurement bases (Abelian grouping), runs one circuit per group, and combines results. A hand-rolled estimator from SamplerV2 + post-processing typically uses 3–10× more shots to hit the same precision.

**ISA requirement:**
Both V2 primitives reject non-ISA circuits. Always run through `generate_preset_pass_manager(backend=bk).run(qc)` first, and apply the same layout to observables with `observable.apply_layout(isa_circuit.layout)`.

**Pitfalls:**
- Passing a raw `QuantumCircuit` (not ISA) to a V2 primitive → `IBMInputValueError`.
- Forgetting `observable.apply_layout(circuit.layout)` — silently wrong results if transpile permuted qubits.
- Treating `PrimitiveResult` like a V1 list — it's a container; index by pub, then read `.data`.
- Mixing `shots=` with `precision=` on Estimator — pick one.

**Rule of thumb:** Always prefer `EstimatorV2` for expectation values (it auto-groups commuting observables and picks shots for you); reserve `SamplerV2` for actual bitstring distributions and mid-circuit measurement readout.
