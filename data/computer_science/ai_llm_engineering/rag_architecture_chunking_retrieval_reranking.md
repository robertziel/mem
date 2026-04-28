### RAG Architecture — Chunking, Retrieval, Reranking

**Definition:** **Retrieval-Augmented Generation** — LLM answers questions grounded in **retrieved documents** rather than only from its training. Reduces hallucination, keeps knowledge fresh, no fine-tuning required. Three knobs that matter most: **chunking** (how to split docs), **retrieval** (how to find relevant chunks), **reranking** (how to refine the candidates).

**The RAG pipeline (online):**

```
   Query
     │
     ▼
   ┌────────────────┐
   │ Embed query    │   (sentence-transformer / OpenAI embeddings)
   └────────┬───────┘
            │ vector
            ▼
   ┌────────────────┐
   │ Vector search  │   top-K candidates (e.g., K=20)
   └────────┬───────┘
            │
            ▼
   ┌────────────────┐
   │ Reranker       │   refine to top-N (e.g., N=5)
   └────────┬───────┘
            │
            ▼
   ┌────────────────────────────────────┐
   │ LLM with retrieved context as prompt │
   └────────────────────────────────────┘
            │
            ▼
        Answer
```

**Ingestion pipeline (offline):**

```
   Documents (PDFs, docs, wikis, code, web)
            │
            ▼
   ┌────────────────┐
   │ Parse / clean  │   (PyPDF2, BeautifulSoup, Unstructured)
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ Chunk          │   (size + overlap strategy)
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ Embed          │   (per-chunk vector)
   └────────┬───────┘
            ▼
   ┌────────────────────────────────┐
   │ Vector DB (chunks + vectors +   │
   │ metadata: source, date, author)  │
   └────────────────────────────────┘
```

**Chunking strategies — picking how to split:**

| Strategy | How | Best for |
|---|---|---|
| **Fixed-size** | Every N tokens (e.g., 512), with M token overlap | Simple, works for most cases |
| **Sentence-based** | Split on sentence boundaries | Avoids mid-sentence splits |
| **Semantic** | Group semantically similar sentences | Coherent chunks |
| **Recursive** | Try paragraph → sentence → character | Preserves structure |
| **Document-aware** | Split by headings / sections / pages | Markdown, PDF, structured |
| **Token + structure aware** | Combine size limit + structure | Best of both |

**Chunk size trade-off:**

| Size | Pros | Cons |
|---|---|---|
| **100 tokens** | Granular, precise hits | Loses context, more chunks |
| **256 tokens** | Good precision + context | Fragmentation risk |
| **512 tokens** | Sweet spot for most | Default starting point |
| **1024 tokens** | More context per chunk | Dilutes relevance |
| **2000+ tokens** | Long context | Wastes LLM context window |

> Default: **512 tokens with 10–20% overlap** (50–100 tokens). Tune based on eval.

**Retrieval strategies:**

| Strategy | Mechanism | Best for |
|---|---|---|
| **Dense retrieval** | Embed query + docs, cosine similarity | Semantic matching |
| **Sparse retrieval (BM25/TF-IDF)** | Keyword matching | Exact terms, names, IDs |
| **Hybrid** | Combine dense + sparse scores | Best of both — common winner |
| **Reciprocal Rank Fusion (RRF)** | Combine rankings, not scores | Robust to score scales |
| **HyDE** | LLM generates hypothetical answer first, then embed it | Improves precision |
| **Multi-query** | Generate query variations, retrieve from each | Recall boost |

**Embedding models — what to pick:**

| Model | Dim | Trade-off |
|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | Good default, low cost |
| `text-embedding-3-large` (OpenAI) | 3072 | Higher quality |
| `BAAI/bge-large-en` | 1024 | Strong open-source |
| `Cohere embed-v3` | 1024 | Multilingual |
| `gte-large` | 1024 | Open-source, fast |
| `nomic-embed-text` | 768 | Tiny, OSS |
| Cross-encoder reranker | — | Slow but accurate |

**Vector DB choices:**

| DB | Detail |
|---|---|
| **Pinecone** | Managed, easiest |
| **Weaviate** | OSS, hybrid search built-in |
| **Qdrant** | OSS, fast, Rust |
| **Milvus** | OSS, large-scale |
| **Chroma** | OSS, embedded / lightweight |
| **pgvector** (Postgres) | Use existing Postgres |
| **OpenSearch / Elasticsearch** | Hybrid search, sparse + dense |
| **FAISS** | Library (not a DB) — embedded |

**Reranking — refine the candidates:**

```
Initial retrieval: 100 ms, returns top-K = 20 (cheap, recall-focused)
Reranker:          200 ms, scores each (query, doc) pair (expensive, precision)
                   Returns top-N = 5 best matches
LLM:               Uses these N as context
```

