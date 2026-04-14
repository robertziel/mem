### AI System Design: Customer Support Chatbot

**Requirements:**
- Answer customer questions from knowledge base
- Perform actions (check order status, process refund)
- Escalate to human agent when needed
- Multi-turn conversation with context

**Architecture:**
```
User -> [API Gateway] -> [Chat Service]
                              |
                    [Intent Classifier] (LLM or fine-tuned model)
                         |         |            |
                    [FAQ/Info]  [Action]    [Escalation]
                         |         |            |
                    [RAG Pipeline] [Tool Executor]  [Human Agent Queue]
                         |         |
                    [LLM generates response with context]
                         |
                    [Guardrails / Output Filter]
                         |
                    Response to User
```

**Key components:**

**1. Intent classification:**
- Route to right handler: informational (RAG), action (tool), escalation (human)
- LLM-based: include intent options in system prompt
- Fine-tuned classifier: faster, cheaper for high-volume

**2. RAG pipeline (for knowledge-based answers):**
```
User question → embed → search knowledge base → retrieve top-K docs → LLM answers with context

Prompt:
"Answer the customer's question based ONLY on the provided context.
If the context doesn't contain the answer, say 'Let me connect you with an agent.'

Context: {retrieved_documents}
Question: {user_question}"
```

**3. Tool use (for actions):**
```python
tools = [
    {"name": "check_order_status", "params": {"order_id": "string"}},
    {"name": "process_refund", "params": {"order_id": "string", "reason": "string"}},
    {"name": "update_shipping_address", "params": {"order_id": "string", "address": "object"}},
]
# LLM decides which tool to call based on user intent
# Tool executor calls internal APIs → returns result → LLM formats response
```

**4. Conversation memory:**
- Store conversation history per session
- Pass last N messages as context to LLM
- Summarize older messages to fit context window
- Store in Redis (TTL 24h) or DynamoDB

**5. Human handoff triggers:**
- LLM confidence below threshold
- User explicitly asks for human
- Sensitive topics (billing disputes, account security)
- N consecutive unhelpful responses
- Sentiment detection (user is frustrated)

**Evaluation metrics:**
| Metric | How to measure |
|--------|---------------|
| Resolution rate | % conversations resolved without human |
| Escalation rate | % handed off to human (lower = better) |
| CSAT | Customer satisfaction score post-chat |
| Accuracy | % answers grounded in knowledge base (not hallucinated) |
| Latency | Time to first response token |

**Rule of thumb:** RAG for informational queries, tool use for actions, human handoff for edge cases. Always have a fallback to human agents. Evaluate faithfulness (is the answer grounded?) not just fluency. Keep conversation history for multi-turn context. Monitor escalation rate as the key quality metric.
