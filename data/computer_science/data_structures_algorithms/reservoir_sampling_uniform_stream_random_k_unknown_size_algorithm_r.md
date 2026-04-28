### Reservoir Sampling (uniform stream, random k, unknown size, Algorithm R)

**When:** sample `k` items uniformly at random from a stream of unknown (or huge) length, in **one pass with O(k) memory**. Used for: log sampling, A/B test cohort selection, training data sampling, sublinear analytics.

**Schema:**

| Variant | Goal | Probability per item |
|---|---|---|
| **Algorithm R** | Sample 1 item uniformly | `1 / (i + 1)` of replacing on item `i` |
| **Algorithm R (k items)** | Sample `k` items uniformly without replacement | `k / (i + 1)` of replacing a random reservoir slot on item `i` |
| **Algorithm A-Res** | Weighted sampling | `key = u^(1/w)`; keep top-`k` by key |
| **Algorithm L** | Faster than R; geometric skip | O(k(1 + log(n/k))) expected ops |

#### Algorithm R — sample k items uniformly from a stream

```python
import random
def reservoir_sample(stream, k):
    reservoir = []
    for i, x in enumerate(stream):
        if i < k:
            reservoir.append(x)
        else:
            j = random.randint(0, i)              # 0..i inclusive
            if j < k:
                reservoir[j] = x
    return reservoir
```

**Why uniform:** by induction, after processing `i` items, every previously-seen item has probability `k/i` of being in the reservoir. The new item has probability `k/(i+1)` of replacing one slot, and existing items survive with probability `1 − k/(i+1)·(1/k) = 1 − 1/(i+1)`. Multiplying out gives `k/(i+1)` for everyone — uniform.

#### Algorithm A-Res — weighted reservoir sampling

```python
import heapq, math, random
def weighted_sample(stream, k):                  # stream of (item, weight)
    heap = []                                    # min-heap of (key, item)
    for x, w in stream:
        if w <= 0: continue
        key = math.log(random.random()) / w       # equivalent to u^(1/w) without overflow
        if len(heap) < k:
            heapq.heappush(heap, (key, x))
        elif key > heap[0][0]:
            heapq.heapreplace(heap, (key, x))
    return [item for _, item in heap]
```

> Each item's probability of inclusion is proportional to its weight. The `log(u)/w` form avoids underflow vs `u^(1/w)`.

#### Algorithm L — faster reservoir (skip-based)

For very long streams, Algorithm L generates **how many items to skip** before the next replacement, sampling from a geometric-like distribution. Reduces work from O(n) random calls to O(k(1 + log(n/k))).

```python
import random, math
def algorithm_l(stream, k):
    reservoir = []; it = iter(stream)
    for _ in range(k):
        try: reservoir.append(next(it))
        except StopIteration: return reservoir
    W = math.exp(math.log(random.random()) / k)
    i = k - 1
    for x in it:
        i += 1
        if random.random() >= W: continue
        # this is the (i)-th item that will replace
        j = random.randint(0, k - 1)
        reservoir[j] = x
        W *= math.exp(math.log(random.random()) / k)
    return reservoir
```

#### Use cases

| Problem | Approach |
|---|---|
| Sample 1 random log line from a huge log file | Algorithm R, k=1 |
| A/B-test bucket selection | Hash user → bucket; reservoir if list unknown |
| Random subset of unknown stream | Algorithm R |
| Training-data sampling from huge dataset | Algorithm R or L |
| Top-K weighted sampling | A-Res |
| Distributed reservoir | Each shard samples k; merge by re-reservoir over k·#shards |
| Pick a random node in an infinite tree | Reservoir over DFS visits |
| Random pivot in random algorithms | Reservoir simplification |

#### Reservoir vs alternatives

| Need | Use |
|---|---|
| Random sample, **size known** | Fisher-Yates partial shuffle on indices |
| Random sample, **stream / unknown size** | **Reservoir** |
| Sample with replacement | Repeat single-pass reservoir |
| Weighted sample with replacement | `random.choices` (when bounded) |
| Top-K largest / smallest from stream | Heap of size K (deterministic, not random) |
| Fixed-prob streaming sample (each kept w.p. p) | Bernoulli filter — variable size |

#### Distributed reservoir merging

```python
# Each shard returns its own reservoir of size k.
# Final answer: take all reservoirs concatenated, then run Algorithm R again at size k.
all_samples = sum(shard_reservoirs, [])
final = reservoir_sample(all_samples, k)
```

> Combined with **per-item count** (so weighted), or per-shard size, this scales to billions of items.

#### Pitfalls

| Mistake | Fix |
|---|---|
| `random.randint(0, i - 1)` instead of `(0, i)` | Off-by-one breaks uniformity |
| Sampling first k blindly without filling first | Fill first k unconditionally; replacement only for `i ≥ k` |
| Re-seeding RNG per item | Seed once; use a high-quality PRNG |
| Weighted sample assuming `u^(1/w)` directly | For high `w`, use log-form to avoid underflow |
| Trying to estimate `n` to compute probabilities | The whole point is **you don't need `n`** |
| Concurrent writes to a single reservoir | Per-thread reservoirs, then merge |

#### Complexity

| Op | Time | Memory |
|---|---|---|
| Algorithm R | O(n) | O(k) |
| Algorithm L | O(k(1 + log(n/k))) | O(k) |
| Weighted A-Res | O(n log k) | O(k) |
| Distributed merge | O(s · k) where s = shards | O(s · k) |

**Rule of thumb:** **Algorithm R** is the canonical "uniform sample of k from a stream" — one pass, O(k) memory, no foreknowledge of `n`. Use **A-Res** for **weighted** sampling. For very long streams, **Algorithm L** skips ahead instead of rolling per item. The pattern is universal: any time you need a **random subset of an unknown stream**, reservoir is the answer.
