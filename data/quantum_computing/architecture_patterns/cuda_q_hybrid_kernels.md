### CUDA-Q Hybrid Kernels — Classical + Quantum Co-Compilation

**Pattern:** NVIDIA CUDA-Q treats quantum circuits as **kernels** that live in the same compilation unit as classical CUDA/host code. The classical controller (CPU/GPU) and the QPU share a type system, function calls can cross the boundary, and GPU acceleration handles **circuit batching, gradient evaluation, and classical inner loops** at throughput a CPU cannot match. The payoff is when your algorithm has a **large classical workload riding on a quantum kernel** — variational loops, shot-heavy estimators, tensor-network simulators.

**Architecture:**
```
+--------------------------+      +-----------------+
|  C++/Python host (CPU)   |      |  GPU (cuStateVec|
|  - classical optimizer   |<--->|   cuTensorNet,   |
|  - data shuffling        |      |   cuQuantum DP)  |
+------------+-------------+      +--------+--------+
             |                             |
             | CUDA-Q MLIR / QIR           | batched simulation
             v                             v
       +-------------------------------------+
       |  QPU target (or GPU simulator)      |
       |  - quantum kernel executes          |
       +-------------------------------------+
```

**Kernel shape (Python API):**
```python
import cudaq

@cudaq.kernel
def ansatz(theta: list[float]):
    q = cudaq.qvector(4)
    for i in range(4): ry(theta[i], q[i])
    for i in range(3): x.ctrl(q[i], q[i+1])

H = cudaq.spin.z(0)*cudaq.spin.z(1) + 0.5 * cudaq.spin.x(2)

# Run 10,000 parameter sets as a single GPU-accelerated batch
params_batch = np.random.rand(10000, 4)
energies = cudaq.observe(ansatz, H, params_batch).expectation()

# Target switch: same kernel, different backend
cudaq.set_target("nvidia-mgpu")      # GPU simulator
# cudaq.set_target("quantinuum")     # real QPU
# cudaq.set_target("ionq")
```

**When it's justified:**
- **Batched VQE / QAOA** — parameter sweep over thousands of points per iteration. GPU simulates them in parallel; CPU-backed simulators serialize.
- **Large-scale simulation** — `nvidia-mqpu`, `nvidia-mgpu`, `tensornet` targets scale to 30–50+ qubits using cuStateVec / cuTensorNet.
- **Hybrid loops with heavy classical data** — preprocessing large datasets (e.g. QML feature maps) where the classical side dominates cycles.
- **Multi-QPU orchestration** — dispatch subcircuits to multiple simulated QPUs from one kernel.

**When it's NOT justified:**
- Small, one-off circuits on real hardware. Qiskit/Cirq have better QPU coverage and the CUDA-Q toolchain is more to learn.
- Pure-Python prototyping without GPU access — you lose the main advantage.
- Workloads dominated by QPU latency, not classical compute — GPU batching doesn't speed up the quantum side.

**Comparison — framework niches:**

| Axis | Qiskit Runtime | Cirq + Qsim | CUDA-Q |
|------|----------------|--------------|---------|
| Native backend coverage | IBM-centric, broad partners | Google-centric | Hardware-agnostic (IonQ, Quantinuum, IBM via adapters) |
| GPU simulation | Aer-GPU (bolt-on) | Qsim-GPU | First-class, multi-GPU |
| Batched observables | One PUB per circuit | Batched via vectorization | Native `observe` over batch |
| Classical-GPU interop | Weak | Moderate | Strong (CUDA types cross boundary) |
| Multi-QPU orchestration | Sessions | External | `mqpu` target built-in |

**Trade-offs:**
- **Pro:** Throughput for simulated workloads is unmatched — GPU state-vector sim at 30+ qubits, tensor-net at 100+.
- **Pro:** Same kernel compiles to simulator or real device — target swap is one line.
- **Con:** Harder deployment story; requires CUDA toolkit on every dev machine. Python-only environments skip GPU acceleration.
- **Con:** Smaller ecosystem of algorithm libraries than Qiskit — you write more primitives yourself.

**Pitfalls:**
- Treating CUDA-Q as a simulator-only — the QPU targets are real but cadence/support varies by vendor.
- Running a serial Python optimizer around a batched `cudaq.observe` call — you GPU-accelerate the inner loop while the outer loop is still Python-slow. Use `cudaq.optimizers` or SciPy with vectorized gradient kernels.
- Mixing `numpy` and `cudaq.State` arrays without realizing the transfer cost — GPU↔CPU bandwidth dominates at scale.
- Assuming multi-GPU scales linearly; `cuStateVec` communication costs go quadratic beyond ~32 qubits.

**Example:** 28-qubit QAOA parameter sweep, 20k points. On CPU Qiskit Aer: ~90 min. On CUDA-Q `nvidia-mgpu` 4xA100: ~2 min. Same kernel compiles for Quantinuum H2 at 56q — no code change.

**Rule of thumb:** Reach for CUDA-Q when your workload is **simulation-heavy** or **batched-variational**, you have GPU access, and the algorithm will eventually run on non-IBM QPUs; otherwise stay on the framework whose QPU you actually target.
