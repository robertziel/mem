### LLM Deployment, Serving & Latency Optimization

**Hosting choice — three big options:**

| Approach | Examples | Latency | Cost | Control | Compliance posture |
|---|---|---|---|---|---|
| **API provider** | OpenAI, Anthropic, Mistral, Cohere | Low (their infra) | Per-token; predictable | Least — black-box weights | Provider's SOC2 / DPA |
| **Cloud-managed** | AWS Bedrock, Azure OpenAI, GCP Vertex | Low | Per-token + cloud | Medium | Stays in your cloud account, region-pinned |
| **Self-hosted OSS** | vLLM, TGI, llama.cpp, SGLang, TensorRT-LLM | Variable (hardware-bound) | Infra + ops | Most — your weights, your data | Anything you can audit |

**Latency anatomy — two phases, very different costs:**

| Phase | What happens | Scales with | Optimization |
|---|---|---|---|
| **Prefill** (TTFT) | Process the prompt, fill the KV cache | Prompt length | Shorten prompts, prompt caching, prefix sharing |
| **Decode** | Generate tokens one at a time | Output length × per-token cost | Quantization, speculative decoding, batching |

> **Total = TTFT + (output_tokens × per_token_latency)**. TTFT dominates short responses; decode dominates long ones.

**Quality vs latency vs cost — the eternal triangle:**

| Lever | Latency ↓ | Cost ↓ | Quality |
|---|---|---|---|
| Smaller model (Haiku vs Opus, 8B vs 70B) | ✅ | ✅ | ↓ |
| Quantization (FP16 → INT8 → INT4) | ✅ | ✅ | ↓ slight |
| Streaming responses | ✅ perceived | — | unchanged |
| Speculative decoding | ✅ | varies | unchanged |
| Continuous batching | — | ✅ | unchanged |
| Prompt / KV caching | ✅ | ✅ | unchanged |
| Shorter system prompt | ✅ | ✅ | requires testing |
| Less reasoning / fewer thinking tokens | ✅ | ✅ | ↓ on hard tasks |

**Quantization at a glance:**

| Format | Bits | Memory ratio vs FP32 | Quality | Notes |
|---|---|---|---|---|
| FP32 | 32 | 1× | Reference | Training default |
| FP16 / BF16 | 16 | 0.5× | ~equal | Most production inference |
| INT8 | 8 | 0.25× | Slight loss | Mature toolchains |
| INT4 (GPTQ, AWQ) | 4 | 0.125× | ~5 % task-dependent | Best $/token for self-host |
| INT4 + LoRA fine-tune | 4 | — | Recoverable per-task | QLoRA pattern |
| Mixed (FP8 weights + KV cache in INT8) | varies | — | Strong | Latest serving stacks |

**KV cache — the silent memory hog:**

| Concern | Detail |
|---|---|
| What it stores | Attention keys + values for **every previous token in every layer** |
| Size | `2 × layers × heads × head_dim × seq_len × batch × dtype_bytes` — gigabytes per request at long context |
| Optimization (PagedAttention / vLLM) | Virtual paging — small fixed-size blocks; eliminates fragmentation |
| **Prefix caching** | Reuse KV across requests sharing a system prompt — huge win for chat |
| **Prompt caching** (Anthropic, OpenAI) | Provider-side equivalent; cache hits ~10× cheaper |
| Sliding window attention | Drops old KV — for very long contexts |

**Batching strategies:**

| Strategy | How | Throughput | Latency for individual req |
|---|---|---|---|
| **No batching** | One request at a time | Worst | Best |
| **Static batch** | Wait for N requests, run together | Better | Worst (waits for slowest peer) |
| **Dynamic batch** | Group by similar lengths, time-bounded wait | Better | Variable |
| **Continuous (in-flight) batching** | Add new requests at every iteration; drop finished ones | **Best** (2–10× of static) | **Best practical** — no waits |

> Continuous batching (vLLM, TGI, TensorRT-LLM) is the default for modern self-hosted serving.

**Speculative decoding (latency win without quality loss):**

| Variant | Idea |
|---|---|
| **Draft model** | Small fast model proposes N tokens; big model verifies in one forward pass |
| **N-gram prompt lookup** | Speculate from the prompt itself when output overlaps it |
| **Medusa heads** | Extra attention heads predict multiple future tokens |
| **EAGLE / Lookahead** | Newer techniques pushing further |
| Typical speedup | 1.5–3× decode |

**Streaming — perceived latency, not real:**

```python
for chunk in client.chat.completions.create(
    model="claude-opus-4-7",
    messages=[...],
    stream=True,
):
    print(chunk.content, end="", flush=True)
```

| Use | Why |
|---|---|
| Chat UI | First token in ~200 ms feels instant |
| CLI tools | User sees progress; cancellable |
| Code generation | Tokens render incrementally |
| Long-form reports | Reduces abandonment |

> Streaming **doesn't reduce total latency** — it just hides it.

