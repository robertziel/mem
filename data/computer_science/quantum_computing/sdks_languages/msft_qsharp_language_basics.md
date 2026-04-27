### Microsoft Q# — Language Basics

**What it is:**
Q# is Microsoft's domain-specific language for quantum programs: strongly typed, scope-safe, with first-class support for the three functors every textbook cares about — **Adjoint**, **Controlled**, and the two-argument `Controlled Adjoint`. Classical glue (loops, arithmetic, recursion) runs on the host; quantum ops run on the target (simulator, Azure Quantum QPU, resource estimator). The compiler synthesizes `adjoint` and `controlled` bodies from your `body` when you ask for `is Adj + Ctl`.

**Operation vs function:**
| Construct | Callable side-effects? | Quantum state? |
|---|---|---|
| `function` | No — pure | No |
| `operation` | Yes | Yes |

A function with `Random()` inside won't compile — use an operation.

**API shape — anatomy of an operation:**
```qsharp
operation ApplyCNOT(control : Qubit, target : Qubit) : Unit is Adj + Ctl {
    body (...) { CNOT(control, target); }
    adjoint self;               // CNOT is its own adjoint
    controlled (ctls, ...) {    // Controlled CNOT == Toffoli chain
        Controlled CNOT(ctls, (control, target));
    }
}
```
The characteristics annotation `is Adj + Ctl` tells the compiler to also synthesize `Adjoint ApplyCNOT` and `Controlled ApplyCNOT` — you only *must* provide bodies if the auto-synthesis doesn't fit.

**Qubit allocation — `use` / `borrow`:**
```qsharp
operation Ghz(n : Int) : Result[] {
    use qs = Qubit[n];                // allocates in |0…0⟩
    H(qs[0]);
    for i in 1..n-1 { CNOT(qs[0], qs[i]); }
    let result = MeasureEachZ(qs);
    ResetAll(qs);                     // MUST return qubits to |0⟩
    return result;
}
```
Q# enforces **Hoare-style cleanup** — a qubit must be back in `|0⟩` before leaving the `use` block, either through explicit `Reset`/`ResetAll` or because a measurement put it there. Violating this is a compile error with the modern QIR path and a runtime error otherwise.

**Functor calls:**
| Call | Meaning |
|---|---|
| `Op(q)` | Apply body |
| `Adjoint Op(q)` | Apply inverse |
| `Controlled Op(ctls, q)` | Controlled-body, where `ctls : Qubit[]` |
| `Controlled Adjoint Op(ctls, q)` | Controlled-inverse |

**Example — GHZ with auto-generated adjoint:**
```qsharp
operation PrepareGhz(qs : Qubit[]) : Unit is Adj + Ctl {
    H(qs[0]);
    for i in 1..Length(qs)-1 {
        CNOT(qs[0], qs[i]);
    }
}

operation UseGhz() : Result[] {
    use qs = Qubit[3];
    PrepareGhz(qs);                   // forward
    // ... quantum work ...
    Adjoint PrepareGhz(qs);           // uncompute — compiler wrote this for us
    let r = MeasureEachZ(qs);
    ResetAll(qs);
    return r;
}
```
Because `PrepareGhz` only uses Adj+Ctl primitives (H and CNOT are both), the compiler safely auto-inverts it — no manual adjoint body required.

**Classical–quantum interop:**
- Host Python calls `qsharp.compile` / `qsharp.run` to invoke operations; arguments are Python primitives, returned values are `Result`, `Int`, arrays, tuples.
- `let` binds immutable values; `mutable` + `set` for updates.
- `fail "..."` raises at runtime; pre-conditions go in `Fact(...)`.

**Target capability profile:**
| Profile | What you get | Typical target |
|---|---|---|
| Full | Arbitrary classical control, mid-circuit measurement feedback | Simulator, Quantinuum adaptive |
| Adaptive | Basic mid-circuit branching | Quantinuum H-series |
| Base | No measurement feedback; straight-line circuits | IonQ, Rigetti |

**Pitfalls:**
- Forgetting `ResetAll` on a non-measured qubit — compiles today but breaks when retargeted to QIR.
- Marking `is Adj` on an operation that uses non-invertible primitives (`M`, `Reset`) — compile error. Measurements are *not* adjointable.
- Mixing `operation` and `function` confusingly — any call with side effects must be `operation`, and functions may not call operations.
- Assuming `Controlled Op(ctls, args)` takes a flat arg list — it takes a *tuple* `(ctls, args)`.

**Rule of thumb:** Write your smallest quantum primitives as `operation ... is Adj + Ctl`, let the compiler synthesize adjoints, and always pair a `use qs = Qubit[n]` with a matching `ResetAll(qs)` — that's the canonical Q# lifecycle.
