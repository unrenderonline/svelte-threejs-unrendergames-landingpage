<script>
  import { onMount, onDestroy } from 'svelte';
  import Spinner from './Spinner.svelte';
  let container;
  let renderer;
  let scene;
  let camera;
  let cube;
  let raf;
  let resizeHandler;
  let scrollCleanup;
  let isLoading = true;
  let isInitialized = false;

  onMount(async () => {
    if (!isInitialized) {
      const THREE = await import('three');

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(2, 2, 5);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.domElement.style.position = 'fixed';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.zIndex = '0';
      container.appendChild(renderer.domElement);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x00aaff });
      cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7.5);
      scene.add(light);

      const amb = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(amb);

      // no orbit controls — cube will be animated by scroll

      resizeHandler = function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', resizeHandler);

      // render loop — no auto-rotation, only render the scene
      function animate() {
        raf = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }

      animate();

      // load GSAP and ScrollTrigger to animate cube on scroll
      try {
        const gsapModule = await import('gsap');
        const gsap = gsapModule.gsap || gsapModule.default || gsapModule;
        const stModule = await import('gsap/ScrollTrigger');
        const ScrollTrigger = stModule.ScrollTrigger || stModule.default || stModule;
        gsap.registerPlugin(ScrollTrigger);

        // animate rotation and position as the user scrolls the page
        const rotationTween = gsap.to(cube.rotation, {
          y: Math.PI * 2,
          x: Math.PI / 4,
          ease: 'none',
          scrollTrigger: {
            scrub: true,
            start: 'top top',
            end: 'bottom top'
          }
        });

        const positionTween = gsap.to(cube.position, {
          y: 2,
          ease: 'none',
          scrollTrigger: {
            scrub: true,
            start: 'top top',
            end: 'bottom top'
          }
        });

        // define how to clean up scroll animations
        scrollCleanup = () => {
          rotationTween.kill();
          positionTween.kill();
          if (ScrollTrigger) {
            ScrollTrigger.getAll().forEach((t) => t.kill());
          }
        };
      } catch (e) {
        // ignore if gsap isn't available; cube will remain static
        console.warn('GSAP not available', e);
      }

      // Mark as loaded and initialized
      isLoading = false;
      isInitialized = true;
    }
  });

  onDestroy(() => {
    // these APIs only exist in the browser; guard for SSR
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(raf);
    }
    if (typeof window !== 'undefined' && resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    if (scrollCleanup) scrollCleanup();
    if (renderer) renderer.dispose();
  });
</script>

{#if isLoading}
  <Spinner />
{/if}

<div bind:this={container} class="w-screen h-screen pointer-events-none"></div>

<style>
:global(body) {
  margin: 0;
}
</style>