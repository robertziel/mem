### Data Visualization Principles (chart choice, color, pre-attentive attributes, grammar of graphics)

**When:** every analysis, every dashboard, every model report. Bad visualizations **mislead more than they inform** — wrong chart type, axis truncation, color misuse cost real decisions. Good viz makes patterns obvious and decisions easy.

**Schema (the four design layers):**

| Layer | Question |
|---|---|
| **Data** | What's the structure (categorical, continuous, time)? |
| **Encoding** | Which visual property maps to which variable? |
| **Composition** | How are panels / layers arranged? |
| **Annotation** | What story / labels guide the reader? |

> **Form follows data type**. Pick the chart by what you're showing, not by what looks impressive.

#### Pre-attentive attributes (perceived without effort)

Cleveland & McGill (1984) ranked encodings by accuracy:

| Rank | Encoding | Accuracy |
|---|---|---|
| 1 | Position on common scale | Best |
| 2 | Position on non-aligned scale | |
| 3 | Length |  |
| 4 | Angle / slope | |
| 5 | Area | |
| 6 | Volume | |
| 7 | Color hue / saturation | Worst |
| 8 | Density | |

> **Always prefer position / length** over color / size. Pie charts use angle (rank 4); bar charts use length (rank 3) — bar charts always more accurate.

#### Chart picker (by data type)

| Show | Best chart | Avoid |
|---|---|---|
| Distribution of one variable | Histogram, density plot, box plot | Pie chart |
| Comparison across categories | Bar chart, dot plot | Pie when > 5 categories |
| Time series | Line chart | Bar chart unless discrete time |
| Two continuous variables | Scatter plot | Bar |
| Categorical × continuous | Box plot, violin, strip plot | Bar with single point |
| Two categorical | Heatmap, mosaic | Stacked bar |
| Part-to-whole (≤ 5 parts) | Bar; pie acceptable | Bar usually clearer |
| Geographic | Choropleth, points on map | 3D anything |
| Correlation matrix | Heatmap | 3D bars |
| Multi-variate | Pair plot, parallel coordinates, scatter matrix | 3D |
| Composition over time | Stacked area | 3D stacked bar |
| Hierarchy | Treemap, sunburst | Nested pies |
| Networks | Force-directed, hierarchical layout | Random layouts |
| Distributions side by side | Violin, box, ridge | Stacked histograms |
| Uncertainty | Error bars, confidence bands | Single line |

#### When to NOT use each

| Chart | Avoid when |
|---|---|
| **Pie** | > 5 slices; comparing similar values |
| **3D bars / pies** | Always — distorts perception |
| **Dual axis** | Different scales mislead |
| **Stacked bar** | Comparing non-bottom segments |
| **Bar starting above 0** | Magnifies small differences |
| **Line for unordered categories** | Implies continuity |
| **Scatter for huge data** | Overplotting; use hexbin / 2D density |
| **Heatmap with rainbow color** | See color section |

#### Color — the most-abused channel

| Use | Detail |
|---|---|
| **Categorical** (≤ 8 categories) | Qualitative palette (Set1, Paired, Tableau 10) |
| **Continuous, unipolar** (low → high) | Sequential (Viridis, Blues, Greens) |
| **Continuous, bipolar** (negative ← 0 → positive) | Diverging (RdBu, BrBG) — center color = neutral |
| **Highlight one value** | Gray + one accent color |
| **Categorical, > 8** | Combine alternative encoding (shape, panel) |

```python
import matplotlib.pyplot as plt
plt.scatter(x, y, c=z, cmap="viridis")        # sequential, perceptually uniform
plt.scatter(x, y, c=z, cmap="RdBu", center=0) # diverging
```

#### Color rules

