<script>
  import Nav from './lib/Nav.svelte';
  import ThreeScene from './lib/ThreeScene.svelte';
  import Home from './lib/Home.svelte';
  import RobloxPage from './lib/RobloxPage.svelte';
  import FortnitePage from './lib/FortnitePage.svelte';

  let route = 'home'; // 'home' | 'roblox' | 'fortnite'

  function handleNavigate(event) {
    route = event.detail;
  }
</script>

<Nav on:navigate={handleNavigate} />

{#if route === 'home'}
  <ThreeScene />
  <Home />
{:else if route === 'roblox'}
  <RobloxPage />
{:else if route === 'fortnite'}
  <FortnitePage />
{/if}

