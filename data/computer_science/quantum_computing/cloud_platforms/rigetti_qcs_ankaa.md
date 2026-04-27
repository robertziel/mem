### Rigetti Quantum Cloud Services — QCS & Ankaa

**What it is:**
Rigetti's native cloud for its superconducting QPUs. QCS (Quantum Cloud Services) is the endpoint, **pyQuil** is the host SDK, and **Quil** / **Quil-T** are the submission IRs. The flagship device family is the **Ankaa-class** — tunable-coupler superconducting processors on a square lattice — with matched noisy simulators (QVM, Quantum Virtual Machine). Rigetti QPUs also appear inside AWS Braket, but QCS is the only route that exposes **pulse-level (Quil-T)** control.

**Access model:**
| Layer | What it is |
|---|---|
| Account | QCS identity + secret key (CLI-managed) |
| Engagement | A reserved or on-demand device session |
| QPU | Named device (Ankaa-class processor) |
| QVM | Classical simulator of the same Quil IR (used for iteration) |
| Quilc | Compiler daemon that transpiles Quil to native gates on the target |

**Stack layout — why there are three processes:**
| Process | Role |
|---|---|
| Your Python | pyQuil builds `Program` / runs algorithms |
| `quilc` | Daemon that compiles Quil → native gates for the chosen QPU / QVM |
| `qvm` (local) or QCS engagement (remote) | Executes the compiled program |

On your laptop you run `quilc -S` and `qvm -S` as background services; pyQuil talks to them over a socket. Against real hardware, the engagement layer takes the place of the local `qvm`.

**Connecting:**
```python
from pyquil import Program, get_qc
from pyquil.gates import H, CNOT, MEASURE

# Local simulator — no credentials needed, needs quilc + qvm running
qvm = get_qc("2q-qvm")
p = Program(H(0), CNOT(0, 1))
ro = p.declare("ro", "BIT", 2)
p += [MEASURE(0, ro[0]), MEASURE(1, ro[1])]
p.wrap_in_numshots_loop(1000)
result = qvm.run(qvm.compile(p)).get_register_map()["ro"]

# Real QPU — name resolved against QCS via `qcs` CLI credentials
ankaa = get_qc("Ankaa-3")                              # or whichever Ankaa target is live
exe = ankaa.compile(p)
result = ankaa.run(exe).get_register_map()["ro"]
```

**Pulse-level access (Quil-T):**
Quil-T extends Quil with pulse, frame, and waveform primitives — you can `DEFCAL` your own gate implementations, measure with custom readout waveforms, or run calibration experiments. This surface is **QCS-only**; Braket exposes gate-level Rigetti devices but not the pulse layer.

```python
# Sketch — custom calibration overriding RX(pi/2) on qubit 0
program = Program("""
DEFCAL RX(pi/2) 0:
    FENCE 0
    PULSE 0 "rf" gaussian(duration: 40e-9, fwhm: 10e-9, t0: 20e-9, scale: 0.5, phase: 0, detuning: 0)
""")
```

**Ankaa-class traits (durable):**
- **Square-lattice topology** with tunable couplers — nearest-neighbor 2-qubit gates; compilation costs scale with SWAP insertion for non-local algorithms.
- **Parametric iSWAP-family** native 2-qubit gate, decomposed from CZ/CNOT by `quilc`.
- Fast gate times typical of superconducting platforms; decoherence, not clock, is the budget.

**QCS vs Braket route:**
| Capability | QCS direct | Braket |
|---|---|---|
| Gate-level submission | Yes | Yes |
| Pulse-level (Quil-T) | Yes | No |
| Parametric compilation + replay | Yes | Limited |
| Integrates with AWS Step Functions / Lambda | No | Yes |

**Pitfalls:**
- Forgetting to start `quilc` and `qvm` daemons locally — pyQuil fails with a connection error on `.compile()` or `.run()`.
- Hardcoding an Ankaa generation name — devices retire; use `list_quantum_computers()` and filter.
- Using parametric compilation (pre-compiled binaries) but then mutating the program structure between shots — `quilc` has to recompile, erasing the latency win.
- Expecting Braket's Rigetti backend to accept Quil-T — it won't; downgrade to gate-level Quil or switch to QCS.

**Rule of thumb:** Use QCS + pyQuil when you need pulse-level (Quil-T) control, calibration experiments, or parametric-compile replays; use Braket when you just want gate-level shots and AWS integration is worth more than the extra control surface.
