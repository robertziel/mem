### Bit Manipulation (XOR, mask, Kernighan, subset enumeration, popcount)

**When:** "find the unique element", "count set bits", "iterate all subsets", "represent state compactly", or anything that exploits binary structure.

**Schema (the 8 core operators):**

| Op | Notation | Effect |
|---|---|---|
| AND | `a & b` | 1 only if both bits 1 |
| OR | `a \| b` | 1 if either bit 1 |
| XOR | `a ^ b` | 1 if bits differ (parity) |
| NOT | `~a` | Flip all bits |
| Left shift | `a << k` | Multiply by 2ᵏ |
| Right shift | `a >> k` | Divide by 2ᵏ (arithmetic for signed) |
| Set bit `i` | `a \| (1 << i)` | Force bit `i` to 1 |
| Clear bit `i` | `a & ~(1 << i)` | Force bit `i` to 0 |
| Toggle bit `i` | `a ^ (1 << i)` | Flip bit `i` |
| Test bit `i` | `(a >> i) & 1` or `a & (1 << i)` | Read bit `i` |

**XOR identities (the workhorse):**

| Identity | Use |
|---|---|
| `a ^ a == 0` | Cancellation |
| `a ^ 0 == a` | Identity |
| `a ^ b ^ a == b` | Order-independent cancellation |
| `(a ^ b) ^ b == a` | Reversibility |

**XOR pattern — single number (every other element appears twice):**

```python
def single_number(nums):
    res = 0
    for x in nums: res ^= x
    return res
```

**Brian Kernighan's trick — clear lowest set bit:**

```python
n &= n - 1                                      # drop lowest set bit
```

**Count set bits (population count):**

```python
def popcount(n):
    count = 0
    while n:
        n &= n - 1                              # clear lowest set bit
        count += 1
    return count

# Or in Python: bin(n).count('1')   or   n.bit_count()  (Python 3.10+)
```

**Isolate the lowest set bit:**

```python
lowest = n & (-n)                                # e.g., 12 (1100) → 4 (0100)
```

**Check if power of two:**

```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0
```

**Swap without temp:**

```python
a ^= b; b ^= a; a ^= b
```

**Subset enumeration (iterate all 2ⁿ subsets):**

```python
n = len(arr)
for mask in range(1 << n):
    subset = [arr[i] for i in range(n) if mask & (1 << i)]
```

**Iterate all submasks of a mask (efficient — O(3ⁿ) total over all masks):**

```python
sub = mask
while sub > 0:
    process(sub)
    sub = (sub - 1) & mask
process(0)                                       # 0 also counts
```

> Total work over all masks summed: `sum_k C(n, k) · 2ᵏ = 3ⁿ`.

**Bitmask DP skeleton (TSP, etc.):**

```python
INF = float('inf')
dp = [[INF] * n for _ in range(1 << n)]
dp[1][0] = 0                                     # start at 0
for mask in range(1 << n):
    for u in range(n):
        if dp[mask][u] == INF: continue
        for v in range(n):
            if mask & (1 << v): continue
            new_mask = mask | (1 << v)
            dp[new_mask][v] = min(dp[new_mask][v], dp[mask][u] + dist[u][v])
```

**Find missing number in [0, n] (XOR all):**

```python
def missing(nums):
    res = len(nums)
    for i, x in enumerate(nums): res ^= i ^ x
    return res
```

**Two single numbers (others appear twice):**

```python
def two_singles(nums):
    xor_all = 0
    for x in nums: xor_all ^= x
    diff = xor_all & (-xor_all)                  # any differing bit
    a = b = 0
    for x in nums:
        if x & diff: a ^= x
        else:        b ^= x
    return [a, b]
```

**Reverse bits (32-bit):**

```python
def reverse_bits(n):
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)
        n >>= 1
    return res
```

**Patterns map:**

| Problem | Bit trick |
|---|---|
| Single number (others twice) | XOR all |
| Single number (others thrice) | Bit count mod 3, per bit |
| Two single numbers (others twice) | XOR all → split by differing bit |
| Missing number | XOR all + indices |
| Power of 2 | `n & (n - 1) == 0` |
| Number of 1 bits | Kernighan's trick |
| Hamming distance | `popcount(a ^ b)` |
| Sum of two integers without `+` | XOR for sum, AND+shift for carry |
| Maximum XOR pair | Bit-trie, greedy from MSB |
| Subsets enumeration | `for mask in range(1 << n)` |
| TSP, assignment, set partition | Bitmask DP `dp[mask][last]` |
| State of N items (N ≤ 30) | Encode as integer mask |
| IP / netmask manipulation | Bitwise AND with subnet mask |
| Encode 26 letters | 32-bit mask, one bit per letter |

**Useful Python tricks:**

```python
n.bit_count()                  # popcount (Python 3.10+)
n.bit_length()                 # number of bits to represent n
bin(n)[2:]                     # binary string
int('1010', 2)                 # parse binary
hex(n), oct(n)                 # other bases
(1 << n) - 1                   # all 1s of length n
```

**Pitfalls:**

| Mistake | Fix |
|---|---|
| `~a` returns `-a-1` in Python (no fixed width) | Mask explicitly: `~a & 0xFFFFFFFF` |
| Operator precedence: `a & 1 == 0` | Parens: `(a & 1) == 0` |
| Right shift on negative | Python is arithmetic; mask to handle 32-bit |
| Forgetting Python ints are arbitrary precision | Mask when emulating fixed-width math |
| Using bit manipulation when a hash set is clearer | Don't optimize prematurely |

**Rule of thumb:** **XOR for "find the odd one out"** problems. **`n & (n-1)` clears the lowest set bit** — basis of popcount and power-of-2 check. **Bitmask DP** is the right hammer for "subset of N ≤ 20 items". For interview problems, the recurring tricks are **XOR cancellation**, **Kernighan**, and **subset enumeration**.
