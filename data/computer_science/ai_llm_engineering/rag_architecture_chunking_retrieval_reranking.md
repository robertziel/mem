### RAG Architecture: Chunking, Retrieval & Reranking

**What RAG is:**
- Retrieval-Augmented Generation: LLM answers questions using external knowledge
- Retrieves relevant documents, feeds them as context to the LLM
- Reduces hallucination, keeps answers grounded in real data
- No model fine-tuning needed (use existing knowledge base)

**RAG pipeline:**
```
Query -> [Embedding Model] -> vector
                                |
                          [Vector DB Search] -> top-K documents
                                |
                          [Reranker (optional)] -> reranked top-N
                                |
                          [LLM] + [retrieved context] -> answer
```

**Ingestion pipeline (offline):**
```
Documents -> [Chunking] -> chunks
                             |
                       [Embedding Model] -> vectors
                             |
                       [Vector DB] (store chunks + vectors + metadata)
```

**Chunking strategies:**
| Strategy | How | Best for |
|----------|-----|----------|
| Fixed-size | Split every N tokens (e.g., 512) with overlap | Simple, works for most cases |
| Sentence-based | Split on sentence boundaries | Clean boundaries, avoids mid-sentence splits |
| Semantic | Group semantically similar sentences | Better coherence per chunk |
| Recursive | Split by paragraphs, then sentences, then characters | Preserves structure hierarchy |
| Document-aware | Split by headings, sections, pages | Structured docs (markdown, PDF) |

**Chunk size tradeoffs:**
- Too small (100 tokens): loses context, more chunks to search
- Too large (2000 tokens): dilutes relevance, wastes context window
- Sweet spot: 256-512 tokens with 10-20% overlap

**Retrieval strategies:**
- **Dense retrieval**: embed query + docs, cosine similarity search (semantic meaning)
- **Sparse retrieval**: BM25/TF-IDF keyword search (exact match)
- **Hybrid**: combine dense + sparse scores (best of both)

**Reranking:**
- Initial retrieval returns top-K (e.g., 20) cheaply
- Cross-encoder reranker scores each (query, document) pair
- More accurate but slower — use on small candidate set
- Tools: Cohere Rerank, cross-encoder models, ColBERT

**Evaluation metrics:**
| Metric | What it measures |
|--------|-----------------|
| Faithfulness | Is the answer grounded in retrieved context? |
| Answer relevance | Does the answer address the question? |
| Context precision | Are retrieved docs relevant? |
| Context recall | Were all relevant docs retrieved? |

Tools: RAGAS, LangSmith, Arize Phoenix

**Rule of thumb:** Start with fixed-size chunking (512 tokens, 50 token overlap) + dense retrieval. Add hybrid search if keyword matching matters. Add reranking for quality-critical applications. Evaluate with RAGAS. Chunk size and retrieval quality matter more than which LLM you use.
