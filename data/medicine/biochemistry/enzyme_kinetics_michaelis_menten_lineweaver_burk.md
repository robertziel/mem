### Enzyme Kinetics

**Michaelis-Menten:** v = (Vmax × [S]) / (Km + [S])

| Parameter | Meaning |
|-----------|---------|
| Vmax | Maximum velocity (all enzyme saturated) |
| Km | [S] at which v = ½ Vmax — measure of substrate affinity |
| ↑Km | ↓ affinity for substrate |
| ↓Km | ↑ affinity for substrate |

**Lineweaver-Burk plot** (1/v vs 1/[S]) — straight line:
- Y-intercept = 1/Vmax
- X-intercept = −1/Km
- Slope = Km/Vmax

Linearizes data so inhibitor effects on Vmax vs Km are visible at a glance.

**Inhibitor types:**

| Type | Binds | Effect on Vmax | Effect on Km | LB plot |
|------|-------|----------------|--------------|---------|
| Competitive | Active site | Unchanged | ↑ | Lines cross on Y-axis |
| Noncompetitive | Allosteric (E or ES) | ↓ | Unchanged | Lines cross on X-axis |
| Uncompetitive | ES complex only | ↓ | ↓ | Parallel lines |
| Mixed | Both E and ES (≠ affinity) | ↓ | Variable | Lines cross left of Y, off X |

**Quick recognition:**
- Adding more substrate **overcomes competitive** inhibition (Vmax preserved)
- Adding more substrate **does NOT** overcome non-/un-competitive (Vmax falls)

**Cooperativity (sigmoidal kinetics):**

| Type | Curve | Example |
|------|-------|---------|
| Hyperbolic (M-M) | Standard | Myoglobin (single subunit) |
| Sigmoidal | S-shaped | Hemoglobin, allosteric enzymes (PFK-1) |

**Hill coefficient (n):**
- n = 1 → no cooperativity
- n > 1 → positive cooperativity (Hb n≈2.8)
- n < 1 → negative cooperativity

**Catalytic efficiency:** kcat / Km. Higher = more efficient enzyme.

**Common drug examples:**

| Drug | Inhibition type | Target |
|------|-----------------|--------|
| Methotrexate | Competitive | DHFR (vs folate) |
| Allopurinol | Competitive | Xanthine oxidase |
| Aspirin | Irreversible (covalent acetylation) | COX-1/COX-2 |
| Statins | Competitive | HMG-CoA reductase |
| Lithium | Uncompetitive | Inositol monophosphatase |
| Penicillin | Irreversible | Transpeptidase |

**Common gotchas:**
- "Increased Km" = decreased affinity (counterintuitive)
- Irreversible inhibitors look like noncompetitive on LB plot but can't be relieved by washing
- Allosteric ≠ noncompetitive — allosteric just means binds away from active site
- Cooperative kinetics aren't fit by simple M-M; use Hill equation

**Rule of thumb:** Competitive ↑ Km, Vmax stays. Noncompetitive ↓ Vmax, Km stays. If more substrate fixes it → competitive.
