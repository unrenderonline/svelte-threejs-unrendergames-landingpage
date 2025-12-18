<script>
  import { onMount, onDestroy } from 'svelte';

  // Prevent body scrolling while this fullscreen page is mounted
  onMount(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  });

  onDestroy(() => {
    // Revert changes
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = '';
    document.body.style.overscrollBehavior = '';
  });
</script>

<main class="fullscreen" aria-label="VFX fullscreen page">
  <div class="content">
    <h1 class="title">VFX</h1>
    <p class="subtitle">This is a fullscreen, no-scroll page for VFX effects.</p>
    <p class="note">Use the site navigation to leave this full-bleed view.</p>
    <p><button type="button" class="back">← Back to home</button></p>
  </div>
</main>

<style>
  .fullscreen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #ec4899 0%, #8b5cf6 100%);
    color: white;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .content { text-align: center; padding: 2rem; max-width: 900px; }
  .title { font-size: 3rem; margin: 0 0 0.5rem; }
  .subtitle { font-size: 1.125rem; margin: 0 0 1rem; opacity: 0.95; }
  .note { opacity: 0.9; margin-bottom: 1.5rem; }

  .back { 
    color: rgba(255,255,255,0.95); 
    text-decoration: underline; 
    background: none;
    border: none;
    padding: 0;
    cursor: pointer; 
  }

  @media (max-width:640px) {
    .title { font-size: 2rem; }
    .content { padding: 1.25rem; }
  }
</style>
