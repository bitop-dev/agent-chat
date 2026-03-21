<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import LoaderIcon from "@lucide/svelte/icons/loader";
  import SquareIcon from "@lucide/svelte/icons/square";

  let {
    onsubmit,
    loading = false,
    disabled = false,
  }: {
    onsubmit: (text: string) => void;
    loading?: boolean;
    disabled?: boolean;
  } = $props();

  let value = $state("");
  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function handleSubmit() {
    if (!value.trim() || loading) return;
    onsubmit(value.trim());
    value = "";
    // Reset height
    if (textareaRef) textareaRef.style.height = "auto";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function autoResize() {
    if (!textareaRef) return;
    textareaRef.style.height = "auto";
    textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + "px";
  }
</script>

<div class="border-t bg-background p-4">
  <div
    class="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-muted/50 p-2 shadow-sm"
  >
    <textarea
      bind:this={textareaRef}
      bind:value
      placeholder="Ask anything..."
      rows={1}
      class="flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      onkeydown={handleKeydown}
      oninput={autoResize}
      {disabled}
    ></textarea>
    <Button
      size="icon"
      class="h-9 w-9 shrink-0 rounded-full"
      disabled={(!value.trim() && !loading) || disabled}
      onclick={handleSubmit}
    >
      {#if loading}
        <SquareIcon class="h-4 w-4" />
      {:else}
        <ArrowUpIcon class="h-4 w-4" />
      {/if}
    </Button>
  </div>
</div>