**Caching strategies:**

| Strategy | Match | Use when |
|---|---|---|
| **Exact-match cache** | `hash(model + prompt + params) → response` | FAQ bots, repeated system prompts |
| **Semantic cache** | Embed prompt, look up nearest neighbor | Slight rephrasings of same intent |
| **Prompt prefix cache** | Provider-side caching of long shared prefixes | Long system prompts, retrieved context shared across users |
| **KV cache reuse (within session)** | Skip prefill on follow-up turns | Multi-turn chat |

**Self-hosting — tooling pick by need:**

| Tool | Strength |
|---|---|
| **vLLM** | Best general-purpose; PagedAttention; OpenAI-compatible API; broad model support |
| **TensorRT-LLM** (NVIDIA) | Lowest latency on NVIDIA; hardest to operate |
| **TGI** (HuggingFace Text Generation Inference) | Good for HF ecosystem, SGLang-style features |
| **SGLang** | RadixAttention prefix sharing; great for reasoning + tool-calling workloads |
| **llama.cpp / Ollama** | CPU + Mac Apple Silicon; great for local dev |
| **MLX** | Apple Silicon-optimized |
| **TGI + Bento** / **Triton** | Custom serving with autoscaling |

**vLLM minimal serve command:**

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9 \
  --enable-prefix-caching
```

**Hardware sizing rules of thumb:**

| Model size (FP16) | VRAM (weights only) | Throw in for KV + activations |
|---|---|---|
| 7–8 B | ~16 GB | + a few GB |
| 13 B | ~26 GB | + several GB |
| 70 B | ~140 GB | requires multi-GPU or quantization |
| 405 B | ~810 GB | tensor parallel + quantization mandatory |

| At INT4 | Approximate VRAM |
|---|---|
| 7 B | ~5 GB |
| 13 B | ~9 GB |
| 70 B | ~40 GB |

**Distributed inference patterns:**

| Pattern | When |
|---|---|
| **Tensor parallel** | Single model split across GPUs in one node |
| **Pipeline parallel** | Layers split across nodes; latency cost per stage |
| **Data parallel** (multiple replicas) | Independent replicas behind a load balancer |
| **Mixture of Experts (MoE)** | Sparse activation — needs expert-aware routing |

**Cost optimization checklist:**

| Lever | Win |
|---|---|
| Prompt caching for shared system prompts | Major — provider charges much less for cache hits |
| Smaller model for easy tasks (router pattern) | Often 5–20× cheaper |
| Output token cap | Linear cost reduction |
| Quantize for self-hosted | 2–4× $/token |
| Batch async / non-real-time inference | Provider batch APIs are 50% off; spot GPUs help self-hosted |
| Eliminate unused thinking / reasoning tokens for simple tasks | Cost in proportion |
| Cache embeddings | Don't re-embed unchanged content |

**Production monitoring — what to dashboard:**

| Metric | Why |
|---|---|
| TTFT (p50 / p95 / p99) | User-perceived "feels fast" |
| Total response latency | Real cost |
| Tokens/sec generated | Throughput health |
| Cache hit rate | Cost driver |
| Queue depth | Saturation signal |
| GPU utilization (self-host) | Right-sizing |
| Error rate per category | Rate limits, timeouts, content filter, model errors |
| Cost per request | Budget control |
| Quality scores (LLM-as-judge / user feedback) | Drift detection |
| Refusal rate / "I don't know" rate | Calibration drift |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Self-hosting before you have load | Idle GPU is the most expensive thing you own |
| Quantizing without measuring quality | Silent regression on real tasks |
| Static batching for chat | Batch-mate's slow request blocks yours |
| No streaming for chat UX | Users abandon |
| One-size-fits-all model | Pay Opus prices for tasks Haiku could do |
| Not honoring `Retry-After` on rate limits | Throughput drops; provider may further throttle |
| Ignoring TTFT vs total latency | Users mostly notice TTFT |
| Forgetting prompt caching | Pay full prefill cost on every shared system prompt |

**Decision matrix — what to pick first:**

| Need | Pick |
|---|---|
| Just ship a feature | API provider, cache, stream |
| Multi-tenant SaaS where data must stay in your cloud | Bedrock / Vertex / Azure OpenAI |
| High-volume internal workload, predictable shape | Self-host vLLM with continuous batching + prefix caching |
| Edge / on-device | llama.cpp, MLX, or a tiny model |
| Real-time voice / sub-200 ms TTFT | Cloud-managed or distilled small model |
| Batch / nightly inference | Provider batch APIs (50 % off) or spot GPUs |

**Rule of thumb:** **start with an API provider.** Add **streaming** for chat UX, **prompt caching** for shared system prompts, **a cheaper model for easy traffic** (router pattern). Self-host only when **scale, compliance, or cost** justify the ops burden — and then **vLLM with continuous batching, INT4/INT8 quantization, prefix caching** is the modern baseline. **TTFT is what users feel; total latency is what you pay for.**
