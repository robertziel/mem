### Fine-Tuning vs RAG — When to Use Which

**Definition:** two strategies for adapting an LLM. **RAG** adds knowledge at inference time via retrieval (no model changes). **Fine-tuning** trains the model itself on task-specific data (changes weights). Most production systems start with **RAG**; reach for **fine-tuning** only when prompt + retrieval can't reach quality, often combining both.

**Side-by-side:**

| Property | **RAG** | **Fine-tuning** |
|---|---|---|
| Knowledge update | Update docs, no retrain | Retrain on new data |
| Model weights | Unchanged | Modified |
| Time to deploy | Hours-days | Days-weeks |
| Cost to maintain | Low (storage + retrieval) | High (training + serving model) |
| Citation / source | Built-in (retrieved chunks) | Can't cite |
| Hallucination | Reduced (grounded) | May still hallucinate |
| Format / style | Prompt-dependent | Strongly enforced |
| Cold-start | Works without training data | Needs labeled examples |
| Latency | + retrieval ms | Same as base model |
| Best for | Knowledge / facts | Format / style / behavior |

**Decision matrix:**

| Criterion | RAG | Fine-tune | Both |
|---|---|---|---|
| Need up-to-date knowledge | ✅ Best | ❌ Stale after training | |
| Need specific tone / style | ❌ | ✅ Best | |
| Need domain knowledge | ✅ Good | ✅ Good | ✅ Ideal |
| Need to cite sources | ✅ Built-in | ❌ Can't cite | |
| Limited training data | ✅ No data needed | ❌ Needs thousands | |
| Latency-sensitive | ❌ Retrieval adds ms | ✅ No retrieval | |
| Cost to update | ✅ Update docs only | ❌ Retrain $$ | |
| Reduce hallucination | ✅ Grounded in docs | ⚠️ May still hallucinate | |
| Strict structured output | ⚠️ Prompt-dependent | ✅ Train exact format | |
| Frequent knowledge changes | ✅ Daily / hourly | ❌ Weeks lag | |

**When to use RAG:**

| Use case | Why |
|---|---|
| Company docs / KB Q&A | Easy updates |
| Customer support with evolving product | Live info |
| Legal / compliance (must cite) | Auditable sources |
| Frequently-changing data | No retrain |
| No labeled training data | Just write/upload docs |
| Multi-tenant (per-customer KB) | Isolate via metadata filter |
| Onboarding / new hires | Knowledge surface |

**When to use fine-tuning:**

| Use case | Why |
|---|---|
| Consistent output format (JSON extraction) | Train exact schema |
| Brand voice / writing style | Style internalized |
| Domain-specific language (medical, legal) | Terminology + behavior |
| Reduce prompt length | Behavior learned, not prompted |
| Edge cases prompting can't handle | Training data is the answer |
| Classification at scale | Specific task, fast inference |
| Tool use / agent behavior | Reliable tool selection |

**When to use BOTH:**

| Combo | Why |
|---|---|
| Domain Q&A with citations | Fine-tune for tone, RAG for knowledge |
| Customer support chatbot | Fine-tune for brand, RAG for product info |
| Legal / medical assistant | Fine-tune for jargon, RAG for current law / cases |
| Multi-task agent | Fine-tune for behavior, RAG per task |

**Fine-tuning approaches — by cost & data needed:**

| Method | What changes | Data needed | Cost |
|---|---|---|---|
| **Full fine-tuning** | All weights | 10K+ examples | Very high (full GPU cluster) |
| **LoRA / QLoRA** | Low-rank adapters (~0.1–1%) | 500–5K examples | Low (single GPU) |
| **Prompt tuning** | Soft prompt prefix only | 100–500 examples | Very low |
| **Adapter layers** | Inserted layers | Few thousand examples | Low |
| **RLHF** (Reinforcement from Human Feedback) | Reward model + PPO | Comparison pairs | High |
| **DPO** (Direct Preference Optimization) | Direct pref training | Comparison pairs | Medium (no reward model) |
| **Instruction tuning** | Behavior on instruction-following | Instruction-output pairs | Medium |

**LoRA / QLoRA — the sweet spot:**

| Property | Detail |
|---|---|
| Freeze base model | Save memory + compute |
| Train small adapter matrices | 0.1–1% of params |
| Inference: merge or load adapters | Stack multiple |
| Quality | Close to full fine-tune for most tasks |
| Cost | Single consumer GPU often enough |
| Trade-off | Worse for tasks needing massive change |

