# API Configuration & n8n Integration Guide

## Your API Key
**API Key:** [https://invokati.com/api-key](https://invokati.com/api-key)


## How to Use Your API Key

Include your API key in request headers when making API calls.

### Recommended (X-API-Key header)

    X-API-Key: your-api-key-here

### Alternative (Bearer token)

    Authorization: Bearer your-api-key-here

---

# Track AI Token Usage from n8n

> 🚧 **Custom n8n nodes coming soon**
> Until then, token tracking is done using an HTTP Request node.

This allows you to track usage from:
- OpenAI
- Anthropic
- Google AI
- Any other AI provider supported by n8n

---

## How Token Tracking Works

After any AI node in your workflow, send token usage data to the API using an **HTTP Request** node.

---

## Step 1: Add HTTP Request Node

Add an **HTTP Request** node immediately after your AI node.

---

## Step 2: Configure the HTTP Request

**Method**

    POST

**URL**

    https://atom8ui.lndo.site/api/token-usage

### Authentication (Header Auth)

| Header Name | Header Value |
|------------|-------------|
| X-API-Key  | your-api-key-here |

---

## Step 3: JSON Body

Set **Body Content Type** to `JSON` and use the following structure:

    {
      "workflow_id": "{{ $workflow.id }}",
      "execution_id": "{{ $execution.id }}",
      "model_id": "gpt-4",
      "input_tokens": {{ $json.usage.prompt_tokens }},
      "output_tokens": {{ $json.usage.completion_tokens }}
    }

### Token Field Mapping by Provider

- **OpenAI**
  - `$json.usage.prompt_tokens`
  - `$json.usage.completion_tokens`
- **Anthropic**
  - `$json.usage.input_tokens`
  - `$json.usage.output_tokens`
- **Google**
  - `$json.usageMetadata.promptTokenCount`
  - `$json.usageMetadata.candidatesTokenCount`
- **Other providers**
  - Inspect the AI node response structure

---

## Step 4: Field Reference

| Field | Required | Description | Example |
|------|----------|-------------|---------|
| workflow_id | Yes | n8n workflow ID | `{{ $workflow.id }}` |
| execution_id | Yes | n8n execution ID | `{{ $execution.id }}` |
| model_id | Yes | AI model name | `"gpt-4"` |
| input_tokens | Yes | Input token count | `1500` |
| output_tokens | Yes | Output token count | `800` |
| installation_id | Optional | Installation ID | `123` |
| node_id | Optional | n8n node ID | `"ai-node-1"` |

---

## Step 5: Example Response

    {
      "status": "success",
      "message": "Token usage recorded successfully",
      "id": 123,
      "data": {
        "workflow_id": "abc123-def456",
        "execution_id": "exec-xyz789",
        "model_id": "gpt-4",
        "input_tokens": 1500,
        "output_tokens": 800,
        "total_tokens": 2300,
        "input_cost": 0.045,
        "output_cost": 0.048,
        "total_cost": 0.093,
        "model_found": true,
        "model_label": "GPT-4"
      }
    }

---

## Complete Example Workflow

1. **Trigger Node** — Webhook, Schedule, etc.
2. **AI Node** — OpenAI, Anthropic, Google AI
3. **HTTP Request Node** — Send token usage
4. **Continue Workflow** — Process AI response

> ✅ **Pro Tip**
> Set the HTTP Request node to **Continue On Fail** so your workflow doesn’t break if token tracking fails.

---

# Set Up n8n Webhook Trigger

Use webhooks to receive data from external systems.

---

## Testing vs Production

- Use the **Test URL** while building
- Switch to the **Production URL** and activate the workflow when live

---

## Step 1: Add Webhook Node

In n8n, click **+** and add a **Webhook** node.

---

## Step 2: Configure Settings

**HTTP Method**

    POST

**Respond To**

    Immediately

This ensures the sender receives a `200 OK` instantly.

---

## Step 3: Copy Webhook URL

Copy the Webhook URL and paste it into the "Endpoint" field of your dashboard trigger.

### Troubleshooting
- Ensure the node is in **Listen for Event** mode
- Confirm the sender is sending valid `JSON`

---
