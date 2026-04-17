### NVIDIA CUDA-Q — GPU-Accelerated Hybrid Quantum-Classical Kernels

**What it is:**
CUDA-Q (formerly CUDA Quantum) is NVIDIA's open-source platform for writing **hybrid quantum-classical kernels** — programs where classical GPU code and quantum circuits live in the same function, compiled together, and executed on the same heterogeneous runtime. It exposes a kernel DSL in both C++ (`__qpu__` attribute) and Python (`@cudaq.kernel`), lowers through an MLIR-based compiler (Quake → QIR), and ships NVIDIA's `nvq++` tooling plus high-performance simulators (`nvidia`, `nvidia-mgpu`, `tensornet`, `nvidia-mqpu`) that run on single GPUs, multi-GPU nodes, and multi-QPU clusters.

**Headline pitch:**
1. Hybrid IR positioning: unlike pure gate IRs (QASM), Quake was designed from day one to contain both classical control and quantum ops in the same function, with explicit support for mid-circuit measurement and feed-forward.
2. GPU simulation leadership: `nvidia-mgpu` can statevector-simulate ~34+ qubits on an 8×A100 node; tensor-network backends reach dozens more for shallow circuits.
3. Vendor-neutral hardware: QPU plugins for IonQ, Quantinuum, IQM, Infleqtion, OQC, Pasqal, Rigetti — swap via `cudaq.set_target(...)`.

**API shape — Python kernel:**
```python
import cudaq

@cudaq.kernel
def bell(n: int) -> None:
    q = cudaq.qvector(n)
    h(q[0])
    for i in range(n - 1):
        x.ctrl(q[i], q[i + 1])
    mz(q)

cudaq.set_target("nvidia")                   # single-GPU statevector
counts = cudaq.sample(bell, 10, shots_count=10000)
print(counts)

cudaq.set_target("quantinuum", machine="H1-1")
handle = cudaq.sample_async(bell, 10, shots_count=1000)
print(handle.get())
```

**C++ kernel (same semantics):**
```cpp
#include <cudaq.h>
struct bell {
  void operator()(int n) __qpu__ {
    cudaq::qvector q(n);
    h(q[0]);
    for (int i = 0; i < n - 1; ++i) x<cudaq::ctrl>(q[i], q[i + 1]);
    mz(q);
  }
};
```
Compiled with `nvq++ bell.cpp -o bell --target nvidia`.

**Targets (simulator + hardware):**

| Target | Kind | Scale |
|---|---|---|
| `qpp-cpu` | CPU statevector | ~24 qubits |
| `nvidia` | Single-GPU SV | ~32 qubits |
| `nvidia-fp64`, `nvidia-mgpu` | Multi-GPU SV | 34–40+ qubits on DGX |
| `tensornet`, `tensornet-mps` | Tensor network | 100s of qubits, depth-limited |
| `nvidia-mqpu` | Multi-QPU partitioned | Ensemble workflows |
| `ionq`, `quantinuum`, `iqm`, `oqc`, `pasqal` | Hardware | Vendor-specific |

**Hybrid IR positioning:**

| IR | Level | Classical control? | GPU codegen? |
|---|---|---|---|
| OpenQASM 3 | Source / wire | Yes (syntactic) | No |
| QIR | LLVM IR target | Yes (LLVM) | Via LLVM backends |
| Quake (CUDA-Q) | MLIR dialect | Yes, native | Yes, through NVIDIA pipeline |
| PHIR | Hybrid JSON IR | Yes, runtime | No |

CUDA-Q's Quake sits below OQ3 as a mid-level representation and compiles *down to* QIR for hardware interop, while compiling *over to* GPU machine code for simulation — the only mainstream stack that spans both ends.

**When to use:**
- You want one source file that drives GPU-simulated and real-QPU runs interchangeably.
- Your workload is simulation-heavy and scales with GPU memory — VQE over many observables, QML gradient sweeps, noisy Monte Carlo.
- You're writing performance-critical hybrid primitives (e.g., variational state prep with classical preconditioning) and want them compiled rather than interpreted.

**Pitfalls:**
- `@cudaq.kernel` bodies run through a restricted Python compiler — not every Python construct works; complex list comprehensions, arbitrary class usage, and most NumPy calls are rejected. Keep kernels narrow.
- Switching `cudaq.set_target` globally is process-wide; multi-backend scripts must manage target state carefully or spawn subprocesses.
- Statevector memory grows as `2^N * 16 bytes` (complex128). On an 80 GB A100 the hard ceiling is ~32 qubits before `mgpu` sharding.
- QIR emitted by CUDA-Q is a specific profile; consumers that expect the base profile may reject dynamic-feature circuits.

**Rule of thumb:** Use CUDA-Q whenever your quantum code sits inside a larger HPC/GPU workload or whenever you need the same source to simulate on A100s *and* execute on IonQ/Quantinuum — it's the only stack that treats GPU simulation and QPU execution as equally first-class compile targets.
