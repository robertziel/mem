### AI System Design: Content Moderation Pipeline

**Requirements:**
- Detect and handle: toxic content, spam, NSFW, violence, misinformation
- Multi-modal: text, images, video
- Scale: millions of posts per day
- Balance: safety vs freedom of expression, speed vs accuracy

**Architecture:**
```
User Content
      |
[Pre-filter] (regex blocklist, hash matching for known bad content)
      |
[ML Classifier] (multi-label: toxic, spam, NSFW, violence, hate speech)
      |
  ┌───────────────────┐
  │ High confidence    │ → Auto-action (remove, flag, warn, shadow-ban)
  │ Medium confidence  │ → Priority human review queue
  │ Low confidence     │ → Allow (log for monitoring)
  └───────────────────┘
      |
[Human Review Queue] (moderators review flagged content)
      |
[Human decision] → [Feedback to ML model] (improve classifier)
```

**Component details:**

**Pre-filter (fast, rule-based):**
- Regex blocklist for known bad words/phrases
- PhotoDNA / perceptual hash for known CSAM/illegal images
- URL blocklist for known malicious links
- Cheap and fast — catches obvious cases before ML

**ML classifier:**
- Multi-label classification (content can be toxic AND spam)
- Text: fine-tuned BERT/transformer, or API (OpenAI Moderation, Perspective API)
- Images: CNN classifier (NSFW, violence, gore)
- Video: frame sampling + image classifier + audio transcription
- Output: confidence score per category (0.0 to 1.0)

**Thresholds and actions:**
```
If toxic_score > 0.95: auto-remove (high confidence)
If toxic_score > 0.70: send to human review (medium confidence)
If toxic_score > 0.30: flag for monitoring (low confidence)
If toxic_score < 0.30: allow
```
Thresholds tuned per category (stricter for CSAM, looser for borderline opinions).

**Human review:**
- Queue prioritized by: severity, confidence, user reach
- Moderator tools: view content + context, one-click actions
- Decision: remove / warn / escalate / allow
- Feedback loop: human decisions retrain the ML model

**Challenges:**
| Challenge | Solution |
|-----------|----------|
| Context-dependent | Sarcasm, quotes, news reporting → multi-turn context + entity detection |
| Adversarial content | Leet speak, Unicode tricks, steganography → normalize text, robust models |
| Bias | Model may over-flag AAVE, minority dialects → bias auditing, diverse training data |
| Scale | Millions of posts/day → ML first, humans only for edge cases |
| Moderator well-being | Exposure to harmful content → rotation, wellness support, tool-assisted review |
| Appeals | Users contest decisions → appeal queue, secondary review |

**Monitoring:**
| Metric | Target |
|--------|--------|
| False positive rate | < 1% (over-moderation harms users) |
| False negative rate | < 0.1% for severe categories (under-moderation = safety risk) |
| Review queue latency | < 4 hours for high-severity |
| Appeal overturn rate | < 10% (high overturn = bad classifier) |
| Moderator throughput | Track for capacity planning |

**Rule of thumb:** ML for scale, humans for edge cases. Pre-filter catches obvious cases cheaply. Multi-stage: auto-action for high confidence, human review for medium. Feedback loop from human decisions improves the model. Audit for bias regularly. Different thresholds per severity category.
