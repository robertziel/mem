### PennyLane — Multi-Backend Devices and Differentiable Circuits

**What it is:**
Xanadu's PennyLane is a Python framework that treats a quantum circuit as a **differentiable function**. The same `@qml.qnode` body can run on dozens of backends — Lightning (C++), `default.qubit` (NumPy), Qiskit, Braket, Cirq, IonQ, Rigetti — via a plugin architecture, and gradients flow end-to-end through NumPy/Autograd, JAX, PyTorch, or TensorFlow. It's the de-facto framework for quantum machine learning and variational algorithms that need autograd.

**Core abstractions:**

| Piece | Role |
|---|---|
| `qml.device("name", wires=n)` | Backend selector — plugin name → execution engine |
| `@qml.qnode(dev, interface="jax")` | Decorator that makes a Python function a differentiable quantum op |
| `qml.grad(qnode)` / `jax.grad(qnode)` | Gradient wrt circuit parameters |
| `qml.transforms.*` | Source-to-source circuit rewrites (e.g. `batch_input`, `compile`) |
| `qml.metric_tensor`, `qml.specs` | Quantum Fisher info, circuit introspection |

**Plugin (device) landscape:**

| Device string | Backend | Notes |
|---|---|---|
| `default.qubit` | Pure-NumPy statevector | Ships with core; differentiable |
| `lightning.qubit` | C++ statevector | 5–20× faster than default |
| `lightning.gpu`, `lightning.kokkos` | GPU / HPC | Scale to 30+ qubits |
| `qiskit.aer`, `qiskit.ibmq` | IBM sim / hardware | Via `pennylane-qiskit` |
| `braket.aws.qubit` | AWS on-demand + QPUs | Via `amazon-braket-pennylane-plugin` |
| `cirq.simulator` | Cirq / qsim | Via `pennylane-cirq` |
| `default.mixed` | Density-matrix | For noise channels |

**API shape:**
```python
import pennylane as qml
import jax
import jax.numpy as jnp

dev = qml.device("lightning.qubit", wires=2)

@qml.qnode(dev, interface="jax", diff_method="adjoint")
def circuit(theta):
    qml.RY(theta[0], wires=0)
    qml.CNOT(wires=[0, 1])
    qml.RZ(theta[1], wires=1)
    return qml.expval(qml.PauliZ(0) @ qml.PauliZ(1))

theta = jnp.array([0.3, 0.9])
value = circuit(theta)
grads = jax.grad(circuit)(theta)          # autodiff through the circuit
```

**Gradient methods:**

| `diff_method=` | How | Works on hardware? |
|---|---|---|
| `"best"` | Picks based on device | Mixed |
| `"backprop"` | Reverse-mode AD through the simulator | Simulators only |
| `"adjoint"` | Adjoint method, O(P) circuit evals | Simulators, often fastest |
| `"parameter-shift"` | Exact shift rule, 2P circuit evals | Yes — standard on hardware |
| `"finite-diff"` | Numerical | Yes, but noisy |

On real hardware you almost always use `parameter-shift`; on simulators, `adjoint` or `backprop` are dramatically faster for many-parameter circuits.

**ML-framework interfaces:**
```python
@qml.qnode(dev, interface="torch")
def f(x): ...
# `f(torch.tensor(...))` returns torch.Tensor with autograd enabled.

@qml.qnode(dev, interface="tf")
def g(x): ...

@qml.qnode(dev, interface="autograd")   # default, numpy-like
def h(x): ...
```

**When to use:**
- Any variational workflow (VQE, QAOA, QML) where you need gradient descent — PennyLane removes the shot/shift/stitch bookkeeping entirely.
- Multi-backend benchmarking: rerun identical code on `lightning.qubit`, `qiskit.aer`, and `braket.aws.qubit` by changing a single string.
- Hybrid classical-quantum models that live inside a PyTorch / JAX training loop.

**Pitfalls:**
- `diff_method="backprop"` silently falls back when you point `dev` at hardware — you'll get a parameter-shift schedule and possibly 100× more circuit runs than expected. Always set `diff_method` explicitly.
- Wires on external plugins are remapped through a layout — `qml.device("qiskit.ibmq", wires=range(27))` picks the first 27 physical qubits, not a curated layout. Use `qml.transforms.map_wires`.
- `qml.QNode` pinning: a qnode caches a compiled tape per `interface` — switching interfaces mid-run invalidates it.
- Mixing Autograd and JAX arrays in the same qnode throws cryptic errors; pick one interface per device.

**Rule of thumb:** Pick PennyLane whenever gradients through circuits are the point — VQE, QAOA, quantum-classical NNs — and lean on the plugin ecosystem so your training code doesn't care whether `dev` is a local simulator, an IBM QPU, or a Braket device.
