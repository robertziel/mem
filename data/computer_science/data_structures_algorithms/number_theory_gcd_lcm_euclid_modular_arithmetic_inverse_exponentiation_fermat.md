### Number Theory (GCD, LCM, Euclid, modular arithmetic, inverse, exponentiation, Fermat)

**When:** GCD / LCM problems, "compute X mod p", modular inverse, "huge exponent mod prime", linear Diophantine equations, RSA-style cryptography.

**Schema:**

| Concept | Definition |
|---|---|
| `gcd(a, b)` | Largest integer dividing both `a` and `b` |
| `lcm(a, b)` | `a * b / gcd(a, b)` |
| Extended Euclid | Find `x, y` with `a·x + b·y = gcd(a, b)` |
| Modular inverse `a⁻¹ mod m` | `x` with `a·x ≡ 1 (mod m)`; exists iff `gcd(a, m) = 1` |
| Fermat's little theorem | If `p` prime and `gcd(a, p) = 1`: `a^(p-1) ≡ 1 (mod p)` |
| Euler's theorem | `a^φ(n) ≡ 1 (mod n)` when `gcd(a, n) = 1` |

#### Euclidean GCD (the workhorse)

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
```

```python
def lcm(a, b): return a // gcd(a, b) * b        # avoid overflow: divide first
```

> Python has it built-in: `math.gcd(a, b)` and `math.lcm(a, b)`.

**Identities:**

| Identity | Detail |
|---|---|
| `gcd(a, 0) = a` | Base case |
| `gcd(a, b) = gcd(b, a mod b)` | Recursive step |
| `gcd(a, b) = gcd(a - b, b)` for `a ≥ b` | Subtraction form (slower) |
| `gcd(ka, kb) = k · gcd(a, b)` | Multiplicative |
| `lcm(a, b) · gcd(a, b) = a · b` | Product identity |

**Complexity:** O(log min(a, b)) — Fibonacci numbers are the worst case.

#### Extended Euclidean

Solves `a·x + b·y = gcd(a, b)` and finds modular inverse.

```python
def ext_gcd(a, b):
    if b == 0: return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1            # x = y1, y = x1 - (a//b)*y1
```

#### Modular exponentiation

`a^b mod m` in O(log b) — every "compute X mod 10⁹+7" problem uses this.

```python
def mod_exp(a, b, m):
    res = 1; a %= m
    while b > 0:
        if b & 1: res = res * a % m
        a = a * a % m
        b >>= 1
    return res
```

> Python: just use `pow(a, b, m)`. It's fast and arbitrary-precision.

#### Modular inverse — two ways

**Via Fermat (only when `m` is prime):**

```python
def mod_inverse_fermat(a, p):
    return pow(a, p - 2, p)                     # a^(p-2) mod p
```

**Via extended Euclid (general — when `gcd(a, m) = 1`):**

```python
def mod_inverse(a, m):
    g, x, _ = ext_gcd(a, m)
    if g != 1: return None                       # no inverse
    return x % m
```

> Python 3.8+: `pow(a, -1, m)` returns `a⁻¹ mod m` directly.

#### Modular arithmetic — the rules

| Operation | Modular form |
|---|---|
| Add | `(a + b) % m` |
| Subtract | `(a - b + m) % m` (avoid negatives) |
| Multiply | `(a * b) % m` |
| Divide by `b` | `(a * mod_inverse(b, m)) % m` (when `gcd(b, m) = 1`) |
| Power | `pow(a, n, m)` |

**Common modulus:** `10⁹ + 7` (prime; chosen so values fit in 64-bit even after multiplication).

#### Diophantine equations — `a·x + b·y = c`

| Case | Solution |
|---|---|
| `c % gcd(a, b) ≠ 0` | **No integer solution** |
| Otherwise | Use extended Euclid; multiply by `c / gcd` |

```python
def linear_diophantine(a, b, c):
    g, x0, y0 = ext_gcd(a, b)
    if c % g != 0: return None
    k = c // g
    return x0 * k, y0 * k                       # one specific solution
# General: (x0*k + n*(b/g),  y0*k - n*(a/g)) for n ∈ ℤ
```

#### Chinese Remainder Theorem (CRT) — sketch

Solve `x ≡ a_i (mod m_i)` when `m_i` are pairwise coprime — unique solution mod `M = ∏ m_i`. Used in big-integer modular reconstruction and competitive programming.

```python
def crt(rems, mods):
    M = 1
    for m in mods: M *= m
    res = 0
    for a, m in zip(rems, mods):
        Mi = M // m
        res = (res + a * Mi * mod_inverse(Mi, m)) % M
    return res
```

#### Patterns map

| Problem | Trick |
|---|---|
| Count common factors | Reduce to gcd |
| Reduce fraction to lowest terms | Divide by gcd |
| Periodicity / cycle in modular sequence | gcd / lcm of periods |
| Compute `aᵇ mod p`, large `b` | Modular exponentiation |
| Compute `n! mod p` for large n | Precompute factorials with prefix products |
| Compute `nCk mod p` | Precompute factorials + inverse factorials |
| Solve `a·x ≡ 1 (mod m)` | Modular inverse |
| Solve `a·x + b·y = c` | Extended Euclid |
| Combine remainders | CRT |
| Decrypt RSA | Modular exponentiation with private key |
| Hashing with double mods (Rabin-Karp) | Two `pow(base, k, mod)` operations |
| Probability of coprimality | 6 / π² ≈ 0.6079 (Mertens) |

#### Useful Python features

```python
import math
math.gcd(a, b); math.lcm(a, b)               # built-in
pow(a, b, m)                                  # fast modular exponentiation
pow(a, -1, m)                                 # modular inverse (Python 3.8+)
math.factorial(n)
math.comb(n, k); math.perm(n, k)              # exact, big-int safe
```

#### Pitfalls

| Mistake | Fix |
|---|---|
| `(a - b) % m` when result negative (other languages) | `((a - b) % m + m) % m` |
| LCM overflow `a * b` first | Divide by gcd first: `a // gcd(a, b) * b` |
| Modular inverse with `gcd(a, m) ≠ 1` | Doesn't exist; check first |
| Fermat inverse on composite modulus | Wrong — only works if modulus is prime |
| Naive `pow(a, b)` then `% m` for huge b | Overflow; use modular exponentiation |
| Negative mod in extended Euclid | Add `m` if `x < 0` |

**Rule of thumb:** **`pow(a, b, m)` is the most-used number-theory primitive** — every "mod 10⁹+7" problem leans on it. Fermat for inverse when `m` is prime, extended Euclid otherwise. **GCD via Euclid is O(log min(a, b))** — never use repeated subtraction. For combinatorics mod `p`, **precompute `fact[i]` and `inv_fact[i]`** once and answer each `nCk` in O(1).
