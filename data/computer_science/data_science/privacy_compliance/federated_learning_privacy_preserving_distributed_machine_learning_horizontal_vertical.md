### Federated Learning (privacy-preserving distributed ML, horizontal / vertical, FedAvg)

**When:** training ML models across **multiple data holders** (devices, hospitals, banks) **without centralizing raw data**. Data stays local; only model updates are shared. Standard pattern in mobile (Gboard), healthcare (multi-hospital), and cross-organization ML.

**Schema:**

| Concept | Detail |
|---|---|
| **Server** | Coordinates training; aggregates client updates |
| **Clients** | Devices / institutions with local data |
| **Federated round** | Server selects clients → clients train locally → upload updates → server aggregates → broadcast new global model |
| **Aggregation** | Weighted average of client updates (FedAvg) |
| **No raw data exchange** | Only model gradients / weights leave clients |

> **Privacy ≠ guaranteed**. Federated learning **reduces but doesn't eliminate** leakage; combine with **differential privacy** + **secure aggregation** for stronger guarantees.

#### Federation types

| Type | Setup | Example |
|---|---|---|
| **Horizontal FL** | Clients have different **rows** (samples), same features | Mobile keyboards across users |
| **Vertical FL** | Clients have different **columns** (features), same rows | Bank + retailer with shared customers |
| **Federated transfer learning** | Different rows AND features; transfer learning bridges | Cross-domain |

#### FedAvg (the canonical algorithm)

```
1. Server initializes global model w_0
2. For each round t = 1, 2, ...:
   a. Server selects subset of clients S_t
   b. Each client k ∈ S_t:
      - Downloads w_t
      - Trains locally for E epochs on its data
      - Sends updated weights w_t^k to server
   c. Server aggregates: w_{t+1} = Σ (n_k / N) · w_t^k
```

```python
# Pseudocode
def federated_round(global_model, clients, frac=0.1, epochs=1):
    selected = random.sample(clients, int(frac * len(clients)))
    client_updates = []
    for client in selected:
        local = copy.deepcopy(global_model)
        train(local, client.data, epochs=epochs)
        client_updates.append((local.state_dict(), len(client.data)))

    # Weighted average
    total = sum(n for _, n in client_updates)
    new_state = {}
    for key in global_model.state_dict():
        new_state[key] = sum(state[key] * n / total for state, n in client_updates)
    global_model.load_state_dict(new_state)
    return global_model
```

#### Frameworks

| Framework | Strength |
|---|---|
| **TensorFlow Federated (TFF)** | Google; research-friendly |
| **Flower** | Framework-agnostic; production-ready |
| **PySyft** | Privacy + federated; secure multi-party computation |
| **FedML** | Academic + industrial |
| **NVFlare** | NVIDIA; healthcare focus |
| **OpenFL** | Intel; cross-organization |

#### Challenges

| Challenge | Mitigation |
|---|---|
| **Non-IID data** | Each client's data distribution differs — FedAvg can converge slowly | Use FedProx, SCAFFOLD, FedYogi |
| **Communication cost** | Sending model updates can dominate | Compress updates (quantization, top-K sparsification) |
| **Stragglers** | Slow clients delay round | Asynchronous FL or partial aggregation |
| **System heterogeneity** | Clients have different compute / network | Client selection strategies |
| **Privacy leakage** | Updates can leak training data (gradient inversion attacks) | + Differential privacy |
| **Adversarial clients** | Malicious clients send poisoned updates | Robust aggregation (median, Krum) |
| **Personalization** | One global model isn't best for everyone | Per-client fine-tuning or meta-learning |
| **Drift** | Distributions change over time | Periodic retraining; continual learning |

#### Non-IID handling

| Algorithm | Idea |
|---|---|
| **FedProx** | Regularize local update to stay close to global |
| **SCAFFOLD** | Variance reduction via control variates |
| **FedYogi / FedAdam** | Server-side adaptive optimizer |
| **FedNova** | Normalize local update by # local steps |

#### Privacy techniques (combined with FL)

| Technique | What |
|---|---|
| **Differential privacy (DP-SGD)** | Add calibrated noise to gradients; bound `(ε, δ)` |
| **Secure aggregation** | Cryptographic protocol — server only sees sum, not individual updates |
| **Homomorphic encryption** | Compute on encrypted data |
| **Secure multi-party computation (MPC)** | Split computation across parties |
| **Trusted execution environment (TEE)** | Hardware enclaves (Intel SGX) |

> **Federated alone provides weak privacy**. Add **DP-SGD + secure aggregation** for production privacy guarantees.

#### Differential Privacy + FL (DP-FL)

```python
# Per-client DP-SGD: clip gradient norm + add noise
def dp_local_train(model, data, max_grad_norm=1.0, noise_multiplier=1.1):
    for batch in data:
        grad = compute_gradient(model, batch)
        # Per-sample clip
        for g in grad:
            g.clip_norm_(max_grad_norm)
        # Add Gaussian noise
        noise = torch.randn_like(grad) * (max_grad_norm * noise_multiplier)
        model.update(grad + noise)
```

> Trade-off: tighter `(ε, δ)` privacy = more noise = lower accuracy. Tune for your application.

#### Communication efficiency