| Rule | Why |
|---|---|
| **Use Viridis / Cividis / Plasma**, not rainbow / jet | Perceptually uniform; colorblind-friendly |
| **Diverging palettes for centered scales** | RdBu, BrBG; symmetric around zero |
| **8% of men are colorblind** — test palettes | Use simulators (Coblis) |
| **Avoid red + green** for "good vs bad" | Red-green colorblind common |
| **Background neutrality** | Avoid gradients / patterns |
| **Limit to ≤ 8 colors per chart** | More = unreadable |
| **Sequential luminance** | Light → dark for low → high |

#### Anti-patterns to spot

| Anti-pattern | Why bad |
|---|---|
| **Truncated y-axis on bar chart** | Magnifies small differences misleadingly |
| **3D charts** | Distorts perception (Cleveland's hierarchy) |
| **Pie chart with slices > 5** | Hard to compare angles |
| **Dual y-axis** | Implies relationship that may not exist |
| **Rainbow / jet colormap** | Perceptually non-uniform |
| **Too many colors** | Eye can track ~5 distinct categories |
| **No labels / units** | Reader has to guess |
| **Grid lines as dark as data** | Data should pop |
| **Default Excel chart styling** | Heavy borders, gradients, background colors |
| **Decimals beyond meaning** | "67.3429%" implies false precision |
| **Pictographs sized by area** | Underestimated by viewers |

#### Axis design

| Practice | Detail |
|---|---|
| **Bar charts: y-axis at 0** | Lengths are perceived from 0 |
| **Line charts: tighter range OK** | Slope is the signal |
| **Log scale** for orders-of-magnitude data | Clear when needed; label |
| **Symmetric log** for negatives + positives | Linear near zero |
| **Date formatting** | "2024-01" not "Jan 1, 2024 12:00:00 AM" |
| **Round tick marks** | Avoid 1.7349 |
| **Don't break axis** | Confusing; pick a different chart |

#### Annotation

| Element | Use |
|---|---|
| Title | Clear, declarative ("Revenue grew 23% in Q3") |
| Subtitle | Context ("Compared to industry avg of 12%") |
| Axis labels with units | "Revenue ($M)" not "Revenue" |
| Direct labels on lines | Replace legend when possible |
| Highlight key data | Annotation arrows / boxes |
| Source / footnote | Data provenance |
| Legend | Only when needed; place close to data |

> **A chart should answer one question.** Annotations make the answer obvious.

#### Grammar of Graphics (ggplot / plotnine / Vega)

```python
# plotnine (Python ggplot)
from plotnine import ggplot, aes, geom_point, geom_smooth, facet_wrap, theme_minimal

(ggplot(df, aes("price", "revenue", color="region"))
 + geom_point(alpha=0.5)
 + geom_smooth(method="lm")
 + facet_wrap("~category")
 + theme_minimal())
```

| Layer | What |
|---|---|
| **Data** | DataFrame |
| **Aesthetic mapping** | Variables → visual properties (`x`, `y`, `color`) |
| **Geom** | Visual mark (point, line, bar) |
| **Stat** | Transformation (mean, count, smooth) |
| **Scale** | Mapping from data to visual (log, linear, color palette) |
| **Coordinate** | Cartesian, polar, log |
| **Facet** | Small multiples |
| **Theme** | Non-data styling |

> Grammar of graphics composes any chart from these layers. **More flexible than chart-type APIs**.

#### Tools

| Tool | Strength |
|---|---|
| **Matplotlib** | Foundational; total control; verbose |
| **Seaborn** | High-level statistical plots on top of matplotlib |
| **Plotnine** (Python ggplot) | Grammar of graphics |
| **Plotly / Bokeh** | Interactive; web-ready |
| **Altair / Vega-Lite** | Declarative; ggplot-like |
| **D3.js** | Custom web visualizations |
| **Tableau / Power BI / Looker** | Business dashboards |
| **Observable Plot** | Modern web charting |
| **Streamlit / Dash / Panel** | Python dashboards |

#### Patterns / cookbook

##### Highlight a single value

```python
colors = ["lightgray"] * len(categories)
colors[idx_of_interest] = "C0"
plt.bar(categories, values, color=colors)
```

##### Add reference lines

```python
plt.axhline(median, color="gray", linestyle="--", label="median")
plt.axvline(target, color="red", linestyle="--", label="target")
```

##### Small multiples (faceting)

```python
g = sns.FacetGrid(df, col="category", col_wrap=4, height=3)
g.map(sns.histplot, "value")
```

##### Time-series with confidence band

```python
plt.plot(t, y_hat)
plt.fill_between(t, y_lower, y_upper, alpha=0.3)
```

#### Dashboards

| Principle | Detail |
|---|---|
| **One question per page** | Don't overload |
| **Top-down** | Most important up top |
| **Z-pattern reading** | Eye scans Z; lay out accordingly |
| **Consistent units / scale** | Comparable across charts |
| **Filters apply globally** | Predictable behavior |
| **Drill-down available** | Aggregate → detail navigation |
| **Action-oriented** | "Sales below target → click for breakdown" |

#### A/B test result viz template

| Element | Detail |
|---|---|
| Estimated effect | Bar with CI error bars |
| Per-segment effect | Forest plot |
| Distribution by arm | Box plot or violin |
| Time series of metric | Line chart, both arms |
| Cumulative event count | Conversion funnel |
| Sample-ratio mismatch table | Numeric |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Bar chart starting above 0 | Always start bars at 0 |
| 3D pie chart | Use bar chart |
| Truncated y-axis | Don't, or annotate clearly |
| Same color for too many categories | Use ≤ 8; otherwise facet |
| Rainbow colormap | Use Viridis or Cividis |
| Missing units / labels | Always annotate |
| Default Excel styling | Use a clean theme (e.g., minimalist) |
| Title that just describes the chart | Title should declare insight |
| Legend separate from data | Direct labels often clearer |
| Treating dashboards as data dumps | One question per dashboard |
| Ignoring color blindness | Test with simulators |
| Showing all data when summary is enough | Reduce to insight |

#### When viz is worth investing in

| Audience | Investment |
|---|---|
| Leadership presentation | High — single, polished chart |
| Engineering monitoring | Medium — readable but functional |
| Personal exploration | Low — quick + dirty |
| Public-facing | Very high — accessibility, accuracy |
| Stakeholder dashboard | High — consistent, automated |

#### Story arc (for presentations)

| Step | Action |
|---|---|
| 1. Set context | What's the question / situation? |
| 2. Show baseline | What's normal / expected? |
| 3. Reveal the change | What did we observe? |
| 4. Diagnose / segment | Why? Where? When? |
| 5. Recommend / decide | What now? |

#### Effective titles

| Bad | Good |
|---|---|
| "Revenue chart" | "Revenue grew 23% in Q3, driven by EMEA" |
| "Daily users" | "Daily active users plateaued in November" |
| "Funnel" | "Drop-off concentrated at checkout step (12% conversion)" |

> **Titles should declare insight**, not describe the chart.

#### Pre-attentive in practice

| Need | Best encoding |
|---|---|
| "Find the outlier" | Position (axis), color saturation |
| "Compare two values" | Position on common scale |
| "Show trend over time" | Position (line) |
| "Group items" | Color hue, shape |
| "Show magnitude" | Length (bar) |
| "Highlight one in many" | Color contrast |
| "Show many distributions" | Small multiples > overlay |

**Rule of thumb:** **pick the chart by data type, not aesthetic**. Use **Cleveland's hierarchy**: position > length > area > color. **Bar charts at zero, lines for time, scatter for two continuous, heatmap for two categorical**. **Viridis** for continuous color, **diverging** for centered, **categorical palettes** for ≤ 8 groups. **Title declares insight** — chart is the proof. **Test for colorblindness**. Avoid 3D, dual axis, pie > 5 slices, truncated bar y-axes.
