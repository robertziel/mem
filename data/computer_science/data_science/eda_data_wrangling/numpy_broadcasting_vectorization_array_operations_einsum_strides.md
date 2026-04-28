### NumPy (broadcasting, vectorization, array operations, einsum, strides)

**When:** numerical computation in Python — feature engineering, batch math, ML inference, scientific computing. The foundation under pandas / scikit-learn / PyTorch. Knowing **vectorization and broadcasting** is the difference between code that uses 1 CPU and 100 CPUs (via SIMD / BLAS).

#### Core concepts

| Concept | Detail |
|---|---|
| **ndarray** | N-dimensional array with uniform dtype |
| **Vectorization** | Operations on whole arrays via C / BLAS — no Python loop |
| **Broadcasting** | How arrays of different shapes interact in element-wise ops |
| **Strides** | How NumPy reads memory; views share data |
| **dtype** | `int8/16/32/64`, `float16/32/64`, `bool`, `complex`, `object` |

#### Broadcasting rules

When operating on arrays of different shapes, NumPy aligns dimensions **from the right**:

| Step | Rule |
|---|---|
| 1 | Right-align shapes by adding 1s on the left |
| 2 | For each dimension, sizes must be **equal**, or one must be **1** |
| 3 | The 1-sized dim is **stretched** (logically) to match |

```python
a = np.zeros((3, 1))     # shape (3, 1)
b = np.zeros((1, 4))     # shape (1, 4)
a + b                     # broadcasts to (3, 4)

X = np.zeros((5, 3))     # 5 samples, 3 features
mean = X.mean(axis=0)    # shape (3,)
X - mean                  # broadcasts: subtract mean from each row
```

| Shape A | Shape B | Result |
|---|---|---|
| (5, 3) | (3,) | (5, 3) |
| (5, 3) | (5, 1) | (5, 3) |
| (5, 1) | (1, 3) | (5, 3) |
| (5, 3) | (4,) | **Error** (3 vs 4 mismatch) |

#### Common patterns

```python
# Subtract mean per column (z-score numerator)
(X - X.mean(axis=0)) / X.std(axis=0)

# Element-wise distance matrix
diff = X[:, None, :] - Y[None, :, :]    # (n, m, d)
sq_dist = (diff ** 2).sum(axis=-1)       # (n, m)

# Pairwise dot products (Gram matrix)
X @ X.T                                   # (n, n)

# One-hot encode integer labels (no for loop)
labels = np.array([0, 2, 1, 2])
n_classes = 3
oh = np.eye(n_classes)[labels]            # (4, 3)

# Argmax along axis
preds = np.argmax(scores, axis=1)

# Fancy indexing
X[[0, 2, 5], :]                           # rows 0, 2, 5
X[X[:, 0] > 0]                            # rows where first column is positive
```

#### Common operations

| Op | Numpy |
|---|---|
| Reshape | `a.reshape(2, -1)` (-1 = infer) |
| Add axis | `a[:, None]` or `a[..., None]` or `np.expand_dims` |
| Squeeze | `a.squeeze()` |
| Transpose | `a.T`, `a.swapaxes(0, 1)`, `a.transpose((2, 0, 1))` |
| Concatenate | `np.concatenate([a, b], axis=0)` or `np.stack`, `np.hstack`, `np.vstack` |
| Tile / repeat | `np.tile(a, (3, 2))`, `np.repeat(a, 3, axis=0)` |
| Sort | `np.sort(a, axis=-1)`, `np.argsort` |
| Unique | `np.unique(a, return_counts=True)` |
| Where | `np.where(cond, a, b)` |
| Cumsum / cumprod | `a.cumsum(axis=0)` |
| Diff | `np.diff(a, n=1, axis=0)` |
| Clip | `a.clip(min, max)` |
| Element-wise math | `np.exp`, `np.log`, `np.sin`, `np.maximum`, `np.minimum` |
| Reductions | `a.sum`, `a.mean`, `a.std`, `a.min`, `a.max`, `a.argmin`, `a.argmax` |

> Most operations have an `axis` argument. **`axis=None`** = over the whole array; **`axis=0`** = over rows (collapse rows); **`axis=1`** = over columns.

#### Linear algebra

```python
A @ B                                  # matrix multiply (recommended)
np.dot(A, B)                            # same
A.T                                     # transpose
np.linalg.inv(A)                        # inverse (rarely needed; prefer solve)
np.linalg.solve(A, b)                   # solve A x = b
np.linalg.eig(A)                        # eigenvalues / eigenvectors
np.linalg.svd(A)                        # SVD
np.linalg.norm(a)                       # L2 norm
np.linalg.det(A)                        # determinant
```

> Always **`solve`**, never **`inv`** — more numerically stable.

#### `einsum` (when complexity grows)

