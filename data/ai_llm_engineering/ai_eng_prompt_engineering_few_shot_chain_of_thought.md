### Prompt Engineering: Few-Shot, Chain-of-Thought & Structured Output

**Prompt engineering techniques (by effectiveness):**

**1. System prompt (role + constraints):**
```
You are a senior backend engineer. Answer questions about Ruby on Rails.
Be concise. Use code examples. If unsure, say "I don't know."
```

**2. Few-shot examples (show, don't tell):**
```
Classify the sentiment of each review.

Review: "The food was amazing!" → Positive
Review: "Terrible service, never again" → Negative
Review: "It was okay, nothing special" → Neutral

Review: "Best experience of my life!" →
```
- 3-5 examples usually sufficient
- Choose diverse examples covering edge cases
- Order matters: put typical cases first, edge cases last

**3. Chain-of-Thought (CoT):**
```
Q: If a store has 15 apples and sells 3 bags of 4 apples each,
   how many apples are left?

A: Let me think step by step:
   1. Bags sold: 3
   2. Apples per bag: 4
   3. Total sold: 3 × 4 = 12
   4. Remaining: 15 - 12 = 3
   Answer: 3 apples
```
- Add "Let's think step by step" or "Think through this carefully"
- Dramatically improves reasoning accuracy
- Works best for math, logic, multi-step problems

**4. Structured output:**
```
Extract the following fields from the text as JSON:

Text: "John Smith, age 35, lives in New York, works at Google as an SRE."

Output format:
{
  "name": "string",
  "age": "number",
  "city": "string",
  "company": "string",
  "role": "string"
}
```
- Specify exact format (JSON, XML, YAML)
- Provide schema or example
- Use `response_format: { type: "json_object" }` in API calls when available

**5. Retrieval-Augmented (RAG prompt):**
```
Answer the question based ONLY on the provided context.
If the context doesn't contain the answer, say "Not found in documents."

Context:
{retrieved_documents}

Question: {user_question}
Answer:
```

**Anti-patterns to avoid:**
- Vague instructions ("do a good job") → be specific
- No examples → add few-shot examples
- Too much context → trim to relevant portions
- No output format specified → model guesses format
- Asking for certainty ("are you sure?") → ask for confidence level instead

**Advanced techniques:**
| Technique | When to use |
|-----------|-------------|
| Self-consistency | Run same prompt N times, take majority vote (higher accuracy) |
| ReAct (Reason + Act) | Agent-like: think → use tool → observe → think again |
| Tree of Thought | Complex reasoning: explore multiple paths, backtrack |
| Prompt chaining | Break complex task into sequential prompts |

**Evaluation:**
- Human evaluation: gold standard but expensive
- LLM-as-judge: use a strong model to score outputs
- Automated metrics: ROUGE, BLEU (for summarization), exact match (for extraction)
- A/B testing: compare prompt variants on real traffic

**Rule of thumb:** Start simple (clear instruction + format). Add few-shot examples if quality is low. Add Chain-of-Thought for reasoning tasks. Use structured output for extraction. Evaluate systematically, not by vibes. Prompt engineering is iterative — version control your prompts.