| Technique | Reduction |
|---|---|
| **Top-K sparsification** | Send only K largest gradient magnitudes | 100×+ |
| **Quantization (1-bit, 8-bit)** | Compress gradient values | 4–32× |
| **Federated dropout** | Sub-models per client | 4× |
| **Local-SGD** with longer rounds | Fewer rounds, more local epochs | 10× |
| **Model distillation** | Send distilled student instead of full teacher | Specialized |

#### Personalization

| Approach | Detail |
|---|---|
| **Local fine-tuning** | Train globally; fine-tune per client at end |
| **MAML / meta-learning** | Train model that's quickly adaptable |
| **Mixture of experts** | Per-client experts |
| **Hypernetwork** | Generate client-specific weights from client embedding |
| **Per-client heads** | Shared backbone, separate output heads |

> One-size-fits-all FL often underperforms — **personalization is the next layer**.

#### Cross-silo vs cross-device

| Cross-silo | Cross-device |
|---|---|
| Few clients (10s–100s of orgs) | Many clients (millions of devices) |
| Each client has lots of data | Each has little |
| Stable, always available | Sporadic; battery / network constrained |
| E.g., hospitals, banks | E.g., smartphones (Gboard) |
| Per-round all clients participate | Sample subset per round |

#### Security threats

| Threat | Mitigation |
|---|---|
| **Gradient inversion** | Reconstruct training data from gradients | DP-SGD; batched updates |
| **Membership inference** | Tell if a specific sample was in training | DP |
| **Backdoor / model poisoning** | Malicious client embeds trigger | Robust aggregation; verification |
| **Free-rider** | Client gains from training without contributing | Incentive mechanisms |
| **Sybil attacks** | Adversary spawns many fake clients | Authentication |

#### Use cases

| Domain | Application |
|---|---|
| **Mobile keyboards** | Gboard next-word prediction (Google) |
| **Healthcare** | Multi-hospital tumor / X-ray analysis without centralizing PHI |
| **Banking** | Cross-bank fraud detection |
| **Voice assistants** | On-device wake-word personalization |
| **Industrial IoT** | Cross-factory predictive maintenance |
| **Pharma** | Drug discovery across pharma companies |

#### Federated vs centralized vs distributed training

| Aspect | Centralized | Distributed (DDP / FSDP) | Federated |
|---|---|---|---|
| Data location | Central server | Central server | **On client; never leaves** |
| Compute | Server | Multi-GPU server | Many client devices |
| Privacy | None inherent | None inherent | **Strong (with DP+SA)** |
| Communication | Local | Fast intra-cluster | Slow / unreliable |
| Coordination | Simple | Tightly coupled | Loose, fault-tolerant |

#### Production considerations

| Concern | Mitigation |
|---|---|
| Model size on device | Compress / distill |
| Battery / data usage | Train on Wi-Fi + charging |
| Versioning | Match client SDK to server protocol |
| A/B testing in FL | Per-client treatment assignment |
| Rollback | Server can broadcast revert |
| Dropouts | Async aggregation; handle stragglers |
| Heterogeneity | Adaptive client selection |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Treating FL as "automatic privacy" | Add DP + secure aggregation |
| FedAvg on highly non-IID data | Use FedProx / SCAFFOLD |
| Too many local epochs | Causes client drift; tune carefully |
| All clients per round | Sample subset (cross-device) |
| No staleness handling | Async FL; weight stale updates less |
| Ignoring communication cost | Compress; sparsify |
| Per-client model = no global learning | Hybrid: global + local fine-tune |

#### Practical FedAvg with Flower

```python
import flwr as fl

class Client(fl.client.NumPyClient):
    def __init__(self, model, train_data, val_data):
        self.model = model
        self.train_data = train_data
        self.val_data = val_data

    def get_parameters(self, config):
        return [p.detach().numpy() for p in self.model.parameters()]

    def fit(self, parameters, config):
        # Load global params, train locally, return updated params
        ...
        return updated_params, num_examples, {}

    def evaluate(self, parameters, config):
        # Load global params, evaluate
        ...
        return loss, num_examples, {"accuracy": acc}

# Server
strategy = fl.server.strategy.FedAvg(
    fraction_fit=0.1,
    min_fit_clients=10,
    min_available_clients=100,
)
fl.server.start_server(server_address="[::]:8080", config=fl.server.ServerConfig(num_rounds=100), strategy=strategy)
```

#### Decision tree

```
Can data be centralized?
├─ Yes                                        → Standard distributed training
└─ No
    ├─ Few large clients (banks, hospitals)   → Cross-silo FL
    ├─ Many small clients (mobile, IoT)        → Cross-device FL
    ├─ Different features per client           → Vertical FL
    ├─ Different rows per client                → Horizontal FL
    └─ Need formal privacy guarantees          → + DP-SGD + secure aggregation
```

**Rule of thumb:** **federated learning trains across decentralized data without moving it**. **FedAvg** is the canonical algorithm — server averages client weights weighted by data size. **Non-IID data** is the central challenge — use FedProx / SCAFFOLD. **Federation alone is weak privacy** — add **differential privacy + secure aggregation** for production guarantees. Use **Flower** for production; **TFF / PySyft** for research.
