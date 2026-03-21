import { env } from "$env/dynamic/private";

const GATEWAY_URL = env.GATEWAY_URL || "http://localhost:8080";
const GATEWAY_KEY = env.GATEWAY_API_KEY || "";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (GATEWAY_KEY) h["Authorization"] = `Bearer ${GATEWAY_KEY}`;
  return h;
}

export interface TaskResult {
  id: string;
  profile: string;
  status: string;
  output?: string;
  error?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  workerUrl?: string;
}

export interface Agent {
  name: string;
  description?: string;
  capabilities?: string[];
  accepts?: string;
  returns?: string;
  tools?: string[];
  model?: string;
  source: string;
}

export async function submitTask(
  profile: string,
  task: string
): Promise<TaskResult> {
  const resp = await fetch(`${GATEWAY_URL}/v1/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ profile, task }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gateway error ${resp.status}: ${text}`);
  }
  return resp.json();
}

export async function submitTaskAsync(
  profile: string,
  task: string
): Promise<{ id: string; status: string }> {
  const resp = await fetch(`${GATEWAY_URL}/v1/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ profile, task, async: true }),
  });
  if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
  return resp.json();
}

export async function getTask(id: string): Promise<TaskResult> {
  const resp = await fetch(`${GATEWAY_URL}/v1/tasks/${id}`, {
    headers: headers(),
  });
  if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
  return resp.json();
}

export async function getAgents(): Promise<Agent[]> {
  const resp = await fetch(`${GATEWAY_URL}/v1/agents`, {
    headers: headers(),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.agents || [];
}

export function getGatewayEventUrl(): string {
  return `${GATEWAY_URL}/v1/events${GATEWAY_KEY ? `?token=${encodeURIComponent(GATEWAY_KEY)}` : ""}`;
}
