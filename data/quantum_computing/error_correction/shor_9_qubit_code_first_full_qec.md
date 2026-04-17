### Shor's 9-Qubit Code (First Full Quantum Error Correction)

**What it is:** The first code to correct an arbitrary single-qubit error — historically decisive because it proved QEC is possible despite the no-cloning theorem. Published by Peter Shor in 1995. Uses concatenation: 3-qubit phase-flip code on the **outside**, 3-qubit bit-flip code on the **inside**.

**Parameters:** [[9, 1, 3]] CSS code — 9 physical qubits, 1 logical, distance 3.

**Encoding (two-stage):**

Stage 1 (phase-flip outer): |0⟩ → |+⟩|+⟩|+⟩, |1⟩ → |−⟩|−⟩|−⟩.
Stage 2 (bit-flip inner): replace each |±⟩ by (|000⟩ ± |111⟩)/√2.

Final logical states:

|0⟩_L = [(|000⟩ + |111⟩)(|000⟩ + |111⟩)(|000⟩ + |111⟩)] / (2√2)

|1⟩_L = [(|000⟩ − |111⟩)(|000⟩ − |111⟩)(|000⟩ − |111⟩)] / (2√2)

**Stabilizer generators (8 total = n − k = 9 − 1):**

Group the 9 qubits into three blocks: {1,2,3}, {4,5,6}, {7,8,9}.

Inner (bit-flip) Z-type stabilizers (2 per block × 3 blocks = 6):
- Z_1 Z_2, Z_2 Z_3
- Z_4 Z_5, Z_5 Z_6
- Z_7 Z_8, Z_8 Z_9

Outer (phase-flip) X-type stabilizers (2 total):
- X_1 X_2 X_3 X_4 X_5 X_6
- X_4 X_5 X_6 X_7 X_8 X_9

**Logical operators:**
- X̄ = Z_1 Z_2 Z_3 Z_4 Z_5 Z_6 Z_7 Z_8 Z_9 (equivalent: Z̄ · all-block-parity)
- Z̄ = X_1 X_4 X_7 (one X per block)

(These look surprising — X̄ is all-Z and Z̄ is weight-3 X — because Shor's code is built in the dual basis for phase correction.)

**Error correction:**
- **Single X error** on any qubit: detected and corrected by the inner Z stabilizers of its block (majority vote within the triple).
- **Single Z error** on any qubit: collapses that block's (|000⟩+|111⟩) → (|000⟩−|111⟩), flipping the sign of that block's |+⟩. Detected by the outer X-type stabilizers comparing block signs.
- **Single Y = iXZ**: corrected by both pathways simultaneously.

**Why it works (core insight):** any single-qubit error is a linear combination of {I, X, Y, Z}; stabilizer measurement collapses the error to one of these four; the code catches each. This is the **error discretization theorem** made concrete.

**Table of error budget:**

| Single-qubit error | Syndrome signature | Recovery |
|---|---|---|
| X_i | inner Z stabilizers of block(i) | apply X_i |
| Z_i | outer X stabilizer straddling block(i) | apply Z_j for any j in block |
| Y_i | both above | apply Y_i |

**Fault-tolerance caveat:** The 9-qubit code as originally stated is *not* fully fault-tolerant against errors occurring *during* syndrome extraction. Steane's 7-qubit code and the later surface code were motivated by the need for simpler fault-tolerant ancilla verification.

**Historical significance:**
- First QEC code (Shor 1995, Phys. Rev. A 52, R2493).
- Proved the threshold theorem was achievable in principle.
- Directly inspired the CSS construction (Calderbank–Shor 1996, Steane 1996) and the entire stabilizer formalism (Gottesman 1997).

**Qiskit encoding sketch:**
```python
from qiskit import QuantumCircuit
qc = QuantumCircuit(9, name='shor_encode')
# phase-flip outer: copy qubit 0 into {0,3,6} with H's
qc.cx(0, 3); qc.cx(0, 6)
qc.h([0, 3, 6])
# bit-flip inner: within each block
for b in [0, 3, 6]:
    qc.cx(b, b+1); qc.cx(b, b+2)
```

**Overhead:** 9-to-1 encoding ratio. Modern surface codes use 50–1000 physical per logical, but provide a tunable distance — Shor's code is fixed at d = 3.

**Rule of thumb:** Shor's code is the Pythagorean theorem of QEC — nobody builds it today, but every subsequent construction is a generalization; remember its structure as "bit-flip inside phase-flip concatenation" and you have the genesis of stabilizer codes.
