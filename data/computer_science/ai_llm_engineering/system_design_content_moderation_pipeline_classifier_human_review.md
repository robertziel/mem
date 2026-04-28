### System Design — Content Moderation Pipeline

**Definition:** detect and act on harmful content (toxic, spam, NSFW, violence, misinformation, CSAM) at scale. **Pipeline pattern**: cheap pre-filter → ML classifier → confidence-based routing → human review → feedback loop. **Multi-modal** (text, images, video, audio) and balances **safety vs free expression**.

**Requirements:**

| Type | Detail |
|---|---|
| **Categories** | Toxic, spam, NSFW, violence, hate, misinformation, CSAM, harassment |
| **Modalities** | Text, images, video, audio |
| **Scale** | Millions of posts per day |
| **Latency** | Pre-publish (block) or post-publish (remove) |
| **Trade-offs** | Speed vs accuracy; safety vs expression |
| **Compliance** | Region-specific (EU DSA, US Section 230, GDPR) |

**Pipeline architecture:**

```
   User Content
        │
        ▼
   ┌────────────────────────┐
   │ 1. Pre-filter           │   regex blocklist, hash matching (PhotoDNA),
   │   (cheap, rule-based)    │   URL blocklist
   └────────────┬───────────┘
                ▼
   ┌────────────────────────┐
   │ 2. ML Classifier         │   multi-label: toxic, spam, NSFW, violence
   │   (text + image models)  │   confidence score per category
   └────────────┬───────────┘
                ▼
   ┌────────────────────────┐
   │ 3. Confidence Routing    │
   │  ├─ High → auto-action   │
   │  ├─ Medium → human queue │
   │  └─ Low → allow + log    │
   └────────────┬───────────┘
                │
                ▼
   ┌────────────────────────┐
   │ 4. Human Review          │   moderator queue
   └────────────┬───────────┘
                ▼
   ┌────────────────────────┐
   │ 5. Decision + Feedback   │   retrain ML model
   └────────────────────────┘
```

**Stage 1 — Pre-filter (fast, deterministic):**

| Tool | What |
|---|---|
| **Regex blocklist** | Known bad words / phrases |
| **PhotoDNA / perceptual hash** | Match known CSAM / illegal content |
| **URL blocklist** | Phishing, malware, banned domains |
| **Bayesian spam filter** | Cheap baseline |
| **Velocity / rate** | Burst posting → bot suspicion |
| Why first | Cheap, deterministic, blocks obvious cases before expensive ML |

**Stage 2 — ML Classifier:**

| Modality | Model |
|---|---|
| **Text** | Fine-tuned BERT / DistilBERT, or APIs (OpenAI Moderation, Perspective API, Detoxify) |
| **Images** | CNN classifier (NSFW.js, Google Cloud Vision), CLIP-based zero-shot |
| **Video** | Sample frames + image classifier + audio transcript + text classifier |
| **Audio** | Transcribe (Whisper) → text classifier; OR direct audio classifier |
| **Multi-label** | One content can be (toxic AND spam AND NSFW) |
| **Multi-language** | Multilingual model or per-language pipelines |

**Confidence-based actions:**

| Score range | Action |
|---|---|
| **> 0.95** | Auto-remove (high confidence) |
| **0.70 – 0.95** | Send to human review (medium) |
| **0.30 – 0.70** | Flag for monitoring (low) |
| **< 0.30** | Allow |

> Thresholds tuned **per category** — strict for CSAM, looser for borderline opinions.

**Severity tiers — different policies:**

| Tier | Categories | Threshold |
|---|---|---|
| **Critical** | CSAM, violent threats | Aggressive auto-remove + report to authorities |
| **High** | Hate, severe harassment | Auto-remove at high confidence |
| **Medium** | Spam, NSFW, mild toxicity | Auto-flag, human review |
| **Low** | Borderline opinions, profanity | Surface to user as warning |

**Stage 4 — Human Review:**

| Aspect | Detail |
|---|---|
| **Queue prioritization** | Severity × confidence × user reach |
| **Tools** | View content + context + user history |
| **One-click actions** | Remove / warn / escalate / allow |
| **SLA per severity** | Critical: minutes, high: hours, medium: 24h |
| **Decision feedback** | Train data for next model iteration |
| **Reviewer wellness** | Rotation, exposure limits, support |
| **Calibration** | Multiple reviewers per high-impact item |

**Adversarial inputs — what attackers do:**

| Tactic | Defense |
|---|---|
| **Leet speak** (`fr33`, `f@ck`) | Normalize text before classification |
| **Unicode tricks** (look-alikes) | NFKC normalization |
| **Image overlay text** | OCR layer |
| **Subtle paraphrasing** | Robust models, retrain on adversarial data |
| **Embedding into media** (memes, audio) | Multi-modal pipeline |
| **Steganography** | Statistical analysis |
| **Coordinated raids** | Velocity / network signals |
| **AI-generated content** | Watermark detection, provenance signals |

