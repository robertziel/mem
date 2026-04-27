### Mid-Circuit Measurement and Feedback — Dynamic-Circuit Patterns

**Pattern:** Measure a qubit partway through the circuit, route the classical bit through runtime, and condition subsequent quantum operations on it. Enables **teleportation**, **qubit reuse**, **measurement-based state preparation**, and **distillation of higher-fidelity logical qubits**. Implemented in Qiskit via `qc.measure(q, c)` followed by `with qc.if_test((c, 1)):` (or legacy `.c_if()`).

**When to use:**
- **Qubit reuse** — free a qubit after its entanglement is harvested (shrinks width, grows depth).
- **Teleportation-based routing** — cross a sparse device graph by teleporting rather than SWAP-chain.
- **Repeat-until-success** state preparation (magic-state distillation, adaptive ansatz).
- **Real-time syndrome extraction** in early error-correction experiments.

**Feedback pattern (Qiskit dynamic-circuit syntax):**
```python
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

qr = QuantumRegister(3, "q")
cr = ClassicalRegister(1, "c")
qc = QuantumCircuit(qr, cr)

# Bell pair between q1 and q2
qc.h(qr[1]); qc.cx(qr[1], qr[2])
# Teleport q0 -> q2
qc.cx(qr[0], qr[1]); qc.h(qr[0])
qc.measure(qr[0], cr[0])
with qc.if_test((cr[0], 1)):    # new-style condition (dynamic)
    qc.z(qr[2])
# q2 now carries the teleported state; q0, q1 are free to reuse
```

**Latency budget (order-of-magnitude, 2025 hardware):**

| Stage | Superconducting | Trapped ion | Neutral atom |
|-------|-----------------|-------------|--------------|
| Single-shot readout | 0.5–2 us | 10–100 us | 1–10 us |
| Classical round-trip | 0.5–1 us (FPGA) | 1–5 us | 10+ us |
| Reset / conditional gate | 1–10 us | 100 us | 50+ us |
| Total feedback cycle | ~5 us | ~200 us | ~100 us |

Meanwhile **coherence (T2)** is typically 50–200 us on superconducting — you get at most ~30 feedback rounds before decoherence dominates.

**Trade-offs:**
- **Pro:** Lets you do things fundamentally impossible without feedback (teleportation, non-Clifford via gate teleportation, adaptive protocols).
- **Con:** Latency is the dominant cost; every feedback round eats coherence. Not all backends support it, and of those that do, not all support **nested** conditions (`if` inside `while`) or general comparators.
- **Con:** Dynamic circuits serialize through a classical controller — many backends throttle concurrency or charge extra.

**Pitfalls:**
- Using `.c_if()` on a bit that has not been `measure`'d first in the same shot — silent behavior differs by backend.
- Expecting `if_test` to branch mid-way through a **parallel** 2q-gate layer — the compiler may serialize the whole layer.
- Ignoring `T2` vs feedback-cycle latency — 5 feedback rounds at 10 us is 50 us of idle on the waiting qubits. Apply dynamical decoupling during the wait.
- Relying on `c_if(creg, N)` where backend only supports single-bit conditions — compile error or silent drop.
- Mid-circuit measurement is often **more error-prone** than end-of-circuit measurement because the readout resonator state bleeds into remaining qubits — include readout crosstalk in your error budget.

**Comparison — static vs dynamic circuits:**

| Axis | Static | Dynamic (with feedback) |
|------|--------|-------------------------|
| Width needed | Grows with entanglement depth | Constant if qubits reused |
| Depth | Smaller | Larger (feedback adds idle) |
| Backend support | All | Subset (Heron, Eagle, ion traps) |
| Compiler maturity | High | Evolving; varies by vendor |
| Gets you | Deterministic unitary | Probabilistic protocols, teleportation, early QEC |

**Example:** Qubit reuse in a 20q ansatz on a 10q device — ancilla q0 is entangled, measured, and reused; the width halves, depth doubles, feedback adds ~5 us per reuse. Net: runs on half the hardware at ~1.5x wall-clock.

**Rule of thumb:** Dynamic circuits unlock capabilities nothing else can provide — but treat every feedback cycle as 10 us of idle per qubit; if your algorithm needs more than `T2 / cycle` rounds, the scheme will not fit, regardless of how clever the logic is.
