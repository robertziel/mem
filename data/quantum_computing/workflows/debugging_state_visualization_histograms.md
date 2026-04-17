### Debugging Circuits — State Visualization and Histograms

**What it is:** The Qiskit `qiskit.visualization` toolbox plus `partial_trace` for peeking inside circuits below ~6 qubits. When a circuit misbehaves, a picture of the state after each block usually exposes the bug in seconds — a qubit pointing the wrong way on the Bloch sphere, a mixedness where purity was expected, off-diagonal phases that shouldn't be there.

**When to use:**
- After stage-1 statevector testing fails and you want to *see* where the state went wrong.
- When comparing ideal vs noisy sim side-by-side (two histograms, same x-axis).
- When a subsystem is entangled with ancillas and you need its reduced density matrix.

**The four visual primitives:**

| Tool | Input | Shows | Qubit budget |
|---|---|---|---|
| `plot_bloch_multivector` | `Statevector` / `DensityMatrix` | One Bloch sphere per qubit (reduced) | ≤ 6 qubits readable |
| `plot_state_city` | `DensityMatrix` | 3D bars of real/imag ρ | ≤ 4 qubits |
| `plot_state_qsphere` | `Statevector` | Basis-state amplitudes & phases on a sphere | ≤ 5 qubits |
| `plot_histogram` | counts dict | Measurement outcome frequencies | any |

**Example — inspect a GHZ prep plus one noisy spot:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace
from qiskit.visualization import plot_bloch_multivector, plot_histogram, plot_state_city

qc = QuantumCircuit(3)
qc.h(0); qc.cx(0, 1); qc.cx(1, 2)           # ideal GHZ

sv = Statevector.from_instruction(qc)
plot_bloch_multivector(sv).savefig("ghz_bloch.png")        # all three qubits at origin (maximally mixed when traced out)
plot_state_city(DensityMatrix(sv)).savefig("ghz_city.png") # 4 corner peaks |000⟩⟨000|, |000⟩⟨111|, etc.

# Is qubit 2 entangled or separable? Trace out 0,1 and look at its reduced state.
rho_2 = partial_trace(sv, qargs=[0, 1])
plot_bloch_multivector(rho_2).savefig("ghz_q2.png")        # origin → maximally mixed → entangled

qc.measure_all()
counts = {"000": 512, "111": 488, "001": 12, "110": 12}    # pretend result
plot_histogram(counts).savefig("ghz_hist.png")
```

**Tip: for >3 qubits, plot reduced single-qubit states.** A 10-qubit `Statevector` has 1024 amplitudes — no visualisation is useful directly. Instead, loop over qubits, `partial_trace` out the rest, and plot one Bloch sphere per qubit. Mixedness (vector length < 1) tells you entanglement with the rest; off-axis direction tells you unintended rotation.

```python
for q in range(qc.num_qubits):
    rho_q = partial_trace(sv, qargs=[i for i in range(qc.num_qubits) if i != q])
    plot_bloch_multivector(rho_q).savefig(f"q{q}.png")
```

**Comparison histogram (ideal vs noisy) on one figure:**
```python
plot_histogram([ideal_counts, noisy_counts], legend=["ideal", "noisy"])
```

**Pitfalls:**
- **`plot_bloch_multivector` on pure states > 1 qubit.** It silently shows reduced states, so an entangled pair looks like two points at the origin (mixed) — it's *not* broken, that's what entanglement looks like.
- **`Statevector.draw("latex")` eats memory.** Fine for tutorial-scale circuits; times out at ~16 qubits.
- **Histograms hide phase.** Two circuits differing only in a Z gate give identical measurement histograms — use `plot_state_qsphere` or `state_city` when phase matters.
- **Jupyter vs headless.** Matplotlib returns `Figure`; in scripts, always `.savefig(...)` or set `matplotlib.use("Agg")` before import.

**Rule of thumb:** If a circuit silently produces the wrong state, step through it with `Statevector.from_instruction` after each block and visualise — the bug almost always shows up as a Bloch vector in the wrong octant before the histogram ever looks weird.
