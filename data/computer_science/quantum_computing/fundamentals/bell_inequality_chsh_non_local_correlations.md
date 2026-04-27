### Bell Inequality and CHSH — Nonlocal Correlations

**What it is:**
Bell inequalities are constraints on correlations produced by any **local hidden-variable** (LHV) theory. Quantum mechanics violates them. Experimental violations rule out local realism and demonstrate that entanglement is a non-classical resource. CHSH (Clauser–Horne–Shimony–Holt) is the most-used 2-party Bell inequality.

**CHSH setup:**
- Two separated parties, Alice and Bob.
- Each chooses one of two measurement settings per round: Alice x ∈ {0, 1}, Bob y ∈ {0, 1}.
- Each obtains an outcome aₓ, b_y ∈ {−1, +1}.
- Correlation E(x, y) = ⟨aₓ b_y⟩ (average over many rounds).
- CHSH statistic:
```
S = E(0,0) + E(0,1) + E(1,0) − E(1,1)
```

**Classical bound (any LHV theory):**
```
|S_classical| ≤ 2        — CHSH inequality
```
Proof: for any deterministic local strategy, a₀, a₁, b₀, b₁ ∈ {±1} are fixed; the expression (a₀+a₁)b₀ + (a₀−a₁)b₁ is at most 2 because one of (a₀+a₁), (a₀−a₁) is 0 and the other is ±2. Averaging over hidden variables preserves the bound.

**Quantum (Tsirelson) bound:**
```
|S_quantum| ≤ 2√2 ≈ 2.828
```
Achieved by the singlet |Ψ⁻⟩ (or any Bell state) with optimal measurement angles:
```
Alice settings:  A₀ = Z,  A₁ = X          (on Bloch sphere: 0°, 90°)
Bob   settings:  B₀ = (Z+X)/√2,  B₁ = (Z−X)/√2   (45°, 135°)
```
Each correlation contributes cos(45°) = 1/√2 → S = 4/√2 = 2√2.

**Beyond-quantum (no-signaling) bound:**
Popescu-Rohrlich box achieves S = 4. No-signaling alone allows stronger correlations than QM; something beyond no-signaling (information causality, uncertainty principle) explains why Nature picks 2√2.

| Theory | Max |S| |
|---|---|
| Local realism (LHV) | 2 |
| Quantum mechanics | 2√2 ≈ 2.828 |
| No-signaling (PR box) | 4 |

**CHSH game formulation:**
Referee sends bits x, y (uniform). Players win iff aₓ ⊕ b_y = x · y (AND).
```
P_classical(win) ≤ 3/4 = 0.75
P_quantum(win)  ≤ cos²(π/8) ≈ 0.854
```
The quantum advantage of ~10 percentage points is measurable experimentally.

**Qiskit computation of CHSH:**
```python
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def chsh_circuit(angle_a, angle_b):
    qc = QuantumCircuit(2, 2)
    qc.h(0); qc.cx(0, 1)                  # |Φ⁺⟩
    qc.ry(-2*angle_a, 0)                  # Alice rotation
    qc.ry(-2*angle_b, 1)                  # Bob rotation
    qc.measure([0, 1], [0, 1])
    return qc

sim = AerSimulator()
def E(a, b, shots=8192):
    counts = sim.run(transpile(chsh_circuit(a, b), sim), shots=shots).result().get_counts()
    exp = 0
    for bits, n in counts.items():
        parity = (-1)**(int(bits[0]) ^ int(bits[1]))
        exp += parity * n
    return exp / shots

a0, a1 = 0, np.pi/4
b0, b1 = np.pi/8, -np.pi/8
S = E(a0, b0) + E(a0, b1) + E(a1, b0) - E(a1, b1)
print(f"CHSH S = {S:.3f}    (classical ≤ 2, quantum ≤ 2√2 ≈ 2.828)")
```

**Experimental violations:**
| Year | Experiment | Notable |
|---|---|---|
| 1972 | Freedman-Clauser | first observation |
| 1982 | Aspect et al. | switching settings, closed locality loophole |
| 2015 | Delft / Vienna / NIST | **loophole-free** (locality + detection simultaneously) |
| 2017–22 | Various | Nobel 2022 (Aspect, Clauser, Zeilinger) |

**Loopholes:**
- **Locality loophole**: settings chosen too late to be spacelike-separated. Closed with fast randomness + long baselines.
- **Detection loophole**: low detector efficiency allows LHV models to mimic QM by post-selection. Closed by high-efficiency detectors (trapped ions, NV centers, SNSPDs).
- **Freedom-of-choice loophole**: settings correlated with hidden variables. Closed (or lessened) with human choices, cosmic photons, quantum random number generators.
- Other loopholes (memory, collapse-locality) are more esoteric.

**Consequences:**
- **Local realism is false**: the world is non-local (or non-real, or both), within the definition of those terms.
- **Device-independent cryptography**: QKD protocols (E91, DIQKD) derive security from CHSH violation alone, without trusting the devices.
- **Randomness certification**: CHSH violation certifies genuine quantum randomness.
- **Self-testing**: the 2√2 value uniquely identifies the Bell state + anti-commuting measurements, up to local isometry — a device-independent "fingerprint" of a specific quantum state and measurements.

**Rule of thumb:** CHSH turns the abstract "entanglement is non-classical" claim into a single number; classical physics caps it at 2, quantum mechanics reaches 2√2, and every loophole-free experiment since 2015 agrees with QM.
