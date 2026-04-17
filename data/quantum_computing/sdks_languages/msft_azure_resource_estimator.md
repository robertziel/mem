### Microsoft Azure — Resource Estimator (microsoft.estimator)

**What it is:**
`microsoft.estimator` is a *non-executing* Azure Quantum target that takes a Q# or QIR program plus a hardware/error-correction model and returns a JSON breakdown of the resources required to run it **fault-tolerantly** — logical qubit count, physical qubit count, T-count, rotation count, runtime hours, wall-clock depth, and a suggested code distance. No shots, no actual quantum execution — just arithmetic on the logical resource graph.

**Why it matters:**
Most "quantum advantage" claims live or die on whether the algorithm fits in a plausible future QPU. The estimator answers questions like:
- If I used surface code at `p = 10⁻³`, how many physical qubits to factor RSA-2048?
- How does Shor vs HHL vs QSVT compare at the same precision target?
- Does my algorithm hit a million-qubit regime or a billion-qubit regime?
Running it **before** you touch hardware surfaces every ugly scaling issue cheaply.

**API shape:**
```python
from azure.quantum import Workspace
import qsharp

ws = Workspace(resource_id=".../my-workspace", location="westus")
est = ws.get_targets("microsoft.estimator")

prog = qsharp.compile("""
    operation FactorDemo(n : Int) : Unit {
        // ... Shor-like body ...
    }
""", target_profile=qsharp.TargetProfile.Base)

job = est.submit(prog, input_params={
    "errorBudget": 0.001,
    "qubitParams": {"name": "qubit_gate_ns_e3"},
    "qecScheme": {"name": "surface_code"},
})
result = job.get_results()
```

**Input knobs:**
| Knob | Meaning | Typical values |
|---|---|---|
| `errorBudget` | Total logical error probability budget | 0.01 → 10⁻⁵ |
| `qubitParams.name` | Physical qubit template | `qubit_gate_ns_e3`, `qubit_gate_us_e3`, `qubit_maj_ns_e6` |
| `qecScheme.name` | Error-correcting code | `surface_code`, `floquet_code` |
| `constraints.maxDuration` | Cap on wall-clock | e.g. `"1 day"` |
| `constraints.maxPhysicalQubits` | Cap on hardware | forces estimator to say "infeasible" past this |

The qubit templates abstract real hardware into categories:
| Template | Gate time | Gate error | Represents |
|---|---|---|---|
| `qubit_gate_ns_e3` | 100 ns | 10⁻³ | Superconducting |
| `qubit_gate_us_e3` | 100 µs | 10⁻³ | Ion-trap |
| `qubit_maj_ns_e6` | 100 ns | 10⁻⁶ | Majorana (aspirational) |

**Output — the JSON breakdown:**
```json
{
  "physicalCounts": {
    "physicalQubits": 14300,
    "runtime": 8412000000,         // nanoseconds
    "breakdown": {
      "algorithmicLogicalQubits": 17,
      "numTfactories": 13,
      "logicalDepth": 62300000
    }
  },
  "logicalCounts": { "tCount": 3120000, "rotationCount": 0, "measurementCount": 17 },
  "logicalQubit": { "codeDistance": 15 },
  "errorBudget": { "total": 0.001, "logical": 3.3e-4, "tStates": 3.3e-4 }
}
```
Notable fields:
| Field | Meaning |
|---|---|
| `algorithmicLogicalQubits` | Logical qubits the algorithm itself occupies |
| `numTfactories` | Concurrent T-state distillation factories required |
| `logicalDepth` | Logical-cycle depth (proxy for runtime) |
| `codeDistance` | Suggested surface-code distance to hit the error budget |
| `physicalQubits` | Total including T-factories and routing overhead |

Most of the physical qubit count is typically *T-factories*, not algorithm qubits — a single T-factory can dwarf the logical register by 10×.

**Interpreting results:**
- Sweep `errorBudget` — cost usually scales sub-linearly (log terms dominate).
- Sweep qubit templates — ion-trap templates blow up `runtime`; superconducting templates blow up `physicalQubits`.
- If `numTfactories` is huge, look for non-Clifford savings (Measurement-based gates, repeat-until-success, magic-state recycling).

**Pitfalls:**
- The estimator assumes **ideal FT architecture** — real engineering overheads (cryogenics, control wiring, interconnect) are *not* modeled. Use the number as a lower bound.
- Precision on `rotationCount`: arbitrary-angle rotations are synthesized into Clifford+T; the estimator uses Ross–Selinger synthesis cost by default. Changing the synthesis precision changes T-count linearly.
- Results depend heavily on assumed qubit parameters. Publishing "Shor needs 14K qubits" without naming the template and error budget is meaningless.
- The estimator target is free, but compiling QIR for very large programs can take minutes. Cache compiled artefacts.

**Rule of thumb:** Run `microsoft.estimator` before your first hardware submission — in an afternoon it will tell you whether your algorithm is a 100-qubit idea or a 10M-qubit pipe dream, which is the one fact worth knowing before sinking engineering cycles.
