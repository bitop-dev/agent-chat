<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Message } from "$lib/stores";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Markdown from "./Markdown.svelte";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import BotIcon from "@lucide/svelte/icons/bot";
  import UserIcon from "@lucide/svelte/icons/user";
  import WrenchIcon from "@lucide/svelte/icons/wrench";

  let { message }: { message: Message } = $props();

  const isUser = $derived(message.role === "user");

  function copyContent() {
    navigator.clipboard.writeText(message.content);
  }
</script>

<div
  class={cn(
    "group flex gap-3 px-4 py-4",
    isUser ? "justify-end" : "justify-start"
  )}
>
  {#if !isUser}
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
    >
      <BotIcon class="h-4 w-4" />
    </div>
  {/if}

  <div class={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
    <!-- Tool calls -->
    {#if message.toolCalls?.length}
      <div class="flex flex-wrap gap-1.5 mb-1">
        {#each message.toolCalls as tc}
          <Badge variant="outline" class="font-mono text-[11px] gap-1">
            <WrenchIcon class="h-3 w-3" />
            {tc.name}
          </Badge>
        {/each}
      </div>
    {/if}

    <!-- Content -->
    <div
      class={cn(
        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground"
      )}
    >
      {#if isUser}
        <div class="whitespace-pre-wrap break-words">{message.content}</div>
      {:else}
        <Markdown content={message.content} />
      {/if}
    </div>

    <!-- Meta (assistant only) -->
    {#if !isUser}
      <div
        class="flex items-center gap-2 mt-1"
      >
        {#if message.model}
          <Badge variant="outline" class="text-[10px] font-mono h-5"
            >{message.model}</Badge
          >
        {/if}
        {#if message.inputTokens || message.outputTokens}
          <span class="text-[10px] text-muted-foreground">
            {message.inputTokens?.toLocaleString()}↑ {message.outputTokens?.toLocaleString()}↓ tokens
          </span>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          class="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
          onclick={copyContent}
        >
          <CopyIcon class="h-3 w-3" />
        </Button>
      </div>
    {/if}
  </div>

  {#if isUser}
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
    >
      <UserIcon class="h-4 w-4" />
    </div>
  {/if}
</div>
