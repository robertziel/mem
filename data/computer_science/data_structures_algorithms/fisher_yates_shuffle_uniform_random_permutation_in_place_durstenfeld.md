### Fisher-Yates Shuffle (uniform random permutation, in-place, Durstenfeld)

**When:** generate a uniform random permutation of an array — deck shuffle, randomized testing, shuffle items before A/B split, generate a random subset, randomized algorithms (random pivot in quicksort, random sampling).

**Schema (Durstenfeld variant — modern in-place):**

| Step | Detail |
|---|---|
| Iterate `i` from `n − 1` down to `1` | (or `0` to `n−1` for the equivalent forward variant) |
| Pick `j` uniformly in `[0, i]` | Inclusive of `i` |
| Swap `arr[i]` and `arr[j]` | Lock element at position `i` |

**In-place template (Durstenfeld, the canonical version):**

```python
import random
def shuffle(arr):
    for i in range(len(arr) - 1, 0, -1):
        j = random.randint(0, i)                 # 0..i inclusive
        arr[i], arr[j] = arr[j], arr[i]
```

**Why uniform:** at each step, position `i` is chosen uniformly from the remaining items, so each of the `n!` permutations is equally likely. Total ops: `n − 1` swaps, `n − 1` random calls.

#### Forward variant (equivalent — Knuth's shuffle in-place forward)

```python
def shuffle_forward(arr):
    for i in range(len(arr)):
        j = random.randint(i, len(arr) - 1)      # i..n-1 inclusive
        arr[i], arr[j] = arr[j], arr[i]
```

#### Out-of-place (build a new permutation)

```python
def shuffled(seq):
    out = []
    for i, x in enumerate(seq):
        j = random.randint(0, i)
        if j == i: out.append(x)
        else:      out.append(out[j]); out[j] = x
    return out
```

#### Partial shuffle (top-K random, when you only need K out of N)

```python
def random_top_k(arr, k):
    arr = list(arr); n = len(arr)
    for i in range(min(k, n)):
        j = random.randint(i, n - 1)
        arr[i], arr[j] = arr[j], arr[i]
    return arr[:k]
```

> Stops after `k` swaps — O(k) time, returns a uniform random `k`-subset (in random order). Different from reservoir sampling: this requires knowing `n`.

#### Use cases

| Problem | Approach |
|---|---|
| Shuffle a deck / playlist | In-place Fisher-Yates |
| Random subset of size k | Partial Fisher-Yates (above) |
| Random sample of k from known list | Same; or `random.sample(arr, k)` |
| Random ordering for A/B test cohorts | Shuffle + slice |
| Random tie-break in sort key | Append a random key, sort |
| Random pivot in quicksort / quickselect | One random index |
| Generate random binary tree shape | Random in-order labels via shuffle |
| Permutation puzzle solvers | Random restart |

#### The "naive shuffle" is biased — don't write it

```python
# WRONG — produces non-uniform permutations
for i in range(len(arr)):
    j = random.randint(0, len(arr) - 1)          # full range every time
    arr[i], arr[j] = arr[j], arr[i]
```

> This produces `n^n` outcomes mapped to `n!` permutations, but `n^n` is **not divisible by** `n!` (for `n ≥ 3`), so some permutations are over-represented. Easy bug, hard to spot.

#### Python built-ins

```python
import random
random.shuffle(arr)            # in-place, Fisher-Yates internally
random.sample(arr, k)          # uniform k-subset, list of k items
random.choices(arr, k=k)       # WITH replacement
```

> **Use the built-ins** unless you have a specific reason. They're correct and fast.

#### Variants

| Variant | Use |
|---|---|
| In-place Durstenfeld | Standard |
| Forward variant | Same outcome, opposite direction |
| Partial (top-K) | When only first K matter |
| Reservoir sampling | When stream length unknown |
| Weighted shuffle | A-Res (weighted reservoir) |
| Cycle-based shuffle | Generate a single random cycle of length `n` |
| Constrained shuffle (derangement) | Reject + retry, or Sattolo's algorithm (no fixed points) |

#### Sattolo's algorithm — random *cyclic* permutation (no fixed points)

```python
def sattolo(arr):
    for i in range(len(arr) - 1, 0, -1):
        j = random.randint(0, i - 1)             # i - 1, NOT i
        arr[i], arr[j] = arr[j], arr[i]
```

> Subtle change (`i − 1` instead of `i`) makes the result a uniform random **single cycle** of length `n` rather than a uniform random permutation.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Drawing `j` from full range each iteration | Bias — must shrink the range |
| Off-by-one in `randint(0, i)` vs `randrange(0, i + 1)` | Both correct; pick one consistently |
| Using a low-quality PRNG | Use Mersenne Twister / SystemRandom for security-sensitive shuffling |
| Shuffling references when independent copies needed | Shuffle indices, not the heavy objects |
| Cryptographic shuffle with `random` | Use `secrets` / `os.urandom`-backed RNG |
| Distributed shuffle without coordination | Per-shard shuffles + merge — easy to get biased |

#### Complexity

| Op | Cost |
|---|---|
| Full shuffle | O(n) time, O(1) extra space (in-place) |
| Partial top-K shuffle | O(k) time |
| `random.sample(arr, k)` | O(k) (when k ≪ n) |

**Rule of thumb:** **Durstenfeld iteration: from end to start, swap with a uniform-random earlier index (inclusive of self).** The naive "swap with any index" is biased — don't. For **k from a known list**, partial shuffle is O(k); for **k from a stream**, use **reservoir sampling**. In Python, **prefer `random.shuffle` / `random.sample`** unless you have a reason to roll your own.
