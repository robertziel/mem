### Gaussian Process Regression + Bayesian Optimization (kernel methods, acquisition functions)

**When:** **small data + uncertainty matters** — hyperparameter tuning, A/B test allocation, expensive simulations, scientific experimentation. Gaussian Processes are the gold-standard probabilistic regressor; Bayesian optimization uses them to efficiently optimize black-box functions where each evaluation is expensive.

**Schema (Gaussian Process):**

| Concept | Detail |
|---|---|
| **GP prior** | Distribution over functions; defined by mean `m(x)` and covariance kernel `k(x, x')` |
| **GP posterior** | Update prior with observed `(X, y)` → still a GP, with closed-form mean and variance |
| **Mean function** | Often zero (data-centered) |
| **Kernel** | Encodes assumed function smoothness / structure |
| **Hyperparameters** | Length-scale, output scale, noise variance — fit by max marginal likelihood |

> A GP is a **distribution over functions** — predictions come with **calibrated uncertainty**. Posterior mean and variance computable in closed form for Gaussian likelihood.

#### Why GPs

| Property | Detail |
|---|---|
| **Calibrated uncertainty** | Native, not post-hoc |
| **Few hyperparameters** | Easy to fit |
| **Non-parametric** | No fixed model size |
| **Closed-form posterior** | For Gaussian likelihood; analytical |
| **Active learning friendly** | Pick next x where uncertainty is high |
| **Bayesian optimization base** | Standard surrogate model |

| Limitation | Detail |
|---|---|
| **O(N³) training** | Naive; intractable above ~10k points |
| **High dimensions** | Curse of dimensionality |
| **Non-Gaussian likelihoods** | Need approximations |

#### Common kernels

| Kernel | Formula | Use |
|---|---|---|
| **RBF / Gaussian** | `exp(-d² / 2ℓ²)` | Smooth functions; default |
| **Matérn** | Various smoothness orders | Less smooth than RBF |
| **Linear** | `xᵀ x'` | Linear functions |
| **Periodic** | `exp(-2 sin²(π d / p) / ℓ²)` | Cyclical patterns |
| **Polynomial** | `(σ² + xᵀ x')ᵈ` | Polynomial relationships |
| **Combined** | Sum / product of kernels | Multi-scale / additive |

```python
import gpytorch

class GP(gpytorch.models.ExactGP):
    def __init__(self, x_train, y_train, likelihood):
        super().__init__(x_train, y_train, likelihood)
        self.mean = gpytorch.means.ConstantMean()
        self.covar = gpytorch.kernels.ScaleKernel(
            gpytorch.kernels.RBFKernel(ard_num_dims=x_train.shape[1])
        )
    def forward(self, x):
        return gpytorch.distributions.MultivariateNormal(self.mean(x), self.covar(x))

likelihood = gpytorch.likelihoods.GaussianLikelihood()
model = GP(x_train, y_train, likelihood)
# Train via type-II MLE on hyperparameters
mll = gpytorch.mlls.ExactMarginalLogLikelihood(likelihood, model)
```

#### GP posterior closed form

For training data `(X, y)` with Gaussian noise `σ²`:

`μ_post(x*) = k_*ᵀ (K + σ²I)⁻¹ y`
`σ²_post(x*) = k(x*, x*) - k_*ᵀ (K + σ²I)⁻¹ k_*`

| Symbol | Meaning |
|---|---|
| `K` | `N × N` kernel matrix on training X |
| `k_*` | Cross-covariance between `x*` and X |
| `μ_post` | Posterior mean at `x*` |
| `σ²_post` | Posterior variance at `x*` |

#### Length-scale (the most important hyperparameter)

| `ℓ` | Behavior |
|---|---|
| Small | Function changes rapidly; less smooth |
| Large | Function changes slowly; smoother |
| Per-dimension (ARD) | Auto-detect feature relevance |

> **ARD (Automatic Relevance Determination)** = separate `ℓ_d` per feature. Large `ℓ_d` → feature `d` is irrelevant. Free feature selection.

#### Bayesian Optimization (BO)

Use GP as a **surrogate** for an expensive black-box function `f(x)`. Iteratively:

```
1. Fit GP on observed (x_i, y_i) pairs
2. Compute acquisition function over candidate space
3. Pick x_next = argmax(acquisition)
4. Evaluate f(x_next)
5. Repeat
```

