### Recruitment Common Questions — Interview Index

279 topics that come up in technical interviews, grouped by area. Each topic has its own cheatsheet — find by typing the keyword in the mem search.

**Coverage by area:**

| Area | # topics | Where it lives in the corpus |
|---|---:|---|
| Ruby / Rails | 31 | `ruby/`, `design_patterns/`, `database_engineering/` |
| Full-stack / FE crossover | 2 | `frontend/web_fundamentals/` |
| Common gems | 1 | `ruby/rails/features/` |
| AI / ML | 149 | `ai_ml/` (12 sub-areas: foundations, prob/stats, info theory, optimization, generalization, core models, losses/metrics, neural nets, vision, sequence/transformers, representation/generative, RL, causality/robustness, interpretability/fairness/privacy) |
| Frontend (full track) | 120 | `frontend/` (web fundamentals, browser arch, JS core, TS, HTML/A11y, CSS, perf, security/auth, architecture, React, testing, tooling, common prompts) |

---

**Ruby / Rails (31):**

| # | Topic | # | Topic |
|---:|---|---:|---|
| 1 | SOLID principles | 17 | DDD |
| 2 | CSRF | 18 | REST meaning |
| 3 | What is Rack | 19 | DRY |
| 4 | Strong parameters | 20 | DDT (data-driven testing) |
| 5 | Single table inheritance | 21 | Immutable data |
| 6 | Polymorphic associations | 22 | Language types (Ruby / JS) |
| 7 | Callbacks | 23 | Load / Require / Include / Extend |
| 8 | `scope` vs `self.method` | 24 | Lambda vs proc |
| 9 | Session management | 25 | REST API vs GraphQL |
| 10 | App server vs web server | 26 | Indexes on large tables |
| 11 | N+1 & eager loading | 27 | Indexes pros / cons |
| 12 | PUT vs PATCH | 28 | NoSQL vs SQL |
| 13 | Big-O basics | 29 | Microservices pitfalls |
| 14 | Frozen strings | 30 | Scaling for high traffic |
| 15 | String vs symbol | 31 | Garbage collector |
| 16 | Event sourcing | | |

**Full-stack crossover (2):** HTML5 `img` `srcset` · Web workers
**Common gems (1):** Popular Rails gems list

---

**AI / ML — by sub-area:**

| Sub-area | Topics |
|---|---|
| Foundations (7) | Supervised · Unsupervised · Self-supervised · Generative vs discriminative · Parametric vs non-parametric · Train/val/test · Data leakage |
| Probability & Statistics (12) | Random variable · E[X] · Var(X) · Covariance / correlation · Independence vs conditional · Bayes' rule · Likelihood · MLE · MAP · Bias (estimator) · Consistency · Overfitting |
| Information Theory (5) | Entropy `H(p)` · Cross-entropy · KL divergence · Jensen–Shannon · Mutual info `I(X;Y)` |
| Optimization Training (11) | Gradient descent · SGD / mini-batch · Momentum · Adam · LR schedule · Weight decay · Regularization · Early stopping · Convexity · Hessian · Gradient clipping |
| Generalization (6) | Bias–variance · Generalization gap · VC dimension · PAC learning · SRM · Double descent |
| Core Models / Algorithms (16) | Linear / Logistic / Softmax regression · SVM · Kernel trick · k-NN · Naive Bayes · Decision tree · Random forest · Boosting (AdaBoost/GBM) · Gradient boosting · PCA · t-SNE / UMAP · k-means · GMM · EM |
| Losses & Metrics (10) | MSE · MAE · Cross-entropy loss · Hinge · Log loss · Calibration · Precision / Recall · F1 · ROC-AUC · PR-AUC |
| Neural Nets (9) | Perceptron · Activation · Backprop · Vanishing/exploding grads · Init · Norm · Dropout · Residual · Attention (idea) |
| Vision (7) | Convolution · Stride / padding · Receptive field · Pooling · BatchNorm in CNNs · IoU · mAP |
| Sequence / Transformers (11) | RNN · LSTM/GRU · Transformer · Self-attention · Multi-head · Positional encoding · LayerNorm · Autoregressive LM · Masked LM · Tokenization (BPE/WordPiece) · Perplexity |
| Representation / Generative (7) | Embedding · Autoencoder · VAE · ELBO · GAN · Mode collapse · Diffusion (concept) |
| Reinforcement Learning (14) | MDP · Policy `π(a\|s)` · `V^π(s)` · `Q^π(s,a)` · Bellman · TD learning · Monte Carlo · Q-learning · SARSA · Exploration vs exploitation · On-policy vs off-policy · Policy gradient · Actor-critic · Advantage |
| Causality / Robustness (5) | Correlation vs causation · Confounder · Distribution shift · OOD · Adversarial example |
| Interpretability / Fairness / Privacy (5) | Feature importance · SHAP · LIME · Fairness metrics · Differential privacy |

