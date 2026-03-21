<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Conversation } from "$lib/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";

  let {
    conversations,
    activeId,
    onselect,
    oncreate,
    ondelete,
  }: {
    conversations: Conversation[];
    activeId: string | null;
    onselect: (id: string) => void;
    oncreate: () => void;
    ondelete: (id: string) => void;
  } = $props();

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex items-center justify-between border-b px-4 py-3">
    <h2 class="text-sm font-semibold">Conversations</h2>
    <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={oncreate}>
      <PlusIcon class="h-4 w-4" />
    </Button>
  </div>

  <div class="flex-1 overflow-y-auto p-2">
    {#if conversations.length === 0}
      <div class="px-2 py-8 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    {:else}
      <div class="space-y-0.5">
        {#each conversations as conv (conv.id)}
          <button
            class={cn(
              "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              activeId === conv.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            onclick={() => onselect(conv.id)}
          >
            <MessageSquareIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">
                {conv.title || "New conversation"}
              </p>
              <p class="text-[10px] text-muted-foreground">
                {timeAgo(conv.updatedAt)}
                {#if conv.profile}
                  · {conv.profile}
                {/if}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                ondelete(conv.id);
              }}
            >
              <Trash2Icon class="h-3 w-3 text-destructive" />
            </Button>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
