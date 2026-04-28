### Distributed Training (data parallel, model parallel, ZeRO, FSDP, pipeline, tensor parallelism)

**When:** training neural networks too large or slow for a single GPU. Modern LLMs / vision models require **tens to thousands of accelerators** working together. Choice of parallelism strategy depends on whether **the model fits in one GPU's memory**.

**Schema (the parallelism axes):**

| Axis | What's split |
|---|---|
| **Data parallel** (DP) | **Batch** split across GPUs; each GPU has full model copy |
| **Model parallel** (MP) | **Model layers** split across GPUs (fewer params per GPU) |
| **Pipeline parallel** (PP) | **Sequential layers** assigned to different GPUs |
| **Tensor parallel** (TP) | **Within-layer matrix ops** split across GPUs |
| **Sequence / context parallel** | Long sequence split across GPUs |
| **Expert parallel** (MoE) | Experts split; only some used per token |

> Modern large-model training combines **multiple axes** (e.g., 3D parallelism = DP × PP × TP).

#### Decision: which parallelism do I need?

| Situation | Strategy |
|---|---|
| Model fits in one GPU; want speedup | **Data parallel** (DDP / FSDP) |
| Model doesn't fit; activations OK | **FSDP / ZeRO-3** (shard model + optimizer + grads) |
| Model way too big; need many GPUs | **3D parallelism** (DP + PP + TP) |
| Sequence length too long | **Sequence parallel** + activation checkpointing |
| Mixture of Experts | **Expert parallel** + DP |

#### Data parallelism (DP / DDP)

Each GPU has full model copy; batch split across GPUs; gradients **all-reduced** at every step.

| API | Detail |
|---|---|
| **`torch.nn.DataParallel`** | Single-process; **avoid** — slow due to GIL and python copies |
| **`torch.nn.parallel.DistributedDataParallel`** (DDP) | Multi-process; **default** for data parallel |
| **PyTorch FSDP (`FullyShardedDataParallel`)** | Shard params + grads + optimizer (ZeRO-3) |
| **Horovod** | Framework-agnostic |
| **DeepSpeed ZeRO** | Microsoft; ZeRO-1/2/3 stages |
| **JAX `pmap`** | Native data parallel |

##### DDP example

```python
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

dist.init_process_group(backend="nccl")
model = MyModel().to(rank)
model = DDP(model, device_ids=[rank])

for batch in loader:
    out = model(batch)
    loss = loss_fn(out, batch.y)
    loss.backward()                          # gradients auto-all-reduced
    optimizer.step()
```

| Property | Detail |
|---|---|
| Memory | Full model on each GPU |
| Communication | All-reduce of gradients per step |
| Scales to | ~hundreds of GPUs efficiently |
| Bottleneck | Gradient communication (use NCCL on GPUs) |

#### ZeRO (Zero Redundancy Optimizer) / FSDP

Reduces memory by **sharding model state** across GPUs:

| Stage | Shards | Memory savings |
|---|---|---|
| **ZeRO-1** | Optimizer states | ~4× |
| **ZeRO-2** | + Gradients | ~8× |
| **ZeRO-3 / FSDP** | + Parameters | Linear in #GPUs |

> **FSDP is PyTorch's built-in ZeRO-3 equivalent**. Each GPU holds only `1/N` of the model; parameters are gathered on-demand for each layer's forward/backward, then released.

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
model = FSDP(MyModel())
```

| ZeRO stage | When to use |
|---|---|
| ZeRO-1 | Optimizer states are bottleneck (Adam = 3× params) |
| ZeRO-2 | Gradients also too large |
| ZeRO-3 / FSDP | Model itself doesn't fit |

#### Mixed precision

| Type | Detail |
|---|---|
| **FP32** | Full precision; baseline |
| **FP16** | Half precision; 2× speed, can have stability issues |
| **BF16** | Brain Float 16; same range as FP32, ~FP16 precision; default for modern training |
| **FP8** (Hopper / H100) | Cutting edge; aggressive scaling required |

```python
# AMP (automatic mixed precision)
from torch.cuda.amp import GradScaler, autocast

scaler = GradScaler()
for batch in loader:
    with autocast(dtype=torch.bfloat16):
        out = model(batch)
        loss = loss_fn(out)
    scaler.scale(loss).backward()
    scaler.step(optimizer); scaler.update()
