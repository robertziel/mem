### LLM Guardrails, Safety & Hallucination Detection

**Failure modes — what you're guarding against:**

| Failure | What it looks like | Primary risk |
|---|---|---|
| **Hallucination** | Plausible-but-false claims (made-up citations, wrong facts) | Misinformation, bad decisions, regulatory issues |
| **Prompt injection** | User input overrides system instructions | Bypass policy, exfiltrate data/system prompt |
| **Indirect prompt injection** | Malicious content in retrieved docs / web pages takes over the model | Same as above, harder to detect |
| **Jailbreak** | Roleplay / encoded prompts unlock disallowed behavior | Toxic / illegal output |
| **Toxic output** | Offensive, biased, harmful content | Brand / legal risk |
| **PII / data leakage** | Model emits private user data or training-set memorization | Privacy violation |
| **Off-topic / scope creep** | Model wanders outside its purpose | Poor UX, abuse vector |
| **Spec drift** | Output doesn't match required schema / format | Downstream parsers break |

**Defense-in-depth layers (where each check lives):**

```
User → [Input validator] → [PII redactor] → [System prompt + retrieval] → [Model]
                                                                            ↓
[User] ← [Moderation API] ← [Schema/policy check] ← [Output filter] ← [Output]
                                                          │
                                                  [Logging + sampling for review]
```

| Layer | Catches | Method |
|---|---|---|
| Input validator | Length, prompt-injection patterns, banned phrases | Regex + classifier |
| PII redactor (input) | User-supplied PII before it ever reaches the model | NER / regex / commercial scanner |
| System prompt | Scope, persona, refusal rules | Hardened, never-override instructions |
| Retrieval (RAG) | Hallucination by grounding answers in sources | Vector search + citation requirement |
| Model decoding | Reduce randomness for factual tasks | `temperature=0`, structured output |
| Output filter | Schema mismatch, off-topic | Pydantic / JSON Schema / custom rules |
| Moderation API | Toxic / unsafe content | OpenAI Moderation, Perspective, Azure Content Safety |
| PII redactor (output) | Leaked PII / training-data leak | Same scanners as input |
| Logging + review | Drift, novel attack patterns | Sample N% for human review |

**Hallucination mitigation:**

| Technique | Mechanism | When it helps |
|---|---|---|
| **RAG grounding** | Answer **only** from retrieved context | Factual / domain-specific Q&A |
| **Citation requirement** | Force model to cite source passage IDs | Auditability, lets reviewer verify |
| **"I don't know" fallback** | Explicit instruction + few-shot examples | When confidence is low, refuse |
| **Temperature 0** | Greedy decoding for factual tasks | Anything where there's a "right answer" |
| **Self-consistency** | Sample N times, check answers agree | High-stakes single-answer tasks |
| **Verifier model** | Second LLM judges claims against sources | Production fact-checking |
| **Tool use over generation** | Calculator / DB / search instead of "guessing" | Math, lookups, structured queries |
| **Constrained decoding** | Restrict tokens to valid grammar / values | Schema output |
| **Eval set with golden answers** | Catches regressions before deploy | Pre-deploy gate |

**Prompt-injection defense:**

| Technique | What it stops |
|---|---|
| **Hardened system prompt** with explicit "never override" rules | First-order injection ("ignore previous instructions") |
| **Treat user input as data**, not as instruction | Inject inside delimiters / XML tags model is trained to keep separate |
| **Privilege separation** | The data-handling model has no tools / no side effects |
| **Dual-LLM pattern** | Untrusted input goes to a sandboxed model; only sanitized output reaches the privileged model |
| **Tool-call allow list** | Even if injection succeeds, restricted action surface |
| **Input classifier** | Reject obvious injection patterns up front |
| **No secrets in the system prompt** | If exfiltrated, low blast radius |

**Sample injection patterns to flag (input classifier):**

| Pattern | Why suspicious |
|---|---|
| "ignore (all\|previous) instructions" | Direct override |
| "you are now \|pretend you are" | Persona swap |
| "system prompt\|reveal instructions" | Exfiltration |
| Unusually long input with embedded `<system>` / `[INST]` tags | Trying to fake control tokens |
| Encoded payloads (base64, ROT13, foreign-language wrappers) | Bypass naive scanners |

> No regex catches everything. Treat input filtering as one layer, not the only layer.

**Output filtering — what to check:**

| Check | Tool / approach |
|---|---|
| Toxic / unsafe content | OpenAI Moderation, Perspective API, Azure Content Safety, Llama Guard |
| Schema conformance | Pydantic / JSON Schema; structured-output mode (`response_format`) |
| PII presence | Microsoft Presidio, AWS Comprehend, custom NER |
| Off-topic | Lightweight classifier or "is this about X?" verifier prompt |
| Refusal failure | Did the model refuse where it should have? Audit sample |
| Citation accuracy | Resolve cited passage IDs; reject if unverifiable |

**Tooling landscape:**

| Tool | Strength |
|---|---|
| **Guardrails AI** | Declarative output validation (types, schemas, custom validators); easy retry-on-fail |
| **NeMo Guardrails** (NVIDIA) | Colang DSL for programmable input/output flows; complex policies |
| **Llama Guard** (Meta) | Open-weights safety classifier — input + output |
| **OpenAI Moderation API** | Free, integrated, basic categories |
| **Azure Content Safety** | Hate / sexual / violence / self-harm + custom blocklists |
| **Perspective API** | Toxicity scoring (Jigsaw) |
| **Microsoft Presidio** | PII detection + redaction |
| **LangChain / LlamaIndex output parsers** | Schema enforcement integrated into framework |

**Monitoring KPIs (what to dashboard):**

| Metric | What it tells you |
|---|---|
| Hallucination rate (sampled human eval) | Quality drift |
| Refusal / "I don't know" rate | Too high = annoying; too low = ungrounded |
| Moderation flag rate (input + output) | Abuse pressure |
| Schema violation rate | Prompt drift, model regression |
| Latency at each guardrail layer | Where to invest in speed |
| Distinct attack patterns logged | Emerging injection techniques |
| User feedback (👍/👎) | End-to-end quality |

**Pitfalls:**

| Pitfall | Why it hurts |
|---|---|
| Relying on the model itself to enforce safety | Same model that can be jailbroken can't be the firewall |
| Single-layer defense | Any miss → exploit. Layer cheap + expensive checks |
| Logging full prompts/outputs without consent | Privacy breach; especially with retrieved docs |
| No eval set | Can't tell if a prompt change made things worse |
| Treating retrieval as safe | **Indirect injection** — malicious content in scraped pages |
| Forgetting tool-use as an attack surface | Injected prompt → unintended DB write / email |

**Rule of thumb:** **defense in depth** — input validation, model constraint, output filter, moderation API, schema check, sampled human review. **RAG with required citations** is the single biggest hallucination reducer. **Treat every external input (user, retrieval, tool output) as untrusted** — privilege-separate the model that touches it from the model that takes actions. **Temperature 0 + structured output + verifier model** is the strong combo for factual tasks. Always provide a graceful **"I don't know"** fallback.
