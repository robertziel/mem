### Superdense Coding

**What it is:**
A protocol that sends 2 classical bits by transmitting only 1 qubit, using a pre-shared Bell pair. The dual of teleportation: teleportation uses entanglement + 2 classical bits to send 1 qubit; superdense coding uses entanglement + 1 qubit to send 2 classical bits.

**Resource accounting (Bennett-Shumacher):**
```
1 qubit + 1 ebit  ≥  2 classical bits
```
Where an **ebit** is one Bell pair of shared entanglement. Without the pre-shared entanglement, 1 qubit can transmit at most 1 classical bit (Holevo bound).

**Protocol:**

Setup — Alice and Bob share |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 (Alice holds qubit A, Bob holds qubit B).

Alice has 2 classical bits (b₁ b₀) to send. She applies one of four local operations on her qubit:
| Bits | Operation on A | Resulting joint state |
|---|---|---|
| 00 | I | \|Φ⁺⟩ = (\|00⟩ + \|11⟩)/√2 |
| 01 | X | \|Ψ⁺⟩ = (\|10⟩ + \|01⟩)/√2 |
| 10 | Z | \|Φ⁻⟩ = (\|00⟩ − \|11⟩)/√2 |
| 11 | XZ (= iY, up to phase) | \|Ψ⁻⟩ = (\|10⟩ − \|01⟩)/√2 |

Alice sends qubit A to Bob. Bob now holds both qubits and performs a Bell measurement:
1. Apply CNOT with A as control, B as target.
2. Apply H on A.
3. Measure both in Z → recovers b₁ b₀ deterministically.

**Why it works:**
The four Bell states are orthogonal, so a Bell measurement distinguishes them perfectly. The four local Pauli operations map |Φ⁺⟩ onto this orthogonal basis, so the encoding is invertible.

**Circuit:**
```
Alice   ──H──•── (encode: I, X, Z, XZ) ── send ──•──H──M═══(b1)
             │                                    │
Bob     ─────⊕────────────────────────────────────⊕──────M═══(b0)
```

**Qiskit example:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

def superdense(bits):                     # bits = '00','01','10','11'
    qc = QuantumCircuit(2, 2)
    qc.h(0); qc.cx(0, 1)                  # Bell pair: q0=Alice, q1=Bob
    # Alice's encoding:
    if bits[0] == '1': qc.z(0)            # phase bit
    if bits[1] == '1': qc.x(0)            # bit-flip bit
    # ...Alice sends qubit 0 to Bob...
    # Bob's Bell measurement:
    qc.cx(0, 1); qc.h(0)
    qc.measure([0, 1], [0, 1])
    return qc

sim = AerSimulator()
for msg in ['00', '01', '10', '11']:
    c = sim.run(transpile(superdense(msg), sim), shots=1024).result().get_counts()
    print(msg, '→', c)                    # each should be ~1024 on one outcome
```
(Note: Qiskit's little-endian means you may see outcome strings reversed — check before comparing.)

**Information-theoretic view:**
- **Without entanglement**: Holevo says 1 qubit carries ≤ 1 classical bit of accessible info. Even with Alice preparing 2 orthogonal states, Bob extracts ≤ 1 bit per qubit.
- **With shared ebit**: 2 bits in 1 qubit. The entanglement effectively doubles the channel capacity.
- **Upper bound**: Can't do better than 2 bits per qubit for classical communication — this is the optimal dense coding rate for noiseless channels.

**Practical considerations:**
- Requires a **quantum channel** Alice→Bob that preserves the qubit's coherence. Photon loss, decoherence reduce fidelity.
- The pre-shared Bell pair must be distributed ahead of time (at slower classical-ish rates, since entanglement distribution has its own overheads).
- Experimental demos: photon polarization over fiber/free-space, trapped-ion chains, superconducting circuits. Channel capacity approaches the 2-bit limit with high-fidelity Bell pairs.

**Security flavor:**
Superdense coding is sometimes used in QKD-adjacent protocols — an eavesdropper intercepting the single qubit sees a maximally-mixed state (without Bob's half of the ebit), so partial intercept leaks minimal information. Full security analysis requires authentication of classical channels, finite-key effects, etc.

**Relation to teleportation:**
They are resource inverses:
```
Teleportation:     1 ebit + 2 cbits   →   1 qubit
Superdense coding: 1 ebit + 1 qubit   →   2 cbits
```
Both protocols compose: teleport a qubit; then use superdense coding to transmit outcomes — a common primitive in entanglement-assisted communication theory.

**Rule of thumb:** Shared entanglement lets you double the classical-information capacity of a quantum channel; superdense coding is the textbook example that entanglement is a genuine communication resource, not just a passive correlation.
