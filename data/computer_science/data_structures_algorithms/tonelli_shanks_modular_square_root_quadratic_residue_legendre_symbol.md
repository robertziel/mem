### Tonelli-Shanks (modular square root, quadratic residue, Legendre symbol)

**When:** find `x` such that `x² ≡ n (mod p)` for prime `p` — needed in cryptography (ECC point compression), discrete-log algorithms, RSA-related computations, competitive number-theory problems. Polynomial-time. The standard "modular square root" algorithm.

**Schema:**

| Concept | Detail |
|---|---|
| **Quadratic residue (QR)** | `n` is a QR mod `p` if `∃ x: x² ≡ n (mod p)`; non-residue (QNR) otherwise |
| **Legendre symbol** `(n / p)` | `+1` if QR; `−1` if QNR; `0` if `p | n` |
| **Euler's criterion** | `(n / p) ≡ n^((p−1)/2) (mod p)` |
| Tonelli-Shanks | Computes `x` when `n` is QR; otherwise return None |

#### Easy case: `p ≡ 3 (mod 4)`

```python
def sqrt_mod_p3mod4(n, p):
    if pow(n, (p - 1) // 2, p) != 1:
        return None                                  # not a QR
    return pow(n, (p + 1) // 4, p)
```

> Half of all primes have this form — when you can avoid Tonelli-Shanks, do.

#### Tonelli-Shanks (general prime `p > 2`)

```python
def tonelli_shanks(n, p):
    """Return x with x^2 ≡ n (mod p), or None if no root exists."""
    n %= p
    if n == 0: return 0
    if pow(n, (p - 1) // 2, p) != 1: return None     # not a QR

    # Easy cases
    if p % 4 == 3:
        return pow(n, (p + 1) // 4, p)

    # Factor p - 1 = q * 2^s with q odd
    q, s = p - 1, 0
    while q % 2 == 0: q //= 2; s += 1

    # Find a quadratic non-residue z
    z = 2
    while pow(z, (p - 1) // 2, p) != p - 1: z += 1

    m = s
    c = pow(z, q, p)
    t = pow(n, q, p)
    r = pow(n, (q + 1) // 2, p)

    while True:
        if t == 1: return r
        # find smallest i such that t^(2^i) ≡ 1
        i = 0; temp = t
        while temp != 1:
            temp = temp * temp % p; i += 1
        b = pow(c, 1 << (m - i - 1), p)
        m = i
        c = b * b % p
        t = t * c % p
        r = r * b % p
```

> Both roots are `±x mod p` (i.e., `x` and `p − x`).

#### Quadratic-residue check (Euler's criterion)

```python
def legendre_symbol(n, p):
    """Returns 1, -1, or 0 (mod p representation: 1, p-1, 0)."""
    return pow(n, (p - 1) // 2, p)

def is_quadratic_residue(n, p):
    return legendre_symbol(n, p) == 1
```

#### Variants by modulus

| Modulus | Algorithm |
|---|---|
| Prime `p`, `p ≡ 3 (mod 4)` | `n^((p+1)/4) mod p` (one line) |
| Prime `p`, general | **Tonelli-Shanks** |
| Prime power `p^k` | Hensel lifting from mod `p` |
| Composite `n = p · q` | Find roots mod each prime, combine via CRT (unless factoring `n` is hard — that's RSA-level hard) |
| `2^k` | Special case; up to 4 roots; explicit formulas |

#### Hensel lifting (extend mod `p` solution to mod `p^k`)

If `x²  ≡ n (mod p)`, then `x' = x + p · ((n − x²) / (2x · p))` mod `p²` solves `x'² ≡ n (mod p²)`. Iterate.

#### Use cases

| Application | Why |
|---|---|
| **Elliptic-curve cryptography** | Decompress a point: given `x`, find `y` with `y² = x³ + ax + b` |
| **Quadratic sieve** (factoring) | Find pairs `(x, y)` with `x² ≡ y² mod n` |
| **Index calculus** (discrete log) | Square-root subroutine |
| Competitive number theory | "Solve `x² ≡ k (mod p)`" |
| Cipolla's algorithm | Alternative when `p` is huge / `s` is large |
| Cubic / higher-power roots | Generalizations: cube roots mod `p` etc. |

#### Cipolla's algorithm — alternative

For each `n`, find `a` with `a² − n` a QNR; compute `(a + √(a² − n))^((p+1)/2)` in `F_p[√(a²−n)]`. Different complexity profile; usually similar speed.

#### Sum of two squares (related)

A prime `p` can be written as `p = a² + b²` iff `p ≡ 1 (mod 4)` (or `p = 2`). Algorithm: find Tonelli-Shanks `x = √(−1) mod p`, then run Euclidean-like reduction on `(p, x)`.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting QR check | Tonelli-Shanks loops forever on non-residues — verify `Legendre = 1` |
| Picking `z = 2` always | Works for most primes; if `2` is a QR (e.g., `p = 7`), advance |
| `p = 2` special case | Square root of `n mod 2` is just `n mod 2` |
| Composite modulus via Tonelli-Shanks | Doesn't apply directly — CRT first |
| Comparing root to `n` directly | Two roots `±x mod p`; both valid |
| Off-by-one on `(p + 1) / 4` | Use integer division in Python |

#### Complexity

| Op | Cost |
|---|---|
| Euler's criterion / Legendre | O(log p) modular exponentiation |
| Tonelli-Shanks | O(log² p) average; O(s · log p) worst, where `p − 1 = q · 2^s` |
| Hensel lifting | O(k · log p) for mod `p^k` |
| Easy case (p ≡ 3 mod 4) | O(log p) |

**Rule of thumb:** **Modular square root via Tonelli-Shanks** when prime modulus is general; one-line `n^((p+1)/4)` when `p ≡ 3 (mod 4)`. Always **verify QR via Euler's criterion** before running. Two roots: `±x mod p`. Standard application: **decompress an ECC point** by recovering `y` from `x` and the curve equation.