**Bias — the elephant in the room:**

| Concern | Mitigation |
|---|---|
| Over-flag minority dialects (AAVE) | Diverse training data, fairness audits |
| Over-flag specific topics (e.g., LGBTQ+) | Counterfactual evaluation |
| Cultural context | Region-specific tuning |
| Reviewer bias | Calibration, blind review |
| Feedback loop bias | Model learns from biased decisions |

**Monitoring — KPIs that matter:**

| Metric | Target |
|---|---|
| **False positive rate** | < 1% (over-moderation harms users + appeals) |
| **False negative rate** | < 0.1% for critical categories |
| **Review queue latency** | < 4 hours for high-severity |
| **Appeal overturn rate** | < 10% (high overturn = bad classifier) |
| **Moderator throughput** | Tracks capacity needs |
| **Time to remove** for critical | Minutes |
| **Coverage** | % of content scored |

**Appeals process:**

| Step | Detail |
|---|---|
| User contests removal | UI button |
| Goes to appeal queue | Different reviewer |
| Decision: uphold / overturn | Counts toward overturn rate metric |
| Overturn → reinstate + retrain signal | Fix the classifier |
| Track per-category overturn | Identify weak spots |

**Multi-modal challenges:**

| Modality | Challenge |
|---|---|
| **Text** | Sarcasm, quotes, news reporting, satire |
| **Images** | Context (medical vs explicit) |
| **Video** | Frame sampling vs full inspection |
| **Audio** | Transcription quality, prosody |
| **Live streaming** | No pre-review; rapid response needed |
| **Memes** | Image + text + cultural context |

**Cost model — at scale:**

| Component | Cost shape |
|---|---|
| Pre-filter | Negligible |
| Text classifier | $/M tokens (API) or GPU-hours (self) |
| Image classifier | $/M images |
| Video frame sampling | × frames per video |
| Human review | $/decision (most expensive) |
| Goal | Maximize ML coverage to minimize human cost |

**Privacy and compliance:**

| Concern | Detail |
|---|---|
| GDPR | Right to deletion, legal basis for moderation |
| EU DSA (Digital Services Act) | Transparency reports, user appeals required |
| US Section 230 | Liability protections (with exceptions) |
| CSAM | Mandatory reporting to NCMEC (US) |
| User notification | Deletion notice with reason |
| Data retention for legal | Removed but retained for evidence |

**Tooling map:**

| Need | Tools |
|---|---|
| Text moderation API | OpenAI Moderation, Perspective API, Detoxify, Azure Content Moderator |
| Image moderation API | Google Cloud Vision SafeSearch, AWS Rekognition |
| CSAM detection | PhotoDNA (Microsoft), CSAI Match (Google) |
| Video frame sampling | OpenCV, ffmpeg pipeline |
| Custom classifier training | Hugging Face Transformers, PyTorch |
| Human-in-the-loop | Hive, Scale AI, Sama, in-house teams |
| Workflow orchestration | Temporal, Argo, custom |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Pure ML without human review | False positives, no escalation |
| Pure human review | Doesn't scale |
| One threshold for all categories | Wrong for severity range |
| No appeal process | Trust + legal risk |
| No bias auditing | Discriminatory enforcement |
| Reviewer burnout | Quality degrades; ethics issue |
| Public-facing thresholds | Adversaries optimize against |
| No regional variation | Misses cultural context |
| Single-language model on multi-language content | Coverage gaps |
| Ignoring AI-generated content | New attack surface |

**Decision matrix:**

| Stage | Tool |
|---|---|
| Pre-filter (cheap, deterministic) | Regex + hash + URL blocklist |
| Text classifier (English) | Perspective API or fine-tuned BERT |
| Image classifier | NSFW model + Google SafeSearch |
| Video | Frame sample + image + audio transcript pipeline |
| Edge cases | Human review |
| Appeals | Separate human review pool |
| Feedback | Retrain ML on human decisions monthly |

**Cross-references:**

- Guardrails / safety / hallucination: [guardrails_*.md](guardrails_safety_hallucination_detection.md)
- LLM deployment: [llm_deployment_*.md](llm_deployment_serving_latency_optimization.md)
- A/B testing patterns: [recommendation_*.md](system_design_recommendation_collaborative_ranking.md)
- Real-time message streaming: [kafka_*.md](../data_engineering/kafka_event_streaming_topic_partition_offset.md)

**Rule of thumb:** **ML for scale, humans for edge cases.** Cheap **pre-filter** catches obvious cases; **classifier** scores; **confidence-based routing** sends only borderline cases to human review. Tune **thresholds per severity tier** (strict for CSAM, looser for opinions). **Feedback loop** from human decisions improves the model. **Audit for bias regularly** — disparate impact is the most common failure mode. Always offer **appeals**.
