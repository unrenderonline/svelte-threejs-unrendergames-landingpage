<script>
  export let showText = true;
</script>

<div class="spinner-container">
  <div class="spinner"></div>
  {#if showText}
    <p class="loading-text">Carregando...</p>
  {/if}
</div>

<style>
  .spinner-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(10px);
    z-index: 9999;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    margin-top: 1rem;
    color: white;
    font-size: 1.125rem;
    opacity: 0.8;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
