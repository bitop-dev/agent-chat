<script lang="ts">
  import { cn } from "$lib/utils";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import BotIcon from "@lucide/svelte/icons/bot";
  import SettingsIcon from "@lucide/svelte/icons/settings";

  let {
    active = "chat",
    onnavigate,
  }: {
    active?: string;
    onnavigate: (page: string) => void;
  } = $props();

  const items = [
    { id: "chat", icon: MessageSquareIcon, label: "Chat" },
    { id: "agents", icon: BotIcon, label: "Agents" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];
</script>

<div
  class="flex h-full w-14 flex-col items-center border-r bg-sidebar py-3 gap-1"
>
  <!-- Logo -->
  <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
    <BotIcon class="h-5 w-5" />
  </div>

  <!-- Nav items -->
  {#each items as item (item.id)}
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            class={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              active === item.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            onclick={() => onnavigate(item.id)}
          >
            <item.icon class="h-5 w-5" />
          </button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content side="right">{item.label}</Tooltip.Content>
    </Tooltip.Root>
  {/each}

  <div class="flex-1"></div>
</div>
