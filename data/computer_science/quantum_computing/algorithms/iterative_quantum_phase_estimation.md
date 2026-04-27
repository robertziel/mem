### Iterative Quantum Phase Estimation — Qubit-Efficient QPE with Classical Feedback

**What it is:** A variant of Quantum Phase Estimation (QPE) that measures the `m` bits of an eigenphase `φ` *one bit at a time*, using a single ancilla qubit plus classical feedback, instead of allocating `m` ancillas up front. Replaces the QFT with classical post-processing of `m` sequential measurements.

**Math:** For unitary `U|ψ⟩ = e^(2πi φ)|ψ⟩` with `φ = 0.φ_1 φ_2 ... φ_m` (binary expansion), the k-th iteration estimates bit `φ_{m-k+1}` using one Hadamard test on `U^{2^{m-k}}`. Prior bits `φ_{m-k+2..m}` are fed back classically as a Z-rotation on the ancilla before the final Hadamard, cancelling their contribution.

**When to use:**
- Hardware-limited backends: only 1 counting ancilla needed.
- Dynamic-circuit-capable systems (mid-circuit measurement + feedforward).
- NISQ-era chemistry (VQE-style phase readout) and Shor variants targeting minimal width.

**Qiskit code (dynamic circuits):**
```python
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
from qiskit.circuit.library import PhaseGate
import numpy as np

m, phi = 4, 0.3125                       # true phase = 0.0101_2
U = PhaseGate(2 * np.pi * phi)           # eigenphase on |1⟩
q, psi = QuantumRegister(1, "a"), QuantumRegister(1, "s")
c = ClassicalRegister(m, "c")
qc = QuantumCircuit(q, psi, c)
qc.x(psi)                                # prepare eigenstate |1⟩

for k in range(m):                       # k = 0 -> LSB, k = m-1 -> MSB
    qc.h(q[0])
    power = 2 ** (m - 1 - k)
    for _ in range(power):
        qc.cp(2 * np.pi * phi, q[0], psi[0])
    # classical feedback: rotate away previously-measured bits
    angle = 0.0
    for j in range(k):
        angle -= np.pi * 2 ** (j - k)
    with qc.if_test((c, 0)) as _:        # placeholder; use c_if per bit in hardware
        qc.p(angle, q[0])
    qc.h(q[0])
    qc.measure(q[0], c[k])
    qc.reset(q[0])
```

**IPE vs standard QPE:**

| Aspect | Standard QPE | IPE |
|---|---|---|
| Counting ancillas | `m` | 1 (reused) |
| Circuit width | `m + n` | `1 + n` |
| Circuit depth | `O(2^m)` controlled-`U` + QFT | `O(2^m)` serialized (higher depth) |
| QFT needed | Yes | No (classical FFT implicit in feedback) |
| Mid-circuit measurement | No | Yes (required) |
| Coherence demand | Shorter per-shot | Longer per-shot |

**Example accuracy target:** To estimate `φ` to 10 bits (additive error `2^{-10} ≈ 10^{-3}`), IPE requires 10 sequential measurement rounds with the final controlled-`U` raised to the power `2^9 = 512`. Standard QPE needs 10 ancillas and the same `512`-power controlled-`U` — identical gate count, opposite resource trade.

**Kitaev's variant:** An older IPE-style approach that avoids QFT by Hadamard-test sampling of `cos(2π 2^k φ)` and `sin(2π 2^k φ)` at each power `k`, then reconstructing `φ` by classical majority voting. Less sample-efficient than feedback-based IPE but trivially parallelizable across shots.

**Pitfalls:**
- Requires *real* feedforward — many backends only simulate it, erasing the ancilla-saving benefit.
- Sequential: total wall-clock time grows with `m`; a single decoherence event mid-sequence corrupts MSBs disproportionately.
- Accuracy still limited by `2^m` controlled-`U` applications — same gate-count scaling as standard QPE.
- Error on an early (MSB) measurement propagates through classical feedback into every subsequent round; the first few bits are the most fragile.

**Rule of thumb:** Use IPE when qubits are scarce and your backend supports real dynamic circuits; stay with textbook QPE when you have ancillas to spare and want shorter wall-clock depth.
