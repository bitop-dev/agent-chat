import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const GATEWAY_URL = env.GATEWAY_URL || "http://localhost:8080";
const GATEWAY_KEY = env.GATEWAY_API_KEY || "";

// GET /api/tasks/:id/events — proxy task events from gateway
export async function GET({ params }) {
  try {
    const headers: Record<string, string> = {};
    if (GATEWAY_KEY) headers["Authorization"] = `Bearer ${GATEWAY_KEY}`;

    const resp = await fetch(
      `${GATEWAY_URL}/v1/tasks/${params.id}/events`,
      { headers }
    );
    const data = await resp.json();
    return json(data);
  } catch (e: any) {
    return json({ events: [], count: 0 });
  }
}
