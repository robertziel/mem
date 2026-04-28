### TurboQuant — KV Cache & Vector Search Quantization

**Definition:** Google Research compression method (March 2026) for **aggressive vector quantization** with two main targets: **LLM key-value caches** and **vector search indexes**. Headline: ~3-bit KV cache, ~6× memory reduction, up to 8× attention speedup at 4-bit.

**Two-stage compression:**

| Stage | Method | Purpose |
|---|---|---|
| **Primary** | **PolarQuant** | Bulk of the compression — angular / direction-based quantization |
| **Residual** | **QJL** (Johnson-Lindenstrauss) | Small error-correction step for residuals |
| **Net** | Removes the usual "metadata overhead" | Most quantization carries scale/offset bytes per block — TurboQuant skips most of that |

**Reported numbers (Google Research blog, March 24, 2026):**

| Metric | Result | Hardware / setup |
|---|---|---|
| KV cache bits per value | **~3 bits** | Down from 16 bits (FP16) baseline |
| KV memory reduction | **≥ 6×** | Reported benchmarks |
| Attention-logit speedup | **Up to 8×** | 4-bit vs 32-bit keys, NVIDIA H100 |
| Quality drop | "Negligible" on tested benchmarks | Their evals — verify on your own model |

**Why KV cache compression matters:**

| Problem | Mechanism | Effect |
|---|---|---|
| Long-context LLMs blow up memory | Each token writes K + V into cache | Cache scales linearly with context length |
| 100K-token context | KV can dominate VRAM | Hurts batch size and throughput |
| 3-bit cache | Same VRAM holds ~5× more tokens | Bigger batches or longer contexts |

**Why vector search benefits:**

| Property | Detail |
|---|---|
| Embeddings stored in indexes | FAISS, ScaNN, HNSW |
| Memory-bound at scale | Billion-scale indexes |
| Smaller vectors | More vectors per shard, lower recall serving cost |
| Inner-product / cosine | TurboQuant preserves these well per the paper |

**Compared to other quantization techniques:**

| Method | Bits | Approach | Notes |
|---|---|---|---|
| FP16 (baseline) | 16 | Half precision | Standard for LLM inference |
| INT8 | 8 | Per-channel scale + zero-point | Common; small quality hit |
| INT4 / GPTQ | 4 | Group-wise scale | Popular for weights; KV less common |
| **TurboQuant** | **~3** | PolarQuant + QJL residual | Targets KV + vectors specifically |
| 1.58-bit / ternary | ~1.6 | Three values per weight | Weight-only, retraining required |

**Where TurboQuant fits in the stack:**

```
              Inference request
                    │
                    ▼
        ┌────────────────────────┐
        │  Model weights (W4 / W8) │   ← weight quantization (separate concern)
        ├────────────────────────┤
        │  KV cache (TurboQuant)   │   ← runtime compression of past tokens
        ├────────────────────────┤
        │  Activations (FP16)      │   ← typically not quantized for KV path
        └────────────────────────┘
```

**Decision matrix:**

| Need | Pick |
|---|---|
| Long-context LLM serving, VRAM-limited | TurboQuant for KV |
| Billion-scale vector index, memory-bound | TurboQuant for embeddings |
| Production model, no risk tolerance | Stick with INT8 / FP16 until validated |
| Custom model, want to verify | Re-run benchmarks on your task — research ≠ guarantee |

**Caveats:**

| Caveat | Detail |
|---|---|
| Research result | Numbers are from Google's setup, not generalized guarantees |
| Your model may differ | Quality drop varies by architecture and fine-tuning |
| Implementation availability | Check open-source release status — research often precedes runtime |
| Hardware specifics | H100-reported speedups; other GPUs may differ |

**Cross-references:**

- LLM deployment + serving: [llm_deployment_*.md](../../ai_llm_engineering/llm_deployment_serving_latency_optimization.md)
- Vector databases + embeddings: [vector_databases_*.md](../../ai_llm_engineering/vector_databases_embeddings_similarity_search.md)
- RAG + chunking: [rag_architecture_*.md](../../ai_llm_engineering/rag_architecture_chunking_retrieval_reranking.md)

**Rule of thumb:** **TurboQuant trades a tiny quality hit for ~6× KV memory savings + faster attention** by combining PolarQuant (main) with a QJL residual. Most useful for **long-context LLM serving** and **billion-scale vector search** where memory dominates cost. **Verify on your own model and hardware** before relying on the reported numbers — research benchmarks rarely transfer 1:1.

**Source:** Google Research blog, "TurboQuant: Redefining AI efficiency with extreme compression" (2026-03-24).
