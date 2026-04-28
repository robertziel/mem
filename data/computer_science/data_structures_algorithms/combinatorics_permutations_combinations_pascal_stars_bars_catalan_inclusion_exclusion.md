### Combinatorics (permutations, combinations, Pascal, stars & bars, Catalan, inclusion-exclusion)

**When:** "count the number of ways to …", "number of arrangements", "lattice paths", "balanced parens", "valid BSTs". Pure counting — no enumeration.

**Schema (the core formulas):**

| Concept | Formula | Meaning |
|---|---|---|
| Permutation `P(n, k)` | `n! / (n − k)!` | Ordered arrangements of `k` from `n` |
| Combination `C(n, k)` | `n! / (k! · (n − k)!)` | Unordered selections of `k` from `n` |
| Pascal's identity | `C(n, k) = C(n−1, k−1) + C(n−1, k)` | Recursive build |
| Hockey-stick | `Σᵢ₌₀..n C(i, k) = C(n+1, k+1)` | Diagonal sum |
| Stars & bars | `C(n + k − 1, k − 1)` | Distribute `n` identical items into `k` bins |
| Catalan number `Cₙ` | `C(2n, n) / (n + 1)` | Balanced parens, valid BSTs, Dyck paths |
| Bell number `Bₙ` | Recurrence on partitions | Set partitions of `n` |
| Stirling 2nd kind `S(n, k)` | Partitions of `n` into `k` non-empty subsets | — |
| Multiset permutations | `n! / (n₁! · n₂! · …)` | When some elements repeat |

#### Direct computation

```python
import math
math.factorial(n)           # n!
math.comb(n, k)             # C(n, k) — exact, big-int safe
math.perm(n, k)             # P(n, k)
```

#### Pascal's triangle (when many `nCk` queries with shared `n`)

```python
def pascal(N):
    P = [[0] * (N + 1) for _ in range(N + 1)]
    for n in range(N + 1):
        P[n][0] = 1
        for k in range(1, n + 1):
            P[n][k] = P[n-1][k-1] + (P[n-1][k] if k < n else 0)
    return P
```

#### Modular nCk (precomputed factorials + inverse factorials)

```python
MOD = 10**9 + 7

def precompute_factorials(N, mod=MOD):
    fact = [1] * (N + 1)
    for i in range(1, N + 1):
        fact[i] = fact[i - 1] * i % mod
    inv_fact = [1] * (N + 1)
    inv_fact[N] = pow(fact[N], mod - 2, mod)         # Fermat (mod must be prime)
    for i in range(N - 1, -1, -1):
        inv_fact[i] = inv_fact[i + 1] * (i + 1) % mod
    return fact, inv_fact

def nCk(n, k, fact, inv_fact, mod=MOD):
    if k < 0 or k > n: return 0
    return fact[n] * inv_fact[k] % mod * inv_fact[n - k] % mod
```

> Standard prep for any "count mod 10⁹+7" problem. **Build once, query in O(1).**

#### Stars and bars

**Number of non-negative integer solutions to `x₁ + x₂ + … + xₖ = n`:**

`C(n + k − 1, k − 1)`

**With each `xᵢ ≥ 1`:** substitute `yᵢ = xᵢ − 1` → `C(n − 1, k − 1)`.

**With each `xᵢ ≤ uᵢ`:** inclusion-exclusion over the upper bounds.

#### Catalan numbers

```
Cₙ = C(2n, n) / (n + 1) = 1, 1, 2, 5, 14, 42, 132, 429, 1430, 4862, ...
```

**Recurrence:** `Cₙ₊₁ = Σᵢ₌₀..ₙ Cᵢ · Cₙ₋ᵢ`

```python
def catalan(n):
    return math.comb(2 * n, n) // (n + 1)
```

**What Catalan counts:**

| Problem | Value |
|---|---|
| Balanced parentheses with `n` pairs | Cₙ |
| Distinct BSTs with `n` distinct keys | Cₙ |
| Triangulations of an (n + 2)-gon | Cₙ |
| Monotonic lattice paths from (0,0) to (n,n) not crossing diagonal | Cₙ |
| Dyck words of length 2n | Cₙ |
| Full binary trees with `n + 1` leaves | Cₙ |

