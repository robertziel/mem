### Shot Noise and Sampling Expectation Values

**What it is:**
Quantum measurements are probabilistic — each **shot** yields a single sample from the Born distribution. Estimating probabilities, expectation values, or gradients requires many shots; the statistical error decreases as 1/√N, setting a hard lower bound on circuit runtime for NISQ algorithms.

**Sampling a probability:**
Run N shots, count nₖ = times outcome k is observed. Then p̂ₖ = nₖ/N. By CLT:
```
E[p̂ₖ] = pₖ
Var[p̂ₖ] = pₖ(1 − pₖ) / N  ≤  1/(4N)
σ(p̂ₖ) ≤ 1/(2√N)
```
Relative error for a small pₖ: σ/pₖ ≈ 1/√(N pₖ), so rare outcomes need many more shots.

**Expectation value of Pauli string P (eigenvalues ±1):**
Each shot returns +1 or −1. With N shots:
```
⟨P⟩̂ = (1/N) Σⱼ sⱼ,    sⱼ ∈ {+1, −1}
Var(⟨P⟩̂) = (1 − ⟨P⟩²) / N   ≤  1/N
σ(⟨P⟩̂) ≤ 1/√N
```
To estimate ⟨P⟩ to precision ε need **N ≳ 1/ε²** shots (e.g., ε=0.01 → 10⁴ shots per term).

**Sum of Hamiltonian terms:**
```
H = Σⱼ cⱼ Pⱼ,   ⟨H⟩ = Σⱼ cⱼ ⟨Pⱼ⟩
Var(⟨H⟩̂) ≈ (1/N_total) (Σⱼ |cⱼ|)² ÷ min-shot-fraction-per-term
```
Shot budget scales with Σⱼ|cⱼ|² (optimal allocation). For a molecular electronic-structure Hamiltonian in chemistry, Σⱼ|cⱼ|² can be 10⁵–10⁷ Hartree² — VQE needs 10⁸–10¹⁰ shots to reach chemical accuracy (1 mHa).

**Shot-allocation strategies:**
- **Uniform**: equal shots per term — wasteful.
- **Weighted (Rao-Blackwell)**: shots ∝ |cⱼ| — minimizes total variance.
- **QWC / graph-coloring grouping**: measure multiple terms from one basis rotation to amortize shots.
- **Shadow tomography / classical shadows**: randomized measurement protocol, estimate many expectation values from O(log M / ε²) shots.

**Python example:**
```python
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit(1, 1)
qc.h(0)                    # |+⟩: ⟨Z⟩ = 0
qc.measure(0, 0)

sim = AerSimulator()
for N in [100, 1_000, 10_000, 100_000]:
    counts = sim.run(transpile(qc, sim), shots=N).result().get_counts()
    p0 = counts.get('0', 0) / N
    Z_hat = 2*p0 - 1
    sigma = np.sqrt((1 - Z_hat**2) / N)
    print(f"N={N:>7}  ⟨Z⟩≈{Z_hat:+.4f}  ±{sigma:.4f}  (1/√N={1/np.sqrt(N):.4f})")
```

**Standard-error scaling table:**
| N (shots) | σ on ⟨P⟩ (worst-case) |
|---|---|
| 10² | 0.1 |
| 10⁴ | 0.01 |
| 10⁶ | 0.001 |
| 10⁸ | 10⁻⁴ |

**Heisenberg-limited alternatives:**
Amplitude estimation (Grover-like phase estimation) can achieve σ ∼ 1/N (rather than 1/√N), a quadratic improvement. Cost: deeper coherent circuits — not yet practical on noisy hardware but important in FTQC.

**Gotchas:**
- **Readout error**: bit-flips before counting introduce bias. Fix with readout-error mitigation (M3, matrix inversion).
- **Sampling bias** on simulators: ideal shot sampling is unbiased, but noise models and statevector-to-count conversions can introduce floating-point artifacts.
- **Gradients**: parameter-shift rule for a single parameter needs 2 expectation-value estimates; total cost for VQE with P parameters is ~2P × per-term shots.

**Rule of thumb:** To get ε-precision on an expectation value you need N ~ 1/ε² shots; halving ε quadruples runtime, which is often the dominant cost of variational quantum algorithms on real hardware.
