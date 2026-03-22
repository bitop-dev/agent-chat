import { json } from "@sveltejs/kit";
import { db, conversations, messages } from "$lib/server/db";
import { eq } from "drizzle-orm";

// POST /api/chat/complete — store the completed task result as an assistant message
export async function POST({ request }) {
  const body = await request.json();
  const { conversationId, taskId, output, error, model, inputTokens, outputTokens, toolSteps } = body;

  if (!conversationId) {
    return json({ error: "conversationId required" }, { status: 400 });
  }

  const content = output || error || "(no response)";

  const [assistantMsg] = await db
    .insert(messages)
    .values({
      conversationId,
      role: "assistant",
      content,
      model,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      toolCalls: toolSteps && toolSteps.length > 0 ? toolSteps : null,
    })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return json({
    assistantMessage: assistantMsg,
    taskId,
    model,
    inputTokens,
    outputTokens,
  });
}
