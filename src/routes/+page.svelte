<script lang="ts">
  import { onMount } from "svelte";
  import { toggleMode } from "mode-watcher";
  import IconRail from "$lib/components/chat/IconRail.svelte";
  import ConversationList from "$lib/components/chat/ConversationList.svelte";
  import ChatMessage from "$lib/components/chat/ChatMessage.svelte";
  import ChatInput from "$lib/components/chat/ChatInput.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import BotIcon from "@lucide/svelte/icons/bot";
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
    // Optimistic: add user message immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    messages = [...messages, userMsg];
    scrollToBottom();

    isLoading = true;
    try {
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

      // Update conversation ID if new
      if (!activeConvId && data.conversationId) {
        activeConvId = data.conversationId;
      }

      // Replace optimistic user message with real one and add assistant message
      messages = messages.filter((m) => m.id !== userMsg.id);
      messages = [
        ...messages,
        {
          id: data.userMessage.id,
          role: "user",
          content: data.userMessage.content,
          createdAt: data.userMessage.createdAt,
        },
        {
          id: data.assistantMessage.id,
          role: "assistant",
          content: data.assistantMessage.content,
          model: data.assistantMessage.model || data.model,
          inputTokens: data.assistantMessage.inputTokens || data.inputTokens,
          outputTokens:
            data.assistantMessage.outputTokens || data.outputTokens,
          createdAt: data.assistantMessage.createdAt,
        },
      ];

      await loadConversations();
      scrollToBottom();
    } catch (e: any) {
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${e.message}`,
          createdAt: new Date().toISOString(),
        },
      ];
    } finally {
      isLoading = false;
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
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <BotIcon class="h-4 w-4" />
                  </div>
                  <div class="flex items-center gap-1">
                    <div
                      class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    ></div>
                    <div
                      class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style="animation-delay: 0.1s"
                    ></div>
                    <div
                      class="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style="animation-delay: 0.2s"
                    ></div>
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
