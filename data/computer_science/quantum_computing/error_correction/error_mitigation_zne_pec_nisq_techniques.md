### Error Mitigation (ZNE, PEC, Readout, DD, CDR) — NISQ Techniques

**What it is:** A suite of classical post-processing and hardware-level tricks that **reduce bias in expectation values** on noisy near-term quantum computers **without encoding a logical qubit**. Crucially distinct from QEC: mitigation increases the **variance** (more shots needed) but shrinks bias; QEC asymptotically suppresses both but needs a logical-qubit encoding, more physical qubits, and fault-tolerant gates. Mitigation is for NISQ; QEC is for FTQC.

**Key difference — in one line:**

- **Error mitigation**: no encoding, exponential-in-circuit-depth sampling cost, only bias correction. Useful today.
- **Error correction**: encoded logical qubit, polynomial overhead, suppresses all errors. Required for scalable FTQC.

**1. Zero-Noise Extrapolation (ZNE):**

Run the circuit at noise levels λ = 1, 1.5, 2, 3 (scaling up the noise) and fit ⟨O(λ)⟩ vs λ, extrapolate to λ = 0.

Noise scaling methods:
- **Identity folding** / **unitary folding**: G → G · G† · G replaces each gate with three gates (folds noise by ×3 under stochastic assumption).
- **Pulse stretching**: lengthen each pulse, increasing decoherence.
- **Global folding**: C → C · C† · C on the entire circuit.

Extrapolation models:
- Linear: ⟨O⟩(λ) = a + bλ.
- Exponential: ⟨O⟩(λ) = A · exp(−bλ) + c.
- Richardson.

Cost: ~K × base circuit runs for K noise levels. Bias reduced to O(p^{K+1}) at cost of variance blowup ~exp(γ·depth).

**Mitiq (Unitary Fund library):**
```python
from mitiq import zne
def executor(circuit):
    return backend.run(circuit).result().expectation_value(obs)
mitigated = zne.execute_with_zne(circuit, executor, scale_factors=[1.0, 2.0, 3.0])
```

**2. Probabilistic Error Cancellation (PEC):**

Decompose the ideal gate as a quasi-probability combination of noisy operations:

G_ideal = Σ_k q_k · N_k, Σ|q_k| = γ ≥ 1

Sample from |q_k|/γ, multiply outcome by sign(q_k)·γ. Unbiased estimator.

Cost: variance scales as γ^(2·depth). For depth-D circuit with per-gate γ = 1 + 2p, variance factor ≈ exp(4p·D). Exponential slowdown in depth.

Requires noise characterization (GST or sparse Pauli-Lindblad model, IBM 2023).

**3. Readout error mitigation:**

Invert the readout confusion matrix A.

- **Complete inverse:** O(2^n) — only small n.
- **Tensored product:** assume independent per-qubit error; O(n).
- **M3 / IBM mthree:** restrict to observed bitstrings, O(sparse).
- **Iterative Bayesian unfolding:** handles negative counts gracefully.

**4. Dynamical Decoupling (DD):**

Insert pulses on idle qubits to refocus low-frequency noise.

| Sequence | Pattern | Suppresses |
|---|---|---|
| Hahn echo | X | slow dephasing |
| CPMG | τ/2 − X − τ − X − τ/2 | + higher-order |
| XY4 | X − Y − X − Y | general single-qubit noise |
| CPMG-N (Uhrig) | optimized spacings | faster decay |

Improves effective T2 by 2–10× in transmons. Qiskit `PadDynamicalDecoupling` transpiler pass applies DD automatically.

**5. Clifford Data Regression (CDR):**

Train a regression ⟨O⟩_noisy → ⟨O⟩_ideal on Clifford circuits (classically simulable). Apply learned correction to near-Clifford target circuit. Variance-frugal compared to ZNE.

**6. Virtual Distillation / Purification:**

Run M copies of |ψ⟩, compute Tr(ρ^M) / Tr(ρ^M) for observable — suppresses non-dominant eigenvalues of ρ (errors). M=2 gives quadratic suppression. Huggins et al. 2021.

**7. Symmetry verification:**

If the ideal state has a symmetry S|ψ⟩ = |ψ⟩ (e.g., parity, particle number), measure S and post-select on +1. Common in VQE for chemistry.

**Comparison table:**

| Technique | Overhead | Assumption | Biggest wins |
|---|---|---|---|
| ZNE | K× shots | Taylor-expandable noise | shallow circuits |
| PEC | γ^(2D) variance | full Pauli noise model | medium depth |
| Readout (M3) | negligible | independent qubits | always apply |
| DD | none (in-line pulses) | Markovian dephasing | idle-heavy circuits |
| CDR | training cost | near-Clifford structure | VQE, QAOA |
| Virtual distillation | M copies | coherent errors dominate | state preparation |

**Experimental evidence:**

- IBM 2023 (Kim et al., *Nature*): ZNE + sparse Pauli-Lindblad PEC on 127-qubit Eagle reproduces classically-hard Ising dynamics — controversial but widely replicated.
- Google 2024: ZNE + DD on Sycamore for chemistry benchmarks.
- Rigetti 2024: symmetry verification in QAOA improves approximation ratio by ~15%.

**Fundamental limit — the sampling wall:**

Any unbiased mitigation of worst-case Pauli noise has sampling cost ≥ exp(Θ(p·D·n)). For p=10^-3, n·D = 10⁶, cost ≈ e^1000 — impossible. Mitigation therefore fundamentally scales only to medium-depth circuits (~1000 two-qubit gates on ~100 qubits) before QEC becomes unavoidable.

**Qiskit Runtime Estimator with mitigation:**
```python
from qiskit_ibm_runtime import EstimatorV2
est = EstimatorV2(backend=backend, options={
    "resilience_level": 2,   # 0=none, 1=readout, 2=ZNE, 3=PEC
    "resilience": {"zne_mitigation": True, "zne_extrapolator": "exponential"}
})
```

**Rule of thumb:** Mitigation is the right tool when your circuit is medium-depth and you need answers today on ~100-qubit hardware; QEC is the right tool when you need worst-case guarantees at large scale — mitigation's sampling overhead grows exponentially with noise-circuit volume, so plan the crossover into encoded logical qubits early.
