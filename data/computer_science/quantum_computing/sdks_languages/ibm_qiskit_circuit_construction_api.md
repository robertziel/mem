### IBM Qiskit — Circuit Construction API

**What it is:** Qiskit's in-memory representation of a quantum program is the `QuantumCircuit`, a DAG of instructions over named `QuantumRegister` and `ClassicalRegister` objects. Building a circuit means instantiating registers, appending gate objects, composing sub-circuits, and (optionally) binding symbolic parameters before transpile.

**Core objects:**

| Object | Role | Notes |
|---|---|---|
| `QuantumRegister(n, 'name')` | Named quantum wire group | Indexed 0..n-1, little-endian |
| `ClassicalRegister(n, 'name')` | Named classical bit group | Used for measurement results + dynamic control |
| `QuantumCircuit(*regs)` or `QuantumCircuit(n_qubits, n_clbits)` | The program | Accepts registers, raw counts, or both |
| `Parameter('θ')` / `ParameterVector` | Symbolic free parameters | For ansätze, parameter sweeps, sessions |

**API shape:**
- **Gate methods:** `qc.h(q)`, `qc.cx(ctrl, tgt)`, `qc.rz(theta, q)`, `qc.measure(q, c)`, `qc.barrier()`.
- **Structural ops:** `compose(other, qubits=..., clbits=..., inplace=True)` merges another circuit into `self`; `decompose(reps=1)` unrolls one level of gate definitions; `inverse()` returns the adjoint; `reverse_bits()` flips endianness in-place-safe.
- **Parametric workflow:** build with `Parameter`; call `assign_parameters({θ: 0.7})` (or a list matching `qc.parameters` order) to get a concrete circuit. Use `inplace=False` (default) to keep the symbolic version for sweeps.

**Example:**
```python
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.circuit import Parameter

theta = Parameter('θ')
q = QuantumRegister(3, 'q')
c = ClassicalRegister(3, 'c')
qc = QuantumCircuit(q, c)

qc.h(q[0])
qc.cx(q[0], q[1])
qc.rz(theta, q[1])
qc.cx(q[1], q[2])
qc.measure(q, c)

bound = qc.assign_parameters({theta: 0.42})        # concrete
inv   = qc.inverse()                                # adjoint (still parametric)
sub   = QuantumCircuit(2); sub.h(0); sub.cx(0, 1)
qc2   = qc.compose(sub, qubits=[0, 1])              # prefer compose over extend
```

**Endianness gotcha:**
Qiskit uses **little-endian** bit ordering: qubit 0 is the *rightmost* bit of a bitstring, so `|q_{n-1} ... q_1 q_0⟩`. A counts dict key `'011'` means `q_0 = 1, q_1 = 1, q_2 = 0`. Use `reverse_bits()` or `QuantumCircuit.reverse_bits()` when interoperating with big-endian textbook conventions (e.g., reading a Grover oracle directly from a paper).

**compose vs. deprecated extend:**
`QuantumCircuit.extend` / `+=` semantics were removed; always use `compose`. `compose` returns a **new** circuit by default — pass `inplace=True` to mutate. `compose` also remaps qubits: `qc.compose(sub, qubits=[2, 0])` wires `sub`'s qubit 0 to `qc`'s qubit 2 and `sub`'s qubit 1 to `qc`'s qubit 0.

**decompose vs. transpile:**
`decompose()` performs **one level** of definition-unrolling per call — it is *not* a transpiler. It ignores basis gates, coupling maps, and optimization. Use it to peek at `EfficientSU2.decompose()` or to flatten a custom gate; use `transpile` when you want a backend-ready circuit.

**Parametric tips:**
- `qc.parameters` is a sorted `ParameterView`, not insertion order. Sort your `θ0..θn` names if you depend on positional binding.
- `ParameterVector('θ', n)` gives you a pre-indexed array, safer for large ansätze.
- Binding is cheap; primitives (Sampler/Estimator V2) accept a `BindingsArray` so you rarely need to call `assign_parameters` yourself during sweeps.

**Common pitfalls:**
- Mixing `QuantumCircuit(3)` (anonymous qubits) with named registers in `compose` — anonymous qubits have no register name, so wire-by-label fails.
- Calling `decompose()` expecting hardware basis — it isn't transpile.
- Editing a circuit after passing it to a primitive — primitives hash/copy circuits; in-place mutation won't retroactively affect submitted jobs but **will** confuse reruns.
- Forgetting to `measure_all()` before a Sampler — V2 pubs require classical registers for counts.

**Rule of thumb:** Build circuits from named registers, use `Parameter` for anything you'll sweep, compose (never extend) sub-circuits, and always remember qubit 0 is the rightmost bit.
