### AI / ML Recruitment — Interview Topics Index

149 topics that come up in ML engineer / data scientist / applied ML interviews, grouped by area. Each topic has its own cheatsheet — search by keyword.

**See also:** [Master interview overview](recruitment_interview_master_overview.md) · [Ruby/Rails track](recruitment_common_questions_ruby_rails_index.md) · [Frontend track](recruitment_frontend_interview_topics.md)

**Coverage by area:**

| Area | # | Where it lives |
|---|---:|---|
| Foundations | 7 | `ai_ml/foundations/` |
| Probability & Statistics | 12 | `ai_ml/probability_statistics/` |
| Information Theory | 5 | `ai_ml/information_theory/` |
| Optimization & Training | 11 | `ai_ml/optimization_training/` |
| Generalization | 6 | `ai_ml/generalization/` |
| Core Models & Algorithms | 16 | `ai_ml/core_models_algorithms/` |
| Losses & Metrics | 10 | `ai_ml/losses_metrics/` |
| Neural Nets | 9 | `ai_ml/neural_nets/` |
| Vision | 7 | `ai_ml/vision/` |
| Sequence / Transformers | 11 | `ai_ml/sequence_transformers/` |
| Representation / Generative | 7 | `ai_ml/representation_generative/` |
| Reinforcement Learning | 14 | `ai_ml/reinforcement_learning/` |
| Causality / Robustness | 5 | `ai_ml/causality_robustness/` |
| Interpretability / Fairness / Privacy | 5 | `ai_ml/interpretability_fairness_privacy/` |

---

**Foundations (7):** Supervised · Unsupervised · Self-supervised · Generative vs discriminative · Parametric vs non-parametric · Train/val/test split · Data leakage

**Probability & Statistics (12):** Random variable · `E[X]` · `Var(X)` · Covariance / correlation · Independence vs conditional · Bayes' rule · Likelihood · MLE · MAP · Bias (estimator) · Consistency · Overfitting

**Information Theory (5):** Entropy `H(p)` · Cross-entropy · KL divergence `D_KL(p ‖ q)` · Jensen–Shannon · Mutual information `I(X;Y)`

**Optimization & Training (11):** Gradient descent · SGD / mini-batch SGD · Momentum · Adam · LR schedule · Weight decay · Regularization · Early stopping · Convexity · Hessian · Gradient clipping

**Generalization (6):** Bias–variance tradeoff · Generalization gap · VC dimension · PAC learning · Structural risk minimization · Double descent

**Core Models & Algorithms (16):** Linear regression · Logistic regression · Softmax / multinomial logistic · SVM · Kernel trick · k-NN · Naive Bayes · Decision tree · Random forest · Boosting (AdaBoost / GBM) · Gradient boosting · PCA · t-SNE / UMAP · k-means · GMM · EM algorithm

**Losses & Metrics (10):** MSE / L2 · MAE / L1 · Cross-entropy loss · Hinge loss · Log loss · Calibration · Precision / Recall · F1 · ROC-AUC · PR-AUC

**Neural Nets (9):** Perceptron · Activation function · Backpropagation · Vanishing / exploding gradients · Initialization · Normalization (Batch/Layer) · Dropout · Residual connection · Attention (idea)

**Vision (7):** Convolution · Stride / padding · Receptive field · Pooling · BatchNorm in CNNs · IoU · mAP

**Sequence / Transformers (11):** RNN · LSTM / GRU · Transformer · Self-attention · Multi-head attention · Positional encoding · LayerNorm · Autoregressive LM · Masked LM · Tokenization (BPE / WordPiece) · Perplexity

**Representation / Generative (7):** Embedding · Autoencoder · VAE · ELBO · GAN · Mode collapse · Diffusion model (concept)

**Reinforcement Learning (14):** MDP · Policy `π(a\|s)` · Value `V^π(s)` · Q-function `Q^π(s,a)` · Bellman equation · TD learning · Monte Carlo · Q-learning · SARSA · Exploration vs exploitation · On-policy vs off-policy · Policy gradient · Actor-critic · Advantage `A(s,a)`

**Causality / Robustness (5):** Correlation vs causation · Confounder · Distribution shift · Out-of-distribution (OOD) · Adversarial example

**Interpretability / Fairness / Privacy (5):** Feature importance · SHAP · LIME · Fairness metrics · Differential privacy

---

**Frequency by interview type:**

| Tier | Topics | Asked by |
|---|---|---|
| **Drill** (almost always) | Bias–variance · Train/val/test · Overfitting · Cross-entropy loss · Gradient descent · MLE · Precision/Recall + F1 · ROC-AUC · Linear & logistic regression · Decision tree | Every ML screen |
| **Likely** (mid-round) | Adam · Regularization · Random forest / boosting · k-means · PCA · BatchNorm · Backprop · Vanishing gradients · Dropout · Residual · Attention | Senior ML / DS |
| **Differentiator (DL-focused)** | Transformer · Self-attention · Multi-head · Positional encoding · Tokenization · KL divergence · ELBO · VAE · Diffusion | LLM / generative roles |
| **Differentiator (RL-focused)** | MDP · Bellman · Q-learning · Policy gradient · Actor-critic · Exploration vs exploitation | RL / agent roles |
| **Differentiator (research)** | VC dimension · PAC learning · Double descent · OOD · Adversarial · SHAP / LIME · Differential privacy | Research scientist |

**Math you should be able to derive on a whiteboard:**

| Item | Derivation |
|---|---|
| MLE for linear regression | Set ∂/∂β of `‖y − Xβ‖²` to 0 → β = (XᵀX)⁻¹Xᵀy |
| Gradient of cross-entropy + softmax | ∂L/∂z = `p − y` (clean form) |
| Bias / variance decomposition | `E[(ŷ − y)²]` = bias² + variance + irreducible |
| Bayes' rule | `P(H\|E) = P(E\|H) · P(H) / P(E)` |
| Backprop on a tiny MLP | Chain rule from output back through weights |

**Rule of thumb:** **own the Drill tier cold** — those questions are asked of every ML candidate. Pick **one** Differentiator track based on the role (DL / RL / research) and go deep. The math derivations get asked in PhD-style screens; for applied roles, intuitive explanations beat formula recitation.
