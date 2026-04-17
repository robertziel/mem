### Quantum Machine Learning — Kernels, QNNs, QCNNs

**Problem:** Build classifiers / regressors / generative models that exploit Hilbert-space structure for (a) expressivity gains, (b) sample-efficiency in small-data regimes, or (c) natively quantum data (states from an experiment). Three main families: **quantum kernels**, **quantum neural networks (QNNs)**, **quantum convolutional neural networks (QCNNs)**.

**Quantum formulation:**
- **Kernel:** encode `x ↦ |φ(x)⟩` via a feature-map circuit `U_φ(x)`; kernel `K(x, x') = |⟨φ(x)|φ(x')⟩|²`; plug into a classical SVM.
- **QNN:** parameterized circuit `U(θ)` acting on `|φ(x)⟩`; observable `⟨Z_j⟩` or Pauli combination as output; train `θ` by classical gradient descent (parameter-shift rule).
- **QCNN:** alternating convolutional unitaries + pooling (measure-and-reset) layers; exponentially fewer parameters than a generic QNN; translation-invariant by construction.

**Expected speedup:** *Provably* separated classes exist (Havlíček et al. for engineered datasets; discrete-log kernel of Liu–Arunachalam–Temme). On generic real-world data, no proven speedup — and often classical dequantization (Tang-style sampling) reduces the gap. Realistic wins: small-data problems, quantum-native data, and models whose symmetries map naturally to a given hardware topology.

**Key insight:** The theoretical QML question is *which inductive biases* a parameterized circuit encodes. Expressivity alone is not the right metric — an infinitely expressive model overfits. The "quantum advantage" hypothesis is that certain feature maps carry useful biases (group equivariance, locality on a specific graph, phase structure) that classical kernels cannot cheaply match. QCNNs with pooling and equivariant QNNs operationalize this — generic hardware-efficient ansätze do not.

**Status 2026 (concept-level):** Verified advantages exist in domain X = *quantum-data* (classifying phases of matter from quantum simulators, error-correcting code readout), and in *structured toy tasks* designed around the kernel's expressive frontier. Classical deep learning dominates broad benchmarks (MNIST-scale and up). Active research on trainability (barren plateaus), encoding strategies, and symmetry-aware ansätze (geometric QML, equivariant QNNs). Negative results — dequantization, provably untrainable architectures — are now as informative as positive ones, helping the field avoid premature claims.

**Qiskit snippet (quantum-kernel SVM):**
```python
from qiskit.circuit.library import ZZFeatureMap
from qiskit_machine_learning.kernels import FidelityQuantumKernel
from sklearn.svm import SVC
import numpy as np

X = np.random.rand(30, 4) * np.pi
y = (X[:, 0] + X[:, 1] > np.pi).astype(int)

fm = ZZFeatureMap(feature_dimension=4, reps=2, entanglement="linear")
qk = FidelityQuantumKernel(feature_map=fm)

clf = SVC(kernel=qk.evaluate).fit(X, y)
print("train accuracy:", clf.score(X, y))
```

**Model-class trade-off:**
| Model | Parameters | Depth | When it helps |
|---|---|---|---|
| Quantum kernel | 0 (non-parametric) | shallow `U_φ` twice | small-n, expressive feature maps |
| QNN (hardware-efficient) | `O(n · L)` | moderate | flexibility, at barren-plateau risk |
| QCNN | `O(log n)` | `O(log n)` | translation-invariant / phase detection |
| Equivariant / symmetric ansatz | problem-tailored | problem-tailored | when data has known symmetry |

**Canonical applications:** classification of phases of matter from simulator snapshots (QCNN wins), high-energy-physics event triggers with known Lorentz symmetry (equivariant QNN), quantum error-correcting code syndrome decoding (native quantum data), and anomaly detection in small-sample industrial settings. Avoid vanilla MNIST / CIFAR demonstrations — they are publicity metrics, not diagnostics.

**QML workflow hygiene:** (a) pick a baseline *before* designing the quantum model — classical RBF, gradient-boosted trees, or a small MLP; (b) match feature dimension across quantum and classical models; (c) report kernel target alignment and effective dimension, not only accuracy; (d) ablate encoding choices separately from ansatz choices; (e) run at least three random seeds and report std, not best-of-five. Rigor here is what distinguishes a useful benchmark from a marketing plot.

**Pitfalls:**
- **Barren plateaus:** for random deep QNNs, gradients vanish as `2^{-n}` → untrainable. Mitigations: local cost functions, QCNN structure, layerwise training, problem-tailored symmetries, smart initialization (identity block, reduced-entanglement).
- **Encoding mismatch:** a generic feature map whose kernel has no inductive bias toward the task will underperform classical RBF / neural tangent kernels. Kernel target alignment before full training saves wasted runs.
- **Dequantization:** for low-rank / well-structured inputs, classical randomized algorithms match several QML proposals (Tang, Chia et al.). Whenever you claim speedup, sanity-check that `(sketch + SVM)` isn't as good.
- **Shot-noise tax:** every QML forward pass is noisy; hyperparameter tuning is harder than classical and model selection is expensive.
- **Overfitting is silent:** quantum kernels with tunable expressivity can fit any small training set perfectly — classical RBF overfits the same way. Cross-validation is non-negotiable.
- **Gradient estimation cost:** parameter-shift rule doubles circuit calls per parameter; for `O(n · L)` parameters and batched training, shot count compounds fast.

**Rule of thumb:** QML shines on *quantum-native data* or problems with strong symmetries that map into a circuit; on generic tabular/vision data, a well-tuned classical baseline is a strong hurdle. Always ship a classical comparison — and an RBF-kernel SVM — in every benchmark.
