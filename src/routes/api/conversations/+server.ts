import { json } from "@sveltejs/kit";
import { db, conversations, messages } from "$lib/server/db";
import { desc, eq } from "drizzle-orm";

// GET /api/conversations — list all
export async function GET() {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));
  return json(rows);
}

// POST /api/conversations — create new
export async function POST({ request }) {
  const body = await request.json();
  const [row] = await db
    .insert(conversations)
    .values({
      title: body.title || null,
      profile: body.profile || null,
    })
    .returning();
  return json(row, { status: 201 });
}

// DELETE /api/conversations?id=... — delete
export async function DELETE({ url }) {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id required" }, { status: 400 });
  await db.delete(conversations).where(eq(conversations.id, id));
  return json({ deleted: true });
}