```

> **BF16 is the default** for transformer training in 2024 — same range as FP32 means no loss scaling needed.

#### Gradient accumulation (poor man's larger batch)

```python
accumulation_steps = 4
for i, batch in enumerate(loader):
    out = model(batch)
    loss = loss_fn(out) / accumulation_steps
    loss.backward()
    if (i + 1) % accumulation_steps == 0:
        optimizer.step(); optimizer.zero_grad()
```

> Effective batch size = `per_GPU_batch × accumulation_steps × N_GPUs`. Useful when full batch doesn't fit in memory.

#### Activation checkpointing (gradient checkpointing)

Recompute activations during backward instead of storing them — saves memory at cost of ~30% extra compute:

```python
import torch.utils.checkpoint as cp

def block_fn(x):
    return self.transformer_block(x)

x = cp.checkpoint(block_fn, x)
```

> Standard for training large transformers. Pair with FSDP for max memory savings.

#### Pipeline parallelism

Different stages of the model on different GPUs; **micro-batches** flow through:

```
GPU 0 [layers 0-7]
GPU 1 [layers 8-15]
GPU 2 [layers 16-23]
GPU 3 [layers 24-31]
```

| Issue | Detail |
|---|---|
| **Bubble** | Idle time when stages wait for each other |
| **Solution** | Pipeline with multiple micro-batches in flight (1F1B schedule, GPipe) |
| Memory | Each stage holds only its layers |
| Best for | Models too big for one GPU; sequential ops |

```python
# Pseudo: PyTorch Pipe
from torch.distributed.pipeline.sync import Pipe
model = nn.Sequential(*layers)
model = Pipe(model, chunks=8)        # 8 micro-batches per pass
```

#### Tensor parallelism (TP)

Split **within a single layer's matrix multiplication** across GPUs.

For `Y = X · W`:

| Split | Detail |
|---|---|
| **Column parallel** (W split by columns) | All-gather output |
| **Row parallel** (W split by rows) | All-reduce output |
| **Megatron-style attention** | QKV projection column-split; output row-split |

> Used for **very wide layers** (huge attention / MLP in LLMs). Requires fast intra-node interconnect (NVLink). 8-way TP is typical within a node.

#### 3D parallelism (DP × PP × TP)

Combine all three for huge models. Used by GPT-3, Llama, etc.

| Axis | Use |
|---|---|
| Tensor parallel | Within node (8-way, NVLink) |
| Pipeline parallel | Across nodes (split layers) |
| Data parallel | Replicate across pipeline groups |

```
Total GPUs = DP × PP × TP
e.g., 64 GPUs = 4 (DP) × 4 (PP) × 4 (TP)
```

#### Communication primitives

| Op | What |
|---|---|
| **All-reduce** | Every GPU has identical sum after | Used in DP gradient averaging |
| **All-gather** | Every GPU has all parts after | FSDP parameter gather |
| **Reduce-scatter** | Sum + scatter to GPUs | FSDP gradient sharing |
| **Broadcast** | One GPU's data to all | Initial weight sync |
| **All-to-all** | Each GPU sends/receives different data | MoE expert dispatch |

#### NCCL (NVIDIA Collective Communications Library)

Used by PyTorch / TF / JAX for GPU-to-GPU communication. Optimized for NVLink, PCIe, InfiniBand.

| Backend | When |
|---|---|
| **NCCL** | GPU communication (default) |
| **Gloo** | CPU communication / debugging |
| **MPI** | HPC clusters |

#### Key trade-offs

| Strategy | Memory | Speed | Communication |
|---|---|---|---|
| **DDP** | Full model per GPU | Fastest | All-reduce gradients |
| **ZeRO-1/2** | Reduced opt + grad | Slightly slower | + All-gather params |
| **FSDP / ZeRO-3** | Sharded all | Slower | Heavy all-gather |
| **Pipeline** | Per-stage | Bubble overhead | Activation pass between stages |
| **Tensor** | Per-shard | Fast within node | Heavy intra-layer |

#### Frameworks

| Framework | Strength |
|---|---|
| **PyTorch DDP / FSDP** | Modern default |
| **DeepSpeed** | ZeRO + many tricks; Microsoft |
| **Megatron-LM** | NVIDIA; tensor + pipeline parallel |
| **PyTorch Lightning** | Wrapper; supports many parallelism strategies |
| **Hugging Face Accelerate** | Easy API; under the hood DDP / FSDP |
| **Hugging Face Trainer** | High-level training loop |
| **JAX `pmap` / `pjit`** | Functional; native multi-device |
| **ColossalAI** | Open-source 3D parallelism |
| **FairScale** | Meta; precursor to FSDP |

#### Cluster + storage

| Concern | Solution |
|---|---|
| Data loading bottleneck | Multiple workers, prefetch, store on fast disk |
| Communication speed | NVLink within node, InfiniBand between |
| GPU memory | Right-size; use H100 / A100 for big models |
| Failure recovery | Checkpoint frequently; resume from last good |
| Job scheduling | Slurm, Kubernetes, Ray |
| Cost | Spot / preemptible instances |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using `nn.DataParallel` instead of DDP | Slow; switch to DDP |
| OOM with large batch | Gradient accumulation + activation checkpointing + FSDP |
| FP16 NaN losses | Switch to BF16 |
| Wrong learning rate scaling | Linear scaling rule for batch size; warmup |
| Mismatched GPUs | All replicas should be identical type |
| `.to(device)` outside DDP wrapping | DDP needs to know devices upfront |
| Forgetting `set_epoch` for `DistributedSampler` | Each epoch reshuffles consistently across workers |
| Not pinning batches | `DataLoader(pin_memory=True)` for GPU transfer |
| Single-machine TP | TP best within multi-GPU node, not across machines |

#### Linear scaling rule (Goyal et al. 2017)

When increasing batch size by `k`, increase learning rate by `k`. Add warmup to prevent early instability.

```python
warmup_steps = 1000
target_lr = base_lr * world_size

