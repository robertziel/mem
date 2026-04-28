### Lucas Theorem (binomial coefficient modulo prime, base-p digits, combinatorics)

**When:** compute `C(n, k) mod p` for **huge** `n, k` (10¹⁸+) with **small prime** `p`. Standard `n!`-precomputation breaks at that scale. Lucas reduces the problem to base-`p` digits — each fits in O(p) precomputation.

**Schema:**

> **Lucas's theorem.** For prime `p`, write `n` and `k` in base `p`:
> `n = nₘ · pᵐ + … + n₁ · p + n₀`, `k = kₘ · pᵐ + … + k₁ · p + k₀`.
> Then `C(n, k) ≡ Π_i C(n_i, k_i) (mod p)`.

| Component | Detail |
|---|---|
| `p` | Small prime (otherwise Lucas doesn't directly apply) |
| Base-`p` digits | Each `n_i, k_i ∈ [0, p − 1]` |
| Per-digit `C(n_i, k_i)` | Precomputed table size O(p × p) — or computed via `factorial[n_i] · inv_fact[k_i] · inv_fact[n_i − k_i] mod p` |
| Final answer | Product of digit-binomials mod `p`; if any digit's `k_i > n_i`, answer is 0 |

#### Implementation

```python
def lucas(n, k, p):
    """C(n, k) mod prime p, for huge n, k via Lucas's theorem."""
    # Precompute factorials and inverse factorials mod p
    fact = [1] * p
    for i in range(1, p): fact[i] = fact[i-1] * i % p
    inv_fact = [1] * p
    inv_fact[p-1] = pow(fact[p-1], p-2, p)
    for i in range(p-2, -1, -1):
        inv_fact[i] = inv_fact[i+1] * (i+1) % p

    def C_small(n, k):
        if k < 0 or k > n: return 0
        return fact[n] * inv_fact[k] % p * inv_fact[n-k] % p

    res = 1
    while n > 0 or k > 0:
        ni, ki = n % p, k % p
        if ki > ni: return 0
        res = res * C_small(ni, ki) % p
        n //= p; k //= p
    return res
```

> Number of digits = `log_p(n)`. For p = 10⁹+7, even n = 10¹⁸ has only 2 digits — extremely fast.

#### When Lucas applies vs doesn't

| Modulus | Use |
|---|---|
| **Prime** | Lucas directly |
| Prime **power** `p^k` | **Generalized Lucas (Granville-Andrew)**, harder |
| Composite, **squarefree** | CRT over prime factors, each via Lucas |
| Composite, **arbitrary** | CRT + generalized Lucas per prime power |
| Huge prime (`p > 10⁹`) | Lucas needs O(p) precompute — too big |

> For competitive: standard `MOD = 10⁹ + 7` is prime; if `n < 10⁷` precompute factorials; if `n ≥ 10⁹+7`, use Lucas.

#### Granville-Andrew (generalized Lucas) for prime powers

`C(n, k) mod p^q` requires tracking factorials with all factors of `p` removed, plus a count of `p`'s in `n!`. More involved; consult Andrew Granville's paper for the recurrence.

#### Patterns map

| Problem | Solution |
|---|---|
| `C(n, k) mod p`, n ≤ 10⁷, p prime | Precompute factorials |
| `C(n, k) mod p`, n huge, p prime small | **Lucas** |
| `C(n, k) mod m`, m squarefree composite | CRT over prime factors |
| `C(n, k) mod m`, m has prime powers | CRT + generalized Lucas |
| `Σ_k C(n, k) x^k mod p` | Lucas + base-p decomposition of x or use FFT |
| Pascal's triangle row mod p | Each entry via Lucas (avoids storing full row) |
| Catalan number mod p | `Catalan(n) = C(2n, n) / (n+1)`; combine Lucas + modular inverse |

#### Examples

**`C(10¹⁸, 5·10¹⁷) mod 7`:**

```
n = 10¹⁸ in base 7 ≈ 21 digits
k = 5·10¹⁷ in base 7
For each digit pair, compute C(n_i, k_i) mod 7 — each is from a 7×7 table.
Multiply modulo 7.
```

#### Special cases

| Case | Result |
|---|---|
| Some digit has `k_i > n_i` | `C(n, k) ≡ 0 (mod p)` |
| `k = 0` | All `k_i = 0`, all binomials = 1 → result = 1 |
| `k = n` | All `k_i = n_i`, all binomials = 1 → result = 1 |
| `n < k` | Result = 0 (return 0 in code) |

#### Lucas's theorem vs Kummer's theorem

| Theorem | Question |
|---|---|
| **Lucas** | What is `C(n, k) mod p`? |
| **Kummer** | What is the **largest power of `p`** dividing `C(n, k)`? It's the **number of carries** when adding `k + (n − k)` in base `p`. |

> Kummer is useful for "is `C(n, k)` divisible by `p^q`?" — count carries.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using Lucas on composite modulus | Doesn't apply directly — CRT first |
| Using Lucas with `p > 10⁷` | O(p) precompute is too big — there's no good Lucas variant for huge primes |
| Forgetting "`k_i > n_i` → 0" check | Easy off-by-one |
| Using `pow(fact, p-2, p)` for huge `p` (slow) | OK for `p` up to ~10⁹+7; just slow per call → precompute inv_fact |
| Confusing factorial Lucas with binomial Lucas | The theorem is about binomials specifically |

#### Complexity

| Op | Cost |
|---|---|
| Precompute factorials mod p | O(p) |
| Single `C(n, k) mod p` query | O(log_p n) |
| Memory | O(p) |

**Rule of thumb:** Lucas's theorem = **`C(n, k) mod p` via base-p digit-wise binomials**. The trick: **decompose `n` and `k` in base `p`**, look up `C(n_i, k_i)` from a small precomputed table, multiply them. Works only for **prime modulus**. For composite, use **CRT + generalized Lucas**. Most-asked use case: `C(n, k) mod 10⁹+7` for `n` up to 10¹⁸.
