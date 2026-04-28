### Backpropagation + SGD / Adam (gradient descent, chain rule, neural network training)

**When:** train any model expressible as a differentiable computation graph — neural networks, logistic regression, matrix factorization, embedding learning. The computational core of deep learning.

**Schema (the training loop):**

| Step | What happens |
|---|---|
| 1. Forward | Feed input → compute output → compare to target via loss `L` |
| 2. Backward | Apply chain rule from `L` backward through the graph to compute `∂L/∂w` for every parameter |
| 3. Update | Move each parameter against its gradient: `w ← w − α · ∂L/∂w` |
| 4. Repeat | Iterate over batches until loss stops decreasing |

#### Chain rule on a computation graph

If `y = f(g(x))`, then `dy/dx = f'(g(x)) · g'(x)`. Backprop is **just chain rule applied to a DAG**, computing each node's gradient once via topological reverse-order.

For `L = (ŷ − y)²` where `ŷ = σ(w · x + b)`:

| Quantity | Gradient |
|---|---|
| `∂L/∂ŷ` | `2(ŷ − y)` |
| `∂ŷ/∂z` (where `z = w·x + b`) | `σ(z) · (1 − σ(z))` (sigmoid) |
| `∂z/∂w` | `x` |
| **`∂L/∂w`** | `2(ŷ − y) · σ'(z) · x` (product of all three) |

#### Minimal MLP forward + backward

```python
import numpy as np

def relu(z): return np.maximum(0, z)
def relu_grad(z): return (z > 0).astype(z.dtype)

def softmax_ce(logits, y_onehot):
    # combined softmax + cross-entropy with stable subtraction
    z = logits - logits.max(axis=1, keepdims=True)
    p = np.exp(z); p /= p.sum(axis=1, keepdims=True)
    loss = -np.mean(np.sum(y_onehot * np.log(p + 1e-12), axis=1))
    grad = (p - y_onehot) / len(p)               # gradient w.r.t. logits
    return loss, grad

# 1-hidden-layer MLP
def forward(X, W1, b1, W2, b2):
    Z1 = X @ W1 + b1
    A1 = relu(Z1)
    Z2 = A1 @ W2 + b2
    return Z1, A1, Z2

def backward(X, Y, W1, W2, Z1, A1, Z2):
    loss, dZ2 = softmax_ce(Z2, Y)
    dW2 = A1.T @ dZ2
    db2 = dZ2.sum(axis=0)
    dA1 = dZ2 @ W2.T
    dZ1 = dA1 * relu_grad(Z1)
    dW1 = X.T @ dZ1
    db1 = dZ1.sum(axis=0)
    return loss, dW1, db1, dW2, db2
```

#### SGD — Stochastic Gradient Descent

```python
def sgd_step(params, grads, lr):
    for p, g in zip(params, grads):
        p -= lr * g
```

> "Stochastic" = use a **mini-batch** sample of data each step (not the full dataset). Trade-offs: noisier gradients but **regularizes** and **scales to huge data**.

#### Optimizer comparison

| Optimizer | Update rule | Strength |
|---|---|---|
| **SGD** | `w ← w − α·g` | Simplest; works with momentum |
| **SGD + momentum** | `v ← β·v + g; w ← w − α·v` | Faster convergence; smooths gradient noise |
| **Nesterov momentum** | "Look-ahead" before computing gradient | Slightly faster than vanilla momentum |
| **AdaGrad** | `s ← s + g²; w ← w − α·g / √s` | Per-parameter learning rate; good for sparse |
| **RMSProp** | `s ← β·s + (1−β)·g²; w ← w − α·g / √s` | Fixes AdaGrad's "lr decays to zero" |
| **Adam** | RMSProp + momentum | **Default** for most deep learning |
| **AdamW** | Adam with **decoupled weight decay** | Better generalization than Adam |
| **Lion** (2023) | Sign-of-momentum update | Memory-efficient; competitive |
| **L-BFGS** | Quasi-Newton; uses curvature | Convex / small problems |

#### Adam (the practical default)

```python
class Adam:
    def __init__(self, params, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):
        self.params = params
        self.lr, self.b1, self.b2, self.eps = lr, b1, b2, eps
        self.m = [np.zeros_like(p) for p in params]
        self.v = [np.zeros_like(p) for p in params]
        self.t = 0

    def step(self, grads):
        self.t += 1
        for p, g, m, v in zip(self.params, grads, self.m, self.v):
            m[:] = self.b1 * m + (1 - self.b1) * g
            v[:] = self.b2 * v + (1 - self.b2) * g * g
            m_hat = m / (1 - self.b1 ** self.t)
            v_hat = v / (1 - self.b2 ** self.t)
            p -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)
```

