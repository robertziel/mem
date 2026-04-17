### Quantum Kernel Methods — Quantum SVM via Feature Maps

**What it is:** A quantum-classical hybrid for supervised learning. A parameterized circuit `U(x)` embeds a classical data point `x` into a quantum state `|φ(x)⟩ = U(x)|0⟩^⊗n`. The kernel is the state-fidelity

`K(x, y) = |⟨φ(x)|φ(y)⟩|² = |⟨0|U(x)† U(y)|0⟩|²`

estimated on hardware. A *classical* SVM (or kernel ridge regression, GP, etc.) then runs on the `K(x_i, x_j)` Gram matrix. The quantum computer is a fancy kernel evaluator — no parameter training on the quantum side.

**Math:** Formally, the feature map sends `x → |φ(x)⟩ ∈ ℂ^(2^n)`. The kernel is a positive-semidefinite Mercer kernel because it's an inner product in Hilbert space. SVM optimization on the `K` matrix is classical convex QP. Measurement of `K(x,y)` uses the SWAP test or the compute-uncompute trick `U(y)† U(x)|0⟩` with overlap `= |⟨0|·⟩|²`.

**Circuit pattern (compute-uncompute):**
```
|0⟩ — U(x) — U†(y) — [measure all, probability of all-zeros = K(x,y)]
```

**Qiskit code:**
```python
from qiskit_machine_learning.kernels import FidelityQuantumKernel
from qiskit.circuit.library import ZZFeatureMap
from sklearn.svm import SVC
import numpy as np

feature_map = ZZFeatureMap(feature_dimension=4, reps=2, entanglement="linear")
qkernel = FidelityQuantumKernel(feature_map=feature_map)

X_train, y_train, X_test = ...                          # classical data
K_train = qkernel.evaluate(x_vec=X_train)               # N×N Gram matrix
K_test  = qkernel.evaluate(x_vec=X_test, y_vec=X_train) # M×N

svm = SVC(kernel="precomputed")
svm.fit(K_train, y_train)
preds = svm.predict(K_test)
```

**Feature-map choices:**

| Feature map | Expressivity | Classically simulable? |
|---|---|---|
| `ZFeatureMap` (single-qubit rotations) | Low | Yes |
| `ZZFeatureMap` (entangling, depth-2 reps) | Medium | Hard for large n |
| Custom hardware-efficient | Tunable | Depends |
| Havlicek 2019 (Nature) | Medium-high | Conjectured hard |

**When to use:**
- Small- to medium-size problems where a quantum feature map captures structure that classical kernels (RBF, poly) miss.
- Problems with natural periodic / group structure that maps onto rotations.
- Benchmarking quantum advantage on structured synthetic data.

**Projected kernels (Huang et al. 2021):** Rather than full-state fidelity, measure only a local observable and define `K(x,y) = tr(ρ(x) ρ(y))` over reduced density matrices. Mitigates the "kernel concentration" problem in high Hilbert-space dimensions and has clearer generalization bounds.

**Speedup claims — where the evidence stands:**

| Setting | Claimed advantage | Evidence level |
|---|---|---|
| Discrete log classification (Liu et al.) | Exponential | **Provable** under cryptographic assumptions |
| Generic supervised learning | Heuristic | **Weak** — often matched or beaten by RBF |
| Group-structured data (e.g. molecular symmetries) | Polynomial | **Empirical** advantage in small studies |
| Quantum-data inputs (outputs of another quantum process) | Exponential | Theoretical, not yet practical |

**Pitfalls:**
- **Encoding is the whole ballgame.** A bad feature map → kernel collapses to `~0` for distinct points (curse of dimensionality in Hilbert space) → SVM can't separate → useless. Liu–Arunachalam–Temme 2021 prove separation exists, but only for *specific* maps.
- Kernel matrix construction costs `O(N²)` fidelity measurements; each needs many shots to beat statistical noise — for `N = 1000` you're pricing out hardware time fast.
- No free lunch vs classical: for unstructured data, classical RBF is typically competitive and 10⁶× cheaper.
- Hardware noise symmetrically reduces all kernel entries, pushing `K` toward the identity — a noise-mitigation protocol (zero-noise extrapolation on fidelity) is usually required at scale.

**Rule of thumb:** Spend 90% of your design time on the feature map and 10% on the SVM. If your kernel Gram matrix looks close to the identity, your encoding is too expressive — pick a shallower ansatz.
