### vLLM vs Ollama — LLM Serving (Production vs Local)

**Definition:** two popular LLM-serving runtimes targeting **different audiences**. **vLLM** = production-grade GPU inference server (PagedAttention, continuous batching, OpenAI-compatible API). **Ollama** = developer-friendly local runner (one-command install, simple CLI, llama.cpp-backed). Pick by **deployment target**, not by raw speed.

**Side-by-side:**

| Property | **vLLM** | **Ollama** |
|---|---|---|
| Primary audience | Production / serving teams | Developers, local dev, hobby |
| Backend | Custom CUDA kernels (PagedAttention) | llama.cpp + GGUF |
| Hardware sweet spot | NVIDIA GPU (A100, H100, L4, RTX) | CPU, Apple Silicon, consumer GPU |
| Quantization | FP16 / BF16 / AWQ / GPTQ / FP8 / INT4 | GGUF (Q2–Q8 family) |
| Throughput | **High** (continuous batching) | Low–moderate (single-stream typical) |
| Latency (single user) | Low | Lowest on-device |
| Multi-tenant batching | ✅ Built-in | ❌ Mostly serial |
| OpenAI-compatible API | ✅ (drop-in replacement) | ✅ (limited) |
| Setup effort | More (Docker / K8s / configs) | **One-command install** |
| Model formats | HF Transformers, safetensors | GGUF |
| Streaming | ✅ | ✅ |

**Pros / Cons:**

| | **Pros** | **Cons** |
|---|---|---|
| **vLLM** | High throughput (PagedAttention + continuous batching); production-ready API; HF Transformers ecosystem; tensor / pipeline parallelism; speculative decoding | GPU-only; more ops complexity; larger images; quantization options narrower for some hardware |
| **Ollama** | Trivial setup (`ollama run llama3`); CPU + Apple Silicon great; rich model library; great UX for local dev | Lower throughput; limited multi-user batching; GGUF quality varies; less suited for serving many concurrent users |

**When to pick which:**

| Need | Pick |
|---|---|
| Production API with concurrent users | **vLLM** |
| Local dev / prototyping | **Ollama** |
| MacBook / no-GPU laptop | **Ollama** (Apple Silicon Metal) |
| Self-hosted internal AI assistant | Ollama (small team) or vLLM (large) |
| Serving fine-tuned LoRA at scale | **vLLM** (multi-LoRA built-in) |
| Air-gapped / offline | Either; Ollama is simpler |
| OpenAI API drop-in for cost reduction | **vLLM** (mature) |
| Edge / desktop app embed | **Ollama** (or llama.cpp directly) |

**Throughput / latency reality (rough, hardware-dependent):**

| Scenario | vLLM | Ollama |
|---|---|---|
| Single 8B model, single user | Comparable | Comparable |
| 8B model, 50 concurrent users | **5–10× higher tokens/sec** | Throughput cliffs |
| 70B model, GPU box | Strong | Possible w/ GGUF + quantization |
| 70B model, MacBook Pro M3 Max | n/a (no NVIDIA) | **Works** with Q4_K_M |

**Quick start:**

```bash
# vLLM (Python / Docker)
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --tensor-parallel-size 1

# Or via Docker:
docker run --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.1-8B-Instruct
```

```bash
# Ollama
brew install ollama        # or: curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama run llama3.1:8b
ollama run llama3.1:70b-instruct-q4_K_M
```

**Both expose OpenAI-compatible endpoints:**

```python
from openai import OpenAI

# vLLM
client = OpenAI(base_url="http://localhost:8000/v1", api_key="anything")

# Ollama
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

resp = client.chat.completions.create(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "Hi"}],
)
```

**Decision matrix:**

| Workload | Pick |
|---|---|
| Internal team chat, <10 users | Ollama |
| Public API replacing OpenAI | **vLLM** behind a load balancer |
| RAG backend at scale | vLLM |
| Local agent experimentation | Ollama |
| Multi-LoRA per-tenant serving | **vLLM** |
| Cheap CPU deployment | Ollama (Q4 GGUF) |
| K8s / autoscaled fleet | vLLM (or TGI / SGLang) |
| Offline desktop app | Ollama / llama.cpp |

**Adjacent runtimes (briefly):**

| Tool | Detail |
|---|---|
| **TGI** (HuggingFace Text Generation Inference) | Production server; competes with vLLM |
| **SGLang** | Newer, structured-generation focus, fast |
| **llama.cpp** | C++ engine Ollama wraps; for power users |
| **TensorRT-LLM** | NVIDIA's optimized engine; strongest perf, hardest setup |
| **MLX** (Apple) | Apple Silicon native |
| **LM Studio / Jan** | Desktop GUI wrappers around llama.cpp |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using Ollama for high-concurrency API | Throughput cliffs |
| Using vLLM on CPU | Wrong fit; use llama.cpp / Ollama |
| Comparing FP16 (vLLM) to Q4 (Ollama) for "speed" | Not apples-to-apples |
| Forgetting `--tensor-parallel-size` on multi-GPU | Underutilization |
| GGUF quality on small models | Q2/Q3 can degrade noticeably |
| Skipping prefix caching | Wasted prompt-prefix work in both |

**Cross-references:**

- LLM deployment & latency: [llm_deployment_*.md](llm_deployment_serving_latency_optimization.md)
- RAG architecture: [rag_architecture_*.md](rag_architecture_chunking_retrieval_reranking.md)
- Fine-tuning vs RAG: [fine_tuning_vs_rag_*.md](fine_tuning_vs_rag_when_to_use.md)
- TurboQuant (KV cache quantization): [turboquant_*.md](../ai_ml/sequence_transformers/turboquant_kv_cache_vector_search_quantization.md)

**Rule of thumb:** **vLLM for production serving** (high throughput, multi-tenant, OpenAI-compatible), **Ollama for local dev + desktop** (one-command install, CPU / Apple Silicon, GGUF). Both expose OpenAI-compatible APIs — code stays identical when you migrate from Ollama (dev) to vLLM (prod). For massive scale, look at **TensorRT-LLM** or **SGLang**; for offline embedding into apps, **llama.cpp** directly.
