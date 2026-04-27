### Pasqal Cloud — Neutral-Atom Platform & Pulser

**What it is:**
Pasqal's cloud for its **neutral-atom** QPUs (Fresnel-class and successors). Like QuEra, Pasqal uses rubidium atoms held in optical tweezers and driven through Rydberg states, but the platform is programmed through **Pulser**, Pasqal's open-source Python SDK, and submitted via the Pasqal Cloud (Orion platform) or through Microsoft Azure Quantum. Pulser lets you build **programmable register geometries** and **pulse sequences** spanning analog, digital-analog, and gate-like modes on the same hardware family.

**Access model:**
| Layer | What it is |
|---|---|
| Account | Pasqal Cloud identity |
| Project | Scope for credentials, jobs, billing |
| Device spec | A `Device` object in Pulser describing geometry/amplitude/detuning limits |
| Register | 2D (or 3D on supported devices) atom positions in µm |
| Sequence | `Sequence` object: channels + pulses bound to the register |
| Backend | Emulator (TorchEmulator, QutipBackend) or Pasqal Cloud QPU |

**What distinguishes Pasqal's neutral-atom approach (durable):**
- **Register geometry is the input.** Unlike a fixed-lattice QPU, you design where atoms sit — triangular, Kagome, custom graphs — subject to device min spacing and max-trap constraints.
- **Multiple computation modes on one platform**:
  - **Analog** (continuous Hamiltonian evolution, like Aquila).
  - **Digital-analog** (global pulses + local addressing combined — Pasqal's sweet spot).
  - **Digital** (gate-model on top of pulse primitives).
- **Local addressing channels** on supported devices enable per-atom detuning / amplitude, which enables problem-specific encodings that a globally-driven device can't express.

**Connecting (Pulser + Pasqal Cloud):**
```python
from pulser import Register, Sequence, Pulse
from pulser.devices import DigitalAnalogDevice
from pulser.waveforms import BlackmanWaveform
from pasqal_cloud import SDK

# 1. Build the register (problem geometry)
reg = Register.rectangle(2, 2, spacing=6.0, prefix="q")

# 2. Bind a sequence to a device spec + open a channel
seq = Sequence(reg, DigitalAnalogDevice)
seq.declare_channel("rydberg_global", "rydberg_global")
seq.add(Pulse.ConstantDetuning(BlackmanWaveform(1000, 3.14), 0, 0), "rydberg_global")

# 3. Iterate on emulator first
from pulser_simulation import QutipEmulator
sim_counts = QutipEmulator.from_sequence(seq).run().sample_final_state(1000)

# 4. Submit to Pasqal Cloud
sdk = SDK(username="YOU", password="...", project_id="PROJECT_UUID")
batch = sdk.create_batch(
    serialized_sequence=seq.to_abstract_repr(),
    jobs=[{"runs": 1000, "variables": {}}],
    emulator=None,                                       # None = real QPU; else EmulatorType.*
)
print(batch.id, batch.status)
```

**Pulser building blocks:**
| Object | Role |
|---|---|
| `Register` | Atom positions (the problem graph) |
| `Device` | Hardware constraints: min spacing, max Ω, channel catalog |
| `Channel` | A driving capability: `rydberg_global`, `rydberg_local`, `raman_local`, ... |
| `Waveform` | Shape over time (Blackman, piecewise-linear, custom) |
| `Pulse` | Combined amplitude + detuning + phase on a channel |
| `Sequence` | Compiled program: register + ordered pulses across channels |

**Compute modes side-by-side:**
| Mode | Channels used | Best for |
|---|---|---|
| Analog | Global Rydberg | Adiabatic optimization, quench dynamics |
| Digital-analog | Global + local addressing | Problem-aware encodings, custom graphs |
| Digital (gate-model) | Per-atom Raman | Textbook circuits, variational with Paulis |

**Cloud vs Azure route:**
| Route | Best for |
|---|---|
| Pasqal Cloud (Orion) direct | Earliest device + feature access, native emulators in loop |
| Azure Quantum | You already live in Azure; accept broker-mediated surface |

**Pitfalls:**
- Building a `Register` that violates the device's **minimum spacing** — Pulser catches this at `Sequence(...)` binding.
- Forgetting to `declare_channel(...)` before adding pulses — the sequence errors at submission.
- Assuming all devices expose local addressing — check `device.channels` first; some only support global drives.
- Treating the `pulser-simulation` emulator as scalable — it's exact Schrödinger evolution; switch to tensor-network or approximate backends past ~20-30 atoms.
- Hardcoding a specific device name — pull the device from `sdk.get_device_specs_dict()` or the `pulser.devices` catalog at runtime.

**Rule of thumb:** Design the **register geometry** first (it encodes your problem), bind it to a `Device` spec so Pulser validates constraints early, iterate on the local emulator, and submit to Pasqal Cloud only when the sequence is stable — the device is programmable where most QPUs are fixed, so most of the design work happens before you ever touch a channel.
