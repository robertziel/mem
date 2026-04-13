### LLM Deployment, Serving & Latency Optimization

**Serving architectures:**
| Approach | Latency | Cost | Control |
|----------|---------|------|---------|
| API (OpenAI, Anthropic) | Low | Per token | Least |
| Managed (Bedrock, Vertex) | Low | Per token | Medium |
| Self-hosted (vLLM, TGI) | Variable | Infrastructure | Most |

**Key latency components:**
```
Total latency = Time to First Token (TTFT) + Token Generation Time
TTFT = prompt processing (prefill phase)
Token Generation = num_tokens × per_token_latency (decode phase)
```

**Optimization techniques:**

**1. Model quantization:**
- Reduce precision: FP32 → FP16 → INT8 → INT4
- Smaller model = faster inference + less memory
- INT4 (GPTQ, AWQ): 4x less memory, ~5% quality loss
- Works for most applications; evaluate quality on your task

**2. KV cache optimization:**
- KV cache stores attention keys/values for generated tokens
- Grows with sequence length × batch size
- PagedAttention (vLLM): virtual memory for KV cache, reduces waste
- Prefix caching: reuse KV cache for shared prompt prefixes

**3. Batching:**
- **Static batching**: wait for N requests, process together
- **Continuous batching** (vLLM): start new requests as old ones finish tokens
- **Dynamic batching**: group requests with similar input lengths
- Continuous batching: 2-10x throughput improvement

**4. Streaming:**
```python
# Stream tokens to client as they're generated
for chunk in client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "..."}],
    stream=True
):
    print(chunk.content, end="", flush=True)
```
- Reduces perceived latency (user sees first token in ~200ms)
- Critical for chat UX

**5. Caching (avoid redundant inference):**
- Exact match cache: hash(prompt) → cached response
- Semantic cache: embed prompt, find similar cached prompts
- Useful for: FAQ bots, common queries, repeated system prompts

**vLLM (popular self-hosting framework):**
```bash
# Serve a model with OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8B-Instruct \
  --tensor-parallel-size 2 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.9
```

**Cost optimization:**
- Shorter prompts: reduce tokens (prompt engineering, summary)
- Smaller models: use Haiku/mini for simple tasks, Opus/GPT-4 for complex
- Caching: avoid re-processing identical or similar prompts
- Batching: higher throughput = lower cost per request
- Spot instances: for batch/offline inference (not real-time)

**Monitoring LLM in production:**
- Latency: TTFT, total generation time, p50/p95/p99
- Throughput: requests/sec, tokens/sec
- Quality: hallucination rate, user feedback, evaluation scores
- Cost: tokens consumed, cost per request
- Errors: rate limit hits, timeouts, model errors

**Rule of thumb:** Use API providers (OpenAI, Anthropic) unless you need maximum control or have compliance requirements. Stream responses for chat UX. Quantize for self-hosted cost savings. Continuous batching (vLLM) for throughput. Cache repeated queries. Monitor latency, quality, and cost.
