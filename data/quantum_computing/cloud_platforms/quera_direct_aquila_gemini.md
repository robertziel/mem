### QuEra Direct — Aquila (Analog) & Gemini (Gate-Model)

**What it is:**
QuEra's neutral-atom platform, organized as two complementary device families:
- **Aquila** — a **256-site analog Rydberg** processor (rubidium atoms in an optical tweezer array), programmed by specifying a **time-dependent Hamiltonian** rather than a gate sequence.
- **Gemini** — a **gate-model** neutral-atom processor; programmed with discrete gates like a standard QPU.

Aquila is reachable through AWS Braket (as an Analog Hamiltonian Simulation device) and through QuEra's direct route; the SDK in both cases is **Bloqade** (or the Braket AHS IR). Gemini sits on QuEra's direct stack with gate-model tooling.

**Access model:**
| Layer | Aquila (analog) | Gemini (gate-model) |
|---|---|---|
| Paradigm | Analog Hamiltonian Simulation (AHS) | Discrete gates |
| Primary SDK | Bloqade (Python / Julia) | Gate-model SDK (circuit-style) |
| Cloud routes | Braket (AHS) + QuEra direct | QuEra direct |
| IR | Hamiltonian program (drive, detuning, register) | Gate circuit |

**Aquila — what "analog" means in practice:**
You specify three things: the **register** (2D positions of atoms in µm, subject to a minimum spacing), the **Rabi frequency Ω(t)**, and the **detuning Δ(t)**. The device evolves the many-body Rydberg Hamiltonian `H = Σ Ω/2 (|g⟩⟨r| + h.c.) - Σ Δ n_r + Σ V_{ij} n_i n_j` for the duration you specify, then measures atom states. There are no gates; the "program" is the waveform.

| Knob | Role |
|---|---|
| Register | Atom positions — encodes the problem graph (MIS, optimization) via blockade |
| Ω(t) | Drive strength as a piecewise-linear waveform |
| Δ(t) | Detuning waveform — adiabatic sweep or protocol-specific shape |
| `t_final` | Total evolution time (µs scale) |
| Shots | Samples drawn from measurement at `t_final` |

**Connecting (Bloqade — analog, direct):**
```python
from bloqade.analog.atom_arrangement import Square

program = (
    Square(4, lattice_spacing=6.1)                       # 4x4 register
    .rydberg.rabi.amplitude.uniform
        .piecewise_linear(durations=[0.1, 3.8, 0.1], values=[0, 15, 15, 0])
    .detuning.uniform
        .piecewise_linear(durations=[0.1, 3.8, 0.1], values=[-10, -10, 10, 10])
)

# Classical simulation first
sim_result = program.bloqade.python().run(shots=100).report()
print(sim_result.counts())

# QuEra cloud (Aquila) — credentialed route
# hw_result = program.quera.aquila().run_async(shots=100)
```

**Connecting (Braket AHS route to Aquila):**
```python
from braket.aws import AwsDevice
from braket.ahs import AnalogHamiltonianSimulation

aquila = AwsDevice("arn:aws:braket:us-east-1::device/qpu/quera/Aquila")
ahs_program: AnalogHamiltonianSimulation = ...           # built from register + waveforms
task = aquila.run(ahs_program, shots=100)
counts = task.result().get_counts()
```

**When to reach for which paradigm:**
| Problem shape | Paradigm | Device |
|---|---|---|
| Max Independent Set, QUBO via blockade encoding | Analog | Aquila |
| Quench dynamics, many-body physics | Analog | Aquila |
| Variational algorithms with Pauli observables | Gate | Gemini (or other gate-model QPUs) |
| Textbook circuits (Grover, QFT) | Gate | Gemini |

**Pitfalls:**
- Placing atoms below the **minimum lattice spacing** — the device enforces it; submissions fail schema validation.
- Writing a detuning waveform that violates **max slew rate** or amplitude — Bloqade catches most, but raw AHS IR won't.
- Mapping an AHS problem to Aquila's register without accounting for the **Rydberg blockade radius** — the encoded constraint graph must match atom geometry.
- Assuming Bloqade's Python simulator scales — it's exact at small `N`; switch to approximate backends or hardware beyond ~25 atoms.
- Confusing Gemini programs (gates) with Aquila programs (Hamiltonian) — the SDKs and IRs are different.

**Rule of thumb:** For graph-structured optimization and many-body physics, encode the problem in Aquila's register geometry and waveforms through Bloqade; reach for Gemini or another gate-model QPU only when your algorithm is natively gate-based.