**Data preparation — fine-tuning data format:**

```jsonl
{"messages": [
  {"role": "system",    "content": "You are a code reviewer focused on Ruby."},
  {"role": "user",      "content": "Review this method..."},
  {"role": "assistant", "content": "Looks good but consider..."}
]}
{"messages": [...next example...]}
```

**Data quality matters more than quantity:**

| Principle | Detail |
|---|---|
| **Quality > quantity** | 100 excellent > 10K noisy |
| **Diversity** | Cover edge cases |
| **Consistent format** | Same structure across examples |
| **Validation set** | 10–20% held out |
| **Avoid duplicates** | Causes overfitting |
| **Match production distribution** | Not biased samples |

**Cost comparison (rough, 2026):**

| Approach | One-time training | Per-inference cost | Maintenance |
|---|---|---|---|
| RAG (vector search) | ~free (embed once) | + retrieval cost | Update docs |
| Prompt engineering | $0 | Same as base | Iterate prompts |
| LoRA fine-tuning | $10–100s | Same as base + adapter | Re-fine-tune monthly |
| Full fine-tuning | $1K–100K+ | Same as base | Re-fine-tune costly |
| RLHF | $10K–1M+ | Same as base | Significant ops |

**Evaluation — how to know which is better:**

| Metric | What |
|---|---|
| **Faithfulness / groundedness** | Is output grounded in source? (RAG) |
| **Answer relevance** | Does it address the question? |
| **Format compliance** | Strict schema match (fine-tune) |
| **Latency p95/p99** | Operational |
| **Cost per query** | Operational |
| **Human eval** | Quality |
| **Task-specific accuracy** | Classification / extraction |

**Eval tools:**

| Tool | Use |
|---|---|
| **RAGAS** | RAG-specific (faithfulness, relevance, precision/recall) |
| **LangSmith** | Tracing + eval (LangChain) |
| **Arize Phoenix** | OSS observability |
| **TruLens** | Eval and tracking |
| **OpenAI Evals** | OSS framework |
| **Custom golden set** | Hand-curated query/answer pairs |

**Architecture: combined RAG + fine-tuned model:**

```
   User query
      │
      ▼
   ┌────────────────┐
   │ Fine-tuned LLM  │   ← style / domain language / tool use
   │ (LoRA on base)  │
   └─────┬──────────┘
         │
         ▼
   ┌────────────────┐
   │ RAG retrieval   │   ← live knowledge
   └─────┬──────────┘
         │
         ▼
   ┌────────────────┐
   │ Generate w/      │   ← grounded + on-brand
   │ retrieved        │
   │ context         │
   └─────────────────┘
```

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Fine-tuning before trying RAG + good prompts | Wasted effort |
| Fine-tuning on noisy data | Bakes bad behavior in |
| RAG with bad retrieval | LLM gets garbage context |
| Not evaluating on production-like distribution | Overfit |
| Forgetting prompt injection defense | Fine-tune doesn't protect |
| Fine-tuned model on outdated facts | Stale at deploy |
| RAG without citation in output | Users can't verify |
| Combining without measuring contribution | Can't tell what's working |

**Decision tree:**

```
Need to answer questions about (changing) facts / docs?
   YES → RAG
   NO →
       Need consistent format / style / domain language?
          YES → Fine-tune (start with LoRA)
       Need both knowledge + style?
          → RAG + fine-tuned model
       Default
          → Try prompt engineering first; many problems don't need either
```

**Cross-references:**

- RAG architecture: [rag_architecture_*.md](rag_architecture_chunking_retrieval_reranking.md)
- Vector databases: [vector_databases_*.md](vector_databases_embeddings_similarity_search.md)
- LLM deployment: [llm_deployment_*.md](llm_deployment_serving_latency_optimization.md)
- Prompt engineering: [prompt_engineering_*.md](prompt_engineering_few_shot_chain_of_thought_structured_output.md)
- RLHF / instructGPT: [instructgpt_*.md](instructgpt_rlhf_sft_reward_model_ppo_alignment.md)

**Rule of thumb:** **Start with RAG** (faster to build, easier to update, cites sources). **Fine-tune** only if RAG + prompt engineering can't reach quality. Use **LoRA/QLoRA** for cost-effective fine-tuning on a single GPU. **Quality > quantity** in training data — 100 excellent examples beat 10K noisy. The best systems often **combine both**: fine-tuned for style + behavior, RAG for live knowledge.