| Reranker | Detail |
|---|---|
| **Cross-encoder** | BERT-based, accurate, slow |
| **Cohere Rerank** | Managed API, very good |
| **ColBERT** | Late interaction, faster than full cross-encoder |
| **bge-reranker** | Open-source, good |
| **LLM-as-judge** | Prompt LLM to score; expensive |

**Evaluation metrics:**

| Metric | What it measures |
|---|---|
| **Faithfulness** | Is the answer grounded in retrieved context? (hallucination check) |
| **Answer relevance** | Does the answer address the question? |
| **Context precision** | Are retrieved docs relevant? (precision @ K) |
| **Context recall** | Were all relevant docs retrieved? |
| **Latency p50/p99** | Operational |
| **Cost per query** | Operational |
| **Token usage** | Operational |

**Eval tools:**

| Tool | Detail |
|---|---|
| **RAGAS** | Python lib for the four core metrics |
| **LangSmith** | Tracing + eval (LangChain ecosystem) |
| **Arize Phoenix** | OSS observability |
| **TruLens** | Eval and tracking |
| **Custom golden set** | Hand-curated query/answer pairs |

**Common architecture variations:**

| Variant | Detail |
|---|---|
| **Plain RAG** | Retrieve top-K, stuff into prompt |
| **Re-ranked RAG** | Add cross-encoder reranking step |
| **Hybrid RAG** | Dense + sparse retrieval combined |
| **Graph RAG** | Knowledge graph adds structured retrieval |
| **Agentic RAG** | LLM decides which tool / source to query |
| **Self-RAG** | LLM decides if it needs retrieval at all |
| **Multi-hop** | Retrieve, generate sub-question, retrieve again |
| **Query rewriting** | LLM rewrites query for better retrieval |

**Metadata filtering — narrow before retrieval:**

```python
# pgvector example
SELECT chunk, embedding <=> :query_vec AS distance
FROM chunks
WHERE doc_type = 'spec' AND created_at > NOW() - INTERVAL '90 days'
ORDER BY distance
LIMIT 20;
```

| Why | Detail |
|---|---|
| Reduce search space | Faster, more relevant |
| Time-bounded queries | "Recent docs only" |
| Permissions | "Docs this user can see" |
| Source filtering | "Only product docs, not support tickets" |
| Combine with vector search | "WHERE … ORDER BY similarity" |

**Cost & latency considerations:**

| Item | Cost / latency |
|---|---|
| Embedding (online query) | ~10–50ms, per-token cost |
| Vector search | ~10–100ms |
| Reranking | ~50–500ms (cross-encoder) |
| LLM call (with context) | ~1–10s, per-token cost |
| **Most expensive**: LLM call | Mitigate via small model + good context |
| Most variable: reranker | Fast vs accurate trade-off |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Chunks too large | LLM dilutes attention; expensive |
| Chunks too small | Lost context, fragmented answers |
| No overlap | Boundary information lost |
| Pure dense retrieval for keyword-heavy data | Misses exact matches (use hybrid) |
| Pure sparse retrieval for semantic | Misses paraphrases (use hybrid) |
| Skipping reranking | Top-K full of borderline candidates |
| Ignoring metadata filters | Larger search, lower precision |
| No eval before iteration | Can't tell if changes help |
| Cherry-picking eval examples | Overfit |
| Forgetting permissions / multi-tenant filtering | Data leak |
| Not citing sources | Users can't verify |
| Stale index after document updates | Outdated answers |

**Decision matrix:**

| Need | Pick |
|---|---|
| First RAG | Fixed-size chunks (512) + dense retrieval + simple prompt |
| Improve precision | Add reranker (Cohere Rerank or cross-encoder) |
| Add keyword precision | Hybrid (dense + BM25) |
| Improve recall | Multi-query or HyDE |
| Reduce hallucination | Faithfulness eval + cite sources in prompt |
| Multi-doc reasoning | Multi-hop or agentic |
| Permissions / multi-tenant | Metadata filter pre-search |

**Cross-references:**

- Vector DB + similarity search: [vector_databases_*.md](vector_databases_embeddings_similarity_search.md)
- LLM deployment + serving: [llm_deployment_*.md](llm_deployment_serving_latency_optimization.md)
- Prompt engineering: [prompt_engineering_*.md](prompt_engineering_few_shot_chain_of_thought_structured_output.md)
- Customer support chatbot (RAG case study): [customer_support_chatbot_*.md](system_design_customer_support_chatbot_rag_intent_handoff.md)

**Rule of thumb:** **Start with fixed-size chunking (512 tokens, 50 overlap) + dense retrieval + simple prompt; iterate based on eval.** Add **hybrid (dense + BM25)** if exact-keyword matching matters. Add **reranking** for quality-critical applications. **Evaluate with RAGAS** (faithfulness, answer relevance, context precision/recall). **Chunking and retrieval quality matter more than which LLM you use.** Always cite sources and apply metadata filters for permissions.
