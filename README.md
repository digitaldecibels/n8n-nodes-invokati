# n8n-nodes-invokati

Custom n8n nodes for [Invokati](https://invokati.com) — a multi-tenant workflow automation dashboard with a CRM, media hub, custom payloads, and AI token cost tracking.

---

## What's Included

| Type | Name | Description |
|------|------|-------------|
| Credential | **Invokati API** | Authenticates all requests to your Invokati installation |
| Trigger | **Invokati Workflow Button** | Triggered by dashboard buttons; responds immediately |
| Action | **Invokati Token Usage** | Records AI model token counts and calculates costs |
| Action | **Invokati Lead Manager** | Create, update, find, and delete CRM leads |
| Action | **Invokati Media Manager** | Manage items in your Media Hub |
| Action | **Invokati Payload Manager** | Store, review, approve, and deny JSON payloads |
| Action | **Invokati Dashboard Notifier** | Send a notification to the dashboard bell from a workflow |

---

## Installation

### Self-hosted n8n

```bash
npm install n8n-nodes-invokati
```

Restart n8n. The nodes appear in the node picker under the **Invokati** category.

### n8n Cloud

Go to **Settings → Community Nodes → Install** and enter `n8n-nodes-invokati`.

---

## Credential: Invokati API

Create an **Invokati API** credential before using any node:

1. Go to **Credentials → New Credential → Invokati API**
2. Set **API Base URL** to your Invokati installation (default: `https://invokati.com`)
3. Paste your API key into the **API Key** field

**API Key format:** `invokati_` followed by 64 hex characters. Find yours at `/api` in your Invokati dashboard.

The credential injects `X-API-Key: {your-key}` into every request and is verified against `GET /api/auth/test`.

---

## Trigger: Invokati Workflow Button

Replaces the Webhook + Respond to Webhook node pair. When an Invokati dashboard button calls this webhook, it responds immediately (HTTP 200) so the button shows feedback without waiting for the full workflow to finish.

**Setup:**
1. Add this node as your workflow trigger
2. Copy the **Webhook URL** shown on the node
3. Paste it into your Invokati dashboard workflow button configuration

**Output data:**

```json
{
  "...any data sent by the button...",
  "_invokati": {
    "triggered_at": "2025-01-01T00:00:00.000Z",
    "source": "dashboard_button"
  }
}
```

---

## Action: Invokati Token Usage

Records AI model token consumption after any LLM call. Costs are calculated automatically server-side — you only need to send token counts.

`workflow_id` and `execution_id` are captured automatically from the n8n execution context.

> **Tip:** Enable **Continue On Fail** so token tracking failures never break your workflow.

### Required Fields

| Field | Description | Example |
|---|---|---|
| **Model ID** | The model identifier | `gpt-4o`, `claude-3-5-sonnet-20241022` |
| **Input Tokens** | Tokens in the prompt | `{{ $json.usage.prompt_tokens }}` |
| **Output Tokens** | Tokens in the completion | `{{ $json.usage.completion_tokens }}` |

### Optional Fields (Additional Fields)

| Field | Description |
|---|---|
| **Installation ID** | Drupal node ID of your n8n installation (improves reporting) |
| **Node Name** | The n8n node name that made the LLM call, for per-node attribution |
| **Total Tokens** | Override the auto-calculated sum of input + output |

### Token Field Mapping by Provider

| Provider | Input Tokens | Output Tokens |
|----------|-------------|---------------|
| **OpenAI** | `{{ $json.usage.prompt_tokens }}` | `{{ $json.usage.completion_tokens }}` |
| **Anthropic** | `{{ $json.usage.input_tokens }}` | `{{ $json.usage.output_tokens }}` |
| **Google AI** | `{{ $json.usageMetadata.promptTokenCount }}` | `{{ $json.usageMetadata.candidatesTokenCount }}` |

### Supported Models

Pricing is managed server-side. Custom pricing can be added at `/admin/atom8/model-pricing`.

**OpenAI:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`

**Anthropic:** `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`

**Google:** `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`

### Example Response

```json
{
  "status": "success",
  "id": 259,
  "data": {
    "workflow_id": "b9NLgJV0oXIpXSsr",
    "execution_id": "551",
    "model_id": "gpt-4o",
    "input_tokens": 399,
    "output_tokens": 288,
    "total_tokens": 687,
    "input_cost": 0.0001197,
    "output_cost": 0.0001728,
    "total_cost": 0.0002925,
    "model_found": true,
    "model_label": "GPT-4o"
  }
}
```

---

## Action: Invokati Lead Manager

Create, update, retrieve, find, and delete leads in your Invokati CRM.

### Operations

| Operation | Required Fields | Description |
|---|---|---|
| **Create Lead** | First Name, Last Name | Add a new lead; email is optional |
| **Update Lead** | Lead ID | Update any fields via Additional Fields |
| **Get Lead** | Lead ID | Retrieve a lead by ID |
| **Find by Email** | Email | Returns the first matching lead or `{ "found": false }` |
| **Update Status** | Lead ID, Status | Change the pipeline status by label |
| **Delete Lead** | Lead ID | Permanently delete a lead |

### Additional Fields (Create & Update)

Company Name · Phone · Job Title · LinkedIn URL · Website · Industry · Lead Score (0–100) · Lead Source · Status · Pain Points · Timeline · Location · UTM Source · UTM Medium · UTM Campaign

---

## Action: Invokati Media Manager

Add and manage items in your Invokati Media Hub. Source URL type is auto-detected (Google Drive, Dropbox, YouTube, Vimeo, S3, and more).

### Operations

| Operation | Required Fields | Description |
|---|---|---|
| **Create Media Item** | Title, Media Type, Source URL | Add a new item by URL |
| **Update Media Item** | Media ID | Update metadata via Additional Fields |
| **Get Media Item** | Media ID | Retrieve an item by ID |
| **List Media Items** | — | List items; filter by type and limit |

### Additional Fields (Create & Update)

Collection Name · Status · Automation Status · Requires Human Review · Allow Regenerate · Resume URL · Workflow ID · Execution ID

**Human review pattern:** Set **Requires Human Review** to `true` and **Resume URL** to `{{ $execution.resumeUrl }}` from a Wait node. The workflow pauses until a team member approves or denies the item in the dashboard, then resumes automatically.

---

## Action: Invokati Payload Manager

Store arbitrary JSON payloads and support human-in-the-loop review before continuing a workflow.

### Operations

| Operation | Required Fields | Description |
|---|---|---|
| **Create Payload** | Title | Store a JSON payload, optionally queuing for review |
| **Update Payload** | Payload ID | Update title, data, or status |
| **Get Payload** | Payload ID | Retrieve a payload by ID |
| **Approve** | Payload ID | Approve a pending payload; resumes the workflow if a Resume URL was set |
| **Deny** | Payload ID | Deny a pending payload; resumes the workflow if a Resume URL was set |

**Task Types:** `generic` · `lead` · `media` · `content-review` — used for filtering in the dashboard.

### Human-in-the-Loop Pattern

```
[AI Node] → [Payload Manager: Create] → [Wait] → [Payload Manager: Get] → [IF: approved?]
             Title: "Review output"
             Requires Human Review: true
             Resume URL: {{ $execution.resumeUrl }}
             Payload Data: {{ $json }}
```

When a team member clicks **Approve** or **Deny** in Invokati, it POSTs to the Resume URL, the Wait node continues, and you branch on `automation_status` (`approved` or `denied`).

---

## Action: Invokati Dashboard Notifier

Pushes a notification to the Invokati dashboard bell from inside a workflow. Useful for alerting your team when a long-running workflow finishes, when something needs attention, or as a custom status update.

### Required Fields

| Field | Description | Example |
|---|---|---|
| **Title** | Short title shown in the bell dropdown (max 255 chars) | `Report ready for review` |
| **Message** | Full notification body | `The weekly sales report has been generated.` |

### Type Options

| Type | Use For |
|---|---|
| `Workflow Alert` | General alert from a workflow (default) |
| `Workflow Complete` | A workflow finished successfully |
| `Workflow Error` | A workflow encountered an error |
| `Human Review` | Something needs manual review |
| `New Lead` | A new CRM lead was created |
| `New Media` | A new media item was added |

### Optional Fields (Additional Fields)

| Field | Description |
|---|---|
| **Link URL** | URL the notification links to when clicked in the dashboard |
| **Entity Type** | The entity type this relates to (e.g. `custom_payload`, `lead`) |
| **Entity ID** | The entity ID this relates to |

### Example Patterns

**Notify on workflow completion:**
```
[Your Workflow] → [Dashboard Notifier]
  Title: "Workflow finished"
  Message: "Processed {{ $items.length }} records successfully."
  Type: Workflow Complete
```

**Notify with a link to a payload:**
```
[Payload Manager: Create] → [Dashboard Notifier]
  Title: "New content ready for review"
  Message: "AI-generated blog post needs approval before publishing."
  Type: Human Review
  Link URL: https://invokati.com/payloads/{{ $json.id }}
  Entity Type: custom_payload
  Entity ID: {{ $json.id }}
```

### Example Response

```json
{ "status": "created" }
```

---

## Resources

- [Invokati](https://invokati.com)
- [API key management](https://invokati.com/api)
- [GitHub repository](https://github.com/digitaldecibels/n8n-nodes-invokati)
- [Report an issue](https://github.com/digitaldecibels/n8n-nodes-invokati/issues)

---

## License

MIT
