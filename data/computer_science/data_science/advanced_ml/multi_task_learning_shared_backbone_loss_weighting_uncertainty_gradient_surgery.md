### Multi-Task Learning (shared backbone, loss weighting, uncertainty, gradient surgery)

**When:** train **one model on multiple related tasks** instead of separate models — share representations, reduce inference cost, transfer learning between tasks. Used in: multi-objective recommenders (CTR + watch-time + revenue), perception stacks (detection + segmentation + depth), language models (multi-task fine-tuning), recommender systems with multiple labels.

**Schema:**

| Concept | Detail |
|---|---|
| **Shared backbone** | Encoder learning representations useful for all tasks |
| **Task heads** | Per-task prediction heads (small, task-specific) |
| **Loss aggregation** | Combined loss = weighted sum of per-task losses |
| **Negative transfer** | Sharing hurts when tasks are conflicting |
| **Positive transfer** | Sharing helps when tasks are related |

> Multi-task is **inductive bias for transfer**. Often outperforms single-task; sometimes hurts (negative transfer) when tasks are unrelated.

#### Architecture patterns

| Pattern | Detail |
|---|---|
| **Hard parameter sharing** | All tasks share encoder; separate heads (default) |
| **Soft parameter sharing** | Per-task encoders + cross-task constraints (regularization) |
| **MMoE** (Multi-gate Mixture of Experts) | Shared experts, per-task gates |
| **Cross-stitch / sluice networks** | Per-task encoders + learnable inter-layer connections |
| **PLE** (Progressive Layered Extraction) | Hierarchical separation of shared / task-specific |
| **MoE / Sparse experts** | Route to subset of experts per token / sample |

##### Hard parameter sharing (the default)

```python
import torch.nn as nn

class MultiTaskModel(nn.Module):
    def __init__(self, n_features):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(n_features, 256), nn.ReLU(),
            nn.Linear(256, 128), nn.ReLU(),
        )
        self.head_clf = nn.Linear(128, 2)         # task A: classification
        self.head_reg = nn.Linear(128, 1)         # task B: regression
        self.head_rank = nn.Linear(128, 1)        # task C: ranking score

    def forward(self, x):
        h = self.backbone(x)
        return {
            "clf": self.head_clf(h),
            "reg": self.head_reg(h),
            "rank": self.head_rank(h),
        }

# Combined loss
def total_loss(preds, targets, weights):
    return (
        weights["clf"]  * F.cross_entropy(preds["clf"],  targets["clf"]) +
        weights["reg"]  * F.mse_loss(preds["reg"], targets["reg"]) +
        weights["rank"] * F.mse_loss(preds["rank"], targets["rank"])
    )
```

#### Loss weighting strategies

| Strategy | Detail |
|---|---|
| **Manual / fixed weights** | Pick by trial; simple |
| **Equal weights** | Default starting point |
| **Per-task gradient norm** | Balance gradient magnitudes (GradNorm) |
| **Uncertainty weighting (Kendall)** | Learn `σ_t` per task; loss = `Σ (1/σ_t²) · L_t + log σ_t` |
| **DWA** (Dynamic Weight Averaging) | Adjust based on rate of loss decrease |
| **PCGrad** (gradient surgery) | Project conflicting gradients onto orthogonal subspace |
| **CAGrad / GradVac / IMTL** | Modern multi-task gradient methods |

##### Uncertainty-based weighting (Kendall et al. 2018)

```python
class UncertaintyWeightedLoss(nn.Module):
    def __init__(self, n_tasks):
        super().__init__()
        self.log_sigma = nn.Parameter(torch.zeros(n_tasks))    # learnable per-task

    def forward(self, losses):
        precisions = torch.exp(-self.log_sigma)
        return (precisions * losses).sum() + self.log_sigma.sum()
```

> Loss = `Σ (1 / σ_t²) L_t + log(σ_t²)`. Tasks with higher noise → smaller weight. **Often outperforms manual tuning**.

##### PCGrad (gradient surgery)

When task gradients conflict (negative cosine), project one onto the normal of the other:

```python
def pcgrad_step(model, losses):
    grads = []
    for L in losses:
        L.backward(retain_graph=True)
        grads.append({n: p.grad.clone() for n, p in model.named_parameters()})
        model.zero_grad()
    # Resolve conflicts: project conflicting grads onto each other's normal
    ...
```

> Reduces negative transfer when tasks pull weights in opposite directions.

#### MMoE (Multi-gate Mixture of Experts)

Shared **experts** (small subnetworks) gated **per task**:

```
Input → [Expert 1, Expert 2, ..., Expert E]
            ↓ (per-task gate combines experts)
        Task A head, Task B head, ...
```

```python
class MMoE(nn.Module):
    def __init__(self, input_dim, n_experts, expert_dim, n_tasks):
        super().__init__()
        self.experts = nn.ModuleList([
            nn.Sequential(nn.Linear(input_dim, expert_dim), nn.ReLU())
            for _ in range(n_experts)
        ])
        self.gates = nn.ModuleList([
            nn.Linear(input_dim, n_experts) for _ in range(n_tasks)
        ])
        self.heads = nn.ModuleList([nn.Linear(expert_dim, 1) for _ in range(n_tasks)])

    def forward(self, x):
        expert_outs = torch.stack([e(x) for e in self.experts], dim=1)   # [B, E, expert_dim]
        outputs = []
        for gate, head in zip(self.gates, self.heads):
            weights = torch.softmax(gate(x), dim=-1)                      # [B, E]
            combined = (expert_outs * weights[..., None]).sum(dim=1)      # [B, expert_dim]
            outputs.append(head(combined))
        return outputs
```

