### Circuit Testing with Reference States — Property-Based Tests for Quantum Code

**What it is:** A testing discipline that replaces "run the circuit and eyeball the histogram" with deterministic assertions against known-good references: a target statevector, a target unitary, or a target reduced state. Because simulation is exact below ~28 qubits, unit tests can be as sharp as in classical code — `assertTrue(U == V)` style, not "distributions look similar".

**When to use:**
- Every circuit you commit. Teleportation primitives, encoder/decoder pairs, oracles, ansatz constructors.
- Any refactor of a gate decomposition ("is my optimized CCX still a CCX?").
- CI on PRs — these tests run in milliseconds and catch off-by-one qubit indexing instantly.

**Three reference styles:**

| Reference | Checks | API | Best for |
|---|---|---|---|
| Statevector | exact output on a fixed input | `Statevector.from_instruction(qc)` | State-prep circuits, oracles |
| Operator (unitary) | circuit equivalence up to global phase | `Operator(qc).equiv(Operator(other))` | Gate decompositions, optimizers |
| Partial trace | reduced-state correctness of a subsystem | `partial_trace(sv, keep)` | Teleportation, QEC, ancilla-discarding code |

**Pytest example (all three styles):**
```python
import numpy as np
import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, Operator, partial_trace

def bell_pair() -> QuantumCircuit:
    qc = QuantumCircuit(2)
    qc.h(0); qc.cx(0, 1)
    return qc

def test_bell_statevector():
    sv = Statevector.from_instruction(bell_pair())
    expected = Statevector([1, 0, 0, 1]) / np.sqrt(2)
    assert sv.equiv(expected)

def test_hh_cancels():
    qc = QuantumCircuit(1); qc.h(0); qc.h(0)
    assert Operator(qc).equiv(Operator(QuantumCircuit(1)))  # identity

def test_teleport_reduced_state():
    # After teleport + corrections, Bob's qubit should match msg input |+⟩
    from my_lib import teleport_circuit
    sv = Statevector.from_instruction(teleport_circuit(input_state="+"))
    bob = partial_trace(sv, qargs=[0, 1])
    assert np.isclose(bob.data[0, 0], 0.5) and np.isclose(bob.data[0, 1], 0.5)
```

**Parametrised equivalence (e.g. verify a decomposition over random angles):**
```python
@pytest.mark.parametrize("theta", np.linspace(0, 2 * np.pi, 8))
def test_rx_decomposition(theta):
    decomposed = QuantumCircuit(1); decomposed.h(0); decomposed.rz(theta, 0); decomposed.h(0)
    target = QuantumCircuit(1); target.rx(theta, 0)
    assert Operator(decomposed).equiv(Operator(target), atol=1e-10)
```

**Pitfalls:**
- **Global phase.** `Operator.equiv` ignores it; `Operator == Operator` does not. Use `.equiv` for decomposition tests.
- **Endianness.** Qiskit uses little-endian qubit ordering in `Statevector` — `|q_{n-1}...q_0⟩`. When you hand-write a `Statevector([...])` reference, the index ordering bites you.
- **Measurements in the circuit.** `Operator(qc)` fails if `qc` contains measurements — strip them or use `qc.remove_final_measurements(inplace=False)`.
- **Unitary size.** `Operator(qc)` is `2^n × 2^n` dense — fine for ≤ 10 qubits, memory-blow at 14+. For bigger circuits, test on a restricted input set via `Statevector.from_instruction`.

**Rule of thumb:** Prefer `Operator.equiv` for anything you claim is "the same circuit"; use `Statevector` checks for "the same output on a fixed input"; use `partial_trace` whenever ancillas or mid-circuit measurements are involved.
