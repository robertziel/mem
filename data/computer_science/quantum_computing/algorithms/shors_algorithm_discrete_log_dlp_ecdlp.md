### Shor's Algorithm for Discrete Logarithms — DLP and ECDLP

**Problem:**
- **DLP (multiplicative group `Z_p^*`):** given prime `p`, generator `g`, and `h = g^x mod p`, recover `x`.
- **ECDLP:** on an elliptic curve `E/F_q` with base point `P` of order `r` and target `Q = xP`, recover `x`.

Both underpin Diffie–Hellman, DSA/ECDSA, ECDH, and the security of Bitcoin/Ethereum key pairs.

**Complexity:**
| Problem | Best classical | Shor quantum |
|---|---|---|
| DLP mod prime `p` | `exp(Õ((log p)^{1/3}))` (Index Calculus / NFS) | **`Õ((log p)^2)`** |
| ECDLP order `n` | `Θ(√n)` (Pollard rho) — fully exponential in `log n` | **`Õ((log n)^2)`** (Proos–Zalka) |

ECDLP is *more* vulnerable in relative terms: no subexponential classical attack is known, so quantum gives a full exponential speedup, not just polynomial over subexponential.

**Quantum approach (two-register QPE):**
Shor's DLP algorithm uses a **two-dimensional period finding**: define `f(a, b) = g^a · h^{−b} mod p`. This has the period lattice `{(a, b) : a ≡ b·x mod r}` where `r` is the order of `g`. Run QFT-based period finding on two registers simultaneously to extract the shift `x`.

1. Three registers: two counting registers of size `≈ 2⌈log₂ r⌉` each (for `a` and `b`), one work register.
2. Hadamard both counting registers.
3. Compute `|a⟩|b⟩|0⟩ → |a⟩|b⟩|g^a · h^{−b} mod p⟩` via modular exponentiation / multiplication.
4. Inverse QFT on each counting register.
5. Measure → samples `(α, β)` satisfying `α + β·x ≡ 0 mod r`. Two independent samples let you solve for `x`.

**ECDLP variant:** Replace modular exponentiation with controlled *point addition* on the elliptic curve; everything else is structurally identical. The quantum circuit cost is dominated by reversible elliptic-curve arithmetic.

**Qiskit sketch (DLP in a small group):**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT

def dlp_shor(p: int, g: int, h: int, r: int) -> QuantumCircuit:
    t = 2 * r.bit_length()
    n = p.bit_length()
    qc = QuantumCircuit(2 * t + n, 2 * t)

    qc.h(range(2 * t))
    # Controlled modular arithmetic: |a⟩|b⟩|1⟩ → |a⟩|b⟩|g^a h^{-b} mod p⟩
    # (Implemented with repeated-squaring controlled multipliers — omitted.)
    # ... controlled_mod_exp(g, a-register) ...
    # ... controlled_mod_exp(pow(h, -1, p), b-register) ...

    qc.compose(QFT(t, inverse=True, do_swaps=True), qubits=range(t), inplace=True)
    qc.compose(QFT(t, inverse=True, do_swaps=True), qubits=range(t, 2 * t), inplace=True)
    qc.measure(range(2 * t), range(2 * t))
    return qc
```
(Full DLP / ECDLP circuits in Qiskit require custom reversible-arithmetic gates; libraries like `qiskit-algorithms` or `pennylane` provide reference implementations.)

**Key insight:** DLP is a *hidden shift* problem on an abelian group, which QFT solves optimally. The 2D period finding extracts the shift `x` from the lattice of periods in one shot (up to a small number of samples for linear algebra).

**Resource estimates (Häner–Jaques–Roetteler 2020, Gidney 2021):**
- 256-bit ECDLP (secp256k1, Bitcoin) requires `≈ 2,300` logical qubits and `≈ 10^{11}` Toffoli gates.
- 2048-bit RSA (factoring) needs more qubits but comparable T-gate count.
- ECDLP is actually *cheaper* in qubits than RSA — ECC is the first crypto to fall as fault-tolerant quantum computers scale.

**Caveats:**
- Requires a *coherent* implementation of modular multiplication / point addition; for ECDLP this is the hardest engineering step.
- Classical pre/post processing (continued fractions, linear system over `Z_r`) is cheap.
- A "cryptographically relevant quantum computer" (CRQC) is the standard term for one capable of these circuits — current NISQ devices are many orders of magnitude short.

**Rule of thumb:** If RSA falls, so do DH and ECC — all from the same Shor-style period/shift-finding framework. NIST PQC standards (Kyber, Dilithium, etc.) exist precisely to replace them.
