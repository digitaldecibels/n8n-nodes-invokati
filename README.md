# n8n-nodes-invokati

Custom n8n nodes for integrating with [Invokati](https://invokati.com) — track AI token usage and costs directly from your n8n workflows.

---

## What's Included

| Type | Name | Description |
|------|------|-------------|
| Credential | **Invokati API** | Authenticates requests to your Invokati installation |
| Node | **Invokati Token Usage** | Records AI model token usage and calculates costs |

---

## Installation

### In a self-hosted n8n instance

```bash
npm install n8n-nodes-invokati
```

Then restart n8n. The nodes will appear in the node picker under the **Invokati** category.

### In n8n Cloud

Go to **Settings → Community Nodes → Install** and enter `n8n-nodes-invokati`.

---

## Credential: Invokati API

Before using any node, create an **Invokati API** credential:

1. In n8n, go to **Credentials → New Credential → Invokati API**
2. Set **API Base URL** to your Invokati installation (default: `https://invokati.com`)
3. Set **API Key** — find yours at [https://invokati.com/api-key](https://invokati.com/api-key)

The credential injects `X-API-Key: {your-key}` into every request automatically.

**Alternative header format (also accepted):**
```
Authorization: Bearer your-api-key-here
```

---

## Node: Invokati Token Usage

Tracks AI model token consumption and cost after any AI node in your workflow. Costs are calculated automatically by the Invokati platform using the model's pricing rates.

### How to Use

1. Add the **Invokati Token Usage** node immediately after your AI node
2. Select your **Invokati API** credential
3. Fill in the required fields (the node auto-captures `workflow_id` and `execution_id`)

### Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| Model ID | Yes | AI model identifier | `gpt-4`, `claude-3-opus`, `gemini-pro` |
| Input Tokens | Yes | Tokens in the prompt/input | `{{ $json.usage.prompt_tokens }}` |
| Output Tokens | Yes | Tokens in the completion/output | `{{ $json.usage.completion_tokens }}` |
| Installation ID | No | Drupal node ID of the n8n installation | `123` |
| Node ID | No | The specific n8n node that generated usage | `"ai-node-1"` |
| Total Tokens | No | Override auto-calculated total | `2300` |

`workflow_id` and `execution_id` are captured automatically from the n8n execution context.

### Token Field Mapping by Provider

| Provider | Input Tokens | Output Tokens |
|----------|-------------|---------------|
| **OpenAI** | `{{ $json.usage.prompt_tokens }}` | `{{ $json.usage.completion_tokens }}` |
| **Anthropic** | `{{ $json.usage.input_tokens }}` | `{{ $json.usage.output_tokens }}` |
| **Google AI** | `{{ $json.usageMetadata.promptTokenCount }}` | `{{ $json.usageMetadata.candidatesTokenCount }}` |
| **Other** | Inspect the AI node output | Inspect the AI node output |

### Example Response

```json
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
```

> **Tip:** Enable **Continue On Fail** on this node so token tracking failures don't break your workflow.

---

## Alternative: HTTP Request Node

If you prefer not to install this package, token usage can be tracked manually with a standard **HTTP Request** node.

**Method:** `POST`
**URL:** `https://invokati.com/api/token-usage`

**Authentication (Header Auth):**
| Header | Value |
|--------|-------|
| `X-API-Key` | `your-api-key-here` |

**Body (JSON):**
```json
{
  "workflow_id": "{{ $workflow.id }}",
  "execution_id": "{{ $execution.id }}",
  "model_id": "gpt-4",
  "input_tokens": "{{ $json.usage.prompt_tokens }}",
  "output_tokens": "{{ $json.usage.completion_tokens }}"
}
```

---

## Webhook Trigger Setup

To trigger an Invokati workflow from n8n:

1. In n8n, add a **Webhook** node as your trigger
2. Set **HTTP Method** to `POST` and **Respond** to `Immediately`
3. Copy the webhook URL
4. Paste it into the **Endpoint** field on your Invokati workflow dashboard

Use the **Test URL** while building and switch to the **Production URL** before activating.

> From the Invokati dashboard: enable editing mode, click **Connect to n8n**, and use the **Copy Trigger Node** button to get a pre-configured webhook node you can paste directly into n8n.

---

## Resources

- [Invokati](https://invokati.com)
- [Get your API key](https://invokati.com/api-key)
- [GitHub repository](https://github.com/digitaldecibels/n8n-nodes-invokati)

---

## License

MIT
