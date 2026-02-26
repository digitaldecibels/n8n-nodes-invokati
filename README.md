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

## Your API Key

Your API key is **automatically generated** when your Invokati account is created. To find it:

1. Log in to your Invokati dashboard
2. Navigate to `/api-key`

Your key is displayed there and can be copied to your clipboard. If you need to rotate it, click **Regenerate Key** — this will invalidate the old key immediately, so update any integrations that use it.

**Key format:** `atom8_{64-char-hex}`

---

## Credential: Invokati API

Before using any node, create an **Invokati API** credential in n8n:

1. Go to **Credentials → New Credential → Invokati API**
2. Set **API Base URL** to your Invokati installation (default: `https://invokati.com`)
3. Paste your API key into the **API Key** field

The credential automatically injects `X-API-Key: {your-key}` into every request.

**Alternative header format (also accepted):**
```
Authorization: Bearer your-api-key-here
```

---

## Node: Invokati Token Usage

Tracks AI model token consumption and cost after any AI node in your workflow. Costs are calculated automatically by the Invokati platform based on the model's pricing rates.

### How to Use

1. Add the **Invokati Token Usage** node immediately after your AI node
2. Select your **Invokati API** credential
3. Fill in the required fields — `workflow_id` and `execution_id` are captured automatically from the n8n execution context

### Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| Model ID | Yes | AI model identifier | `gpt-4`, `claude-3-opus`, `gemini-pro` |
| Input Tokens | Yes | Tokens in the prompt/input | `{{ $json.usage.prompt_tokens }}` |
| Output Tokens | Yes | Tokens in the completion/output | `{{ $json.usage.completion_tokens }}` |
| Installation ID | No | Drupal node ID of the n8n installation | `123` |
| Node ID | No | The n8n node that generated the usage | `"ai-node-1"` |
| Total Tokens | No | Override auto-calculated total (defaults to input + output) | `2300` |

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
  "id": 259,
  "data": {
    "workflow_id": "b9NLgJV0oXIpXSsr",
    "execution_id": "551",
    "model_id": "gpt-4",
    "input_tokens": 399,
    "output_tokens": 288,
    "total_tokens": 687,
    "input_cost": 0.01197,
    "output_cost": 0.01728,
    "total_cost": 0.02925,
    "model_found": true,
    "model_label": "GPT-4"
  }
}
```

> **Tip:** Enable **Continue On Fail** on this node so token tracking failures don't break your workflow.

---

## Alternative: HTTP Request Node

If you prefer not to install this package, token usage can be tracked with a standard **HTTP Request** node.

**Method:** `POST`
**URL:** `https://invokati.com/api/token-usage`

**Authentication — Header Auth:**
| Header | Value |
|--------|-------|
| `X-API-Key` | `your-api-key-here` |

**Body (JSON):**
```json
{
  "n8n_base_url": "{{ $env.WEBHOOK_URL.split('/webhook')[0] }}",
  "workflow_id": "{{ $workflow.id }}",
  "execution_id": "{{ $execution.id }}",
  "model_id": "gpt-4",
  "input_tokens": "{{ $json.usage.prompt_tokens }}",
  "output_tokens": "{{ $json.usage.completion_tokens }}"
}
```

If your self-hosted n8n instance doesn't have `WEBHOOK_URL` set, replace the `n8n_base_url` value with your n8n installation URL directly (e.g., `"https://n8n.yourdomain.com"`).

> From the Invokati dashboard: enable editing mode, click **Connect to n8n**, then use the **Copy HTTP Node** button to get a pre-configured node with your API key already filled in.

---

## Webhook Trigger Setup

To trigger an Invokati workflow from n8n:

1. In n8n, add a **Webhook** node as your trigger
2. Set **HTTP Method** to `POST`, **Path** to `invokati-trigger/[installation_id]/[workflow_id]`, and **Respond** to `Immediately`
3. Copy the webhook URL and paste it into the **Endpoint** field on your Invokati workflow dashboard

Use the **Test URL** while building and switch to the **Production URL** before activating.

> From the Invokati dashboard: enable editing mode, click **Connect to n8n**, then use the **Copy Trigger Node** button to get a fully pre-configured webhook node you can paste directly into n8n — no manual setup needed.

---

## Resources

- [Invokati](https://invokati.com)
- [Get your API key](https://invokati.com/api-key)
- [GitHub repository](https://github.com/digitaldecibels/n8n-nodes-invokati)

---

## License

MIT
