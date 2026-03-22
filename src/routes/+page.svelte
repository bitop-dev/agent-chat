<script lang="ts">
  import { onMount } from "svelte";
  import { toggleMode } from "mode-watcher";
  import IconRail from "$lib/components/chat/IconRail.svelte";
  import ConversationList from "$lib/components/chat/ConversationList.svelte";
  import ChatMessage from "$lib/components/chat/ChatMessage.svelte";
  import ChatInput from "$lib/components/chat/ChatInput.svelte";
  import Markdown from "$lib/components/chat/Markdown.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import BotIcon from "@lucide/svelte/icons/bot";
  import SearchIcon from "@lucide/svelte/icons/search";
  import WrenchIcon from "@lucide/svelte/icons/wrench";
  import type { Conversation, Message } from "$lib/stores";

  interface Agent {
    name: string;
    description?: string;
    capabilities?: string[];
  }

  let activePage = $state("chat");
  let conversations = $state<Conversation[]>([]);
  let activeConvId = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let isLoading = $state(false);
  let statusText = $state("");
  let taskEvents = $state<Array<{ type: string; tool: string; message: string; time: string }>>([]);
  let agents = $state<Agent[]>([]);
  let selectedProfile = $state("researcher");
  let messagesEndRef = $state<HTMLDivElement | null>(null);

  onMount(async () => {
    await loadConversations();
    await loadAgents();
  });

  async function loadConversations() {
    const resp = await fetch("/api/conversations");
    conversations = await resp.json();
  }

  async function loadAgents() {
    try {
      const resp = await fetch("/api/agents");
      agents = await resp.json();
    } catch {
      agents = [];
    }
  }

  async function loadMessages(convId: string) {
    const resp = await fetch(`/api/conversations/${convId}/messages`);
    messages = await resp.json();
    scrollToBottom();
  }

  async function selectConversation(id: string) {
    activeConvId = id;
    await loadMessages(id);
  }

  async function createConversation() {
    activeConvId = null;
    messages = [];
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    if (activeConvId === id) {
      activeConvId = null;
      messages = [];
    }
    await loadConversations();
  }

  async function sendMessage(text: string) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    messages = [...messages, userMsg];
    scrollToBottom();

    isLoading = true;
    statusText = "Submitting task...";

    try {
      // Step 1: Submit (returns immediately with task ID)
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: text,
          profile: selectedProfile,
        }),
      });
      const data = await resp.json();

      if (data.error && data.assistantMessage) {
        // Immediate error
        if (!activeConvId && data.conversationId) activeConvId = data.conversationId;
        messages = messages.filter((m) => m.id !== userMsg.id);
        messages = [...messages,
          { id: data.userMessage.id, role: "user", content: data.userMessage.content, createdAt: data.userMessage.createdAt },
          { id: data.assistantMessage.id, role: "assistant", content: data.assistantMessage.content, createdAt: data.assistantMessage.createdAt },
        ];
        await loadConversations();
        return;
      }

      if (!activeConvId && data.conversationId) activeConvId = data.conversationId;

      // Replace optimistic message with real user message
      messages = messages.filter((m) => m.id !== userMsg.id);
      messages = [...messages,
        { id: data.userMessage.id, role: "user", content: data.userMessage.content, createdAt: data.userMessage.createdAt },
      ];

      const taskId = data.taskId;
      statusText = `<span class="text-muted-foreground">⏳ Task submitted to</span> <strong class="text-foreground">${selectedProfile}</strong>`;
      const startTime = Date.now();

      // Step 2: Poll for completion with real-time events
      taskEvents = [];
      let result: any = null;
      for (let i = 0; i < 300; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        try {
          const [taskResp, eventsResp] = await Promise.all([
            fetch(`/api/tasks/${taskId}`),
            fetch(`/api/tasks/${taskId}/events`),
          ]);
          const task = await taskResp.json();
          const eventsData = await eventsResp.json();
          const profile = task.profile || selectedProfile;

          // Update live events
          if (eventsData.events?.length > 0) {
            taskEvents = eventsData.events;
            scrollToBottom();
          }

          if (task.status === "running") {
            const lastEvent = taskEvents[taskEvents.length - 1];
            if (lastEvent) {
              const toolName = lastEvent.tool || lastEvent.type;
              statusText = `🔍 <strong class="text-foreground">${profile}</strong> → <code class="text-xs">${toolName}</code> <span class="font-mono text-xs text-muted-foreground">${elapsed}s</span>`;
            } else {
              statusText = `🔄 <strong class="text-foreground">${profile}</strong> <span class="text-muted-foreground">working...</span> <span class="font-mono text-xs text-muted-foreground">${elapsed}s</span>`;
            }
          } else if (task.status === "queued") {
            statusText = `⏳ <span class="text-muted-foreground">Waiting for worker...</span> <span class="font-mono text-xs text-muted-foreground">${elapsed}s</span>`;
          }

          if (task.status === "completed" || task.status === "failed") {
            result = task;
            break;
          }
        } catch {
          // keep polling
        }
      }

      if (!result) {
        result = { output: "", error: "Task timed out", status: "timeout" };
      }

      statusText = "Saving response...";

      // Step 3: Store the result
      const completeResp = await fetch("/api/chat/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          taskId,
          output: result.output || "",
          error: result.error || "",
          model: result.model,
          inputTokens: result.inputTokens,
          toolSteps: result.toolSteps || [],
          outputTokens: result.outputTokens,
        }),
      });
      const completeData = await completeResp.json();

      messages = [...messages,
        {
          id: completeData.assistantMessage.id,
          role: "assistant" as const,
          content: completeData.assistantMessage.content,
          model: completeData.assistantMessage.model || result.model,
          inputTokens: completeData.assistantMessage.inputTokens || result.inputTokens,
          outputTokens: completeData.assistantMessage.outputTokens || result.outputTokens,
          createdAt: completeData.assistantMessage.createdAt,
          toolCalls: (result.toolSteps || []).map((s: any) => ({ name: s.tool, arguments: {} })),
        },
      ];

      await loadConversations();
      scrollToBottom();
    } catch (e: any) {
      messages = [...messages,
        { id: crypto.randomUUID(), role: "assistant" as const, content: `Error: ${e.message}`, createdAt: new Date().toISOString() },
      ];
    } finally {
      isLoading = false;
      statusText = "";
      taskEvents = [];
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }
</script>

