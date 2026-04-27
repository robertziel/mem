### Fine-Tuning vs RAG: When to Use Which

**RAG (Retrieval-Augmented Generation):**
- Add external knowledge at inference time
- No model modification needed
- Knowledge can be updated without retraining

**Fine-tuning:**
- Train the model on your specific data
- Changes model weights/behavior
- Knowledge baked into the model

**Decision matrix:**
| Criterion | RAG | Fine-tuning | Both |
|-----------|-----|-------------|------|
| Need up-to-date knowledge | ✅ Best | ❌ Stale after training | |
| Need specific tone/style | ❌ | ✅ Best | |
| Need domain knowledge | ✅ Good | ✅ Good | ✅ Ideal |
| Need to cite sources | ✅ Built-in | ❌ Can't cite | |
| Limited training data | ✅ No data needed | ❌ Needs thousands of examples | |
| Latency-sensitive | ❌ Retrieval adds latency | ✅ No retrieval step | |
| Cost to update | ✅ Update docs, no retrain | ❌ Retrain = expensive | |
| Reduce hallucination | ✅ Grounded in docs | ⚠️ May still hallucinate | |
| Structured output format | ⚠️ Prompt-dependent | ✅ Can train exact format | |

**When to use RAG:**
- Company documentation, knowledge base Q&A
- Customer support with evolving product info
- Legal/compliance (must cite sources)
- Frequently changing data
- You don't have training data

**When to use fine-tuning:**
- Consistent output format (JSON extraction, classification)
- Brand voice / writing style
- Domain-specific language (medical, legal, financial)
- Reduce prompt length (behavior learned, not prompted)
- Edge cases that prompting can't handle

**When to use both (RAG + fine-tuned model):**
- Domain-specific Q&A with citations
- Fine-tuned for format/style, RAG for knowledge
- Best quality but most complex and expensive

**Fine-tuning approaches:**
| Method | What changes | Data needed | Cost |
|--------|-------------|-------------|------|
| Full fine-tuning | All weights | 10K+ examples | Very high |
| LoRA/QLoRA | Low-rank adapters | 500-5K examples | Low |
| Prompt tuning | Soft prompt prefix | 100-500 examples | Very low |
| RLHF | Reward model + PPO | Comparison pairs | High |

**LoRA (Low-Rank Adaptation):**
- Freeze base model, train small adapter matrices
- 0.1-1% of parameters trained
- Can run on a single GPU
- Quality close to full fine-tuning for most tasks

**Data preparation for fine-tuning:**
```jsonl
{"messages": [{"role": "system", "content": "You are..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
{"messages": [{"role": "system", "content": "You are..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```
- Quality > quantity (100 excellent examples > 10K noisy examples)
- Diverse examples covering edge cases
- Consistent format across examples

**Rule of thumb:** Start with RAG (faster to build, easier to update, cites sources). Fine-tune only if RAG + prompt engineering can't achieve the quality you need. Use LoRA for cost-effective fine-tuning. The best systems often combine both: fine-tuned model + RAG for knowledge.
