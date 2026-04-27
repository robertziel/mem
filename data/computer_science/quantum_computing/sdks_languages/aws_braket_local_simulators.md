### AWS Braket LocalSimulator — braket_sv / braket_dm / braket_ahs

**What it is:**
A family of in-process simulators shipped as Python wheels (`amazon-braket-default-simulator`) that run entirely on the caller's machine — no AWS account, no network round-trip, no per-shot billing. Construct with `LocalSimulator(backend_name)`, submit the same `Circuit` (or `AnalogHamiltonianSimulation`) objects you would send to an `AwsDevice`. This is the *fast inner loop* of Braket development.

**API shape:**
```python
from braket.devices import LocalSimulator
sv  = LocalSimulator("braket_sv")    # default — statevector, noise-free
dm  = LocalSimulator("braket_dm")    # density matrix, supports noise ops
ahs = LocalSimulator("braket_ahs")   # analog Hamiltonian (Rydberg-style)
```
All three expose the same `.run(program, shots=N).result()` contract as `AwsDevice`, so swapping local → cloud is a one-line change.

**The three backends:**
| Backend | Representation | Qubit ceiling (laptop) | Supports noise? | Supports `AnalogHamiltonianSimulation`? |
|---|---|---|---|---|
| `braket_sv` | Statevector (2^n complex) | ~25 | No | No |
| `braket_dm` | Density matrix (4^n complex) | ~12 | Yes — `Kraus`, `BitFlip`, `Depolarizing`, etc. | No |
| `braket_ahs` | Schrödinger ODE on Rydberg atom arrays | ~11 atoms | Decoherence built-in | Yes (only one that does) |

Rule: pick the smallest representation that expresses your physics. Density-matrix simulation is *exponentially* more expensive per qubit than statevector — every added qubit doubles SV memory but quadruples DM memory.

**Example — CI-friendly Bell test on braket_sv:**
```python
from braket.circuits import Circuit
from braket.devices import LocalSimulator

bell = Circuit().h(0).cnot(0, 1)
sim = LocalSimulator("braket_sv")
result = sim.run(bell, shots=2000).result()

counts = result.measurement_counts
assert counts["00"] + counts["11"] > 1900   # > 95% aligned
```
Swap `"braket_sv"` for `"braket_dm"` and add `bell.depolarizing(target=0, probability=0.01)` to simulate a noisy channel in the same script.

**When to prefer each:**
- `braket_sv` — default. Ideal for algorithm development, CI tests, VQE/QAOA parameter sweeps up to ~24 qubits.
- `braket_dm` — only when noise matters: error-mitigation experiments, Kraus channels, measurement error models. Much slower; a 12-qubit DM sim uses similar memory to a 24-qubit SV sim.
- `braket_ahs` — required to simulate QuEra / Aquila analog programs locally. Gate-model circuits cannot target it.

**Comparison vs on-demand simulators (SV1, DM1, TN1):**
| Axis | Local | On-demand (e.g. SV1) |
|---|---|---|
| Billing | Free | Per-minute |
| Max qubits | laptop-bound | SV1 up to 34, DM1 up to 17, TN1 up to 50 (tensor-net) |
| Parallelism | 1 process | Managed, elastic |
| Network latency | ~0 | seconds |
| Reproducible in CI | Yes | Needs AWS creds |

**Noise ops on braket_dm:**
Unlike gate-only `braket_sv`, the density-matrix simulator accepts Kraus channels and named noise primitives mid-circuit:
```python
from braket.circuits import Circuit, Noise
c = Circuit().h(0).cnot(0, 1)
c.apply_gate_noise(Noise.Depolarizing(probability=0.01))
c.apply_readout_noise(Noise.BitFlip(probability=0.02))
LocalSimulator("braket_dm").run(c, shots=2000).result()
```
Use `apply_gate_noise` / `apply_readout_noise` to sweep noise models without rewriting the circuit.

**Pitfalls:**
- `braket_sv` with `shots=0` returns the exact amplitudes; on a QPU this errors. Guard your code paths.
- `braket_dm` is not a drop-in speedup — it's a capability upgrade. Do not default to it "because it's more accurate." It's just *differently* expensive.
- Local simulators do not enforce QPU connectivity or native gate sets. A circuit that runs on `braket_sv` may fail `AwsDevice` verification with `ValidationException`. Validate against a real device ARN before submission.
- `braket_ahs` ignores gate ops entirely — feeding it a `Circuit` instead of an `AnalogHamiltonianSimulation` raises.
- Multi-process parallelism (joblib, mp.Pool) around `LocalSimulator` works but each worker holds a full statevector — memory scales with worker count, not just qubit count.

**Rule of thumb:** Use `braket_sv` for CI and iteration; reach for `braket_dm` only when you're actually studying noise, and use `braket_ahs` only for Rydberg-array analog programs.