<svelte:head>
  <title>Agent Chat</title>
</svelte:head>

<div class="flex h-screen overflow-hidden bg-background">
  <!-- Icon rail (PocketBase style) -->
  <IconRail active={activePage} onnavigate={(p) => (activePage = p)} />

  <!-- Context sidebar -->
  {#if activePage === "chat"}
    <div class="w-64 border-r bg-sidebar">
      <ConversationList
        {conversations}
        activeId={activeConvId}
        onselect={selectConversation}
        oncreate={createConversation}
        ondelete={deleteConversation}
      />
    </div>
  {/if}

  <!-- Main content area -->
  <div class="flex flex-1 flex-col">
    <!-- Top bar -->
    <div
      class="flex h-14 items-center justify-between border-b px-4"
    >
      <div class="flex items-center gap-3">
        {#if activePage === "chat"}
          <select
            class="h-8 rounded-md border bg-transparent px-2 text-sm"
            bind:value={selectedProfile}
          >
            {#each agents as agent (agent.name)}
              <option value={agent.name}>{agent.name}</option>
            {/each}
            {#if agents.length === 0}
              <option value="researcher">researcher</option>
            {/if}
          </select>
          {#if selectedProfile}
            {@const agent = agents.find((a) => a.name === selectedProfile)}
            {#if agent?.description}
              <span class="text-xs text-muted-foreground hidden md:inline">
                {agent.description}
              </span>
            {/if}
          {/if}
        {:else if activePage === "agents"}
          <h1 class="text-lg font-semibold">Agents</h1>
        {:else if activePage === "settings"}
          <h1 class="text-lg font-semibold">Settings</h1>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          onclick={toggleMode}
        >
          <SunIcon
            class="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <MoonIcon
            class="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
        </Button>
      </div>
    </div>

    <!-- Chat area -->
    {#if activePage === "chat"}
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto">
          {#if messages.length === 0 && !activeConvId}
            <!-- Empty state -->
            <div
              class="flex h-full flex-col items-center justify-center text-center px-4"
            >
              <BotIcon class="h-12 w-12 text-muted-foreground mb-4" />
              <h2 class="text-2xl font-bold mb-2">Agent Chat</h2>
              <p class="text-muted-foreground mb-6 max-w-md">
                Chat with AI agents. Select a profile above or just start
                typing — the agent will use its tools to help you.
              </p>
              <div class="flex flex-wrap gap-2 max-w-lg justify-center">
                {#each ["What is the latest Go version?", "Review a GitHub PR", "Research Kubernetes news", "Write about cloud computing"] as suggestion}
                  <button
                    class="rounded-full border px-4 py-2 text-sm hover:bg-accent transition-colors"
                    onclick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            <div class="mx-auto max-w-3xl">
              {#each messages as msg (msg.id)}
                <ChatMessage message={msg} />
              {/each}
              {#if isLoading}
                <div class="flex gap-3 px-4 py-4">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <BotIcon class="h-4 w-4 animate-pulse" />
                  </div>
                  <div class="flex flex-col gap-2 flex-1 max-w-[80%]">
                    {#if statusText}
                      <div class="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        {@html statusText}
                      </div>
                    {/if}
                    <!-- Live event feed -->
                    {#if taskEvents.length > 0}
                      <div class="space-y-1">
                        {#each taskEvents as event, i (i)}
                          <div class="flex items-start gap-2 text-xs">
                            {#if event.type === "tool_requested"}
                              <span class="shrink-0 mt-0.5">
                                <WrenchIcon class="h-3 w-3 text-blue-400" />
                              </span>
                              <span>
                                <code class="rounded bg-blue-500/10 px-1 text-blue-400">{event.tool}</code>
                              </span>
                            {:else if event.type === "tool_finished"}
                              <span class="shrink-0 mt-0.5 text-green-400">✓</span>
                              <span class="text-muted-foreground truncate">
                                {event.message?.substring(0, 80)}{event.message?.length > 80 ? '...' : ''}
                              </span>
                            {:else if event.type === "sub_agent"}
                              <span class="shrink-0 mt-0.5">
                                <BotIcon class="h-3 w-3 text-purple-400" />
                              </span>
                              <span class="text-purple-400">{event.message}</span>
                            {:else if event.type === "turn_started" || event.type === "turn_finished"}
                              <span class="text-muted-foreground/50">─</span>
                              <span class="text-muted-foreground/50">{event.message}</span>
                            {:else}
                              <span class="text-muted-foreground">{event.message?.substring(0, 80)}</span>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
              <div bind:this={messagesEndRef}></div>
            </div>
          {/if}
        </div>

        <!-- Input -->
        <ChatInput onsubmit={sendMessage} loading={isLoading} />
      </div>
    {:else if activePage === "agents"}
      <div class="flex-1 overflow-y-auto p-6">
        <div class="mx-auto max-w-3xl space-y-4">
          {#each agents as agent (agent.name)}
            <div class="rounded-lg border p-4 space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">{agent.name}</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => {
                    selectedProfile = agent.name;
                    activePage = "chat";
                    createConversation();
                  }}
                >
                  Chat
                </Button>
              </div>
              {#if agent.description}
                <p class="text-sm text-muted-foreground">
                  {agent.description}
                </p>
              {/if}
              {#if agent.capabilities?.length}
                <div class="flex flex-wrap gap-1">
                  {#each agent.capabilities as cap}
                    <Badge variant="secondary" class="text-[10px]"
                      >{cap}</Badge
                    >
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if activePage === "settings"}
      <div class="flex-1 overflow-y-auto p-6">
        <div class="mx-auto max-w-lg space-y-4">
          <p class="text-sm text-muted-foreground">
            Gateway and preferences are configured via environment variables on
            the server. See PLAN.md for details.
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>
