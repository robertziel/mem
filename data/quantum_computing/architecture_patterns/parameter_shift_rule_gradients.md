### Parameter-Shift Rule — Exact Analytic Gradients on Hardware

**Pattern:** For any gate of the form `U(θ) = exp(−i θ G / 2)` where `G` has two distinct eigenvalues `±1` (all single-qubit Pauli rotations `RX, RY, RZ` qualify), the derivative of an expectation value is given *exactly* by two circuit evaluations at shifted parameters:

```
∂⟨H⟩(θ)/∂θ_k = ½ · [ f(θ_k + π/2) − f(θ_k − π/2) ]
```

No finite-difference truncation error. The same circuit structure is re-run; only the `k`-th parameter is shifted.

**When to use:**
- QPU or noisy simulator — finite-diff is dominated by shot noise at small `h`; parameter-shift uses a large shift (`π/2`) and still recovers the exact gradient.
- You need per-parameter gradients for Adam, L-BFGS-B, or natural gradient.
- Gate generators are 2-eigenvalue (standard Pauli rotations, Ising `ZZ(θ)`).

**When it does NOT work (as-is):**
| Gate | Generator eigenvalues | Rule |
|---|---|---|
| `RX/RY/RZ(θ)` | `±1` | 2-term shift, `s = π/2` |
| Controlled-rotation `CRX(θ)` | `0, 0, ±½` | 4-term generalized shift |
| `exp(−i θ H)` with `H` multi-eigenvalue | `λ_1..λ_n` | Nyquist-style reconstruction (≥ 2n terms) |
| Hardware-native `ECR`, `CZ` (fixed) | — | not parameterized; no shift needed |

**Cost:** `2 · P` circuit executions per gradient (`P` = number of parameters). SPSA reduces this to `O(1)` at the cost of variance; shot-frugal shadows can also amortize.

**Example — PennyLane `qml.grad`:**
```python
import pennylane as qml
from pennylane import numpy as np

dev = qml.device("default.qubit", wires=2, shots=4096)

@qml.qnode(dev, diff_method="parameter-shift")
def cost(theta):
    qml.RY(theta[0], wires=0)
    qml.CNOT(wires=[0, 1])
    qml.RZ(theta[1], wires=1)
    return qml.expval(qml.PauliZ(0) @ qml.PauliZ(1))

theta = np.array([0.3, -0.7], requires_grad=True)
grad_fn = qml.grad(cost)                 # parameter-shift under the hood
print(cost(theta), grad_fn(theta))       # exact ∂⟨ZZ⟩/∂θ on 2·2 = 4 circuits
```

**Qiskit equivalent:** `qiskit_algorithms.gradients.ParamShiftEstimatorGradient(estimator)` — wraps `EstimatorV2` with the 2-term rule; `LinCombEstimatorGradient` for linear-combination variant.

**Trade-offs vs. alternatives:**
| Method | Circuits/grad | Bias | Notes |
|---|---|---|---|
| Parameter-shift | `2P` | 0 (exact) | preferred on hardware |
| Finite difference `h=1e−3` | `2P` | `O(h²)` + huge variance | unusable under shot noise |
| SPSA | `2` | biased at finite `c` | great for many-param, noisy |
| Adjoint / backprop | `O(1)` | exact | simulator only |

**Pitfalls:**
- Treating a `CRX(θ)` with the 2-term rule — silently wrong. Decompose to `CNOT · RX(θ/2) · CNOT · RX(−θ/2)` or use the 4-term generalized shift.
- Shot budget: each of the `2P` circuits needs enough shots to resolve the subtraction; variance of the difference is `2·Var(f)/shots`.
- Classical optimizer expecting gradients in parameter-vector order — confirm the ansatz's `parameters` iteration matches.
- Re-using the same backend calibration across all `2P` runs — use a Session to keep the QPU hot and calibrated.

**Rule of thumb:** If your ansatz is built from standard Pauli rotations, default to parameter-shift — it's the only gradient method that is simultaneously exact, hardware-runnable, and compatible with shot-noise-aware optimizers; fall back to SPSA only when `2P` circuits per step blows your shot budget.