```python
# Trace
np.einsum("ii->", A)                   # sum of diagonal

# Dot product
np.einsum("i,i->", a, b)               # equivalent to a @ b

# Matrix multiply
np.einsum("ij,jk->ik", A, B)           # A @ B

# Batch matrix multiply
np.einsum("bij,bjk->bik", A_batch, B_batch)

# Outer product
np.einsum("i,j->ij", a, b)             # a[:, None] * b[None, :]

# Sum specific axes
np.einsum("ijk->ik", T)                # sum over axis j
```

> `einsum` makes index manipulations explicit — readable for complex tensor ops, often as fast as hand-coded.

#### Random numbers (modern API)

```python
rng = np.random.default_rng(seed=42)

rng.random((3, 4))                     # uniform [0, 1)
rng.normal(loc=0, scale=1, size=(3, 4))
rng.integers(0, 10, size=5)
rng.choice([1, 2, 3], size=10, replace=True, p=[0.5, 0.3, 0.2])
rng.permutation(arr)
rng.shuffle(arr)                       # in-place
```

> **Use `default_rng()`**, not `np.random.seed()` (legacy global state).

#### Memory and views vs copies

```python
a = np.arange(10)
b = a[2:7]                             # VIEW — modifies a
b[0] = 99                              # a[2] is now 99

c = a[[0, 2, 5]]                       # COPY (fancy indexing always copies)
c[0] = 100                             # a unchanged

# Force a copy
d = a.copy()
```

| Operation | Result |
|---|---|
| Slicing `a[2:5]` | View |
| Reshape (when contiguous) | View |
| Transpose | View |
| Boolean indexing | Copy |
| Fancy indexing (int array) | Copy |
| `.copy()` | Copy |

#### Performance tips

| Tip | Why |
|---|---|
| Use `np.float32` instead of `float64` if precision allows | 2× memory, 2× speed on matrix ops |
| Avoid Python loops; use vectorized ops | C-speed |
| Pre-allocate arrays; don't `np.append` in loops | `append` copies |
| Use `out=` parameter to write into existing array | Saves allocation |
| Use BLAS (matmul) where possible | Multi-threaded |
| Profile with `%timeit` and `np.show_config()` | Confirm BLAS backend |
| For huge arrays, use `np.memmap` | Out-of-core |
| Use Numba / Cython for inner loops that **can't** vectorize | JIT compilation |
| `np.einsum_path` to optimize einsum execution order | Multi-tensor contractions |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Iterating with Python loops | Vectorize or use `np.apply_along_axis` (still slow but clearer) |
| `np.append` in a loop | Pre-allocate; use lists then `np.array` once |
| `dtype=object` arrays | Loses C-speed; usually a sign of mixed types |
| Comparing arrays with `==` instead of `np.array_equal` | Returns array, not bool |
| `if arr:` on multi-element array | Ambiguous — use `arr.any()` or `arr.all()` |
| Modifying view, surprised by source change | Use `.copy()` if needed |
| Mixing `int` and `float` accidentally | NumPy upcasts; check `dtype` |
| Indexing with floats | Convert to int first |
| Using `np.matrix` | Deprecated — use 2D ndarray + `@` |

#### NaN handling

```python
np.nan == np.nan                       # False!
np.isnan(arr).any()
np.nansum(arr), np.nanmean(arr)        # ignore NaN
arr[np.isnan(arr)] = 0                 # fill with 0
```

> `nan != nan` — use `np.isnan` always.

#### Broadcasting recipes

**Pairwise distance (efficient):**

```python
# Squared Euclidean distance between every pair (X, Y)
sq_dist = (X[:, None, :] - Y[None, :, :]) ** 2
sq_dist = sq_dist.sum(-1)              # (n_X, n_Y)

# More memory-efficient via dot product expansion:
# ||x - y||² = ||x||² - 2·x·y + ||y||²
sq_dist = (X**2).sum(1)[:, None] - 2 * X @ Y.T + (Y**2).sum(1)[None, :]
```

**Standardize per feature:**

```python
X_std = (X - X.mean(axis=0)) / X.std(axis=0)
```

**Apply different threshold per column:**

```python
mask = X > thresholds[None, :]         # thresholds shape (d,)
```

**Top-K indices per row:**

```python
topk = np.argpartition(scores, -k, axis=1)[:, -k:]
```

#### NumPy ↔ pandas / scikit-learn

| Convert | How |
|---|---|
| pandas DataFrame → NumPy | `df.values` or `df.to_numpy()` |
| NumPy → pandas | `pd.DataFrame(arr, columns=[...])` |
| Sparse matrix | `scipy.sparse.csr_matrix(arr)` |
| GPU array | `cupy.asarray(arr)` (CuPy mirrors NumPy API) |
| PyTorch tensor | `torch.from_numpy(arr)` |

**Rule of thumb:** **vectorize, broadcast, never loop**. Use **`@`** for matmul, **`einsum`** for complex tensor ops, **`np.linalg.solve`** instead of `inv`. **Float32** for ML where precision allows. **`default_rng()`** for randomness. Slicing is a **view**, fancy indexing is a **copy** — be explicit when it matters. NumPy is the substrate of the entire scientific Python stack.
