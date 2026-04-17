### QIR, MLIR-Quantum, CUDA-Q — Modern Quantum IRs

**What it is:** An **intermediate representation (IR)** is the compiler's internal data structure — a common format into which front-ends lower (Qiskit, Cirq, Q#, OpenQASM 3, PennyLane) and from which back-ends generate device-specific code. Classical compilers settled on LLVM IR decades ago; quantum compilers are converging now. Three dominant contenders: **QIR** (Microsoft, LLVM-based), **MLIR-quantum** (multi-dialect, extensible), **CUDA-Q kernel IR** (NVIDIA, GPU-native hybrid).

**Why an IR?** Without one, every (front-end x back-end) pair needs a bespoke path (N x M). With one, each front-end lowers to IR (N lowerings) and each back-end consumes IR (M back-ends) — `N + M` instead of `N * M`. Plus the optimization passes live in the middle and are reused across everything.

**Comparison:**

| Property                    | QIR                               | MLIR-quantum (dialect)         | CUDA-Q kernel IR                |
|-----------------------------|-----------------------------------|--------------------------------|---------------------------------|
| Host / backbone             | LLVM IR (SSA, bitcode)            | MLIR (ops on typed SSA)        | LLVM (hybrid CPU/GPU/QPU)       |
| Hybrid classical-quantum    | First-class (functions, if, loop) | First-class via `func`+`quantum` dialects | First-class: kernels mix classical + quantum SSA |
| Dynamic circuits (mid-circuit meas, feed-forward) | Native `result` type | Native via `quantum.measure`   | Native                          |
| Backends consuming it       | Azure Quantum, IonQ, Quantinuum, Q#, some Qiskit paths | Catalyst (Xanadu), Enzyme-like passes, research | CUDA-Q targets (NVIDIA cuQuantum GPU, IonQ, IQM, OQC, QuEra) |
| Authored by                 | Microsoft + QIR Alliance          | Community, LLVM project        | NVIDIA                          |
| Strength                    | Standardization, vendor buy-in    | Extensibility (dialects), reuse of MLIR passes | Hybrid performance, GPU simulation |
| Weakness                    | LLVM-native -> verbose for pure quantum | Newer, less tooling in place   | Vendor-centric (NVIDIA)         |

**QIR in a nutshell:** an LLVM function operates on opaque `%Qubit*` and `%Result*` pointers. Quantum operations are runtime calls: `__quantum__qis__h__body(%Qubit* %q)`. Classical control flow is stock LLVM IR — enabling reuse of every classical optimizer. A QIR program is a `.ll` or `.bc` file.

**MLIR-quantum sketch:**
```mlir
func.func @bell() -> tensor<2xi1> {
  %q0 = quantum.alloc : !quantum.qubit
  %q1 = quantum.alloc : !quantum.qubit
  quantum.h %q0 : !quantum.qubit
  quantum.cnot %q0, %q1 : !quantum.qubit, !quantum.qubit
  %m0 = quantum.measure %q0 : i1
  %m1 = quantum.measure %q1 : i1
  %r  = tensor.from_elements %m0, %m1 : tensor<2xi1>
  return %r : tensor<2xi1>
}
```
Custom dialects can add passes (routing, synthesis) as first-class MLIR transforms.

**CUDA-Q kernel example:**
```python
import cudaq

@cudaq.kernel
def bell():
    q = cudaq.qvector(2)
    h(q[0])
    x.ctrl(q[0], q[1])
    mz(q)

print(cudaq.sample(bell))
# Under the hood: lowered to CUDA-Q kernel IR, JIT-compiled via LLVM,
# dispatched to a GPU simulator or a real QPU back-end.
```

**Qiskit interop:**
```python
# Qiskit -> QIR (via qiskit_qir)
from qiskit import QuantumCircuit
from qiskit_qir import to_qir_module
qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); qc.measure_all()
module, entry_points = to_qir_module(qc)
print(module)   # LLVM bitcode / text
```

**When to use:**
- **QIR** — targeting Azure Quantum / multi-vendor FT pipelines; want LLVM tool reuse.
- **MLIR-quantum** — building new compiler passes, especially if classical-quantum co-optimization matters (Catalyst, PennyLane).
- **CUDA-Q** — GPU-accelerated simulation + real-QPU dispatch with the same kernel code; HPC-adjacent workflows.

**Pitfalls:**
- Not every IR supports every primitive (e.g. some older QIR profiles ban mid-circuit measurement; check the QIR **profile** supported by your target).
- Translation between IRs is lossy (e.g., Qiskit pulse calibrations often don't round-trip).
- Ecosystems move fast — pin exact versions.

**Rule of thumb:** If your code imports an SDK, pick the IR that SDK targets — QIR for Microsoft/multi-vendor, MLIR for new compiler work, CUDA-Q for GPU-accelerated hybrids.
