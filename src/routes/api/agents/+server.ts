import { json } from "@sveltejs/kit";
import { getAgents } from "$lib/server/gateway";

export async function GET() {
  const agents = await getAgents();
  return json(agents);
}