---

**Frontend — by sub-area:**

| Sub-area | Topics |
|---|---|
| Web Fundamentals (9) | Client–server · URL · HTTP · HTTP methods · Idempotency · Headers · Status codes · Content negotiation · MIME type |
| Browser Architecture (9) | Rendering pipeline · DOM · CSSOM · Layout (reflow) · Paint · Compositing · Reflow vs repaint · Critical rendering path · Main thread |
| JavaScript Core Theory (14) | Execution context · Call stack · Heap · Hoisting · Scope · Closure · `this` binding · Prototype chain · Event loop · Macrotask vs microtask · Promise · Async/await · Strict mode · Immutability |
| TypeScript Typing (6) | Structural typing · Union / intersection · Generics · Type narrowing · `any` vs `unknown` · Type inference |
| HTML Semantics & A11y (6) | Semantic HTML · ARIA · Keyboard a11y · Focus mgmt · Form semantics · WCAG |
| CSS Theory Keys (14) | Specificity · Cascade · Inheritance · Box model · BFC · Positioning · Flexbox · Grid · Responsive · Units · Stacking context / z-index · CSS variables · Animations vs transitions · GPU-friendly props |
| Performance / Web Vitals (10) | Bundle size · Tree shaking · Code splitting · Lazy loading · Caching · Compression · Critical CSS · Debounce / throttle · Virtualization · Core Web Vitals |
| Network Security & Auth (10) | CORS · Same-Origin Policy · CSRF · XSS · CSP · Cookies · LocalStorage vs SessionStorage · JWT · OAuth · PKCE |
| Architecture Patterns (9) | SPA vs MPA · SSR · SSG · Hydration · Islands · State mgmt · Controlled vs uncontrolled · Design systems · Component composition |
| React (13) | JSX · Virtual DOM · Reconciliation · Key prop · Props vs state · Derived state · Hooks · `useEffect` · `useMemo` / `useCallback` · Context · Controlled re-render · StrictMode · Concurrent rendering |
| Testing Theory (6) | Unit · Integration · E2E · Mocking vs stubbing · Test pyramid · A11y testing |
| Tooling & Build (7) | Bundler · Transpiler · Polyfill · Source maps · Linting · Formatting · CI |
| Common Theory Prompts (7) | Browser rendering pipeline · `useEffect` vs `useLayoutEffect` · CORS vs Same-Origin · Prevent XSS/CSRF in SPA · SSR vs SPA + hydration · Optimize LCP/INP/CLS · Event loop ordering |

---

**Highest-frequency areas to drill (Polish/EU Ruby/Rails recruitment):**

| Tier | Areas | Why |
|---|---|---|
| Drill (asked almost always) | SOLID · DRY · REST · N+1 · Strong params · CSRF · Polymorphic associations · STI · Sessions · Indexes pros/cons | Stock first-round questions |
| Likely (mid-round) | Callbacks lifecycle · `scope` vs class methods · Lambda vs proc · Microservices pitfalls · Scaling · GC · Eager loading variants (`includes` / `preload` / `eager_load`) | Senior screening signals |
| Differentiator (senior) | Event sourcing · DDD · Big-O on hot paths · Service objects · App server vs web server (Puma internals) · GraphQL vs REST trade-offs | Architectural depth |

**Rule of thumb:** scan the area-overview table to confirm what's covered, drill the **Drill** tier first (those are stock questions across recruiters), then walk the **Likely** tier the day before. Open the individual cheatsheets via the mem search — the keyword in the topic name is the search term.
