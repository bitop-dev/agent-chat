import { json } from "@sveltejs/kit";
import { db, conversations, messages } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { submitTask, type TaskResult } from "$lib/server/gateway";

// POST /api/chat — send a message and get agent response
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

  // Submit to gateway
  const selectedProfile = profile || "researcher";
  let result: TaskResult;
  try {
    result = await submitTask(selectedProfile, userMessage);
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

  // Store assistant response
  const [assistantMsg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: result.output || result.error || "(no response)",
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    })
    .returning();

  // Update conversation title if first message
  if (!conversationId) {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, convId));
  } else {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, convId));
  }

  return json({
    conversationId: convId,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    taskId: result.id,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
}