> **MMoE is YouTube's recommender architecture** (Ma et al. 2018). Different gates let conflicting tasks use different experts.

#### When MTL helps vs hurts

| Helps when | Hurts when |
|---|---|
| Tasks share latent structure | Tasks are unrelated |
| Some tasks are data-poor (regularize via shared) | One task dominates loss |
| Tasks have similar input distributions | Heterogeneous inputs |
| Auxiliary tasks improve main task | Task imbalance unaddressed |
| Compute / latency budget is tight | Training is straightforward single-task |

> **Negative transfer** = tasks pulling representations in conflicting directions. Mitigate with **MMoE / PCGrad / soft sharing**.

#### Task selection

| Strategy | Detail |
|---|---|
| **Domain-driven** | Tasks share semantics (CTR + dwell + add-to-cart) |
| **Auxiliary tasks** | Easy tasks that regularize the main one |
| **Multi-objective optimization** | Pareto front of trade-offs |
| **Curriculum** | Easy tasks first, then hard |

#### Common patterns by domain

| Domain | Tasks |
|---|---|
| **Recommender systems** | CTR + watch-time + share + skip + revenue |
| **Computer vision** | Classification + detection + segmentation + depth |
| **NLP** | Classification + NER + parsing + masked LM |
| **Search** | Relevance + diversity + freshness |
| **Self-driving** | Detection + lane + drivable area + planning |

#### Multi-task vs single-task — when to choose

| Setting | Single-task | Multi-task |
|---|---|---|
| Inference budget tight | ✗ multiple models | ✓ one model |
| Data size per task is small | ✗ overfit | ✓ regularizes |
| Tasks unrelated | ✓ | ✗ negative transfer |
| Want best per-task accuracy | Often single | Sometimes MTL still better |
| Production complexity | Simple | More complex |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Equal weights without inspecting loss scales | Tasks with smaller losses dominated; use uncertainty weighting |
| Ignoring negative transfer | Try MMoE / PCGrad |
| Sharing too many layers | Separate task-specific layers higher up |
| Per-task data imbalance | Sample / weight tasks proportionally |
| Comparing MTL only on aggregate metric | Per-task metric per task |
| Treating MTL as multi-headed regression | Different losses (binary, regression, ranking) need careful weighting |
| Not freezing pretrained backbone | If backbone is pretrained, optionally freeze early epochs |
| Validating per-task without aggregate trade-off | Pareto front matters |

#### Empirical recipe

| Step | Action |
|---|---|
| 1 | Identify related tasks; share encoder |
| 2 | Train baseline with equal weights |
| 3 | Compare to single-task baselines |
| 4 | If negative transfer: switch to MMoE / PCGrad / soft sharing |
| 5 | Tune weights via uncertainty / GradNorm |
| 6 | Validate per-task; check no task degraded vs single-task |

#### Multi-task in production recommenders

```python
# YouTube-style multi-task model
class WatchTimePredictor(nn.Module):
    def __init__(self, ...):
        super().__init__()
        self.shared_encoder = ...
        self.gates = nn.ModuleList([nn.Linear(...) for _ in range(n_tasks)])
        # Tasks: CTR, watch-time, share, skip, like

    def forward(self, x):
        h = self.shared_encoder(x)
        ctr_logit = ctr_head(h_ctr)         # binary
        watch_time = watch_head(h_watch)    # regression with weight = CTR (Wide & Deep style)
        ...
        # Combined ranking score
        score = ctr_prob * E[watch_time | clicked]
        return score
```

#### MoE (sparse experts)

Modern variant: **route each input to a subset of experts** (top-k gating). Used in:

| Model | Detail |
|---|---|
| **Switch Transformer** | One expert per token (k=1) |
| **GShard** | k=2 |
| **Mixtral** | 8 experts, top-2 |
| **Router collapse** | Mitigation: load balancing loss |

> MoE scales **parameters cheaply** (only fraction active per forward) but adds routing overhead and instability.

#### Decision tree

```
Tasks related?
├─ Yes, all critical                   → Hard parameter sharing
├─ Some conflicting                    → MMoE / PCGrad
├─ Auxiliary task helps main           → Multi-task with weighted loss
├─ Tasks very different                 → Single-task or soft sharing
└─ Inference cost critical              → Multi-task (single model)
```

#### Tools

| Tool | Use |
|---|---|
| **PyTorch lightning + multi-loss** | Wrap multiple `*_step` methods |
| **Ray / TorchRec** | Production multi-task recommenders |
| **NVIDIA Merlin** | Multi-task GPU recommender stack |
| **Hugging Face Transformers** | Multi-task fine-tuning |
| **Distributed multi-task training** | Standard DDP / FSDP |

**Rule of thumb:** **multi-task learning works when tasks share structure**. **Hard parameter sharing** is the simple default; **MMoE** when tasks may conflict (production recommenders); **uncertainty weighting** to balance loss scales without manual tuning. Always **compare to single-task baselines** per task — MTL must not degrade any task significantly. **Negative transfer** is the failure mode; mitigate with **MMoE / PCGrad / soft sharing**.
