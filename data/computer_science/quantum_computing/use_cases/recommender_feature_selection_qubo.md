### Recommenders & Feature Selection — Binary QUBO + Quantum Similarity

**Problem:** Two related tasks: (a) **feature selection** — pick a subset `S ⊂ {1..N}` of predictors that maximizes relevance while minimizing redundancy (mRMR-style); (b) **recommender similarity** — compute user/item cosine similarities or build a diverse shortlist subject to a budget (`k`-item slate).

**Quantum formulation:**
- **Feature selection as QUBO:** binary `x_i ∈ {0,1}` selects feature `i`.
  `H = −Σ_i r_i x_i + λ · Σ_{i<j} |ρ_{ij}| x_i x_j + μ · (Σ_i x_i − k)^2`,
  with `r_i = |corr(x_i, y)|` and `ρ_{ij}` inter-feature correlations. Solve with **QAOA**, annealer, or hybrid CQM.
- **QML similarity:** encode item vectors into a feature-map state `|φ(v)⟩`; kernel `K(v, v') = |⟨φ(v)|φ(v')⟩|²` acts as cosine-analog similarity. Build candidate sets, then re-rank via classical ranking model.
- **Diversity-aware slate selection** maps to a **determinantal** / QUBO objective: maximize `Σ r_i x_i − γ Σ_{i≠j} sim(i,j) x_i x_j`.

**Expected speedup:** None proven. Realistic play: (i) small-data kernel lift for cold-start items, (ii) QUBO formulations that neatly unify relevance + diversity + budget in one objective, (iii) sampling-based generation of *alternative* slates for A/B testing or exploration.

**Key insight:** Feature selection and slate recommendation share a skeleton — binary decision vector, quadratic objective (relevance − pairwise redundancy / similarity), linear budget constraint. Any advance in QUBO solvers (including QAOA variants, annealing, and quantum-inspired classical solvers) immediately transfers. The most honest quantum pitch is "unify three heuristic stages (select, diversify, budget) into one principled objective" rather than "beat ANN search".

**Status 2026 (concept-level):** Verified advantages exist in domain X = niche slate-optimization problems (e.g., ad-slot diversification with hard business rules) where the QUBO encoding is natural and instance size is modest. Production recommenders (YouTube, Netflix-scale) stay fully classical — embeddings + approximate nearest-neighbor search dominate.

**Feature-selection QUBO snippet:**
```python
import numpy as np
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import StatevectorSampler

N, k = 6, 3
relevance = np.random.rand(N)
redund    = np.abs(np.random.randn(N, N)); np.fill_diagonal(redund, 0)

qp = QuadraticProgram()
for i in range(N): qp.binary_var(f"x_{i}")
qp.minimize(linear=-relevance,
            quadratic={(f"x_{i}", f"x_{j}"): 0.5 * redund[i, j]
                       for i in range(N) for j in range(i+1, N)})
qp.linear_constraint({f"x_{i}": 1 for i in range(N)}, "==", k, "budget")

qaoa = QAOA(sampler=StatevectorSampler(), optimizer=COBYLA(), reps=2)
sel  = MinimumEigenOptimizer(qaoa).solve(qp)
print("selected features:", sel.x)
```

**Quantum vs. classical trade-off:**
| Task | Classical baseline | Quantum angle |
|---|---|---|
| Univariate feature ranking | chi², mutual information | — (trivial) |
| Multivariate selection | greedy mRMR, LASSO, genetic | QUBO / QAOA |
| Pairwise cosine similarity | dot product + ANN | QML kernel (small-n) |
| Slate optimization (div + rel) | DPP, submodular greedy | QUBO with penalties |
| Business-rule-heavy ranking | rule engine + classical optimizer | unified penalty QUBO |

**Worked formulations:** mRMR (max relevance, min redundancy), MIFS (mutual-information feature selection), CFS (correlation-based), and determinantal point process (DPP) slate selection can all be expressed as QUBOs with different penalty structures. The cross-domain lesson: whenever a classical pipeline composes *three or more* objective components via brittle weighting, a single QUBO is a principled alternative.

**Pitfalls:**
- **Embedding dimension** limits QML kernel utility: after PCA / autoencoder to `n` qubits, a classical RBF on the same reduced features is a fierce baseline. Running both in parallel at the same feature count is the fair comparison.
- **Correlation estimation** `ρ_{ij}` on noisy data overwhelms optimizer advantage — worry about shrinkage and regularization before choosing QAOA vs. greedy.
- **Slate size `k`** is usually small (5–20) — classical submodular greedy comes within `1 − 1/e` of optimum cheaply; the QUBO has to beat a benchmark that is already tight.
- **Cold-start trap:** quantum kernels on 10² items feels promising; at 10⁸-item catalogs you need ANN indexes (FAISS, ScaNN), which are classical. Quantum fits only in the retrieved-candidate re-rank stage.
- **Business rules** (exclusivity, brand safety, frequency caps) map naturally to QUBO penalties — this is the pedagogical win over hand-rolled heuristics.
- **Online / bandit settings:** repeat QUBO solves per request stress the quantum stack more than classical vectorized ranking.

**Rule of thumb:** Recommenders are embedding + ANN at scale — quantum belongs at the re-ranking or slate-selection stage, on small, constrained subsets where a unified QUBO beats hand-rolled relevance-diversity pipelines.
