<script>
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
  import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
  import Spinner from "./Spinner.svelte";

  let canvas;
  let scene, camera, renderer;
  let models = {};
  let isLoading = true;
  let scrollCleanup;

  const modelPaths = {
    lowPoly: "/models/3dmodel/low_poly_character.glb",
    skier: "/models/3dmodel/engineer_tf2.glb",
    chair: "/models/3dmodel/gaming_chair.glb",
    building: "/models/3dmodel/lowpoly_urban_building.glb",
  };

  onMount(async () => {
    // Prevent horizontal scroll on this page
    document.body.style.overflowX = "hidden";

    try {
      await loadModels();
      initScene();
      await setupScrollAnimations();
      animate();
    } catch (error) {
      console.error("Error initializing 3D scene:", error);
      isLoading = false;
    }

    return () => {
      if (renderer) {
        renderer.dispose();
      }
      if (scrollCleanup) scrollCleanup();
      // Restore horizontal scroll
      document.body.style.overflowX = "";
    };
  });

  async function loadModels() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
    );
    loader.setDRACOLoader(dracoLoader);

    const loadPromises = Object.entries(modelPaths).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        loader.load(
          path,
          (gltf) => {
            const model = gltf.scene;

            // Fix for models with missing tangents (like building.glb)
            model.traverse((child) => {
              if (child.isMesh) {
                // Check if material has normal map but geometry lacks tangents
                if (
                  child.material.normalMap &&
                  !child.geometry.attributes.tangent
                ) {
                  try {
                    // Try to compute tangents
                    if (child.geometry.attributes.uv) {
                      child.geometry.computeTangents();
                    } else {
                      throw new Error("No UVs");
                    }
                  } catch (e) {
                    console.warn(
                      `Could not compute tangents for ${key}/${child.name}, removing normal map to ensure visibility.`,
                    );
                    child.material.normalMap = null;
                    child.material.needsUpdate = true;
                  }
                }
              }
            });

            // Center model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Normalize scale (approximate)

            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            let scaleFactor = 2.5 / maxDim;
            let targetX = 2;

            // Custom adjustments per model
            if (key === "building") {
              scaleFactor *= 2.0; // Make building bigger
              model.position.y += 1.5; // Move building up
              model.userData.targetRotation = Math.PI; // Face backwards
            } else if (key === "chair") {
              model.userData.targetRotation = Math.PI; // Face backwards
            } else if (key === "skier") {
              scaleFactor *= 10.0; // Make engineer MUCH bigger (attempt 3)
              model.userData.targetRotation = 0;
              targetX = 5.0; // Move further right (attempt 3)
            } else {
              model.userData.targetRotation = 0;
            }

            model.scale.setScalar(scaleFactor);

            // Move to right side
            model.position.x = targetX;

            models[key] = model;
            resolve();
          },
          undefined,
          reject,
        );
      });
    });

    await Promise.all(loadPromises);
    isLoading = false;
  }

  function initScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    scene.add(spotLight);

    // Add models to scene but hide them initially
    Object.values(models).forEach((model) => {
      scene.add(model);
      model.visible = false;
    });

    // Don't set initial visibility here, let ScrollTrigger handle it to avoid "double" appearance
    // or set it but ensure ScrollTrigger knows.
    // Actually, setting it here ensures something is seen if JS fails or before scroll.
    if (models.lowPoly) {
      models.lowPoly.visible = true;
      models.lowPoly.rotation.y = -0.5;
    }

    // Handle resize
    window.addEventListener("resize", onWindowResize);
  }

  async function setupScrollAnimations() {
    try {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.gsap || gsapModule.default || gsapModule;
      const stModule = await import("gsap/ScrollTrigger");
      const ScrollTrigger =
        stModule.ScrollTrigger || stModule.default || stModule;
      gsap.registerPlugin(ScrollTrigger);

      const transitionDuration = 0.8;
      const spinEase = "back.out(1.2)";

      // Helper for transitions
      const switchModel = (showModel, hideModels, isInitial = false) => {
        // If the model is already visible and this isn't a forced update, skip
        // This prevents the "double animation" or "stuck" feeling if it re-triggers
        if (showModel.visible && !isInitial) return;

        hideModels.forEach((m) => {
          if (m) m.visible = false;
        });

        if (showModel) {
          showModel.visible = true;

          const targetRot = showModel.userData.targetRotation || 0;

          // Reset rotation for the spin effect
          // We want it to spin INTO position
          gsap.fromTo(
            showModel.rotation,
            { y: targetRot - Math.PI * 2 }, // Start from a full rotation back relative to target
            {
              y: targetRot,
              duration: transitionDuration,
              ease: spinEase,
              overwrite: true,
            },
          );

          gsap.fromTo(
            showModel.scale,
            { x: 0, y: 0, z: 0 },
            {
              x: showModel.userData.originalScale || showModel.scale.x,
              y: showModel.userData.originalScale || showModel.scale.y,
              z: showModel.userData.originalScale || showModel.scale.z,
              duration: 0.5,
              ease: "power2.out",
              overwrite: true,
            },
          );
        }
      };

      // Store original scales
      Object.values(models).forEach((m) => {
        m.userData.originalScale = m.scale.x;
      });

      // Section 1: Low Poly
      ScrollTrigger.create({
        trigger: ".section-1",
        start: "top 60%", // Trigger earlier
        end: "bottom 60%",
        onEnter: () =>
          switchModel(models.lowPoly, [
            models.skier,
            models.chair,
            models.building,
          ]),
        onEnterBack: () =>
          switchModel(models.lowPoly, [
            models.skier,
            models.chair,
            models.building,
          ]),
      });

      // Continuous rotation for active model
      gsap.to(models.lowPoly.rotation, {
        y: (models.lowPoly.userData.targetRotation || 0) + Math.PI / 4,
        scrollTrigger: {
          trigger: ".section-1",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Section 2: Skier
      ScrollTrigger.create({
        trigger: ".section-2",
        start: "top 60%",
        end: "bottom 60%",
        onEnter: () =>
          switchModel(models.skier, [
            models.lowPoly,
            models.chair,
            models.building,
          ]),
        onEnterBack: () =>
          switchModel(models.skier, [
            models.lowPoly,
            models.chair,
            models.building,
          ]),
      });

      gsap.to(models.skier.rotation, {
        y: (models.skier.userData.targetRotation || 0) + Math.PI / 4,
        scrollTrigger: {
          trigger: ".section-2",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Section 3: Chair
      ScrollTrigger.create({
        trigger: ".section-3",
        start: "top 60%",
        end: "bottom 60%",
        onEnter: () =>
          switchModel(models.chair, [
            models.lowPoly,
            models.skier,
            models.building,
          ]),
        onEnterBack: () =>
          switchModel(models.chair, [
            models.lowPoly,
            models.skier,
            models.building,
          ]),
      });

      gsap.to(models.chair.rotation, {
        y: (models.chair.userData.targetRotation || 0) + Math.PI / 4,
        scrollTrigger: {
          trigger: ".section-3",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Section 4: Building
      ScrollTrigger.create({
        trigger: ".section-4",
        start: "top 60%",
        end: "bottom bottom", // Keep it visible until the very end
        onEnter: () =>
          switchModel(models.building, [
            models.lowPoly,
            models.skier,
            models.chair,
          ]),
        onEnterBack: () =>
          switchModel(models.building, [
            models.lowPoly,
            models.skier,
            models.chair,
          ]),
      });

      gsap.to(models.building.rotation, {
        y: (models.building.userData.targetRotation || 0) + Math.PI / 4,
        scrollTrigger: {
          trigger: ".section-4",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      scrollCleanup = () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    } catch (e) {
      console.warn("GSAP not available for scroll animations", e);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
</script>

{#if isLoading}
  <Spinner />
{/if}

<div class="page-container">
  <canvas bind:this={canvas} class="fixed-canvas"></canvas>

  <section class="section section-1">
    <div class="content">
      <h1 class="title">Personagens Low Poly</h1>
      <p class="text">Estilo e Performance</p>
      <p class="description">
        Personagens otimizados com estilo visual único, perfeitos para jogos
        mobile e web onde a performance é crucial sem perder a identidade
        visual.
      </p>
    </div>
  </section>

  <section class="section section-2">
    <div class="content">
      <h2 class="title">Animação e Movimento</h2>
      <p class="text">Vida em cada frame</p>
      <p class="description">
        Modelos preparados para animação (rigging), permitindo movimentos
        fluidos e naturais para qualquer tipo de ação ou esporte.
      </p>
    </div>
  </section>

  <section class="section section-3">
    <div class="content">
      <h2 class="title">Props e Objetos</h2>
      <p class="text">Detalhamento Imersivo</p>
      <p class="description">
        Objetos de cena detalhados como esta cadeira gamer, criando ambientes
        ricos e verossímeis para seus cenários virtuais.
      </p>
    </div>
  </section>

  <section class="section section-4">
    <div class="content">
      <h2 class="title">Arquitetura e Cenários</h2>
      <p class="text">Escala e Complexidade</p>
      <p class="description">
        Construções e ambientes completos, desde pequenas casas até grandes
        edifícios, mantendo a coerência visual do projeto.
      </p>
    </div>
  </section>

  <div class="scroll-fab">
    <p>
      Rolar para baixo <i
        class="fa-solid fa-arrow-down"
        style="margin-left: 0.5rem;"
      ></i>
    </p>
  </div>
</div>

<style>
  .page-container {
    position: relative;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background: #1a1a1a;
  }

  .fixed-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 1;
    pointer-events: none;
  }

  .section {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: flex-start; /* Align content to the left */
    z-index: 2;
    padding: 2rem;
    pointer-events: none;
  }

  .content {
    pointer-events: auto;
    max-width: 40%; /* Limit width to leave room for model */
    margin-left: 10%; /* Position on the left */
    text-align: left;
    color: white;
    padding: 2rem;
    background: rgba(26, 26, 26, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .title {
    font-size: 3rem;
    margin: 0 0 1rem;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
  }

  .text {
    font-size: 1.5rem;
    margin: 0 0 1.5rem;
    opacity: 0.9;
    font-weight: 600;
    color: #e2e8f0;
  }

  .description {
    font-size: 1.125rem;
    line-height: 1.6;
    opacity: 0.8;
    margin: 0;
    color: #cbd5e1;
  }

  @media (max-width: 768px) {
    .section {
      justify-content: center;
    }

    .content {
      margin-left: 0;
      max-width: 90%;
      margin-top: 50vh; /* Push content down on mobile */
      background: rgba(26, 26, 26, 0.85);
    }

    .title {
      font-size: 2rem;
    }
  }

  .scroll-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    color: white;
    z-index: 100;
    pointer-events: none;
    animation: bounce 2s infinite;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 0.8rem 1.5rem;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-family: inherit;
    font-weight: 600;
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }
</style>
