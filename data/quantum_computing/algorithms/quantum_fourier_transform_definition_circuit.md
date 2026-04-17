### Quantum Fourier Transform (QFT) — Definition and Circuit

**Definition:** The QFT on `n` qubits (dimension `N = 2^n`) is the unitary
`QFT|x⟩ = (1/√N) Σ_{y=0}^{N-1} e^{2πi x y / N} |y⟩`.

It is the discrete Fourier transform applied to amplitude vectors.

**Complexity:**
| | Gates | Notes |
|---|---|---|
| Classical FFT | `O(N log N) = O(n · 2^n)` | operates on explicit length-N vectors |
| QFT | **`O(n²)`** | on `n` qubits; `O(n log n)` with approximations |

QFT is *exponentially* more gate-efficient than FFT per call — but you can't "read out" all `N` Fourier coefficients; you can only sample, and this is exactly what makes QFT useful inside period-finding / phase-estimation algorithms rather than as a general-purpose FFT replacement.

**Circuit (recursive structure):**
On qubit `j` (MSB first):
1. Apply `H` to qubit `j`.
2. For each `k > j`, apply a controlled-phase `CR_{k-j+1}` with phase `e^{2πi / 2^{k-j+1}}` controlled by qubit `k`, target qubit `j`.
3. Recurse on qubits `j+1 ... n-1`.
4. Finally, **reverse the qubit order** via SWAPs — a common source of indexing bugs.

Total gate count: `n` Hadamards + `n(n-1)/2` controlled phases + `⌊n/2⌋` SWAPs = `O(n²)`.

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
import numpy as np

# Built-in QFT (do_swaps=True appends the final SWAPs)
qft = QFT(num_qubits=4, do_swaps=True, inverse=False)

# Hand-built for clarity
def qft_manual(n: int) -> QuantumCircuit:
    qc = QuantumCircuit(n)
    for j in range(n):
        qc.h(j)
        for k in range(j + 1, n):
            qc.cp(np.pi / 2 ** (k - j), k, j)
    for j in range(n // 2):
        qc.swap(j, n - 1 - j)
    return qc

# Inverse QFT: qft_manual(n).inverse(), or QFT(..., inverse=True)
```

**Key insight — what quantum mechanics enables:**
- The QFT unitary factors as a *tensor network* of 1- and 2-qubit gates (Coppersmith decomposition), which directly exposes `O(n²)` scaling.
- Amplitudes encode the Fourier transform *in parallel*. We can't read the whole spectrum, but measuring after QFT concentrates probability on frequencies that a hidden periodic structure would create — this is the engine of Shor and QPE.

**Approximate QFT (AQFT):** Dropping controlled phases with angle `< 2π / 2^m` yields `O(n log n)` gates with negligible error for moderate `m`; standard in fault-tolerant resource estimates.

**Caveats:**
- The final SWAPs reverse qubit order; forgetting them silently transposes your answer.
- Controlled-phase angles shrink as `π / 2^k` — very small rotations are the biggest source of noise on NISQ hardware. Approximate QFT is usually preferred in practice.
- QFT is not a "fast Fourier transform of a classical vector" — inputs must already be prepared as a quantum state; classical loading costs `O(N)`.

**Rule of thumb:** You almost never use a QFT standalone; it's the inner loop of *phase estimation* (and therefore Shor, HHL, and many others). Memorize the circuit pattern and the SWAP at the end.
