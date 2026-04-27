### Controlled Rotations — CRx, CRy, CRz

**What it is:**
Single-qubit rotations conditioned on a control qubit: **CRx(θ)**, **CRy(θ)**, **CRz(θ)** apply `R_{x,y,z}(θ)` to the target iff the control is |1⟩. Essential for **phase kickback**, **QPE**, **amplitude amplification**, and any time you want a continuous-angle conditional.

**Math:**
```
CRz(θ) = |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ Rz(θ)
       = diag(1, 1, e^{-iθ/2}, e^{iθ/2})
CRy(θ) and CRx(θ) analogous with Ry, Rx on the target.
```

**Standard decomposition (into CNOT + single-qubit):**
```
CRz(θ):  q_t: ── Rz(θ/2) ──■── Rz(-θ/2) ──■──
         q_c: ─────────────⊕─────────────⊕──

CRy(θ):  replace Rz by Ry, same structure
CRx(θ):  same with H · CRz · H sandwich, OR use Rx directly
```
Cost: **2 CNOTs + 2 single-qubit rotations** per controlled rotation.

**Phase kickback (the reason CR* matters):**
If the target is an eigenstate `|u⟩` of U with `U|u⟩ = e^{iφ}|u⟩`, then controlled-U writes the eigenphase onto the control:
```
(|0⟩ + |1⟩)/√2 ⊗ |u⟩  →  (|0⟩ + e^{iφ}|1⟩)/√2 ⊗ |u⟩
```
This is the core move in **QPE**: repeated controlled-U^{2^k} kicks back `φ · 2^k` phases into a register of Hadamarded control qubits, then an inverse QFT reads out `φ`.

**QPE's key step in Qiskit:**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
import numpy as np

theta = 2 * np.pi * 0.375                            # phase to estimate
n = 3                                                # precision qubits
qc = QuantumCircuit(n + 1, n)
qc.x(n)                                              # target in eigenstate |1>
qc.h(range(n))
for k in range(n):
    qc.cp(theta * (2 ** k), k, n)                    # controlled-phase = CRz up to global
qc.append(QFT(n, inverse=True), range(n))
qc.measure(range(n), range(n))
```

**Controlled-phase vs CRz:**
| | CRz(θ) | CP(θ) (= CU1) |
|---|---|---|
| Matrix | diag(1,1,e^{-iθ/2},e^{iθ/2}) | diag(1,1,1,e^{iθ}) |
| Symmetric on control/target? | no (phase spread) | yes |
| Global phase | unavoidable | absorbed at 00 corner |
| QPE canonical | via CP / CU | same kick, simpler algebra |

**When to use:**
- **QPE / order-finding / Shor**: controlled powers of U.
- **Amplitude encoding** (Möttönen / Shende–Markov–Bullock): recursive tree of CRy rotations loads `|x⟩ = Σ x_i |i⟩`.
- **Controlled ansatz blocks** in VQE where a single flag toggles between rotation regimes.
- **Arbitrary multi-controlled rotations**: nest or use Gray-code decomposition of `C^n-R(θ)`.

**Pitfalls:**
- **Global phase ≠ observable on paper** but **is observable when controlled** — CRz carries a global phase that matters once you stick another control above it. Use CP if you want a pure diagonal with zeros above the top-right.
- **Angle-sharing between decompositions**: Qiskit's `CRZGate.definition` differs by a convention factor of 2 from some textbooks (θ on the gate vs θ on the Rz). Always inspect `.definition`.
- **Hardware native?** CRz is *never* native — the transpiler lowers to `CX + RZ`. On IonQ you can sometimes save gates by rewriting to `RZZ(θ) + single-qubit frame changes`.
- **Numerical phase accumulation**: in deep QPE, floating-point error in θ compounds across `2^k` powers. Use exact fractions where possible.

**Rule of thumb:** Anywhere you see "controlled-U" in an algorithm sketch, you'll pay **2 CNOTs + a rotation per instance** on real hardware — budget accordingly, and reach for phase kickback whenever you need to extract an eigenphase.
