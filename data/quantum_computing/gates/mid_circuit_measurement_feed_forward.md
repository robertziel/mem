### Mid-Circuit Measurement and Classical Feed-Forward

**What it is:**
Measure a qubit **during** a circuit (not just at the end), condition subsequent gates on the classical outcome, and optionally **reset** the qubit to reuse it. Enables **teleportation**, **QEC syndrome cycles**, **measurement-based quantum computing**, **dynamic circuits**, and qubit recycling on small devices.

**The three capabilities:**
| Capability | Effect |
|---|---|
| Mid-circuit measurement | collapse + classical bit, rest of circuit continues |
| Reset | deterministic `|ψ⟩ → |0⟩` (measurement + conditional X) |
| Feed-forward | apply / skip later gates based on classical bit in **real time** |

**Canonical use — teleportation:**
```
Alice: |ψ⟩ ──■── H ── M₁ ─┐
Bell pair: ──⊕──────── M₂ ─┼─ classical bits → Bob
Bob:       ──────────────  ─── X^M₂ ── Z^M₁ ── = |ψ⟩
```
Requires **real-time classical control** — M₁, M₂ must reach Bob before his qubit decoheres.

**Qiskit — `c_if` (legacy) vs dynamic circuits:**
```python
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister

q = QuantumRegister(2); c = ClassicalRegister(1)
qc = QuantumCircuit(q, c)
qc.h(0); qc.cx(0, 1)
qc.measure(0, 0)
qc.x(1).c_if(c, 1)                  # legacy, still supported
qc.measure(1, 0)

# Dynamic circuits (OpenQASM 3 style) — preferred on new backends
from qiskit.circuit.classical import expr
qc2 = QuantumCircuit(2, 2)
qc2.h(0); qc2.measure(0, 0)
with qc2.if_test((qc2.clbits[0], 1)):
    qc2.x(1)
```

**Backend support (as of 2026):**
| Backend | MCM | Reset | Feed-forward | Dynamic (if/for/while) |
|---|---|---|---|---|
| IBM Heron r2 / Condor | yes | yes | yes | yes (QASM3) |
| IonQ Forte | yes | yes | yes | limited |
| Quantinuum H2 | yes | yes | yes | full (best-in-class) |
| Google Willow | yes | limited | limited | partial |
| Atom Computing | yes | partial | early-stage | partial |
| Simulator (Aer) | yes | yes | yes | yes |

**Latency matters:**
- **Feed-forward latency** = classical readout + FPGA decision + gate trigger. Current IBM: ~1 µs. Compare to T₂ ≈ 100 µs on superconducting → ~1% decoherence budget per feed-forward.
- **Quantinuum ion traps** have ms-scale gates but feed-forward is ~µs → effectively free.
- **QEC cycles** depend critically on this ratio — the **decoder threshold** depends on whether syndrome extraction finishes inside coherence time.

**When to use:**
- **QEC syndrome extraction**: measure ancillas, decode, apply corrections all in one shot.
- **Repeat-until-success** gate synthesis (e.g., some non-Clifford gates).
- **Magic state distillation**: verification measurements that keep/discard states.
- **Qubit recycling**: measure + reset lets 2 physical qubits execute 4-qubit logical circuits at the cost of wall-clock time.
- **Dynamic algorithms**: adaptive QPE, variational circuits with mid-circuit parameter updates.

**Pitfalls:**
- **Measurement ≠ projector on hardware**: real MCM leaks (T1 during readout ~µs), and nearby qubits may experience crosstalk (measurement-induced dephasing).
- **Not all backends support reset** — emulation via "measure + conditional X" works but doubles the measurement overhead.
- **Latency budget**: if feed-forward takes too long, the controlled qubit decoheres before the gate fires — always measure round-trip time (RTT) with a calibration circuit.
- **Simulator ≠ hardware**: Aer runs MCM ideally; real backends have readout error that is *much* larger than gate error (typically 1-2% vs 0.1%).
- **Compiler passes**: many transpiler optimizations assume no measurement before the end — `c_if` and dynamic circuits break those; stick to `optimization_level=1` or explicitly preserve control flow.

**Rule of thumb:** Treat a mid-circuit measurement as a **~1% depolarizing channel plus a 1 µs delay**; if your algorithm still wins after that budget, you're in business — if not, re-design to measure only at the end.
