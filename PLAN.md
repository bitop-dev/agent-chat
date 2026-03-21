# Agent Chat — Plan

## Vision

A conversational web interface for the Agent platform. Users chat naturally,
the app routes to the right agent profile, streams responses, and maintains
conversation history. Separate from the gateway — it's a client.

```
┌──────────────────────────┐
│     Agent Chat :3000     │
│  SvelteKit + Postgres    │
│                          │
│  ┌────────────────────┐  │
│  │  Conversation UI   │  │
│  │  (svelte-ai-elem)  │  │
│  └────────┬───────────┘  │
│           │               │
│  ┌────────┴───────────┐  │
│  │  API Routes        │  │
│  │  (+server.ts)      │  │
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │ POST /v1/tasks
            │ GET  /v1/agents
            │ SSE  /v1/events
┌───────────┴──────────────┐
│     Gateway :8080        │
│     (unchanged)          │
└──────────────────────────┘
```

## Tech stack

- **SvelteKit** — full-stack framework (pages + API routes)
- **Bun** — runtime + package manager
- **shadcn-svelte** — base UI components
- **svelte-ai-elements** — AI chat components (message, prompt-input, conversation,
  reasoning, tool calls, code blocks, markdown, model selector)
- **Tailwind CSS v4** — styling
- **PostgreSQL** — conversation history, user preferences
- **Drizzle ORM** — type-safe database access

## Pages

### Chat (/)
The main page. Full-screen chat interface.

```
┌──────────────────────────────────────────────────┐
│ Agent Chat                    [model] [⚙️] [🌙]  │
├──────────────────────────────────────────────────┤
│                                                    │
│  Conversations        │  Chat                      │
│  ─────────────        │                            │
│  ● K8s troubleshoot   │  👤 Review PR #42 on       │
│    Today              │     bitop-dev/agent         │
│  ● AI news research   │                            │
│    Yesterday          │  🤖 I'll review that PR.    │
│  ● Code review        │     [tool: github/pr-diff]  │
│    Mar 19             │     ...analyzing changes... │
│                       │                            │
│                       │  The PR adds model          │
│  [+ New chat]         │  resolution with these      │
│                       │  findings:                  │
│                       │  • **High**: Missing null    │
│                       │    check on line 42          │
│                       │  • **Low**: Variable name    │
│                       │                            │
│                       │  ┌────────────────────────┐ │
│                       │  │ Type a message...   [↑]│ │
│                       │  └────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

Features:
- Conversation sidebar (list, create, delete, rename)
- Message stream with markdown rendering
- Tool call visualization (collapsible, shows tool name + result)
- Reasoning/chain-of-thought display (collapsible)
- Code blocks with syntax highlighting + copy
- Profile/model selector in header
- Auto-profile routing: user just types, app picks the right agent
- Streaming responses via gateway SSE events
- Message editing and regeneration

### Settings (/settings)
- Gateway URL configuration
- API key management
- Default model/profile preferences
- Theme

## Database schema (PostgreSQL)

```sql
-- Conversations
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  profile     TEXT,              -- agent profile used (or null for auto)
  model       TEXT,              -- model override (or null for default)
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,    -- user, assistant, tool, system
  content         TEXT,
  tool_calls      JSONB,           -- [{id, name, arguments}]
  tool_call_id    TEXT,            -- for tool result messages
  model           TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- Settings (key-value per-user, single user for now)
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## How it talks to the gateway

### Submitting tasks
```typescript
// Submit task and get result
const resp = await fetch(`${GATEWAY}/v1/tasks`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    profile: selectedProfile,  // or auto-detected
    task: userMessage,
    async: true,
  }),
});
const { id } = await resp.json();

// Poll for completion or listen to SSE
const events = new EventSource(`${GATEWAY}/v1/events?token=${apiKey}`);
events.addEventListener("agent.task.completed", (e) => {
  const data = JSON.parse(e.data);
  if (data.taskId === id) {
    // Fetch full result
    const task = await fetch(`${GATEWAY}/v1/tasks/${id}`);
    // Display response
  }
});
```

### Auto-profile routing
When the user doesn't select a profile, the chat app:
1. Fetches available agents: `GET /v1/agents`
2. Uses a simple keyword/intent match to pick the best profile
3. Or submits to the `orchestrator` profile which discovers + delegates

### Streaming (future)
Currently the gateway returns complete responses. For real streaming:
- Option A: Gateway adds a streaming task endpoint (WebSocket)
- Option B: Chat app talks directly to a worker for streaming
- Option C: Worker streams to NATS, chat app subscribes
Start with async + SSE events (works today), add streaming later.

## Implementation phases

### Phase 1: Foundation
- SvelteKit project with Bun
- PostgreSQL connection with Drizzle
- shadcn-svelte + svelte-ai-elements setup
- Gateway API client
- Basic chat page: send message, get response, display
- Conversation list sidebar

### Phase 2: Rich UI
- Markdown rendering in messages
- Tool call display (collapsible cards)
- Code blocks with syntax highlighting
- Model/profile selector
- Conversation management (create, rename, delete)

### Phase 3: Intelligence
- Auto-profile routing (keyword match → profile)
- Conversation context (send history with each turn)
- Token usage display per message
- Suggested prompts / quick actions

### Phase 4: Polish
- Dark/light mode
- Mobile responsive
- Keyboard shortcuts (Cmd+N new chat, Cmd+K search)
- Message editing and regeneration
- Export conversation

## k8s deployment

```yaml
# New pod in agent-system namespace
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-chat
  namespace: agent-system
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: chat
          image: ghcr.io/bitop-dev/agent-chat:latest
          env:
            - name: GATEWAY_URL
              value: http://agent-gateway:8080
            - name: GATEWAY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: agent-secrets
                  key: chat-api-key
            - name: DATABASE_URL
              value: postgres://...  # same postgres or separate
          ports:
            - containerPort: 3000
```
