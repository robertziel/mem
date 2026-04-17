### Sampler vs Estimator — Picking the Right Primitive

**Pattern:** Modern runtime stacks (IBM Qiskit Runtime, Braket primitives, PennyLane devices) expose two canonical execution primitives. **Sampler** returns raw measurement outcomes (bitstring counts / distributions); **Estimator** returns expectation values `⟨ψ|O|ψ⟩` for user-supplied observables, doing Pauli grouping and shot allocation *server-side*. Choosing the wrong primitive costs 3–10× more shots or forces you to re-implement batched observables by hand.

**When to use — Sampler:**
- You genuinely need a **distribution**: QAOA bitstring post-processing, graph-state verification, amplitude estimation, Grover output.
- Mid-circuit measurements and conditional feedforward (dynamic circuits).
- Quantum ML where the loss is a function of the distribution (e.g. Rényi entropies, cross-entropy benchmarking).
- You're computing non-Pauli observables (projectors on bitstrings).

**When to use — Estimator:**
- You want `⟨H⟩` for a local / sparse Hamiltonian — VQE, QAOA cost evaluation, Trotter energy estimation.
- Observable is (a sum of) Pauli strings and you can tolerate shot-noise-controlled precision.
- You want automatic **commuting-group measurement** (Qubit-wise commuting, Abelian grouping).
- You need `precision=` target error instead of manual shot accounting.

**Comparison:**
| Aspect | `SamplerV2` | `EstimatorV2` |
|---|---|---|
| Output | bitstring counts | expectation values `.evs` + `.stds` |
| Input (pub) | `(circuit, params?, shots?)` | `(circuit, observables, params?, precision?)` |
| Observables | not part of the pub | `ObservablesArray`, any shape |
| Pauli grouping | manual | automatic (server-side) |
| Shot allocation | fixed `shots=` | `precision=` or `shots=` |
| Post-processing | on client | on server |
| Best for | distributions, dynamic circuits | `⟨H⟩`, gradients, VQE/QAOA loops |

**Decision flow:**
```
Need a distribution / bitstrings?  ── yes ──▶ Sampler
                │no
                ▼
Observable is sum of Paulis?        ── yes ──▶ Estimator  (auto-grouping)
                │no
                ▼
Custom observable (projector, rank) ── yes ──▶ Sampler + client post-proc
```

**Qiskit example — both:**
```python
from qiskit_ibm_runtime import SamplerV2, EstimatorV2
from qiskit.quantum_info import SparsePauliOp

H = SparsePauliOp.from_list([("ZZI", 1.0), ("IXX", 0.5), ("YYI", 0.5)])

# Estimator: one call, auto-grouping → typically 2 groups, not 3 circuits
est = EstimatorV2(mode=backend)
ev  = est.run([(isa, H, theta)], precision=0.01).result()[0].data.evs

# Sampler: for QAOA bitstring cost
samp = SamplerV2(mode=backend)
counts = samp.run([(isa, theta)], shots=4096).result()[0].data.meas.get_counts()
cost   = sum(p * classical_cost(bs) for bs, p in counts.items())
```

**Trade-offs:**
- Hand-rolling `⟨H⟩` from Sampler counts wastes shots — a 10-term Hamiltonian that groups into 2 Abelian blocks costs 2 circuits via Estimator and 10 via naive Sampler.
- Estimator hides the shot distribution — if you need to audit per-group variance, call with `shots=` and query `.stds`.
- Sampler returns bitstrings already in *little-endian Qiskit order*; off-by-reverse bugs are common.

**Pitfalls:**
- Using Sampler + post-processing when Estimator would do — pay the extra shots for nothing.
- Using Estimator for a QAOA cost that is a non-Pauli classical objective — you'd have to pauli-decompose, usually cheaper to sample.
- Passing non-ISA circuits to either V2 primitive — hard error.
- Assuming Sampler default creg name; `measure_all()` creates `meas`, a named register creates `cr` (or whatever you set) — read `.data.<creg>`.

**Rule of thumb:** If you're computing `⟨H⟩`, default to Estimator — its server-side Abelian grouping is free and you cannot beat it with hand-rolled Sampler post-processing; reach for Sampler only when you truly need the distribution or mid-circuit-measurement raw output.
