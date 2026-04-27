### Quantum Teleportation

**What it is:**
A protocol that transmits an unknown qubit state |ψ⟩ = α|0⟩ + β|1⟩ from Alice to Bob using (a) one pre-shared Bell pair and (b) 2 classical bits, and without moving the physical qubit itself. Teleportation does not violate no-cloning (Alice's copy is destroyed by measurement) and does not transmit faster than light (classical bits are rate-limiting).

**Resources:**
- 1 qubit to send (unknown state |ψ⟩ held by Alice).
- 1 pre-shared Bell pair |Φ⁺⟩_{A2,B} (qubit A2 with Alice, qubit B with Bob).
- 2 classical bits communicated Alice → Bob.

**Protocol:**

Initial state (before Alice acts):
```
|ψ⟩_A1 ⊗ |Φ⁺⟩_{A2 B} = (α|0⟩ + β|1⟩)_A1 ⊗ (|00⟩ + |11⟩)_{A2 B} / √2
```

Rewrite in the Bell basis of A1-A2 (algebra — the key identity):
```
= ½ [ |Φ⁺⟩_{A1 A2} (α|0⟩ + β|1⟩)_B
    + |Φ⁻⟩_{A1 A2} (α|0⟩ − β|1⟩)_B
    + |Ψ⁺⟩_{A1 A2} (α|1⟩ + β|0⟩)_B
    + |Ψ⁻⟩_{A1 A2} (α|1⟩ − β|0⟩)_B ]
```
After Alice's Bell measurement on A1-A2 she gets one of four outcomes (2 classical bits m₁m₂). Bob's qubit collapses to one of four states — the unknown state up to a known Pauli.

Alice sends (m₁, m₂). Bob applies the correction:
| Outcome (m₁ m₂) | Bell state | Bob's state before | Correction |
|---|---|---|---|
| 00 | Φ⁺ | α\|0⟩ + β\|1⟩ | I |
| 01 | Φ⁻ | α\|0⟩ − β\|1⟩ | Z |
| 10 | Ψ⁺ | α\|1⟩ + β\|0⟩ | X |
| 11 | Ψ⁻ | α\|1⟩ − β\|0⟩ | XZ = iY |

After correction Bob holds |ψ⟩. Alice's qubit A1 is now a classical bit, unentangled from |ψ⟩.

**Circuit:**
```
Alice (msg)  ──────•──H──M═══╗
                   │        ║
Alice (bell) ──•───⊕────M═══╣══╗
               │                 ║  ║
Bob          ──⊕─────────────X ──Z  (classical-controlled)
```
Wire creating the Bell pair: `H(Alice-bell); CX(Alice-bell, Bob)`. The boxed M lines carry classical bits that condition Bob's X and Z.

**Qiskit implementation (mid-circuit measurement + classical control):**
```python
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister

msg = QuantumRegister(1, 'msg')
alice = QuantumRegister(1, 'alice')
bob = QuantumRegister(1, 'bob')
c_alice = ClassicalRegister(2, 'cA')
qc = QuantumCircuit(msg, alice, bob, c_alice)

# Prepare some message state, e.g., H|0⟩ = |+⟩
qc.h(msg[0])

# Prepare Bell pair between alice and bob
qc.h(alice[0]); qc.cx(alice[0], bob[0])

# Alice's Bell measurement on (msg, alice)
qc.cx(msg[0], alice[0])
qc.h(msg[0])
qc.measure(msg[0], c_alice[0])
qc.measure(alice[0], c_alice[1])

# Bob's conditional corrections (classical-controlled gates, Qiskit dynamic circuits)
qc.x(bob[0]).c_if(c_alice, 0b10)   # m1=1 → X
qc.z(bob[0]).c_if(c_alice, 0b01)   # m2=1 → Z
qc.x(bob[0]).c_if(c_alice, 0b11)   # both → XZ
qc.z(bob[0]).c_if(c_alice, 0b11)
```
In modern Qiskit use `if_test` / `IfElseOp` for dynamic circuits; older code uses `.c_if`.

**Key properties:**
- **No cloning violated?** No. Alice's copy is measured, thus destroyed. Only one copy of |ψ⟩ exists at any moment.
- **FTL signaling?** No. Bob's qubit before classical communication is a maximally mixed state I/2; applying corrections requires Alice's 2 classical bits, which travel ≤ c.
- **Entanglement consumed**: one Bell pair per teleportation — not reusable.
- **Works for mixed states, unknown states, even halves of entanglement** (entanglement swapping).

**Entanglement swapping:**
If Alice's |ψ⟩ is itself half of another Bell pair with a third party Charlie, teleporting it to Bob entangles Bob with Charlie without Bob and Charlie ever interacting. Basis for quantum repeaters.

**Historical / practical:**
Proposed by Bennett et al. 1993. Experimentally demonstrated with photons (Zeilinger 1997), over fiber (tens of km), satellite-ground (Micius, 2017), and in superconducting chips.

**Rule of thumb:** Teleportation transmits one qubit of quantum information at the cost of one Bell pair plus two classical bits; it doesn't beat light speed and doesn't clone, but it lets you move or rewire entanglement at will.
