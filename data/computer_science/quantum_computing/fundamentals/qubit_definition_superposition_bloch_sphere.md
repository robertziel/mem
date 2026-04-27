### Qubit, Superposition, and the Bloch Sphere

**What it is:**
A qubit is a 2-level quantum system: any system with two distinguishable basis states, e.g., spin-1/2, photon polarization, two transmon energy levels. Unlike a classical bit (0 or 1), a qubit can be in any complex linear combination of the basis states.

**State vector:**
```
|ψ⟩ = α|0⟩ + β|1⟩    where α, β ∈ ℂ    and |α|² + |β|² = 1
```

**Superposition vs classical probability:**
A qubit with amplitudes (α, β) is NOT the same as a classical bit that is 0 with probability |α|² and 1 with probability |β|². The amplitudes are complex numbers and can interfere (cancel or reinforce). Classical mixtures cannot.

| | Classical bit | Classical probabilistic bit | Qubit |
|---|---|---|---|
| State | 0 or 1 | (p₀, p₁), pᵢ ≥ 0, Σpᵢ=1 | (α, β), α,β ∈ ℂ, Σ|αᵢ|²=1 |
| Interference | no | no | yes (phases matter) |
| Space | {0, 1} | [0,1] interval | surface of Bloch sphere |

**Bloch sphere parameterization:**
Up to an unobservable global phase, any pure qubit state can be written as:
```
|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
```
where θ ∈ [0, π] is the polar angle and φ ∈ [0, 2π) is the azimuthal angle.

**Key points on the sphere:**
- North pole (θ=0): |0⟩
- South pole (θ=π): |1⟩
- Equator (θ=π/2): equal superpositions, e.g., |+⟩=(|0⟩+|1⟩)/√2 at φ=0, |−⟩=(|0⟩−|1⟩)/√2 at φ=π
- +Y axis: |+i⟩ = (|0⟩ + i|1⟩)/√2
- −Y axis: |−i⟩ = (|0⟩ − i|1⟩)/√2

**Bloch vector r:**
```
r = (sin θ cos φ, sin θ sin φ, cos θ)
⟨X⟩ = rₓ, ⟨Y⟩ = r_y, ⟨Z⟩ = r_z
```
|r| = 1 for pure states; |r| < 1 for mixed states (interior of ball).

**Qiskit example:**
```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit.visualization import plot_bloch_multivector

qc = QuantumCircuit(1)
qc.ry(1.0, 0)       # rotate around Y by 1 rad → superposition
qc.rz(0.5, 0)       # add relative phase
state = Statevector.from_instruction(qc)
plot_bloch_multivector(state)
```

**Rotations on the sphere:**
Single-qubit gates Rₓ(θ), R_y(θ), R_z(θ) rotate the Bloch vector around the x, y, z axes respectively by angle θ. H maps |0⟩↔|+⟩ (rotation by π around (x̂+ẑ)/√2).

**Common gotchas:**
- The factor of θ/2 in the parameterization means a 2π rotation about the z-axis produces a sign flip (−|ψ⟩), not the identity. Full return requires 4π (spinor behavior).
- The Bloch sphere only represents a single qubit. A 2-qubit state lives in ℂ⁴ and needs 2 spheres plus correlation info (or density matrices) to visualize.

**Rule of thumb:** Picture single-qubit states as points on the Bloch sphere and single-qubit gates as rotations; reach for amplitudes (α, β) whenever interference or multi-qubit correlations matter.
