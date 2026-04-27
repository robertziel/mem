### Dynamic Circuits and OpenQASM 3

**What it is:**
**Dynamic circuits** interleave classical control flow (`if`, `for`, `while`, arithmetic on classical registers) with quantum gates **in real time** on hardware. **OpenQASM 3** (2021, stable 3.1) is the standard language that exposes these capabilities — a superset of OpenQASM 2 with classical types, arrays, control flow, and timing annotations.

**Key OpenQASM 3 features beyond 2.0:**
| Feature | Purpose |
|---|---|
| `bit`, `int`, `uint`, `float`, `duration` | rich classical types |
| `if`, `else`, `for`, `while` | runtime control flow |
| `let`, arrays | local classical state |
| `delay[100ns]` | explicit timing |
| `gate`, `defcal` | logical + physical gate defs |
| `extern`, `input`, `output` | parameter binding for hybrid jobs |

**Minimal example:**
```qasm
OPENQASM 3.1;
include "stdgates.inc";

qubit[2] q;
bit[2] c;

h q[0];
cx q[0], q[1];
c[0] = measure q[0];

if (c[0] == 1) {
    x q[1];
}
c[1] = measure q[1];
```

**Qiskit → OpenQASM 3:**
```python
from qiskit import QuantumCircuit, qasm3

qc = QuantumCircuit(2, 2)
qc.h(0); qc.measure(0, 0)
with qc.if_test((qc.clbits[0], 1)):
    qc.x(1)
qc.measure(1, 1)

print(qasm3.dumps(qc))                           # emits OpenQASM 3
# Parsing back:
qc2 = qasm3.loads(qasm3.dumps(qc))
```

**Backend support table (2026):**
| Backend | QASM3 parse | if / else | for | while | Classical arithmetic |
|---|---|---|---|---|---|
| IBM Heron r2 | yes | yes | yes | yes | yes (integers) |
| Quantinuum H2 | yes | yes | yes | yes | yes (full) |
| IonQ Forte | partial | yes | limited | no | basic |
| Google | gRPC/Cirq pipeline | yes | limited | no | limited |
| Aer simulator | yes | yes | yes | yes | yes |

**When to use:**
- **QEC cycle**: syndrome extraction, decoder lookup, Pauli frame update all in one QASM3 program.
- **Repeat-until-success synthesis**: `while (success_flag == 0) { try_gate; measure_flag; }`.
- **Iterative phase estimation (IPE)**: adaptive QPE where each bit of the phase updates the next rotation angle.
- **Magic state distillation**: 15→1 protocols with verification measurements selecting the kept state.
- **Hybrid algorithms** with in-circuit classical arithmetic (e.g., computing a running parity in hardware rather than round-tripping to CPU).

**Comparison — OpenQASM 2 vs 3:**
| | OpenQASM 2 | OpenQASM 3 |
|---|---|---|
| Classical types | single `creg` | `bit/int/float/duration/array` |
| Control flow | `if(c==x)` gate only | full `if/else/for/while` |
| Timing | implicit | `delay`, stretch |
| Hybrid pipelines | no | `input`/`output`/`extern` |
| Pulse-level (`defcal`) | no | yes |

**Pitfalls:**
- **Compiler support lags the spec**: writing `while` is easy; having Qiskit's transpiler + the backend's scheduler both support it is not. Check the target backend's supported subset.
- **No floating-point on hardware classical ALU yet** (as of 2026, most backends are integer-only). Arithmetic beyond `bit` and `int` often rejected at runtime.
- **Timing annotations are load-bearing**: `delay[100ns]` may be ignored by the simulator but required by hardware — circuits can behave differently between the two.
- **Session boundaries**: dynamic jobs on IBM require a "session" with guaranteed low-latency classical path; outside a session, feed-forward RTT jumps to seconds.
- **Latency budget** same as MCM: every classical decision ≈ 1 µs of qubit time on SC — budget carefully in tight QEC cycles.
- **Version drift**: OpenQASM 3.0 vs 3.1 syntax differs on a few edge cases (e.g., array slicing). Pin the version in your toolchain.

**Rule of thumb:** If your algorithm says "measure, then decide, then act," write it in OpenQASM 3 and run on a dynamic-circuit-capable backend — static QASM 2 can only express the "act then measure" shape, which leaves QEC and adaptive algorithms inexpressible.