**Why Adam dominates:** combines momentum (`m`) with adaptive per-parameter step size (`v`). Bias correction (`m_hat`, `v_hat`) makes early-step updates well-scaled. Default hyperparameters (`lr=3e-4` for transformers) just work.

#### Common activations and their gradients

| Activation | Forward | Backward |
|---|---|---|
| Sigmoid | `σ(z) = 1/(1+e^−z)` | `σ(z)(1−σ(z))` |
| Tanh | `tanh(z)` | `1 − tanh²(z)` |
| ReLU | `max(0, z)` | `1[z > 0]` |
| Leaky ReLU | `max(αz, z)` | `α` for `z<0`, `1` else |
| GELU | `z·Φ(z)` ≈ smooth ReLU | analytic, ~ReLU+0.5 |
| Softmax | `eᶻⁱ / Σeᶻʲ` | combined with cross-entropy → `p − y_onehot` |

#### Loss functions

| Task | Loss | Gradient (softmax/sigmoid combined) |
|---|---|---|
| Multi-class classification | Cross-entropy + softmax | `p − y_onehot` |
| Binary classification | Binary cross-entropy + sigmoid | `σ(z) − y` |
| Regression | MSE = `(ŷ − y)²` | `2(ŷ − y)` |
| Robust regression | Huber loss | Linear far from target, quadratic near |
| Margin / SVM | Hinge `max(0, 1 − y·ŷ)` | `−y · 1[1 − y·ŷ > 0]` |
| Contrastive | Cosine similarity / InfoNCE | Pairwise comparisons |

#### Tricks that make training work

| Technique | Why |
|---|---|
| **Mini-batch SGD** | Vectorizes hardware; regularizes via noise |
| **Learning rate schedule** | Warmup + cosine / step decay; helps Adam too |
| **Gradient clipping** | Prevents exploding gradients (RNNs, transformers) |
| **Batch / Layer normalization** | Stabilizes deep networks |
| **Weight initialization** (Xavier / He) | Keeps activations from vanishing or exploding at init |
| **Residual connections** | Allows training very deep networks |
| **Dropout** | Regularization via random unit deletion |
| **Mixed precision (fp16/bf16)** | 2× speed, less memory, with loss scaling |

#### Patterns map

| Problem | Choice |
|---|---|
| Train any modern NN | Adam / AdamW with warmup |
| Convex problem with small data | L-BFGS |
| Memory-constrained training | Lion / 8-bit Adam |
| Online learning (one sample at a time) | SGD with momentum |
| Sparse features (NLP bag-of-words) | AdaGrad / FTRL |
| Reinforcement learning | PPO / Adam |
| Sequence model with vanishing gradients | LSTM / Transformer + Adam + gradient clipping |
| Distributed training | Data parallel + AllReduce of gradients |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to **zero gradients** between batches | Reset to zero before each backward; otherwise they accumulate |
| Loss is `nan` | Lower learning rate; check log of zero; use stable softmax |
| Loss not decreasing | Check data labels; verify forward; reduce model size |
| Loss decreases on train but not eval | Overfitting → more data, dropout, weight decay, early stopping |
| Exploding gradients (RNN) | Clip gradients to a max norm (e.g., 1.0) |
| Vanishing gradients (deep) | ReLU / GELU + residuals + LayerNorm |
| Bad initialization (all zeros) | Use Xavier / He |
| Adam without bias correction | Implementations skip it sometimes; bias correction matters in early steps |
| Dropout active at eval time | Switch model to eval mode |
| Forgot to scale loss by batch size | Affects gradient magnitude → tune lr accordingly |

#### Complexity (per parameter per step)

| Op | Cost |
|---|---|
| Forward | O(model size) |
| Backward | ~2× forward |
| Adam update | O(1) per parameter (constant memory: 2 moment buffers) |
| Memory | Forward activations + 2 buffers per param + grads |

**Rule of thumb:** **forward + chain-rule backward + Adam step = the entire training loop**. Default to **AdamW** with warmup + cosine decay, **gradient clipping** for sequence models, **batch / layer norm** for stability. **Zero gradients between batches.** When loss explodes, lower the learning rate first; when it doesn't decrease, check your data pipeline before the model.
