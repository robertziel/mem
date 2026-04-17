### CI/CD for Quantum Notebooks — papermill, nbmake, GitHub Actions

**What it is:** A pipeline that executes Jupyter notebooks on every push, matrixed across simulator backends, so demos and tutorials stay runnable as Qiskit and your own code evolve. Quantum notebooks rot fast: APIs deprecate (`execute` → `Sampler` → `SamplerV2`), backends retire, primitives change signatures. Running them in CI is the cheapest way to notice.

**When to use:**
- Any repo shipping example notebooks (tutorials, papers, demos).
- Docs that embed executed outputs (nbsphinx / jupyter-book builds).
- Regression gates before a release — rerun all notebooks with the new Qiskit version.

**Two execution styles:**

| Tool | What it does | Best for |
|---|---|---|
| `papermill` | Execute a notebook, inject parameters, save output .ipynb | Parameter sweeps; long-form notebooks you publish |
| `nbmake` (pytest plugin) | `pytest --nbmake` treats every cell as a test | Fast-fail unit-style checks; hundreds of short notebooks |

Use both: `nbmake` for per-PR fast checks, `papermill` for nightly full runs with real-hardware secrets.

**Layout:**
```
notebooks/
  01_bell_state.ipynb
  02_vqe_h2.ipynb
tests/
  test_notebooks.py        # pytest + nbmake
.github/workflows/
  notebooks.yml
```

**Compact GitHub Actions YAML:**
```yaml
name: notebooks
on: [push, pull_request]
jobs:
  execute:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        backend: [aer_statevector, aer_noisy, fake_sherbrooke]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt pytest nbmake papermill
      - name: Run notebooks
        env:
          QISKIT_BACKEND: ${{ matrix.backend }}
          QISKIT_IBM_TOKEN: ${{ secrets.QISKIT_IBM_TOKEN }}
        run: pytest --nbmake --nbmake-timeout=300 notebooks/
```

**Parametrised papermill run (nightly, hits real hardware):**
```python
import papermill as pm
for shots in (1024, 4096, 16384):
    pm.execute_notebook(
        "notebooks/02_vqe_h2.ipynb",
        f"out/vqe_h2_{shots}.ipynb",
        parameters={"shots": shots, "backend_name": "ibm_sherbrooke"},
        kernel_name="python3",
    )
```
Cell tagged `parameters` in the notebook receives `shots`/`backend_name` — see papermill docs.

**Caching provider auth:**
- Store `QISKIT_IBM_TOKEN` as a GitHub Actions encrypted secret.
- In the notebook, read from env: `QiskitRuntimeService(channel="ibm_cloud", token=os.environ["QISKIT_IBM_TOKEN"])`.
- Never `service.save_account()` in CI — it persists to disk and can leak via cached runners.
- Limit secret scope to the workflow file; use branch protection to prevent fork PRs from requesting it.

**Pitfalls:**
- **Wall time blowups.** A VQE notebook that takes 30s locally can hit a 6h runner limit on hardware matrix rows. Use `--nbmake-timeout` and mark hardware cells with `@skip_unless(os.getenv("HARDWARE"))`.
- **Cell output diffs.** `nbmake` by default ignores output differences; `nbmake-lint` or `nbdime` diffs them — opt in only if determinism is pinned (see reproducibility_seeds_calibration_snapshots).
- **Matplotlib in CI.** Set `matplotlib.use("Agg")` or headless-backend errors kill the run.
- **Queue time on real backends.** A PR check that queues for 4 hours is not a check. Keep hardware tests on `schedule:` (nightly), not `push`.
- **Stale kernel metadata.** Notebooks committed with `kernel: python-3.10-custom` break on CI's generic `python3`; normalise with `jupyter nbconvert --to notebook --inplace --clear-output`.

**Rule of thumb:** Run every notebook on every PR against simulators only — save real-hardware execution for a scheduled nightly job with secrets, otherwise your CI bill and queue time will outpace your actual quantum compute.
