import { json } from "@sveltejs/kit";
import { db, messages } from "$lib/server/db";
import { eq, asc } from "drizzle-orm";

// GET /api/conversations/:id/messages
export async function GET({ params }) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.id))
    .orderBy(asc(messages.createdAt));
  return json(rows);
}
