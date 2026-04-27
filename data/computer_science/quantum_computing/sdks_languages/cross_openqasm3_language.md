### OpenQASM 3 — Classical Control, Timing, and the Lingua Franca

**What it is:**
OpenQASM 3 is the IBM-led textual IR for quantum circuits that vendors use as an interchange format. Where OpenQASM 2 was essentially "a list of gates on qubits," OQ3 grows a real type system (`bit`, `int`, `uint`, `float`, `angle`, `complex`, `duration`), genuine classical control flow (`if`, `for`, `while`), explicit **timing** primitives (`delay`, `stretch`, `box`), and a way to define gates down to the pulse level via `defcal`. It is the closest thing the field has to a portable source language across Qiskit, Braket, IonQ, Quantinuum, Rigetti, and QIR toolchains.

**Version deltas at a glance:**

| Feature | OQ2 | OQ3 |
|---|---|---|
| Classical types | `creg` only | `bit`, `int`, `float`, `angle`, `duration` |
| Control flow | (none) | `if`, `for`, `while`, `end`, `continue` |
| Timing | implicit | `delay`, `stretch`, `box { ... }` |
| Gate defs | `gate` (unitary only) | `gate` + `defcal` (pulse) |
| Subroutines | (none) | `def`, `extern` |
| Arrays | (none) | `array[int, N]`, slicing |

**Example — OQ3 with a typed variable, branching, and timing:**
```qasm
OPENQASM 3.0;
include "stdgates.inc";

qubit[3] q;
bit[3] c;

angle theta = pi / 4;
int[32] round = 0;

for int i in [0:2] {
  rx(theta) q[i];
  delay[200ns] q[i];        // explicit idle
}

h q[0];
cx q[0], q[1];
c[0] = measure q[0];

if (c[0] == 1) {
  x q[1];                   // feed-forward correction
}
```

**Why `angle` and `duration` matter:**
- `angle[n]` is a modular fixed-point type specifically for rotation parameters — hardware compilers can pick efficient pulse amplitudes without float drift.
- `duration` and `stretch` let the compiler solve a linear-programming problem to meet DD / dynamical-decoupling constraints while keeping total circuit time minimal. This is how Qiskit implements scheduled circuits behind the scenes.

**`defcal` — bridging logical and pulse layers:**
```qasm
defcal rx(angle[20] theta) $0 {
  play drive($0), gaussian(amp=theta/pi, sigma=40dt, duration=160dt);
}
```
`defcal` binds a gate signature to a pulse schedule at a *specific* physical qubit (`$0`). A compiler can match an abstract `rx(θ) q[0]` to this calibration when routing onto the device.

**Interop matrix:**

| Vendor / SDK | OQ3 support |
|---|---|
| Qiskit | First-class (`qiskit.qasm3.dump`, `loads`); default export format |
| Amazon Braket | Supported for gate-model; most devices accept OQ3 input |
| IonQ | Accepted through native API |
| Quantinuum | Supported via pytket `qasm_to_circuit` |
| Rigetti | Partial; Quil is primary, OQ3 via converters |
| CUDA-Q | Ingest via AST; emits QIR downstream |

**When to use:**
- As the serialization format for any circuit you want to persist, version, or send between SDKs — prefer it over pickled SDK-specific objects.
- When you need mid-circuit measurement + classical feed-forward that OQ2's flat `measure → creg` can't express.
- When the target backend publishes its `defcal`s and you want calibration-aware compilation without writing pulse code by hand.

**Pitfalls:**
- `for`/`while` with unbounded iteration counts fails validation on most hardware — compilers require compile-time-bounded loops.
- `angle` vs `float` are not interchangeable — passing `float` where `angle` is expected raises a type error in strict parsers.
- `delay[dt]` uses dimensionless `dt` (the hardware sample period) but `delay[100ns]` uses SI — mixing them in one circuit is legal but fragile.
- Parser conformance varies: Qiskit's parser is the most complete reference; third-party parsers often miss `extern`, `box`, or `stretch`.

**Rule of thumb:** Treat OpenQASM 3 as the wire format between SDKs and hardware, not as a language you hand-write day to day — author circuits in your preferred SDK, then export to OQ3 whenever you need portability, versioning, or vendor hand-off.
