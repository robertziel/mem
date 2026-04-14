### AWS Step Functions

**What Step Functions does:**
- Serverless workflow orchestration
- Coordinate multiple AWS services into visual state machines
- Handle retries, error handling, parallel execution, branching

**Use cases:**
- Order processing pipeline (validate → charge → fulfill → notify)
- ETL workflows (extract → transform → load → validate)
- Human approval workflows (submit → wait for approval → process)
- ML pipeline (preprocess → train → evaluate → deploy)

**State types:**
| State | Purpose | Example |
|-------|---------|---------|
| Task | Execute work (Lambda, ECS, API call) | Call Lambda to process payment |
| Choice | Branching logic (if/else) | If order > $100, apply discount |
| Parallel | Run branches concurrently | Validate + check inventory simultaneously |
| Wait | Pause for time or timestamp | Wait 24 hours before retry |
| Map | Iterate over a list | Process each order line item |
| Pass | Transform data, inject values | Add default fields |
| Succeed / Fail | End states | Mark workflow complete or failed |

**Example (Amazon States Language):**
```json
{
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:validate-order",
      "Next": "CheckInventory",
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "MaxAttempts": 2 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "OrderFailed" }]
    },
    "CheckInventory": {
      "Type": "Choice",
      "Choices": [
        { "Variable": "$.inStock", "BooleanEquals": true, "Next": "ProcessPayment" }
      ],
      "Default": "OutOfStock"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:process-payment",
      "Next": "ShipOrder"
    },
    "ShipOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ship-order",
      "End": true
    },
    "OutOfStock": { "Type": "Fail", "Error": "OutOfStock" },
    "OrderFailed": { "Type": "Fail", "Error": "OrderProcessingFailed" }
  }
}
```

**Standard vs Express workflows:**
| Feature | Standard | Express |
|---------|----------|---------|
| Duration | Up to 1 year | Up to 5 minutes |
| Pricing | Per state transition | Per execution + duration |
| Execution model | Exactly-once | At-least-once |
| Use case | Long-running, approval workflows | High-volume, short (API backend, streaming) |

**Error handling:**
```json
"Retry": [{
  "ErrorEquals": ["States.TaskFailed"],
  "IntervalSeconds": 3,
  "MaxAttempts": 3,
  "BackoffRate": 2.0
}],
"Catch": [{
  "ErrorEquals": ["States.ALL"],
  "Next": "HandleError",
  "ResultPath": "$.error"
}]
```

**Step Functions vs SQS + Lambda vs EventBridge:**
| Pattern | Best for |
|---------|----------|
| Step Functions | Complex workflows with branching, retries, human approval |
| SQS + Lambda | Simple queue processing, fire-and-forget |
| EventBridge | Event-driven fan-out, loosely coupled services |

**Rule of thumb:** Step Functions for orchestration (complex workflows with branching and error handling). SQS for simple async job processing. The visual workflow editor is excellent for debugging. Use Standard for long-running, Express for high-volume short tasks.
