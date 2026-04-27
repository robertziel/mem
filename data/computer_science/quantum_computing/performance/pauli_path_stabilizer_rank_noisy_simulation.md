### Pauli-Path Integrals and Stabilizer Rank — Classical Ceilings

**What it is:**
Two families of classical simulators defining hard upper bounds on when a quantum device's output is actually computable classically:
- **Pauli-path integrals (PPI):** expand the noisy channel in the Pauli basis; keep only paths whose total Pauli weight is bounded by a truncation `k`. Cost scales `poly(n) × (# gates)^k`. Effective whenever noise suppresses high-weight paths (always, on real hardware).
- **Stabilizer rank (SR):** write a state as a sum of `χ` stabilizer states; `T`-gates increase `χ` multiplicatively. Clifford circuits cost O(n²); near-Clifford circuits with `t` T-gates cost ~`2^(t/2)` up to constants.

Together they answer: "which claimed-hard quantum circuits are in fact classically cheap?"

**Pauli-path cost bound (Aharonov et al. / Gao et al.):**
For a depth-`D` circuit with two-qubit layer density `L` and Pauli noise rate `ε` per gate, the truncated PPI error is bounded by:
```
|⟨O⟩_true - ⟨O⟩_k| ≤ ||O||_∞ · Σ_{w > k} (1 − ε)^w ≈ exp(−ε · k)
Cost: O(n · (L · D)^k · poly)    for Pauli observables
```
Choose `k = O(log(1/δ) / ε)` → polynomial time for constant noise and target error `δ`.

**Stabilizer-rank decomposition:**
Any pure state with `t` non-Clifford (T-like) gates admits a stabilizer-rank bound:
```
|ψ⟩ = Σ_{i=1}^{χ} c_i |s_i⟩,         |s_i⟩ stabilizer states
χ ≤ 2^{α · t},    α ≈ 0.396 (Bravyi et al. 2019)
```
Sampling cost for the circuit output distribution is `O(χ² · poly(n))`. Practical simulators (Stim, Qiskit-Clifford) use this for error-correction decoders; SRe-based simulators for algorithms with modest `t`.

**Comparison of classical methods:**
| Method | Best regime | Cost | Killer workload |
|---|---|---|---|
| Full statevector | `n ≤ 30` | `O(2^n)` | Small exact sims |
| MPS / PEPS | Low entanglement, shallow | `O(poly · χ^O(1))` | 1D, area-law |
| **Pauli-path** | **Noisy, deep, any entanglement** | `O(n · (LD)^k)` | NISQ devices under realistic error |
| **Stabilizer rank** | Near-Clifford | `O(2^{α t})` | Clifford + few T |
| Neural / MPS-TDVP hybrids | 2D dynamics | Varies | Heisenberg dynamics |

**Example — Stim stabilizer simulation (near-Clifford):**
```python
import stim

n, depth, t_gates = 60, 20, 3
circ = stim.Circuit()
for _ in range(depth):
    for q in range(n):
        circ.append("H", [q])
    for q in range(0, n - 1, 2):
        circ.append("CX", [q, q + 1])
for q in range(t_gates):                # inject T gates — SR grows as 2^(α t)
    circ.append("S", [q])               # stand-in (Stim supports Clifford);
                                        # sparse simulators handle real T-gates
circ.append("M", range(n))
sampler = circ.compile_sampler()
samples = sampler.sample(shots=1024)
print(samples.shape, samples[0][:10])
```

**Why noise *helps* classical simulation:**
Each gate with error rate `ε` multiplies each Pauli-weight-`w` path by `(1 − ε)^w`. High-weight paths exponentially suppress → only low-weight paths survive → truncation at `k ~ log(1/ε)` is accurate. Paradoxically, the **noisier the device, the cheaper classical Pauli-path simulation**.

**Recent impact:**
- Several "quantum advantage" circuits (Google 2019 RC sampling, IBM 2023 127-qubit Trotter) have been approached or matched by PPI-family methods.
- Protocols that tolerate high per-gate noise are automatically within classical reach unless paths reorganize non-trivially.

**When to use:**
- **Verification:** compute `⟨O⟩` of a hardware run on your laptop for comparison.
- **Advantage claims:** convince yourself `k` truncation fails (high `t`, low noise, extended entanglement).
- **Benchmarking:** classical PPI gives an independent shot-level fidelity estimator when MPS fails.
- **Error-correction:** Stim for surface-code decoder sampling; SR methods for magic-state distillation studies.

**Pitfalls:**
- Truncation controls **expectation values**, not sampling — sampling the full distribution is harder; variants (Pauli-path sampling, Stochastic Pauli-path) trade rigor for speed.
- PPI accuracy depends sharply on correctly modeling the **actual noise channel** (Pauli-twirled ≠ physical).
- SR simulators assume *pure-state* near-Clifford; open-system SR is still active research.
- Coherent, non-Pauli noise can break PPI bounds — worth checking via twirled-then-compared runs.
- `t`-count inflation from compilation can push SR past feasibility without anyone noticing.

**Rule of thumb:** Before trusting a "quantum is faster" result, try both Pauli-path (up to `k = 5–8`) and stabilizer-rank (if `t-count ≤ 30`); if either reproduces the observable to your error bar on a laptop, quantum advantage has not been demonstrated.
