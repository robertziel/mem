### Microsoft Azure — Integrated Hybrid Computing

**What it is:**
Azure Quantum's **Integrated Hybrid Computing** mode lets a Q# program interleave classical control flow — `if`, `while`, `for`, integer arithmetic — with quantum operations *inside a single job* on hardware that supports it. The classical computation runs on the control system next to the QPU with microsecond-scale round-trip latency, so you can branch on a mid-circuit measurement and act on the result *within the coherence window*. Compare this to the "outer loop" style (VQE, QAOA) where every iteration is a fresh job and results come back in seconds-to-minutes.

**Why it matters:**
Some algorithms genuinely need measurement-conditioned next-step quantum ops:
- **Adaptive phase estimation** (iterative QPE) — read a bit, rotate by a function of it, repeat.
- **Quantum error correction** — syndrome extraction followed by real-time correction.
- **Repeat-until-success** state preparation (e.g. magic-state distillation).
- **Teleportation with live Pauli correction** — exactly the "two classical bits" step.

Without integrated hybrid you'd need to re-submit after each measurement — but by then the qubits have decohered and the protocol is broken.

**API shape (Q# on a hybrid-capable target):**
```qsharp
operation IterativeQpe(precision : Int, eigenOp : (Qubit => Unit is Adj + Ctl),
                       eigenstate : Qubit) : Int {
    mutable phaseBits = 0;
    use aux = Qubit();
    for k in precision-1..-1..0 {
        H(aux);
        Controlled (Repeated(eigenOp, 2^k))([aux], eigenstate);
        // Classical rotation conditioned on bits already measured
        R1Frac(-phaseBits, k + 1, aux);
        H(aux);
        let m = M(aux);               // <-- mid-circuit measurement
        Reset(aux);
        if m == One {
            set phaseBits += 1 <<< (precision - 1 - k);   // live classical update
        }
    }
    return phaseBits;
}
```
The branch on `m == One` is the whole point — outside integrated hybrid, you'd be forced to return `m` and resubmit.

**Supported targets (current):**
| Target | Hybrid? | Notes |
|---|---|---|
| `quantinuum.qpu.h1-1` / `h1-2` | Yes | Deepest support; real-time classical control |
| `quantinuum.sim.h1-1e` | Yes | Emulates the same hybrid model for testing |
| `ionq.qpu.*` | Limited | Base profile only — no mid-circuit feedback |
| `rigetti.qpu.*` | Limited | Subset of adaptive features |
| Microsoft simulators | Yes | Full Q# — least restrictive |

**Target capability profiles:**
| Profile | Measurement feedback? | Integer arithmetic mid-circuit? | Loop on classical reg? |
|---|---|---|---|
| Base | No | No | No |
| Adaptive | Yes | Limited | Bounded |
| Full | Yes | Yes | Yes |

Hybrid capability is selected via the target — `quantinuum.qpu.h1-1` accepts "Adaptive" profile programs; the compiler enforces this statically and will reject Q# features the target cannot execute.

**Submission (Python):**
```python
from azure.quantum import Workspace
import qsharp

ws = Workspace(resource_id=".../my-workspace", location="westus")
target = ws.get_targets("quantinuum.qpu.h1-1")
# `target_capability="AdaptiveExecution"` selects the hybrid backend
prog = qsharp.compile(open("iqpe.qs").read(),
                      target_profile=qsharp.TargetProfile.Adaptive)
job = target.submit(prog, shots=200, input_params={"precision": 6})
print(job.get_results())
```

**Pitfalls:**
- Not every Q# construct compiles under Adaptive. Recursive operations, arrays of qubits of unknown length, arbitrary range iteration — all may be rejected. Compile errors are your friend; they happen before you burn HQCs.
- Mid-circuit measurement cost is device-specific — on H1 it's sub-millisecond but nonzero; on devices without real classical control it's absent entirely.
- Integrated hybrid jobs are billed as *one* job with complex classical+quantum operation counts — Quantinuum HQC estimates can be 2–5× higher than the non-hybrid equivalent for the same number of shots.
- Simulators may accept programs that a real QPU rejects. Always compile against the target capability profile you'll ship to.

**vs outer-loop hybrid (VQE-style):**
| Axis | Integrated hybrid | Outer loop (Python ↔ QPU) |
|---|---|---|
| Round-trip | µs (on chip) | seconds–minutes |
| Coherence budget | intact | broken between iters |
| Use case | QEC, iterative QPE, RUS | VQE, QAOA |
| Complexity | High, target-specific | Simple, portable |

**Rule of thumb:** Reach for integrated hybrid when you need to condition *the next gate* on a measurement result — anything else (parameter optimization, shot averaging) belongs in an outer loop, because the capability profile restrictions are strict and debugging an adaptive-profile Q# program without a simulator is brutal.
