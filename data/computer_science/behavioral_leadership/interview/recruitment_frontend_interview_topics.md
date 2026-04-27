### Frontend Recruitment — Interview Topics Index

120 topics that come up in frontend / full-stack frontend interviews, grouped by area. Each topic has its own cheatsheet — search by keyword.

**See also:** [Master interview overview](recruitment_interview_master_overview.md) · [Ruby/Rails track](recruitment_common_questions_ruby_rails_index.md) · [AI/ML track](recruitment_ai_ml_interview_topics.md)

**Coverage by area:**

| Area | # | Where it lives |
|---|---:|---|
| Web Fundamentals | 9 | `frontend/web_fundamentals/` |
| Browser Architecture | 9 | `frontend/browser_architecture/` |
| JavaScript Core Theory | 14 | `frontend/javascript_core_theory/` |
| TypeScript Typing | 6 | `frontend/typescript_typing/` |
| HTML Semantics & Accessibility | 6 | `frontend/html_semantics_accessibility/` |
| CSS Theory | 14 | `frontend/css_theory_keys/` |
| Performance & Web Vitals | 10 | `frontend/performance_web_vitals/` |
| Network Security & Auth | 10 | `frontend/network_security_auth/` |
| Architecture Patterns | 9 | `frontend/frontend_architecture_patterns/` |
| React | 13 | `frontend/react/` |
| Testing Theory | 6 | `frontend/testing_theory/` |
| Tooling & Build | 7 | `frontend/tooling_build_systems/` |
| Common Theory Prompts | 7 | `frontend/common_theory_prompts/` |

---

**Web Fundamentals (9):** Client–server · URL · HTTP · HTTP methods · Idempotency · Headers · Status codes · Content negotiation · MIME type

**Browser Architecture (9):** Rendering pipeline · DOM · CSSOM · Layout (reflow) · Paint · Compositing · Reflow vs repaint · Critical rendering path · Main thread

**JavaScript Core Theory (14):** Execution context · Call stack · Heap · Hoisting · Scope · Closure · `this` binding · Prototype chain · Event loop · Macrotask vs microtask · Promise · Async/await · Strict mode · Immutability

**TypeScript Typing (6):** Structural typing · Union / intersection types · Generics · Type narrowing · `any` vs `unknown` · Type inference

**HTML Semantics & Accessibility (6):** Semantic HTML · ARIA · Keyboard accessibility · Focus management · Form semantics · WCAG

**CSS Theory (14):** Specificity · Cascade · Inheritance · Box model · BFC · Positioning · Flexbox · Grid · Responsive design · Units · Stacking context / z-index · CSS variables · Animations vs transitions · GPU-friendly properties

**Performance & Web Vitals (10):** Bundle size · Tree shaking · Code splitting · Lazy loading · Caching · Compression · Critical CSS · Debounce / throttle · Virtualization · Core Web Vitals (LCP / INP / CLS)

**Network Security & Auth (10):** CORS · Same-Origin Policy · CSRF · XSS · CSP · Cookies · LocalStorage vs SessionStorage · JWT · OAuth · PKCE

**Architecture Patterns (9):** SPA vs MPA · SSR · SSG · Hydration · Islands architecture · State management · Controlled vs uncontrolled inputs · Design systems · Component composition

**React (13):** JSX · Virtual DOM · Reconciliation · Key prop · Props vs state · Derived state · Hooks · `useEffect` · `useMemo` / `useCallback` · Context · Controlled re-render · StrictMode · Concurrent rendering

**Testing Theory (6):** Unit · Integration · E2E · Mocking vs stubbing · Test pyramid · Accessibility testing

**Tooling & Build (7):** Bundler · Transpiler · Polyfill · Source maps · Linting · Formatting · CI

**Common Theory Prompts (7):** Browser rendering pipeline (full walkthrough) · `useEffect` vs `useLayoutEffect` · CORS vs Same-Origin · Prevent XSS / CSRF in SPA · SSR vs SPA + hydration · Optimize LCP / INP / CLS · Event loop ordering (macrotask + microtask interleaving)

---

**Frequency by interview type:**

| Tier | Topics | Asked by |
|---|---|---|
| **Drill** (almost always) | HTTP methods · Idempotency · Status codes · Closure · `this` binding · Event loop · Promise · Hoisting · Box model · Specificity · CORS · CSRF · XSS · React Hooks · `useEffect` · Props vs state | Every frontend screen |
| **Likely** (mid-round) | Reconciliation · Virtual DOM · Macrotask vs microtask · `useMemo` / `useCallback` · State management · Async/await · Stacking context · Flexbox vs Grid · Critical rendering path · Bundle size / code splitting | Senior frontend |
| **Differentiator (architecture)** | SSR vs SSG vs Hydration · Islands · Design systems · Concurrent rendering · Controlled re-render · Test pyramid · A11y testing | Staff / principal frontend |
| **Differentiator (perf)** | Core Web Vitals (LCP/INP/CLS) · Tree shaking · Critical CSS · GPU-friendly properties · Virtualization · Reflow vs repaint | Performance-focused roles |
| **Differentiator (security)** | CSP · OAuth + PKCE · JWT pitfalls · Same-Origin Policy nuances · Cookies (SameSite, Secure, HttpOnly) | Security-leaning frontend |

**Common composite prompts (the questions that combine multiple topics):**

| Prompt | Topics it touches |
|---|---|
| "Walk me through what happens when I type a URL and press Enter" | Web fundamentals + browser arch + critical rendering path + event loop |
| "How does the event loop schedule a Promise vs a setTimeout?" | Event loop + macrotask vs microtask + Promise |
| "Why does my `useEffect` run twice in dev?" | StrictMode + concurrent rendering + Hooks |
| "How would you prevent XSS / CSRF in a React SPA?" | XSS + CSRF + CSP + cookies + SameSite + JWT storage |
| "Optimize Core Web Vitals on a slow page" | LCP / INP / CLS + bundle size + code splitting + critical CSS + lazy loading |
| "SSR vs SPA — when do you pick which?" | SSR + SSG + hydration + Core Web Vitals + state mgmt |

**Rule of thumb:** **own the Drill tier cold — these get asked every interview, often in the first 15 minutes**. The composite prompts above are how mid/senior interviews surface depth — practice combining 4–5 topics into a coherent answer rather than memorizing isolated definitions. For React-heavy roles, **`useEffect` and concurrent rendering** are the most-misunderstood topics worth deep mastery.