def lr_schedule(step):
    if step < warmup_steps:
        return target_lr * step / warmup_steps
    return target_lr * cosine_decay(step)
```

#### Checkpointing strategy

| Item | When to save |
|---|---|
| Model weights | Every N steps |
| Optimizer state | Same |
| LR scheduler state | Same |
| Random seeds / RNG state | Reproducibility |
| Sharded checkpoints (FSDP) | Each GPU saves its shard |

> **Sharded checkpoints save / load 10× faster** for large models.

#### Cost model

| Setup | Approx cost |
|---|---|
| 1 × A100 80GB | ~$3/hour spot |
| 8 × A100 (single node) | ~$25/hour spot |
| 64 × A100 cluster | ~$200/hour spot |
| GPT-3 training (175B params) | $5–10M |
| Llama-2 70B training | ~$2M |
| BERT-base training | ~$1k–10k |

#### Decision tree

```
Model fits in one GPU?
├─ Yes
│   ├─ Single GPU sufficient        → No parallelism
│   └─ Want speedup                  → Data parallel (DDP)
└─ No
    ├─ Just barely too big          → ZeRO-3 / FSDP
    ├─ Several GPUs needed          → FSDP + activation checkpointing
    └─ Hundreds-of-billions params   → 3D parallelism (DP × PP × TP)

Sequence length issue?
└─ Add sequence parallel + checkpointing
```

#### Modern training stack

```
Job orchestrator (Slurm / K8s)
       ↓
Training script (PyTorch + FSDP / DeepSpeed)
       ↓
Model code (transformer / vision / etc.)
       ↓
Data loader (pinned, multi-worker, sharded)
       ↓
Storage (S3 + WebDataset / streaming Parquet)
       ↓
Compute (NCCL on H100 / A100 with NVLink + InfiniBand)
       ↓
Checkpoints (sharded, every N steps)
       ↓
Logging (W&B / TensorBoard / MLflow)
```

**Rule of thumb:** **start with DDP / FSDP** for any model that fits or "almost fits". Use **BF16 + activation checkpointing + gradient accumulation** to extend single-GPU training. **3D parallelism (DP × PP × TP)** is for huge models (1B+ params, 100+ GPUs) — don't over-engineer at smaller scale. **Hugging Face Accelerate / Trainer** abstracts most of this — production teams use it for 90% of distributed training. **Cost optimization**: BF16, fewer epochs with bigger batch, spot instances, gradient checkpointing.
