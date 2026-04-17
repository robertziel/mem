### Google Quantum AI — Research-Access Platform

**What it is:**
Google's superconducting-qubit program (Sycamore and its successors) and the surrounding software stack (Cirq, qsim, OpenFermion, Stim for Clifford/stabilizer work). Unlike IBM/AWS/Azure, Google does **not** operate a self-serve commercial cloud for its hardware — QPU access is granted through research partnerships, the Quantum Computing Service (QCS) pilot, and published collaborations. Most external users interact with Google Quantum AI at the **simulator + SDK level**, not the device level.

**Access model:**
| Layer | Who gets it |
|---|---|
| Public SDKs (Cirq, qsim, Stim) | Anyone — Apache-2.0 on PyPI |
| Noise models + characterization data | Published with papers, replayable locally |
| QCS / hardware | Vetted research collaborators only |
| Indirect hardware access | Some Google devices surface via Azure Quantum or partner brokers at limited times |

**Software ecosystem (the part you can durably rely on):**
| Library | Scope |
|---|---|
| `cirq` | Circuit construction, simulation, `Engine` abstraction for remote devices |
| `cirq-google` | Google-specific device shapes, calibration APIs, Engine client |
| `qsim` / `qsimcirq` | High-performance statevector simulator (CPU/GPU); backs Cirq's `Simulator` |
| `OpenFermion` | Fermionic Hamiltonian mapping, chemistry workflows |
| `Stim` | Fast Clifford simulator + stabilizer code tooling (surface-code experiments) |
| `qualtran` | Resource estimation for fault-tolerant algorithms |

**Connecting (the path most users actually take — local simulation):**
```python
import cirq
import cirq_google as cg

# Build on a known Google device topology (pulled from cirq_google.Sycamore et al.)
q = cirq.GridQubit.rect(2, 2)
circuit = cirq.Circuit(
    cirq.H(q[0]),
    cirq.CNOT(q[0], q[1]),
    cirq.measure(*q, key="m"),
)

# Local simulation (qsim under the hood for large circuits)
result = cirq.Simulator().run(circuit, repetitions=1000)
print(result.histogram(key="m"))

# Remote hardware path — only works with QCS credentials (research access)
# engine = cg.Engine(project_id="your-gcp-project")
# job = engine.run(program=circuit, processor_ids=["rainbow"], repetitions=1000)
```

**Device topology you can target locally:**
| Topology | Where it lives |
|---|---|
| `cirq_google.Sycamore` | Historical 2D grid, published noise model |
| `cirq.GridQubit.rect(r, c)` | Generic 2D grid — useful stand-in |
| `cirq.LineQubit.range(n)` | 1D chain — useful for algorithm prototyping |

**Where Google's platform fits:**
| You want to... | Route |
|---|---|
| Learn gate-model QC on a clean API | Use Cirq locally with `cirq.Simulator()` |
| Simulate 30–40 qubits with noise | `qsimcirq` + GPU |
| Do surface-code / QEC research | Stim + `stimcirq` bridge |
| Estimate FTQC resource cost | Qualtran + cirq-ft |
| Run on actual Google hardware | Apply through Google Quantum AI (research program) |

**Pitfalls:**
- Treating `cirq_google.Sycamore` as a live device — it's a **shape**, used for transpilation and noise studies. Running on it means running a simulator.
- Confusing Google's open-source stack (broadly available) with Google's physical QPUs (not self-serve).
- Using `cirq.Simulator()` without swapping in `qsimcirq.QSimSimulator` for >25 qubits — the default pure-Python simulator crawls past that size.
- Assuming third-party "Google backend" brokers give the same device or calibration state Google's research team sees; at best you get a named snapshot.

**Rule of thumb:** Write against the Cirq/qsim/Stim stack as if it's the product — because for external users, it is; real Google QPU time is a research grant, not an API call, so design algorithms to be portable to IBM, AWS, or Azure devices when you need hardware.
