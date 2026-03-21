<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  let { children } = $props();
</script>

<ModeWatcher defaultMode="dark" />
<Tooltip.Provider>
  {@render children()}
</Tooltip.Provider>
