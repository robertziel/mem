### QIR — Quantum Intermediate Representation (LLVM-based)

**What it is:**
QIR is an **LLVM IR** specification for quantum programs. Microsoft proposed it in 2020; it's now governed by the vendor-neutral **QIR Alliance** (Microsoft, Quantinuum, Rigetti, Oak Ridge, IonQ, and others). QIR is not a source language and not a wire format for humans — it's the *compiler target* layer, where source languages (Q#, Qiskit via `qiskit-qir`, PennyLane via `pennylane-qir`, CUDA-Q, OpenQASM 3 via converters) lower before hardware backends consume them. Because it's literally LLVM IR with a set of reserved intrinsics, QIR inherits the entire LLVM optimization and tooling ecosystem (opt passes, linking, debug info, JIT).

**Core idea:**
A quantum program is an LLVM module with calls into a standard runtime library. Qubits and results are opaque pointer types; gates are `call` instructions; classical control is plain LLVM.

| LLVM construct | QIR usage |
|---|---|
| `%Qubit*` | Opaque qubit handle |
| `%Result*` | Measurement outcome handle |
| `call void @__quantum__qis__h__body(%Qubit* %q)` | Apply H |
| `call %Result* @__quantum__qis__m__body(%Qubit*)` | Measure |
| `call i1 @__quantum__rt__result_equal(%Result*, %Result*)` | Runtime result compare |
| `br i1 %cmp, label %then, label %else` | Classical branching on measurement |

**Example snippet (Q# compiled to QIR):**
```llvm
; Function Attrs: "EntryPoint"
define void @Example__Bell() #0 {
entry:
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q1)
  %r = call %Result* @__quantum__qis__m__body(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  ret void
}
```

**Profiles — three conformance tiers:**

| Profile | Features | Device target |
|---|---|---|
| Base | Static circuits only — no classical control on measurement | Most current superconducting QPUs |
| Adaptive | Mid-circuit measurement + classical feed-forward | Quantinuum H-series, newer IBM |
| Full | Arbitrary LLVM classical code + dynamic qubit alloc | Simulators, future hardware |

Backends advertise the profile they consume; QIR-emitting compilers lower to the lowest profile the target can execute.

**The alliance value-prop:**

| Without QIR | With QIR |
|---|---|
| N languages × M hardware = N·M compilers | N + M (each language → QIR, each hardware ← QIR) |
| Vendor-specific optimization passes | Reuse LLVM `opt`, alliance passes |
| Hand-written JITs | `lli`, MLIR, standard toolchain |
| Ad-hoc classical control | LLVM instructions, native |

**Who produces QIR:**

| Frontend | Path |
|---|---|
| Q# | `dotnet build` → QIR via `qsc` / `qsharp-compiler` |
| Qiskit | `qiskit-qir` package |
| PennyLane | `pennylane-qir` |
| OpenQASM 3 | Via `pyqir` + alliance tooling |
| CUDA-Q | Quake → QIR lowering in `nvq++` |

**Who consumes QIR:**

| Backend | Profile |
|---|---|
| Azure Quantum hardware targets | Base / Adaptive |
| Quantinuum H-series | Adaptive |
| Rigetti (research path) | Base |
| QIR Runner (simulator) | Full |

**When to use (conceptually):**
- You're writing a *compiler* or *optimizer* for quantum code — QIR is the IR you target, the way classical compilers target LLVM IR.
- You're building tooling (linters, profilers, resource estimators) that should work across source languages — operate on QIR, not on Q#/Qiskit/etc. ASTs.
- You need to compose a quantum program with classical LLVM libraries (linear algebra, optimizers) in one module.

**Pitfalls:**
- Profile mismatch is the #1 submission failure: a circuit compiled for Full profile (with dynamic alloc) will be rejected by a Base-profile device with a cryptic "unsupported intrinsic" error.
- QIR's qubit addressing is *symbolic* — `%Qubit*` values don't correspond to physical qubit indices until a backend-specific mapping pass. Don't assume `%q0 == physical qubit 0`.
- The alliance publishes reference passes (`inline`, `static-allocate`, `flatten-control-flow`) — running a Full-profile module through a Base-only backend without these passes is the classic foot-gun.
- QIR is not human-authored: do not write `.ll` by hand for production.

**Rule of thumb:** Treat QIR as the **LLVM of quantum** — not something you ever type, but the portable target every serious quantum compiler lowers into; its three profiles (Base / Adaptive / Full) define what you can actually ask a device to do, and always match the profile to the device before submitting.
