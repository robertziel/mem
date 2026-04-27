### TurboQuant

- Google Research compression method for aggressive vector quantization.
- Main use cases: LLM key-value cache compression and vector search.
- Goal: reduce memory usage a lot without hurting model quality.

### How it works (high level)

- Uses **PolarQuant** for most of the compression.
- Uses **QJL** for a tiny residual error-correction step.
- Designed to remove the usual memory overhead that many quantization methods keep.

### Why it matters

- Smaller KV cache -> less memory pressure for long-context LLMs
- Smaller vectors -> faster / cheaper similarity search
- Better compression can improve both cost and runtime

### Quick claims from the Google Research post

- KV cache compressed down to **3 bits**
- At least **6x** KV memory reduction on reported benchmarks
- Up to **8x** attention-logit speedup at **4-bit** vs **32-bit** keys on H100 in the post's experiments

### Gotcha

- This is a research result, not a guarantee that every production model will get the same gains.

Source:
- Google Research blog, "TurboQuant: Redefining AI efficiency with extreme compression" (March 24, 2026)