#### Acquisition functions (the key choice)

| Function | Formula | Behavior |
|---|---|---|
| **Expected Improvement (EI)** | `E[max(0, f(x) - f_best)]` | Default; balances mean and uncertainty |
| **Upper Confidence Bound (UCB)** | `μ + κ · σ` | Optimistic; tune κ for explore-exploit |
| **Probability of Improvement (PI)** | `P(f(x) > f_best)` | Greedy; can get stuck |
| **Knowledge Gradient (KG)** | One-step lookahead | More principled; slower |
| **Thompson Sampling** | Sample posterior; pick max | Easy parallel; stochastic |
| **Entropy Search / Max-Value Entropy Search** | Information-theoretic | Best in theory; expensive |

```python
def expected_improvement(x, gp, f_best, xi=0.01):
    mu, sigma = gp.predict(x, return_std=True)
    z = (mu - f_best - xi) / sigma
    return (mu - f_best - xi) * norm.cdf(z) + sigma * norm.pdf(z)
```

> **EI is the default acquisition**. UCB is simpler; tune `κ ≈ 2` typically. **Thompson Sampling** for parallel evaluation.

#### Bayesian optimization workflow

```python
from skopt import gp_minimize

def f(x):
    """Expensive black-box; returns scalar to minimize."""
    return train_model_and_score(x)

result = gp_minimize(
    f,
    dimensions=[(0.001, 1.0, "log-uniform"),     # learning rate
                (3, 12),                           # max_depth
                (50, 500)],                        # n_estimators
    n_calls=50,
    n_initial_points=10,
    acq_func="EI",
    random_state=42,
)
print(result.x, result.fun)
```

#### When BO shines

| Setting | Why |
|---|---|
| Each evaluation is **expensive** | Few trials needed |
| Hyperparameter search for ML | Few hours per train run |
| A/B testing allocation | Each test has cost |
| Materials / drug discovery | Each experiment expensive |
| Scientific simulation | Compute-bound |
| Robot control | Real-world trial cost |
| Architecture search (small) | Each architecture = full train |

#### When BO fails / underperforms

| Setting | Use instead |
|---|---|
| Cheap function, many evaluations available | Random / grid search |
| Very high dimensions (> ~20) | Random search; specialized methods |
| Discrete / categorical-heavy | Tree-based BO (TPE); Bayesian categorical |
| Multi-objective | Multi-objective BO (qNEHVI, NSGA-II) |
| Constraints | Constrained BO (CEI) |
| Need parallelism | Thompson sampling, batch BO |

#### Tree-structured Parzen Estimator (TPE)

**Optuna's default**. Models density `p(x | y_top)` and `p(x | y_bottom)`; samples from the ratio. Better for **discrete + continuous mix**.

```python
import optuna
study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler())
```

| Pro | Con |
|---|---|
| Handles categorical natively | Less rigorous than GP-BO |
| No matrix inverses | No analytical covariance |
| Scales better | Less data-efficient per trial |

#### GP scaling tricks

| Trick | Detail |
|---|---|
| **Sparse GP / inducing points** | Approximate with M < N inducing points → O(NM²) |
| **SVGP** (Stochastic Variational GP) | Train via mini-batch SGD |
| **Deep Kernel Learning** | NN encoder + GP on top |
| **GPU acceleration (GPyTorch)** | Use Cholesky / Lanczos with CUDA |

> Above ~10k points, switch to sparse / SVGP. Up to ~50k points fine on GPU with GPyTorch.

#### GP vs alternatives for regression

| Method | Strength |
|---|---|
| **GP** | Calibrated uncertainty, small data, smooth functions |
| **Linear regression** | Cheap, interpretable, no uncertainty |
| **Random forest** | No uncertainty (per-tree variance approx); larger data |
| **Gradient boosting** | Best point predictions; no native uncertainty |
| **Neural network** | Big data; needs MC dropout / ensembles for uncertainty |
| **Bayesian NN** | Uncertainty + scale; harder to train |

#### Constraints

```python
# Constrained BO: only suggest x where constraint c(x) ≥ 0
# Use Constrained Expected Improvement (CEI)
acq = ei(x) * P(c(x) ≥ 0)
```

#### Multi-objective BO

For Pareto-optimal trade-offs:

| Method | Detail |
|---|---|
| **qEHVI** (Expected Hypervolume Improvement) | BoTorch standard |
| **NSGA-II** | Genetic Pareto |
| **Random scalarizations** | Sample weights, optimize scalar |

```python
import optuna
study = optuna.create_study(directions=["minimize", "minimize"])
```

#### Tools

| Tool | Strength |
|---|---|
| **GPyTorch** | PyTorch GPs; GPU; modern |
| **scikit-learn `GaussianProcessRegressor`** | Simple |
| **GPy** | Pure-Python; many features |
| **BoTorch** (Meta) | PyTorch BO; multi-objective |
| **Ax** (Meta) | Higher-level wrapper around BoTorch |
| **Optuna** | TPE BO; production-friendly |
| **scikit-optimize** | sklearn-style API |
| **Spearmint, Hyperopt** | Older but solid |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| BO on cheap evaluations | Use random search instead |
| Default RBF on noisy data | Add explicit noise variance |
| No initial random samples | Need 10–20 initial points before BO is informative |
| GP on > 20 dims | Curse of dimensionality; use TPE / random projection |
| Mixing categorical + continuous in GP | Use TPE or specialized kernels |
| Treating BO as black box | Inspect surrogate; understand exploration vs exploitation |
| Not normalizing inputs | GP length-scale heuristic assumes unit scale |
| One acquisition function for all problems | EI default; UCB for explicit exploration; KG for sample efficiency |
| Optimizing a noisy objective without averaging | Average per evaluation; use `noise_variance` in GP |

#### Acquisition trade-offs

| Want | Acquisition |
|---|---|
| Conservative; balanced | EI |
| Pure exploitation | PI |
| Explicit exploration | UCB with high κ |
| Parallel evaluation | Thompson sampling, qEI batch |
| Information-greedy | KG / Max-Value Entropy |

#### Real-world examples

| Application | Detail |
|---|---|
| **Hyperparameter tuning** | sklearn / Hugging Face / production ML |
| **Robotics** | Bayesian optimization for gait / control |
| **Drug discovery** | Active learning over molecular space |
| **Material design** | Optimize material properties |
| **A/B testing budget allocation** | Allocate users to most-promising variants |
| **Hardware design** | Chip layout, antenna optimization |
| **Closed-loop science** | Auto-experimentation |
| **Compiler tuning** | Find best optimization flags |

#### Code: full Bayesian-optimization loop

```python
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern
from scipy.stats import norm

def bo_loop(f, bounds, n_init=5, n_iter=20):
    X = np.random.uniform(bounds[:, 0], bounds[:, 1], size=(n_init, len(bounds)))
    y = np.array([f(x) for x in X])

    for _ in range(n_iter):
        gp = GaussianProcessRegressor(kernel=Matern(nu=2.5), normalize_y=True).fit(X, y)
        # Maximize EI (random search over candidate x)
        candidates = np.random.uniform(bounds[:, 0], bounds[:, 1], size=(1000, len(bounds)))
        mu, sigma = gp.predict(candidates, return_std=True)
        f_best = y.max()
        z = (mu - f_best) / (sigma + 1e-9)
        ei = (mu - f_best) * norm.cdf(z) + sigma * norm.pdf(z)
        x_next = candidates[np.argmax(ei)]
        y_next = f(x_next)
        X = np.vstack([X, x_next]); y = np.append(y, y_next)
    return X, y
```

#### Decision tree

```
Each evaluation is expensive?
├─ No, cheap                                → Random / grid search
└─ Yes
    ├─ Continuous, smooth, < 20 dims         → GP-BO with EI
    ├─ Mixed categorical / continuous       → TPE (Optuna)
    ├─ Multi-objective                       → BoTorch qEHVI
    ├─ Constrained                            → CEI
    ├─ High-dim (> 20)                        → REMBO / random projection / TPE
    └─ Parallel evaluation needed            → Thompson sampling / qEI batch
```

**Rule of thumb:** **GP regression = small data + calibrated uncertainty**. Used as the **surrogate model in Bayesian optimization** for expensive black-box optimization. **Expected Improvement is the default acquisition**; **UCB** for explicit exploration tuning. Use **TPE** for mixed continuous/categorical hyperparam tuning. **Don't use BO for cheap functions** — random search is enough. For high dim (> 20) or huge data, switch to sparse GP / NN-based surrogates.
