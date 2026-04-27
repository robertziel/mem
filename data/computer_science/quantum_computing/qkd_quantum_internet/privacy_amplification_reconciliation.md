### Privacy Amplification and Reconciliation — From Raw to Final Key

**What it is:**
After the quantum phase of QKD, Alice and Bob share a **noisy, partially-leaked** raw bit string. Two classical post-processing steps distill it into a secret: **information reconciliation** (error correction) makes their strings identical, and **privacy amplification** (universal hashing) compresses the corrected key to remove Eve's residual information.

**Full pipeline:**
```
 raw key  ──► sifting   ──►  reconciliation ──► privacy amplification ──► final key
 (Alice ≠   (match        (Alice = Bob,           (Alice = Bob,
  Bob, some  bases,         but Eve has            Eve has
  Eve info)  drop rest)     leaked bits + QBER)    negligible info)
    N          n ≈ qN         k = n − bits_leak   ℓ = k − privacy_leak
```

**Reconciliation — error correction over a public channel:**
Goal: given Alice's string X and Bob's string Y with bit-error rate e_b, make Bob's copy match Alice's while leaking minimum information. Modern systems use **LDPC** or **polar codes** with syndrome-based decoding:
```
Alice:  computes syndrome  s = H · X   (parity-check matrix H)
Alice:  sends s over public channel  (leak: |s| = (1−R) · n bits)
Bob:    runs belief-propagation decode  X̂ = arg max P(X | Y, s)
Alice+Bob: verify with a short universal-hash tag (abort if mismatch)
```

**Reconciliation efficiency:**
```
f = leak_EC / [ n · H₂(e_b) ]       f ≥ 1
                       Shannon limit: f = 1 (impossible to reach)
practical LDPC:  f ≈ 1.05–1.10 at e_b = 2–5%
practical polar: f ≈ 1.05 with list decoding + CRC
```

**Why universal hashing for privacy amplification:**
After reconciliation, Eve knows:
- the error-correction syndrome (leak_EC bits)
- up to λ bits of information about the n-bit key from the quantum phase

Alice and Bob agree on a **random universal-hash function** h: {0,1}ⁿ → {0,1}^ℓ (e.g. Toeplitz matrix multiplication mod 2, or a random polynomial hash) and set
```
K = h(X)
```
The **leftover hash lemma** guarantees: if ℓ ≤ H_min(X|E) − 2 log₂(1/ε), then K is ε-close to uniform given Eve's side info, i.e. K is a true secret key.

**Final key length (asymptotic):**
```
ℓ = n · [ 1 − H₂(e_ph) ]  −  leak_EC
      e_ph     = phase error (bounds Eve's info)
      leak_EC  ≈ f · n · H₂(e_b)
```
Rearranged: R = 1 − H₂(e_ph) − f H₂(e_b), matching the BB84 key-rate formula.

**Finite-key composable formula:**
```
ℓ ≤ H_min^ε(X|E) − leak_EC − 2 log₂(1/ε_PA)
      H_min^ε   = smooth min-entropy, from quantum statistics + finite-key bounds
      ε_PA      = privacy-amplification failure probability
```

**Pipeline diagram with sizes:**
```
N raw pulses
   │  quantum phase
   ▼
n = qN sifted bits            ← sifting; q ≈ 1/2
   │  EC syndrome (public):  leak_EC ≈ f n H₂(e_b)
   ▼
n bits corrected, Eve knows leak_EC + quantum leakage λ
   │  privacy amplification: pick random hash h, send seed publicly
   ▼
ℓ = n − leak_EC − λ − 2 log(1/ε) secret bits
```

**Reconciliation algorithm comparison:**
| Scheme | Efficiency f | Complexity | Suitable for |
|---|---|---|---|
| Cascade (interactive) | 1.05–1.2 | O(n log n), many rounds | low-latency links, small n |
| LDPC + rate adaptation | 1.05–1.10 | O(n), 1 round | high-throughput DV-QKD |
| Polar codes | 1.03–1.06 | O(n log n) | finite n, provable rates |
| Multi-edge LDPC (CV) | 1.02–1.05 at low SNR | O(n) | CV-QKD reconciliation |

**Pitfalls:**
- **Don't reuse the hash seed**: the universal-hash seed must be fresh (or from a public source of randomness); reuse compromises composability.
- **Syndrome leak enters privacy amplification**: every bit of EC leakage must be subtracted from ℓ. Forgetting this is a classic proof error.
- **Verification step**: after EC, hash the corrected key and compare a short tag to catch undecoded errors — otherwise a silent decoding failure produces mismatched final keys and catastrophic protocol failure.
- **CV-QKD reconciliation** is over Gaussian variables → needs **slice reconciliation** or multi-dimensional reconciliation, not plain bit codes.
- **Finite-key penalties** in PA are non-negligible: ε_PA = 10⁻¹⁰ subtracts ~66 bits regardless of n.
- **Authenticated classical channel**: all public messages must be authenticated (Wegman-Carter MAC with pre-shared key), else Eve man-in-the-middles the reconciliation.

**Rule of thumb:** Reconciliation burns bits proportional to H₂(QBER); privacy amplification then shrinks the result by Eve's information plus a small security margin — the final key length is essentially n minus everything classical and quantum leakage combined.
