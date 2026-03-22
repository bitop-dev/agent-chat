import { json } from "@sveltejs/kit";
import { getTask } from "$lib/server/gateway";

// GET /api/tasks/:id — proxy task status from gateway
export async function GET({ params }) {
  try {
    const task = await getTask(params.id);
    return json(task);
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
}
