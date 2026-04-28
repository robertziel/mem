### Möbius Function & Möbius Inversion (divisor sum, inclusion-exclusion, number theory)

**When:** counting / summing functions over divisors, "count integers coprime to n", inclusion-exclusion across divisibility, Euler totient sums, GCD-related sums in competitive programming.

**Schema:**

| Concept | Detail |
|---|---|
| **`μ(n)` (Möbius)** | `0` if `n` has a squared prime factor; `(−1)^k` if `n` is squarefree with `k` distinct primes |
| `μ(1) = 1` | Convention |
| **Möbius inversion** | `f(n) = Σ_{d \| n} g(d)` ⇔ `g(n) = Σ_{d \| n} μ(d)·f(n/d)` |
| Multiplicative | `μ(m·n) = μ(m)·μ(n)` when `gcd(m, n) = 1` |
| Sum identity | `Σ_{d \| n} μ(d) = [n = 1]` (1 if n = 1, else 0) |

| n | μ(n) | Reason |
|---|---|---|
| 1 | 1 | empty product |
| 2 | −1 | one prime |
| 4 | 0 | `2²` divides |
| 6 | 1 | `2·3` (two distinct primes) |
| 12 | 0 | `2²` divides |
| 30 | −1 | `2·3·5` (three distinct primes) |

#### Compute Möbius via sieve

```python
def mobius_sieve(N):
    mu = [1] * (N + 1)
    primes = []
    is_prime = [True] * (N + 1); is_prime[0] = is_prime[1] = False
    for i in range(2, N + 1):
        if is_prime[i]:
            primes.append(i)
            mu[i] = -1
        for p in primes:
            if i * p > N: break
            is_prime[i * p] = False
            if i % p == 0:
                mu[i * p] = 0
                break                                # higher power of p
            else:
                mu[i * p] = -mu[i]
    return mu
```

> Linear sieve adapted for `μ`: O(N).

#### Möbius inversion in action

**Setup:** you know `f(n) = Σ_{d | n} g(d)` (sum over divisors), you want `g(n)`.

```
g(n) = Σ_{d | n} μ(d) · f(n / d)
```

**Example:** `f(n)` = number of fractions `k/n` (k = 1..n) **before reduction**; `g(n)` = number of fractions in lowest terms = `φ(n)`. The relation `n = Σ_{d | n} φ(d)` is the canonical Möbius inversion target.

#### Counting coprime pairs

**"How many pairs `(i, j)` with `1 ≤ i, j ≤ n` and `gcd(i, j) = 1`?"**

```
count = Σ_{d=1..n} μ(d) · ⌊n/d⌋²
```

```python
def coprime_pairs(n, mu):
    return sum(mu[d] * (n // d) ** 2 for d in range(1, n + 1))
```

> Generalizes: "pairs with `gcd = k`" = (substitute `n // k` everywhere).

#### Sum of GCDs

**`Σ_{i=1..n} Σ_{j=1..n} gcd(i, j)`** can be computed in O(n) via Möbius:

```
Σ gcd(i, j) = Σ_{g=1..n} g · #{(i, j) : gcd(i, j) = g}
            = Σ_{g} g · Σ_{d=1..n/g} μ(d) · ⌊n/(gd)⌋²
```

#### Möbius vs Euler totient

| Function | Definition | Identity |
|---|---|---|
| `μ(n)` | (above) | `Σ_{d \| n} μ(d) = [n = 1]` |
| `φ(n)` | Count of `1 ≤ k ≤ n` with `gcd(k, n) = 1` | `n = Σ_{d \| n} φ(d)` |
| Relation | `φ(n) = Σ_{d \| n} μ(d) · (n / d)` | (Möbius inversion of `n = Σ φ(d)`) |

#### Multiplicative function machinery

If `f, g` are multiplicative and `f(n) = Σ_{d | n} g(d)`, then `g` is also multiplicative. Möbius inversion preserves multiplicativity.

#### Patterns map

| Problem | Apply |
|---|---|
| "Count coprime pairs" | `Σ μ(d) ⌊n/d⌋²` |
| "Sum of GCDs over pairs" | Möbius + Euler |
| "Number of squarefree integers ≤ N" | `Σ_{d=1..√N} μ(d) · ⌊N/d²⌋` |
| "Count divisors of every number ≤ N" | Sieve-style accumulation |
| Compute `φ(n)` from prime factorization | Direct or via Möbius identity |
| GCD-restricted sums | Möbius reduction to standard sums |
| Inclusion-exclusion over divisibility | Replace ad-hoc with Möbius — uniform notation |

#### Squarefree-integer count

**# integers `1 ≤ k ≤ N` that are squarefree** = `Σ_{d=1..√N} μ(d) · ⌊N / d²⌋`.

```python
def squarefree_count(N, mu):
    s = 0; d = 1
    while d * d <= N:
        s += mu[d] * (N // (d * d)); d += 1
    return s
```

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting `μ(1) = 1` | Foundation for inversion identity |
| Treating `μ(n)` as `±1` always | It's 0 whenever any prime appears with exponent ≥ 2 |
| Using Möbius without divisor structure | Inversion only works with divisor sums |
| Skipping the multiplicative-function check | Inversion preserves multiplicativity, but `f` must come from a divisor sum |
| Off-by-one in `⌊n/d⌋` ranges | Use `n // d` in Python (integer division) |
| Computing μ with naive factorization for large N | Use linear sieve in O(N) |

#### Complexity

| Op | Cost |
|---|---|
| Build μ via linear sieve | O(N) |
| Apply Möbius inversion (one query) | O(σ(n)) where σ(n) = # divisors |
| Count coprime pairs ≤ n | O(n) |
| Squarefree count | O(√N) |
| Sum of GCDs ≤ n | O(n) with prep |

**Rule of thumb:** **Möbius is the inclusion-exclusion calculator for divisibility**. Use it when the answer is "how many things are coprime to / NOT divisible by …". The two cheat-sheet identities are **`Σ_{d|n} μ(d) = [n=1]`** and **inversion**. With μ precomputed, almost every "GCD-over-pairs" or "squarefree" problem becomes a single sum.
