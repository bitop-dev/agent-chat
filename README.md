# agent-chat

Conversational chat interface for the [Agent Platform](https://github.com/bitop-dev/agent).
Chat with AI agents through a modern web UI with conversation history,
tool call visualization, and multi-profile support.

## Stack

- **SvelteKit** — full-stack framework
- **Bun** — runtime + package manager
- **shadcn-svelte** — UI components
- **Tailwind CSS v4** — styling
- **PostgreSQL** — conversation history
- **Drizzle ORM** — type-safe database access

## Features

- Three-column layout: icon rail → conversation sidebar → chat area
- Profile selector with agent descriptions
- Conversation management (create, delete, switch)
- Message history with markdown rendering
- Tool call display
- Token usage per message (model, input/output tokens)
- Suggestion prompts for empty state
- Dark/light mode
- Agents browser page

## Setup

```bash
# Install deps
bun install

# Set environment
cp .env.example .env
# Edit .env with your gateway URL and API key

# Run database migration
bun run drizzle-kit push

# Start dev server
bun run dev
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://localhost:5432/agent_chat` |
| `GATEWAY_URL` | Agent gateway URL | `http://localhost:8080` |
| `GATEWAY_API_KEY` | Gateway API key | — |

## k8s deployment

Deployed as a pod in the `agent-system` namespace alongside the gateway
and registry. Connects to the same PostgreSQL instance or a separate database.

## Architecture

```
Browser → agent-chat:3000 → gateway:8080 → workers → LLM
                ↓
           PostgreSQL (conversations, messages)
```

The chat app is a **client** of the gateway. It submits tasks via `POST /v1/tasks`,
fetches results, and stores the conversation in its own database.
