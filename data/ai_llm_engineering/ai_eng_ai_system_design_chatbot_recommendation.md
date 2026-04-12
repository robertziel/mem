### AI System Design: Chatbot, Recommendation & Content Moderation

**Design: Customer Support Chatbot**
```
User -> [API Gateway] -> [Intent Classifier]
                              |
                    [FAQ / Simple] -> [RAG Pipeline] -> [LLM] -> Response
                    [Complex]     -> [Human Agent Handoff]
                    [Action]      -> [Tool Executor] (check order, refund, etc.)
```

**Key components:**
- Intent classification: route to right handler (FAQ, action, escalation)
- RAG: retrieve from knowledge base for informational queries
- Tool use: LLM calls APIs for actions (check order status, process refund)
- Fallback: escalate to human agent when confidence is low
- Memory: conversation history for multi-turn context

**Design: Recommendation System**
```
User Activity -> [Event Stream (Kafka)] -> [Feature Store]
                                               |
                                     [Candidate Generation]
                                         (collaborative filtering,
                                          content-based, ANN)
                                               |
                                     [Ranking Model] (ML model scores candidates)
                                               |
                                     [Business Rules] (diversity, freshness, filtering)
                                               |
                                     [API] -> Client
```

**Recommendation approaches:**
| Approach | How | Best for |
|----------|-----|----------|
| Collaborative filtering | Users who liked X also liked Y | Established users with history |
| Content-based | Similar items by attributes | Cold-start (new users), explainability |
| Hybrid | Combine both | Production systems |
| Embedding-based | Neural embeddings + ANN search | Scale, complex patterns |
| LLM-based | Use LLM for reasoning about preferences | Novel, emerging approach |

**Design: Content Moderation Pipeline**
```
User Content -> [Pre-filter (regex, blocklist)]
                     |
              [ML Classifier] (toxic, spam, NSFW, violence)
                     |
              [High confidence] -> Auto-action (remove, flag, warn)
              [Low confidence]  -> [Human Review Queue]
                                        |
                                  [Human decision] -> [Feedback to ML model]
```

**Content moderation considerations:**
- Multi-modal: text + images + video (different models)
- Latency: real-time for chat, async for uploads
- Appeals: users can contest decisions
- Bias: audit for disparate impact across demographics
- Context: sarcasm, quotes, news reporting (not always harmful)
- Scale: millions of posts/day → ML first, humans for edge cases

**Common AI system design interview questions:**
1. Design a chatbot for customer support
2. Design a recommendation system (Netflix, Spotify, Amazon)
3. Design a content moderation system
4. Design a search ranking system
5. Design a fraud detection system
6. Design a real-time translation service
7. Design an AI-powered email assistant

**What interviewers look for in AI system design:**
- Clear problem decomposition (don't jump to model selection)
- Data pipeline: collection → storage → feature engineering → training → serving
- Online vs offline components (training is offline, serving is online)
- Evaluation: how do you measure if the system works?
- Feedback loops: how does the system improve over time?
- Failure modes: what happens when the model is wrong?

**Rule of thumb:** Decompose into retrieval + ranking + business rules. ML for scoring, not for the entire system. Always have a human-in-the-loop fallback. Design evaluation before building the model. Think about the full lifecycle: data → train → serve → monitor → retrain.