#### Inclusion-exclusion

**For events `A₁, A₂, …, Aₙ`:**

`|A₁ ∪ … ∪ Aₙ| = Σ|Aᵢ| − Σ|Aᵢ ∩ Aⱼ| + Σ|Aᵢ ∩ Aⱼ ∩ Aₖ| − …`

```python
# Count integers in [1, N] divisible by any of primes
def count_multiples(N, primes):
    total = 0
    n = len(primes)
    for mask in range(1, 1 << n):
        prod = 1; bits = 0
        for i in range(n):
            if mask & (1 << i): prod *= primes[i]; bits += 1
        sign = 1 if bits % 2 == 1 else -1
        total += sign * (N // prod)
    return total
```

#### Pigeonhole principle

If `n` items are placed in `k` boxes with `n > k`, some box has ≥ 2 items. Generalized: at least `⌈n / k⌉`.

**Used for:** "two of these must share property X", existence proofs, Floyd cycle.

#### Multinomial coefficient

`(n; n₁, n₂, …, nₖ) = n! / (n₁! · n₂! · … · nₖ!)` — number of ways to split `n` items into groups of sizes `n₁, …, nₖ`.

#### Patterns map

| Problem | Formula |
|---|---|
| Lattice paths from (0,0) to (m, n) (right / down only) | `C(m + n, m)` |
| Lattice paths avoiding diagonal | Catalan: `C(2n, n) − C(2n, n+1)` |
| Distribute n identical balls into k boxes | `C(n + k − 1, k − 1)` |
| Distribute n distinct balls into k boxes | `kⁿ` (any), `k! · S(n, k)` (no empty), `S(n, k)` (boxes identical) |
| Count anagrams of word with repeats | `n! / ∏(rᵢ!)` |
| Number of valid bracket sequences of length 2n | Catalan `Cₙ` |
| Number of distinct BSTs with n nodes | Catalan `Cₙ` |
| At least one of K conditions holds | Inclusion-exclusion |
| Derangements (no fixed point) | `n! · Σ (−1)ᵏ / k!` |
| Pick k items, no two adjacent | `C(n − k + 1, k)` |
| Subsets of n with constraints | Generating functions / DP |

#### Generating functions (when formulas don't simplify)

For "ways to make sum `S` from coins of values `c₁, c₂, …`": coefficient of `xˢ` in `∏ 1 / (1 − x^{cᵢ})`.

In code: this is **exactly the unbounded knapsack count DP** (see DP knapsack memo).

#### Pitfalls

| Mistake | Fix |
|---|---|
| Computing `n! / k!` then `// (n−k)!` with floats | Use `math.comb` or precomputed factorials |
| Modular division without inverse | Multiply by modular inverse |
| Off-by-one in stars-and-bars | Sketch boxes and stars to verify |
| Forgetting Catalan's `+1` denominator | Cₙ = C(2n, n) / (n + 1), **not** C(2n, n) |
| Counting permutations as combinations | Order matters? then permutations |
| Inclusion-exclusion sign error | Even intersection size → +; odd → − |
| Treating identical items as distinct (or vice versa) | Read the problem: "distinct", "identical", "labeled", "unlabeled" |

#### Complexity

| Op | Cost |
|---|---|
| `math.comb(n, k)` | O(min(k, n−k)) multiplications |
| Pascal up to N | O(N²) |
| Modular nCk after prep | O(1) per query, O(N) prep |
| Catalan via formula | O(n) |
| Inclusion-exclusion over n events | O(2ⁿ) |

**Rule of thumb:** `nCk` for unordered selection, `nPk` for ordered. **Stars & bars** is the answer for "distribute identical items". **Catalan** for "balanced parens, valid BSTs, monotonic-paths-below-diagonal". For modular counting at scale, **precompute factorials + inverse factorials once**. Reach for **inclusion-exclusion** when the constraint is "at least one of …".
