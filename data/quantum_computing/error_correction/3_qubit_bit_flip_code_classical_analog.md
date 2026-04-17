### 3-Qubit Bit-Flip Code (Classical Repetition Analog)

**What it is:** The simplest quantum repetition code. Encodes 1 logical qubit in 3 physical qubits. Corrects a single X error (bit flip). Does **not** correct Z (phase) errors — so it is not a full QEC code but an essential pedagogical building block and a component of Shor's 9-qubit code.

**Encoding:**

|0⟩_L = |000⟩
|1⟩_L = |111⟩
α|0⟩ + β|1⟩ → α|000⟩ + β|111⟩

**Encoding circuit (2 CNOTs):**

```
|ψ⟩ ─●─●─       α|0⟩+β|1⟩
|0⟩ ─X─│─       →   α|000⟩ + β|111⟩
|0⟩ ───X─
```

**Stabilizers:** [[3, 1, 1]] code for X-errors (distance 3 in the classical sense; quantum distance is 1 because Z flips are logical).

Generators:
- g_1 = Z_1 Z_2
- g_2 = Z_2 Z_3

Logical operators:
- X̄ = X_1 X_2 X_3
- Z̄ = Z_1 (or Z_2, Z_3; all equivalent mod stabilizers)

**Syndromes and correction:**

| Syndrome (g_1, g_2) | Error | Correction |
|---|---|---|
| (+1, +1) | I | none |
| (−1, +1) | X_1 | apply X_1 |
| (−1, −1) | X_2 | apply X_2 |
| (+1, −1) | X_3 | apply X_3 |

Classical analog: majority vote on three copies. Quantum version does the vote without measuring the encoded bit.

**Syndrome extraction circuit:**

```
q0  ─────●─────────
q1  ─────│──●──●──
q2  ─────│──│──│──●
a0  |0⟩──X──X─────── M → s1
a1  |0⟩────────X──X─ M → s2
```

**Why it only catches X, not Z:**

Under a Z error on qubit i: Z_i · (α|000⟩ + β|111⟩) = α|000⟩ − β|111⟩ for any i — indistinguishable outcome regardless of which qubit flipped. All Z_i commute with both stabilizers, so syndrome is trivial and the phase flip is undetected. Worse: Z_1 ≈ Z_2 ≈ Z_3 as logical Z̄, so any single Z is logical error.

**Failure analysis:**

- Under independent X error with rate p: logical error rate ~3p² (two or three flips).
- Under independent Z error with rate p_Z: logical error ~p_Z (code is worse than no encoding!).

This asymmetry — code helps one kind of error and hurts the other — is why Shor concatenated it with a phase-flip code.

**Qiskit snippet:**
```python
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
data = QuantumRegister(3, 'd'); anc = QuantumRegister(2, 'a')
c = ClassicalRegister(2)
qc = QuantumCircuit(data, anc, c)
# encode
qc.cx(data[0], data[1]); qc.cx(data[0], data[2])
# syndrome g1 = Z0Z1, g2 = Z1Z2
qc.cx(data[0], anc[0]); qc.cx(data[1], anc[0])
qc.cx(data[1], anc[1]); qc.cx(data[2], anc[1])
qc.measure(anc, c)
```

**Stim (one round, bit-flip repetition):**
```
R 0 1 2 3 4
CX 0 1 0 2
DEPOLARIZE1(0.01) 0 1 2
CX 0 3 1 3 1 4 2 4
M 3 4
```

**Rule of thumb:** The 3-qubit code is a pedagogy tool, not a QEC code — it shows how classical repetition ports to quantum, but it halves your error rate for X at the cost of tripling it for Z. Dual code (phase-flip in Hadamard basis) has the opposite trade; Shor's code combines both.
