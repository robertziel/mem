### Primes (Sieve of Eratosthenes, linear sieve, factorization, smallest prime factor, Miller-Rabin)

**When:** "list all primes ≤ N", "factorize many numbers ≤ N", "is this big number prime", "Euler's totient", "count divisors". Sieve is O(n log log n) — fast enough for N up to ~10⁷.

**Schema:**

| Tool | What it gives | Cost |
|---|---|---|
| Sieve of Eratosthenes | `is_prime[i]` for `i ≤ N` | O(N log log N) time, O(N) space |
| Linear sieve | Same + smallest prime factor table | **O(N)** time |
| SPF table | Factorize any `i ≤ N` in O(log i) | After O(N) prep |
| Trial division | Primality of small `n` | O(√n) |
| Miller-Rabin | Probabilistic / deterministic primality of huge `n` | O(k log³ n); deterministic for 64-bit with fixed witnesses |
| Pollard's rho | Factor large composites | Expected O(n^{1/4}) per factor |

#### Sieve of Eratosthenes

```python
def sieve(N):
    is_prime = [True] * (N + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(N ** 0.5) + 1):
        if is_prime[i]:
            for j in range(i * i, N + 1, i):    # start from i² (smaller multiples already done)
                is_prime[j] = False
    return [i for i, p in enumerate(is_prime) if p]
```

**Key optimization:** start the inner loop at `i²` — all smaller multiples of `i` are already marked by smaller primes.

#### Linear sieve (each number visited once — O(N) total)

```python
def linear_sieve(N):
    spf = [0] * (N + 1)                          # smallest prime factor
    primes = []
    for i in range(2, N + 1):
        if spf[i] == 0:
            spf[i] = i; primes.append(i)
        for p in primes:
            if p > spf[i] or i * p > N: break
            spf[i * p] = p
    return primes, spf
```

#### Factorize using SPF (O(log n) per query after sieve)

```python
def factorize(n, spf):
    factors = {}
    while n > 1:
        p = spf[n]
        factors[p] = factors.get(p, 0) + 1
        n //= p
    return factors
```

#### Trial division (single number)

```python
def is_prime_trial(n):
    if n < 2: return False
    if n < 4: return True
    if n % 2 == 0 or n % 3 == 0: return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0: return False
        i += 6                                   # check 6k±1
    return True
```

```python
def factorize_trial(n):
    factors = {}
    for p in [2, 3, 5]:
        while n % p == 0: factors[p] = factors.get(p, 0) + 1; n //= p
    i = 7
    while i * i <= n:
        for j in [0, 4, 6, 10, 12, 16, 22, 24]:  # 30k + {7,11,13,17,19,23,29,31}
            d = i + j
            while n % d == 0: factors[d] = factors.get(d, 0) + 1; n //= d
        i += 30
    if n > 1: factors[n] = factors.get(n, 0) + 1
    return factors
```

#### Miller-Rabin (deterministic for 64-bit ints with these witnesses)

```python
def miller_rabin(n):
    if n < 2: return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0: return n == p
    d, r = n - 1, 0
    while d % 2 == 0: d //= 2; r += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x == 1 or x == n - 1: continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1: break
        else:
            return False
    return True
```

> **These 12 witnesses are enough to deterministically test any `n < 2⁶⁴`.** For larger `n`, Miller-Rabin remains probabilistic.

#### Euler's totient `φ(n)` — count of integers in `[1, n]` coprime to `n`

```python
def phi(n):
    res = n
    p = 2
    while p * p <= n:
        if n % p == 0:
            while n % p == 0: n //= p
            res -= res // p
        p += 1
    if n > 1: res -= res // n
    return res
```

**Properties:**

| Identity | Detail |
|---|---|
| `φ(p) = p - 1` | For prime `p` |
| `φ(p^k) = p^k - p^(k-1)` | Prime power |
| `φ(m·n) = φ(m)·φ(n)` | When `gcd(m, n) = 1` (multiplicative) |
| `Σ_{d \| n} φ(d) = n` | Sum over divisors |

**Sieve of φ in O(N log log N):**

```python
def phi_sieve(N):
    phi = list(range(N + 1))
    for p in range(2, N + 1):
        if phi[p] == p:                          # p is prime
            for j in range(p, N + 1, p):
                phi[j] -= phi[j] // p
    return phi
```

#### Patterns map

| Problem | Trick |
|---|---|
| Count primes ≤ N | Sieve, count `True` |
| Factorize many numbers | Linear sieve + SPF |
| Number of divisors of n | From factorization: `∏(eᵢ + 1)` |
| Sum of divisors of n | `∏ (p^(eᵢ+1) - 1) / (p - 1)` |
| Count coprime pairs | Inclusion-exclusion via Möbius / totient |
| RSA primality test | Miller-Rabin |
| Find largest prime factor | Trial division up to √n |
| Goldbach conjecture verification | Sieve + check pair |
| Twin primes | Sieve + scan |
| Perfect powers | Trial root + verify |
| Smallest divisor ≥ k | Sieve + sorted divisors |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Sieving above 10⁸ in pure Python | Use bytearray or numpy; consider linear sieve |
| Trial division up to `n` instead of √n | Half the cost: stop at √n |
| Forgetting "leftover" factor after trial loop | If `n > 1` after loop, `n` itself is prime — add to factors |
| Using Fermat primality test alone | Carmichael numbers fool Fermat — use Miller-Rabin |
| Re-factorizing same numbers in a loop | Precompute SPF once |
| Sieve for "is prime?" of one number | Trial division in O(√n) is faster than O(N) sieve |

#### Complexity summary

| Op | Cost |
|---|---|
| Sieve of Eratosthenes | O(N log log N) |
| Linear sieve | O(N) |
| Factorize via SPF | O(log n) per query (after O(N) prep) |
| Trial division (single) | O(√n) |
| Miller-Rabin (deterministic 64-bit) | O(log³ n) |
| Pollard's rho | Expected O(n^{1/4}) per factor |
| Euler's φ via factorization | O(√n) per query |

**Rule of thumb:** **sieve up to 10⁷ if you need many prime queries**, else trial division per number. **Linear sieve gives you SPF for free** — log-time factorization after that. For huge `n` (cryptographic), **Miller-Rabin with the 12-witness set is deterministic up to 2⁶⁴**. Number of divisors comes from prime factorization: `∏(eᵢ + 1)`.
