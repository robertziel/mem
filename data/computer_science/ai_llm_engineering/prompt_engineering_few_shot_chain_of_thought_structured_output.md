### Prompt Engineering — Few-Shot, Chain-of-Thought, Structured Output

**Technique stack — apply in order until quality is acceptable:**

| Layer | Technique | What it does | When it helps |
|---|---|---|---|
| 1 | **Clear instruction** | State the task, tone, audience, length | Always — the cheapest gain |
| 2 | **Role / persona** | "You are a senior X engineer who…" | Calibrates style + depth |
| 3 | **Output format spec** | "Return JSON with fields a, b, c" | Anything parsed downstream |
| 4 | **Few-shot examples** | Show 3–5 input → output pairs | Subjective tasks (classification, style transfer) |
| 5 | **Chain-of-Thought (CoT)** | "Think step by step before answering" | Reasoning, math, multi-step logic |
| 6 | **Self-consistency** | Sample N times, take majority answer | High-stakes single-answer tasks |
| 7 | **Retrieval (RAG)** | Inject grounding context | Factual / domain-specific questions |
| 8 | **Tool use / ReAct** | Call calculator, DB, search; observe; iterate | When the answer requires external state |
| 9 | **Tree-of-Thought** | Explore branching options, backtrack | Hard search-style problems |
| 10 | **Prompt chaining** | Decompose into sequential sub-prompts | Long pipelines (extract → classify → summarize) |

**Pattern shapes:**

| Pattern | Skeleton |
|---|---|
| **Role + constraints** | `You are <role>. Answer about <scope>. Be <tone>. If unsure, say "I don't know."` |
| **Few-shot** | Task description, then 3–5 `Input: … → Output: …` pairs, then the new input with empty output |
| **CoT trigger** | Append `Let's think step by step.` or `Reason carefully before answering, then give the final answer.` |
| **Structured output** | `Return JSON matching: { "name": string, "age": number }` + use `response_format: { type: "json_schema" }` in the API |
| **RAG** | `Answer ONLY from the context. If absent, reply "Not found." \n Context: {docs} \n Question: {q}` |

**Few-shot — the rules that matter:**

| Rule | Why |
|---|---|
| 3–5 examples is usually plenty | Diminishing returns past that; context cost grows |
| Cover the edge cases | The model copies the pattern, so missing edges = missing handling |
| Put typical cases **first**, edges last | Recency bias — last example influences output most |
| Keep examples short | Each example takes context space |
| Use the same format / delimiter throughout | Mixed formats confuse the model |
| Don't include examples that contradict each other | Few-shot is induction; contradictions break it |

**Chain-of-Thought variants:**

| Variant | Use |
|---|---|
| **Zero-shot CoT** | Just append "Let's think step by step" — works on math, logic |
| **Few-shot CoT** | Provide examples that show the reasoning trace, not just the answer |
| **Self-consistency** | Sample N=5–20 CoT traces, majority-vote the final answers |
| **Hide the reasoning** | Ask for thinking in `<thinking>` tags, then a clean final answer for users |
| **Verifier loop** | Generate answer → second prompt asks "is this correct? show why" → revise |

**Structured output — three levels of strictness:**

| Level | Mechanism | Reliability |
|---|---|---|
| Prompt-only | "Return JSON with…" + few-shot example | Best-effort; parse with retry |
| `response_format: json_object` | Model guarantees valid JSON syntax | Field names/types still up to model |
| **`response_format: json_schema` / function calling / structured output API** | Constrained decoding to a schema | **Strict — use this when available** |

**Anti-patterns:**

| Anti-pattern | What to do instead |
|---|---|
| Vague ("do a good job") | Specify audience, length, tone, format |
| No examples on subjective tasks | Add 3–5 few-shot pairs |
| Wall of context (irrelevant stuff) | Trim to what's actually needed; long context dilutes attention |
| No output format | Specify JSON / Markdown / fixed sections |
| "Are you sure?" / "Be confident" | Ask for a calibrated confidence score instead |
| Mixing instructions with data inline | Use clear delimiters / XML tags so model can tell them apart |
| Burying the question | Put the actual question **last** — recency bias helps |
| Negative-only instructions ("don't say X") | Pair with positive ("say Y instead") |

**Evaluation methods:**

| Method | Cost | Reliability | When to use |
|---|---|---|---|
| **Human eval** | High | Gold standard | Final gate before launch |
| **LLM-as-judge** | Medium | Good for relative quality | Iterating on prompts |
| **Pairwise comparison** | Medium | Robust — easier than absolute scoring | Choosing between two prompts |
| **Reference-based metrics** (BLEU, ROUGE) | Low | Brittle; only works with golden answers | Translation, summarization |
| **Exact-match / regex** | Low | Strict | Extraction tasks |
| **Functional eval** (does the code run?) | Low | Strong signal | Code generation |
| **A/B test on real traffic** | Variable | Production truth | Post-launch optimization |
| **Eval suite (Promptfoo, LangSmith, Braintrust)** | Low–medium | Repeatable | Regression-test prompts on every change |

**Iteration discipline:**

| Practice | Why |
|---|---|
| Version-control prompts | Diff what changed when quality changed |
| Pin the model version | Same prompt + new model = different behavior |
| Hold out an eval set | Don't tune on data you measure with |
| Track temperature, seed | Reproducible runs |
| Capture latency + cost per technique | CoT and self-consistency are 5–20× cost — make sure they're worth it |

**Rule of thumb:** **start simple (clear instruction + output format), add few-shot only if quality is low, add CoT only for reasoning, use structured-output APIs when parsing matters.** **Evaluate systematically** (eval suite + LLM-as-judge), not by vibes. Treat prompts like code: version-control, regression-test, pin the model. The gains stack — but so does latency and cost.
