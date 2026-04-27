### Quantinuum pytket — Cross-Platform Compiler with PHIR Hybrid IR

**What it is:**
pytket is Quantinuum's Python SDK whose distinguishing feature is a **high-quality compiler** that retargets circuits across most major backends (IBM, IonQ, Quantinuum, AWS, Google, Rigetti, Azure). Its central object is `pytket.Circuit` — an LLVM-style mutable DAG — and its central workflow is a pipeline of **passes** (`CompilationPass` objects) that rewrite that DAG. At the top of the stack, pytket can emit **PHIR** (Pytket Hybrid Intermediate Representation), a JSON-based IR designed for programs that mix quantum ops, mid-circuit measurements, and classical control flow for devices like Quantinuum H-series.

**Core objects:**

| Object | Role |
|---|---|
| `pytket.Circuit(n_q, n_c)` | Mutable circuit DAG |
| `pytket.passes.*` | Named compilation passes (rewrites) |
| `pytket.predicates.*` | Assertions over circuits (e.g. `GateSetPredicate`) |
| `pytket.extensions.<vendor>` | Backend plugins (`pytket-qiskit`, `pytket-braket`, ...) |
| PHIR JSON | Portable hybrid IR output |

**Headline passes:**

| Pass | Purpose |
|---|---|
| `FullPeepholeOptimise` | Depth + gate count reduction via peephole rules |
| `CliffordSimp` | Aggressive Clifford-subcircuit simplification |
| `RemoveRedundancies` | Drops identity compositions, cancels H-H, etc. |
| `DecomposeBoxes` | Expands custom boxes into primitive gates |
| `RebaseTket`, `RebaseQuil`, `RebaseIBM` | Retarget to a gate set |
| `PlacementPass`, `RoutingPass` | Topology mapping |
| `SequencePass([...])` | Compose passes in order |

**API shape:**
```python
from pytket import Circuit
from pytket.passes import FullPeepholeOptimise, CliffordSimp, SequencePass
from pytket.extensions.qiskit import IBMQBackend

circ = Circuit(3, 3)
circ.H(0).CX(0, 1).CX(1, 2)
circ.Measure(0, 0).Measure(1, 1).Measure(2, 2)

pipeline = SequencePass([FullPeepholeOptimise(), CliffordSimp()])
pipeline.apply(circ)

backend = IBMQBackend("ibm_torino")
compiled = backend.get_compiled_circuit(circ, optimisation_level=2)
handle = backend.process_circuit(compiled, n_shots=2000)
counts = backend.get_result(handle).get_counts()
```

**Why people switch to pytket just for compilation:**
On non-trivial circuits, `FullPeepholeOptimise` + `CliffordSimp` frequently produce lower CX counts than Qiskit's `optimization_level=3`, especially for Clifford-heavy ansatz (stabilizer preps, error-correction-like structures). Teams often author in Qiskit, convert via `pytket.extensions.qiskit.qiskit_to_tk`, compile in pytket, then convert back.

**PHIR — the hybrid IR:**
PHIR is a JSON schema describing a quantum program interleaved with classical operations: bit registers, arithmetic, conditional jumps, mid-circuit measurement, classical feedback. It's the native target for Quantinuum H-series, which supports real-time classical computation between quantum ops.

```python
from pytket.qir import pytket_to_phir

phir_json = pytket_to_phir(compiled)
# Schema: {"format": "PHIR/JSON", "ops": [ {"qop": "RZ", "args": [0.5], "returns": [["q", 0]]}, ... ]}
```

| IR | Owner | Strength |
|---|---|---|
| OpenQASM 3 | IBM-led | Human-readable source + portability |
| QIR | Microsoft / QIR Alliance | LLVM IR target for compilers |
| PHIR | Quantinuum | Hybrid quantum-classical with live control |
| Quil-T | Rigetti | Pulse-level timed operations |

**When to use:**
- You care about circuit depth or two-qubit gate count and Qiskit's passes aren't closing the gap.
- You target Quantinuum H-series and need real-time classical feedback — PHIR is the right IR.
- You need to move a circuit between two vendor SDKs without hand-translating; pytket's extension ecosystem is the most complete.

**Pitfalls:**
- `FullPeepholeOptimise` assumes a canonical gate set internally — run `DecomposeBoxes()` first if your circuit contains custom gate boxes, or the pass silently skips them.
- Wire/qubit indices in pytket are *not* identical to Qiskit's — `qiskit_to_tk`/`tk_to_qiskit` round-trips are faithful, but hand-indexed lookups on a tket circuit won't match raw `QuantumCircuit`.
- PHIR consumers vary in coverage — some backends only accept a subset of the op list.
- A pass that fails predicates raises rather than falling back; always wrap untrusted pipelines in `try/except` or use `apply(circ, allow_missing=True)` where available.

**Rule of thumb:** Use pytket as your circuit compiler even if you don't use it as your circuit authoring tool — author where you're comfortable (Qiskit, Cirq, Braket), convert in, optimize with `FullPeepholeOptimise` + `CliffordSimp`, convert back out; reach for PHIR whenever a Quantinuum device or hybrid-control program is in the loop.
