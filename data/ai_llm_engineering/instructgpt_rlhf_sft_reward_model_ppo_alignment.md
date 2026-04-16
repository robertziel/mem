### InstructGPT / RLHF — SFT + Reward Model + PPO (2022)

**Paper:** "Training language models to follow instructions with human feedback" (Ouyang et al., OpenAI, 2022). The foundation for ChatGPT, Claude, Gemini — turning a pretrained LM into an aligned assistant.

**Why it mattered:** GPT-3 was capable but unaligned — it would continue text patterns rather than follow instructions or refuse harmful requests. InstructGPT showed that a smaller 1.3B model fine-tuned with human feedback is preferred over raw 175B GPT-3.

**The 3-stage RLHF pipeline:**
```
Stage 1: SFT (Supervised Fine-Tuning)
  Base LM (GPT-3) + human-written demonstrations
  → Instruction-following model (teaches "how to respond")

Stage 2: RM (Reward Model training)
  For each prompt, generate K responses
  Humans rank them best → worst (pairwise comparisons)
  Train a separate model to predict "which response would humans prefer?"
  → Reward model outputs a scalar score for any (prompt, response)

Stage 3: PPO (Proximal Policy Optimization)
  Policy = the LM (initialized from SFT model)
  For each prompt:
    1. Policy generates a response
    2. Reward model scores it
    3. Update policy via PPO to maximize reward
    4. KL penalty vs SFT model (prevents "reward hacking" / mode collapse)
  → Final aligned model
```

**Why three stages (not just "train to mimic humans")?**
```
SFT alone:
  + Fast, cheap, stable training
  - Can only learn from what humans wrote (no exploration)
  - Hard to express "preference between outputs" in demonstrations

RM alone (no policy update):
  + Learns fine-grained preferences from rankings
  - Just a scorer — doesn't improve the LM

RLHF (all three):
  + LM explores its own outputs, gets scored, improves
  + Humans rank (easier than writing gold responses)
  + Scales: once RM trained, policy training is "free" of human labels
```

**Data requirements (InstructGPT):**
- SFT: ~13K human-written demonstrations (prompt → ideal response)
- RM: ~33K prompts × ~4-9 responses each, humans ranked
- PPO: ~31K prompts used for policy optimization loop

**KL penalty — why it's critical:**
```
Without KL: policy drifts toward "gaming" the reward model
  → produces weird text that maximizes RM score but is nonsense
  → "reward hacking"

With KL penalty: policy stays close to SFT model
  reward = RM_score - β * KL(policy || SFT_model)
  Higher β = more conservative, stays near SFT
  Lower β = more exploration, risk of drift
```

**Modern variations:**

| Method | Year | Change from InstructGPT |
|---|---|---|
| **DPO** (Direct Preference Optimization) | 2023 | Skip RM training, directly optimize policy from preferences — simpler, no PPO |
| **RLAIF** (RL from AI Feedback) | 2023 | Replace human rankers with another LM — scales data generation |
| **Constitutional AI** (Claude) | 2022 | Self-critique + revise using written principles, then RLHF/RLAIF |
| **RLVR** (Reinforcement Learning with Verifiable Rewards) | 2024+ | Use ground-truth rewards (math, code tests) instead of learned RM |

**What RLHF does vs doesn't fix:**
```
✅ Fixes:
  - Instruction following
  - Tone, helpfulness, safety refusals
  - Output format adherence
  - Honesty about uncertainty

❌ Doesn't fix:
  - Factual accuracy (RM learns what sounds right, not what's true)
  - Reasoning capability (base model's ceiling)
  - New knowledge (no new facts learned)
  - Sycophancy (model learns to agree with rater preferences)
```

**Rule of thumb:** RLHF is how pretrained LMs become assistants. Three stages: SFT teaches format/style from demonstrations, reward model learns from rankings (easier than writing gold text), PPO optimizes the policy while KL-constrained to the SFT model. Modern alternatives like DPO collapse stages 2+3 into one. RLHF aligns behavior but doesn't add knowledge or reasoning ability — those come from pretraining.
