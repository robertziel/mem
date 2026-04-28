### FFT / NTT (Fast Fourier Transform, Number Theoretic Transform, polynomial multiplication, convolution, Cooley-Tukey)

**When:** multiply two polynomials / huge integers in O(n log n), compute convolutions, do signal processing, fast string matching with wildcards. The universal "n log n" trick for anything bilinear.

**Schema:**

| Concept | Detail |
|---|---|
| DFT | `A[k] = Σⱼ a[j] · ω^{jk}` where `ω = e^(−2πi/n)` is a primitive n-th root of unity |
| Inverse DFT | Same with `ω⁻¹`, divided by `n` |
| FFT | DFT computed in O(n log n) via divide-and-conquer (Cooley-Tukey) |
| NTT | FFT in `Z/p` using a primitive n-th root of unity mod a prime `p` (no floating point) |
| Convolution theorem | `conv(a, b) = IFFT( FFT(a) · FFT(b) )` (pointwise multiply in frequency domain) |

**Why FFT is fast:** the DFT matrix `(ω^{jk})` factors into log₂ n butterfly stages of O(n) work each.

#### Iterative FFT (Cooley-Tukey, in-place)

```python
import cmath

def fft(a, invert=False):
    n = len(a)
    # bit-reversal permutation
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit:
            j ^= bit; bit >>= 1
        j ^= bit
        if i < j: a[i], a[j] = a[j], a[i]
    # butterfly
    length = 2
    while length <= n:
        ang = (-2 if not invert else 2) * cmath.pi / length
        wlen = cmath.exp(1j * ang)
        for i in range(0, n, length):
            w = 1+0j
            for k in range(length // 2):
                u = a[i + k]; v = a[i + k + length//2] * w
                a[i + k] = u + v
                a[i + k + length//2] = u - v
                w *= wlen
        length <<= 1
    if invert:
        for i in range(n): a[i] /= n
```

#### Polynomial multiplication

```python
def multiply(a, b):
    result_len = len(a) + len(b) - 1
    n = 1
    while n < result_len: n <<= 1
    fa = list(a) + [0] * (n - len(a))
    fb = list(b) + [0] * (n - len(b))
    fft(fa); fft(fb)
    for i in range(n):
        fa[i] *= fb[i]
    fft(fa, invert=True)
    return [round(fa[i].real) for i in range(result_len)]
```

#### NTT (modular FFT — exact integer convolution)

Use a prime `p = c·2ᵏ + 1` with a primitive root `g`. Common: `p = 998244353 = 119·2²³ + 1`, `g = 3`.

```python
MOD = 998244353
ROOT = 3

def ntt(a, invert=False):
    n = len(a)
    # bit-reversal (same as FFT)
    j = 0
    for i in range(1, n):
        bit = n >> 1
        while j & bit: j ^= bit; bit >>= 1
        j ^= bit
        if i < j: a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        if invert:
            wlen = pow(ROOT, MOD - 1 - (MOD - 1) // length, MOD)
        else:
            wlen = pow(ROOT, (MOD - 1) // length, MOD)
        for i in range(0, n, length):
            w = 1
            for k in range(length // 2):
                u = a[i + k]
                v = a[i + k + length//2] * w % MOD
                a[i + k] = (u + v) % MOD
                a[i + k + length//2] = (u - v) % MOD
                w = w * wlen % MOD
        length <<= 1
    if invert:
        n_inv = pow(n, MOD - 2, MOD)
        for i in range(n): a[i] = a[i] * n_inv % MOD
```

#### Use cases

| Problem | Reduction to FFT |
|---|---|
| Multiply two polynomials | Direct FFT of coefficients |
| Multiply two big integers | Treat digits as polynomial coefficients; FFT, then carry |
| Convolution of two sequences | Direct FFT |
| Sum of pairs (`#pairs (i, j) with a[i] + b[j] = k`) | FFT of indicator polynomials |
| Subset sum count up to N | FFT of subset-indicator polynomials |
| String matching with wildcards | Encode as numeric convolution |
| Audio / image filtering | 1D / 2D convolution via FFT |
| Polynomial interpolation / evaluation | FFT-based evaluation at roots of unity |
| Cyclic convolution | FFT of cyclically-arranged input |
| Discrete cosine / sine transform (DCT / DST) | Variants of FFT |

#### FFT vs NTT — pick by need

| Concern | FFT | NTT |
|---|---|---|
| Domain | Complex numbers (doubles) | Integers mod prime |
| Precision | Floating-point round-off | **Exact** |
| Modular answers | Need rounding + modulus | Native |
| Size limit | 2 ⌈log₂(value²·n)⌉-bit precision | n must divide `p−1` |
| Speed | Slightly faster (smaller constants) | Slower per op |
| Use for | Audio, geometry, generic | Competitive: counting / modular |

#### Patterns map

| Problem signature | Approach |
|---|---|
| Multiply two polynomials of degree n | FFT |
| Big-int multiply > ~10⁴ digits | Karatsuba up to ~10⁵, FFT / NTT beyond |
| Count pairs / k-tuples summing to target | FFT on count polynomials |
| Number of partitions / restricted compositions | NTT on generating functions |
| Cyclic / circular pattern matching | FFT on circular shifts |
| Polynomial division, multiplication chains | Multipoint evaluation |
| FFT-based hashing collisions | Polynomial hash + FFT compare |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using FFT on sizes not power of 2 | Pad with zeros up to next power of 2 |
| Bit-reversal off-by-one | Verify on a tiny example (n=4) |
| Floating-point error on large coefficients | Use NTT or split coefficients (3-mod NTT for safety) |
| Forgetting to divide by `n` on inverse | Inverse FFT must scale by `1/n` |
| Choosing NTT prime where `n ∤ p−1` | Use `998244353` (supports n up to 2²³) |
| Pure-Python speed | Use NumPy `np.fft` or write in C++ for contests |

#### Complexity

| Op | Cost |
|---|---|
| FFT / inverse FFT | O(n log n) |
| Polynomial multiplication | O(n log n) |
| Big-int multiplication | O(n log n log log n) (Schönhage-Strassen) |
| 2D FFT | O(n² log n) |

**Rule of thumb:** **FFT** = "convert convolution into pointwise multiply via O(n log n) transform". Use for **polynomial / integer multiplication**, **convolutions**, and **counting problems** that reduce to convolution. **NTT** when you need exact modular arithmetic; **FFT** when floats are fine and you want simplicity. Always pad to a power of 2.
