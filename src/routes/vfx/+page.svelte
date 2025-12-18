<script>
  import VFXPage from "$lib/VFXPage.svelte";
  import { browser } from "$app/environment";
</script>

{#if browser}
  <VFXPage />
{/if}
