### Viterbi Algorithm (HMM most-likely path, DP, speech recognition, decoding)

**When:** find the most likely sequence of **hidden states** given a sequence of observations and a Hidden Markov Model — POS tagging, speech recognition, gene finding, decoding error-correcting (Trellis) codes, computer-vision sequence labeling. The DP backbone of every "decode the hidden sequence" problem.

**Schema:**

| Concept | Symbol | Detail |
|---|---|---|
| States | `S = {s₁, …, s_K}` | K hidden states |
| Observations | `O = (o₁, …, o_T)` | What you actually see |
| Initial probabilities | `π_i` | `P(state₀ = sᵢ)` |
| Transition | `A[i][j]` | `P(state_{t+1} = j | state_t = i)` |
| Emission | `B[i][o]` | `P(observe o | state = i)` |
| Goal | `argmax_path P(path | observations)` | Most likely state sequence |

**Recurrence:** `δ_t(j) = max_i δ_{t−1}(i) · A[i][j] · B[j][o_t]`. Track `ψ_t(j) = argmax i` for backtracking.

#### Implementation (probability space)

```python
def viterbi(obs, states, pi, A, B):
    T = len(obs); K = len(states)
    delta = [[0.0] * K for _ in range(T)]
    psi   = [[0]   * K for _ in range(T)]
    # Initialization
    for j in range(K):
        delta[0][j] = pi[j] * B[j][obs[0]]
    # Recursion
    for t in range(1, T):
        for j in range(K):
            best, arg = -1.0, 0
            for i in range(K):
                v = delta[t-1][i] * A[i][j]
                if v > best:
                    best, arg = v, i
            delta[t][j] = best * B[j][obs[t]]
            psi[t][j] = arg
    # Termination — pick best final state
    last = max(range(K), key=lambda j: delta[T-1][j])
    # Backtrack
    path = [0] * T; path[-1] = last
    for t in range(T - 1, 0, -1):
        path[t-1] = psi[t][path[t]]
    return path, delta[T-1][last]                # path + its probability
```

**Numerical stability — use log space:**

```python
import math

def viterbi_log(obs, K, log_pi, log_A, log_B):
    T = len(obs)
    delta = [[-math.inf] * K for _ in range(T)]
    psi   = [[0]         * K for _ in range(T)]
    for j in range(K):
        delta[0][j] = log_pi[j] + log_B[j][obs[0]]
    for t in range(1, T):
        for j in range(K):
            best, arg = -math.inf, 0
            for i in range(K):
                v = delta[t-1][i] + log_A[i][j]
                if v > best:
                    best, arg = v, i
            delta[t][j] = best + log_B[j][obs[t]]
            psi[t][j] = arg
    last = max(range(K), key=lambda j: delta[T-1][j])
    path = [0] * T; path[-1] = last
    for t in range(T - 1, 0, -1):
        path[t-1] = psi[t][path[t]]
    return path, delta[T-1][last]
```

> Long sequences underflow in probability space — **always use log probabilities** in production. Multiply → add.

#### Forward / backward / Viterbi — three classic HMM tasks

| Algorithm | What | Recurrence |
|---|---|---|
| **Forward** | `P(observations)` (likelihood) | `α_t(j) = Σ_i α_{t−1}(i) · A[i][j] · B[j][o_t]` (sum) |
| **Backward** | `P(observations after t | state_t)` | `β_t(i) = Σ_j A[i][j] · B[j][o_{t+1}] · β_{t+1}(j)` |
| **Viterbi** | Most likely **path** | Same recurrence as Forward but **max** instead of sum |
| **Forward-Backward (smoothing)** | `P(state_t = i | observations)` | Combines α and β |
| **Baum-Welch** | EM to learn HMM parameters from data | Iterates Forward-Backward |

> Viterbi = forward with **max instead of sum**, plus pointers for backtracking. Same DP shape.

#### Use cases

| Domain | What's hidden | What's observed |
|---|---|---|
| POS tagging | Part-of-speech tags | Words |
| Speech recognition | Phonemes | Audio frames |
| Gene finding | Coding / non-coding regions | DNA sequence |
| Named entity recognition | Person / Org / Location tags | Words |
| Error-correcting codes | Transmitted bits | Received noisy bits |
| OCR / handwriting | Characters | Pixel features |
| Activity recognition | High-level activity | Sensor readings |
| ASR / TTS HMM | Phones | Spectrogram |

#### Variants

| Variant | Difference |
|---|---|
| **Viterbi with beam search** | Keep only top-K states per time step — sub-linear in K when K is huge (speech) |
| **Continuous emission** | `B[j][o_t]` is a Gaussian (or GMM) — replace `log B` with log-density |
| **CRF (linear-chain)** | Discriminative model; same Viterbi DP for inference |
| **HMM in higher-order** | Conditioned on `n` previous states — same DP, larger state space (`Kⁿ`) |
| **Pair HMM** | Two emission tracks; used in bioinformatics alignment |
| **Profile HMM** | State-dependent emissions for each position; HMMER for protein search |

#### Complexity

| Op | Cost |
|---|---|
| Time | **O(T · K²)** |
| Space | O(T · K) for `δ` and `ψ` |
| With beam (size B) | O(T · K · B) → much smaller in practice |
| Forward / Backward | Same O(T · K²) |
| Baum-Welch (per iteration) | O(T · K²) |

> When K is large (e.g., HMM-based ASR with thousands of states), **beam search** is essential. Same DP, just keep top-K per column.

#### Patterns map

| Problem signature | Use |
|---|---|
| "Decode hidden sequence given observations" | Viterbi |
| "Likelihood of observations under HMM" | Forward |
| "Probability of being in state X at time t" | Forward-Backward |
| "Learn HMM parameters from data" | Baum-Welch (EM) |
| "Sequence labeling with structured features" | Linear-chain CRF + Viterbi |
| "Decode convolutional code (radio)" | Trellis Viterbi |
| "Speech recognition" | HMM-GMM (classic) or HMM + neural acoustic (modern) → Viterbi/beam |
| "Protein domain search" | Profile HMM (HMMER) + Viterbi |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Multiplying probabilities for long T (underflow) | Use **log probabilities** (multiply → add) |
| Forgetting to backtrack | Without `psi`, you only know the best ending state |
| Confusing Viterbi with Forward | Forward sums; Viterbi maxes — different answers |
| Picking ending state by `δ[T-1][j]` then forgetting termination probability | If model has explicit end states, multiply by them |
| Using sum-product when you want max-product (or vice versa) | Read the problem: "most likely path" = max; "likelihood" = sum |
| Heavy state space without beam | Adopt beam search early |
| Initial state probability ignored | Multiply by `π_j` (or add `log π_j`) at t=0 |

#### Two-line summary of the recurrence

```
δ_t(j)   = (max_i δ_{t-1}(i) · A[i][j]) · B[j][o_t]
ψ_t(j)   = argmax_i δ_{t-1}(i) · A[i][j]
```

In log space:

```
δ_t(j)   = max_i (δ_{t-1}(i) + log A[i][j]) + log B[j][o_t]
ψ_t(j)   = argmax_i (δ_{t-1}(i) + log A[i][j])
```

**Rule of thumb:** Viterbi = **DP on the trellis with max-product**, plus a pointer table for backtracking. **Always use log probabilities** for long sequences. **O(T·K²)**; if `K` is huge, use **beam search**. Same DP shape works for **HMMs, CRFs, and convolutional codes** — what changes is how the transition / emission scores are computed.
