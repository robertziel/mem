### Shor's Algorithm — Integer Factoring via Period Finding

**Problem:** Given a composite `N` (e.g., `N = pq` with `p, q` prime), find a nontrivial factor.

**Complexity:**
| Algorithm | Runtime |
|---|---|
| Best known classical (General Number Field Sieve) | `exp(Õ((log N)^{1/3}))` (subexponential) |
| Shor (quantum) | **`Õ((log N)^2 · loglog N)` with `O(log N)` qubits** |

Shor runs in *polynomial* time in `log N` — this is the exponential speedup that breaks RSA, DH, and related classical cryptosystems.

**Reduction (classical):** Factoring reduces to order finding.
1. Pick random `a ∈ {2, ..., N-1}`. If `gcd(a, N) > 1`, done.
2. Find the *order* `r`: smallest positive integer with `a^r ≡ 1 (mod N)`.
3. If `r` is even and `a^{r/2} ≢ −1 (mod N)`, then `gcd(a^{r/2} ± 1, N)` is a nontrivial factor of `N` with probability ≥ 1/2.

Only step 2 is quantum; steps 1 and 3 are classical and cheap.

**Quantum subroutine — order finding via QPE:**
1. Register 1 (counting): `2n + 1` qubits where `n = ⌈log₂ N⌉`. Register 2 (work): `n` qubits in `|1⟩`.
2. Hadamard the counting register.
3. Apply controlled modular exponentiation: `|x⟩|1⟩ → |x⟩|a^x mod N⟩` using repeated-squaring circuits.
4. Inverse QFT on the counting register.
5. Measure → sample a value close to `k · 2^{2n}/r` for random `k`.
6. **Continued fractions** on the measurement recovers `r`.

Modular exponentiation is the dominant cost: `O(n^3)` gates with textbook Beauregard construction, or `Õ(n^2)` with modern optimizations.

**Qiskit code (toy: factor 15):**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit.primitives import StatevectorSampler
from fractions import Fraction
from math import gcd

N, a = 15, 7
n = N.bit_length()
count_q = 2 * n

def c_amod15(a: int, power: int) -> QuantumCircuit:
    """Controlled a^power mod 15 (hand-built for N=15; see Beauregard for general N)."""
    U = QuantumCircuit(4)
    for _ in range(power):
        if a == 7: U.swap(0, 1); U.swap(1, 2); U.swap(2, 3); [U.x(i) for i in range(4)]
        # ... other a values have their own patterns ...
    return U.to_gate().control(1)

qc = QuantumCircuit(count_q + n, count_q)
qc.h(range(count_q)); qc.x(count_q)                         # work register = |1⟩
for k in range(count_q):
    qc.append(c_amod15(a, 2 ** k), [k] + list(range(count_q, count_q + n)))
qc.compose(QFT(count_q, inverse=True, do_swaps=True), qubits=range(count_q), inplace=True)
qc.measure(range(count_q), range(count_q))

counts = StatevectorSampler().run([qc], shots=1024).result()[0].data.c.get_counts()
phase = int(max(counts, key=counts.get)[::-1], 2) / 2 ** count_q
r = Fraction(phase).limit_denominator(N).denominator                 # continued fractions
if r % 2 == 0 and pow(a, r // 2, N) != N - 1:
    print("factors:", gcd(pow(a, r // 2) - 1, N), gcd(pow(a, r // 2) + 1, N))
```

**Key insight:** QPE on the modular-multiplication unitary `M_a: |y⟩ → |a·y mod N⟩` extracts eigenphases of the form `k/r`. The QFT turns the periodic structure of `a^x mod N` into a sharp frequency peak — the exponential speedup comes from performing modular exponentiation *in superposition over all exponents* and letting interference isolate the period.

**Caveats / resource estimates:**
- RSA-2048 break requires ~`6.4k` logical qubits and `~10^9` T gates; with surface-code fault tolerance, ~`2 × 10^7` physical qubits (Gidney–Ekerå 2021).
- Approximate QFT (Coppersmith) is standard — full QFT's tiny phases are error-prone.
- Success is probabilistic; the continued-fractions step can fail and require retries.

**Rule of thumb:** Shor is the reason "post-quantum cryptography" exists. It doesn't threaten symmetric crypto (AES, hash functions) — for those, Grover gives only quadratic speedup, handled by doubling key size.
