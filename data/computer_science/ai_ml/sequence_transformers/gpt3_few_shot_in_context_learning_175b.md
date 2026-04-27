### GPT-3 — Few-Shot In-Context Learning (2020)

**Paper:** "Language Models are Few-Shot Learners" (Brown et al., OpenAI, 2020).

**Why it mattered:** Scaled transformer LMs to 175B parameters and showed that large models can learn new tasks from just a few examples in the prompt — no fine-tuning, no gradient updates. This "in-context learning" was the surprise that made ChatGPT possible.

**The key finding — in-context learning:**
```
Zero-shot:
  "Translate English to French: cheese =>"
  Model outputs: "fromage"

One-shot:
  "Translate English to French:
   sea otter => loutre de mer
   cheese =>"
  Model outputs: "fromage"

Few-shot (k examples):
  "Translate English to French:
   sea otter => loutre de mer
   peppermint => menthe poivrée
   plush girafe => girafe en peluche
   cheese =>"
  Model outputs: "fromage"

No weight updates — the model "learns" purely from the prompt context.
```

**Scaling the model — 175B parameters:**
```
Architecture: same as GPT-2 (decoder-only transformer, causal attention)
  But scaled up massively.

Size progression:
  GPT-1 (2018):    117M params, 1GB data
  GPT-2 (2019):    1.5B params, 40GB data (WebText)
  GPT-3 (2020):    175B params, 570GB filtered data (~300B tokens)
  GPT-4 (2023):    rumored ~1.7T params (mixture of experts)

GPT-3 model details:
  - 96 transformer layers
  - 12,288 hidden dimension
  - 96 attention heads
  - 128-dim per head
  - 2048 context window (later models: much longer)
  - Trained on Common Crawl + WebText2 + Books + Wikipedia
```

**The scaling insight (later codified by Kaplan scaling laws):**
```
Across model sizes (125M → 175B), few-shot performance:
  - Smooth improvement on most tasks
  - Sudden jumps at large scale on some (arithmetic, analogies, news generation)

Few-shot gap vs zero-shot WIDENS with scale:
  → Larger models benefit more from in-context examples
  → This became the "emergence" phenomenon

Tasks where 175B matched or beat SOTA without fine-tuning:
  - Translation, Q&A, reading comprehension
  - SuperGLUE tasks (zero-shot)
  - Arithmetic (2-3 digit addition nearly solved; 4-5 digit harder)
  - Generating human-like news articles (humans couldn't tell apart)
```

**What GPT-3 still couldn't do (at release):**
- Instruction following (it continues patterns, doesn't "answer questions")
- Factual accuracy (makes up confident-sounding false info)
- Multi-step reasoning without explicit chain-of-thought prompts
- Safety refusals (no alignment training)

These gaps were filled later by:
- **InstructGPT (2022)** — RLHF alignment → ChatGPT
- **Chain-of-thought prompting** (2022) — explicit step-by-step
- **Tool use / retrieval** (2023+) — external knowledge

**Training compute and cost:**
```
~3640 petaflop/s-days of compute
~$4-12M estimated training cost (2020 prices)

This was the first LM training cost to be "strategic national resource" level.
Only a handful of orgs could replicate it.
```

**In-context learning — how does it work? (ongoing research):**
```
Hypotheses:
  1. Meta-learning during pretraining: the model sees many patterns of
     "examples followed by completion" in training data, learns to
     generalize the pattern at inference.

  2. Gradient descent in activations: forward pass computes something
     analogous to fine-tuning steps in the attention layers.

  3. Pattern matching: model retrieves similar examples from
     "memory" encoded in weights.

Reality: probably all three, and effect depends on task type.
```

**Modern successor context:**
```
GPT-3 (2020): 175B, in-context learning, not instruction-tuned
ChatGPT (2022): GPT-3.5 + RLHF = conversational assistant
GPT-4 (2023): multimodal, better reasoning, longer context
Claude 3/GPT-4o/Gemini: rivals built on the same foundation

Today, few-shot prompting remains useful but:
  - Zero-shot works better on aligned models (InstructGPT and beyond)
  - Chain-of-thought unlocks reasoning
  - Tools + retrieval handle knowledge gaps
```

**What changed after GPT-3:**

| Before GPT-3 | After GPT-3 |
|---|---|
| Fine-tune per task | Single model for many tasks (prompting) |
| Small, task-specific datasets | Massive, diverse pretraining |
| Supervised learning dominant | Few-shot / zero-shot viable |
| Labeled data bottleneck | Prompt design bottleneck |
| Academic research scale | Industrial research scale ($10M+ models) |

**Rule of thumb:** GPT-3 showed that scale alone (175B params + 300B tokens) gives rise to in-context learning — the ability to learn new tasks from prompt examples, without weight updates. Bigger model = better few-shot performance, with some capabilities emerging suddenly at scale. GPT-3 was not aligned (InstructGPT fixed that later) but it was the proof that pretraining + prompting > per-task fine-tuning. Every modern LLM follows the GPT-3 recipe: huge decoder-only transformer, trained on web text, prompted at inference.
