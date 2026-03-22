import { json } from "@sveltejs/kit";
import { db, conversations, messages } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { submitTaskAsync } from "$lib/server/gateway";

// POST /api/chat — send a message, submit async task, return task ID
// Frontend polls /api/tasks/:id for status and calls /api/chat/complete when done
export async function POST({ request }) {
  const body = await request.json();
  const { conversationId, message: userMessage, profile } = body;

  if (!userMessage?.trim()) {
    return json({ error: "message is required" }, { status: 400 });
  }

  let convId = conversationId;

  // Create conversation if needed
  if (!convId) {
    const title =
      userMessage.length > 60
        ? userMessage.substring(0, 57) + "..."
        : userMessage;
    const [conv] = await db
      .insert(conversations)
      .values({ title, profile: profile || null })
      .returning();
    convId = conv.id;
  }

  // Store user message
  const [userMsg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "user",
      content: userMessage,
    })
    .returning();

  // Submit async task to gateway (returns immediately)
  const selectedProfile = profile || "researcher";
  try {
    const resp = await submitTaskAsync(selectedProfile, userMessage);
    return json({
      conversationId: convId,
      userMessage: userMsg,
      taskId: resp.id,
      status: "submitted",
    });
  } catch (e: any) {
    // Store error as assistant message
    const [errMsg] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        role: "assistant",
        content: `Error: ${e.message}`,
      })
      .returning();

    return json({
      conversationId: convId,
      userMessage: userMsg,
      assistantMessage: errMsg,
      error: e.message,
    });
  }
}
