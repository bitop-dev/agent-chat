<script lang="ts">
  import { cn } from "$lib/utils";
  import { Streamdown, type StreamdownProps } from "svelte-streamdown";
  import { mode } from "mode-watcher";
  import Code from "svelte-streamdown/code";
  import githubLightDefault from "@shikijs/themes/github-light-default";
  import githubDarkDefault from "@shikijs/themes/github-dark-default";

  let { content, class: className }: { content: string; class?: string } =
    $props();

  let currentTheme = $derived(
    mode.current === "dark" ? "github-dark-default" : "github-light-default"
  );
</script>

<div class={cn(className)}>
  <Streamdown
    {content}
    class="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    shikiTheme={currentTheme}
    baseTheme="shadcn"
    components={{ code: Code }}
    shikiThemes={{
      "github-light-default": githubLightDefault,
      "github-dark-default": githubDarkDefault,
    }}
  />
</div>
