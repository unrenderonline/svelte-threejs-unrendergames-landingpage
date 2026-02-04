<script>
  import { onMount, tick } from "svelte";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
  import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
  import Spinner from "./Spinner.svelte";

  let canvas;
  let scene, camera, renderer;
  let models = {};
  let mixers = {}; // Animation Mixers
  let clock = new THREE.Clock(); // Clock for animations
  let modelGroup; // Parent group for all models to handle shared positioning
  let isLoading = true;
  let scrollCleanup;
  let scrollY = 0;

  const modelPaths = {
    lowPoly: "/models/3dmodel/lowpoly_car.glb",
    skier: "/models/3dmodel/p.u.c._security_bot_7.glb",
    chair: "/models/3dmodel/gaming_chair.glb",
    building: "/models/3dmodel/modern_home.glb",
  };

  onMount(async () => {
    document.body.style.overflowX = "hidden";

    try {
      initScene();
      await loadModels();
      setupLayout(); // Initial positioning
      await setupScrollAnimations();
      animate();
    } catch (error) {
      console.error("Error initializing 3D scene:", error);
      isLoading = false;
    }

    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      if (renderer) renderer.dispose();
      if (scrollCleanup) scrollCleanup();
      document.body.style.overflowX = "";
    };
  });

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Slightly darker bg

    camera = new THREE.PerspectiveCamera(
      45, // Smaller FOV for less distortion
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 8; // Further back for better view

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(2, 5, 5);
    scene.add(dirLight);
    
    const blueLight = new THREE.PointLight(0x3b82f6, 5); // Blue tint light for accents
    blueLight.position.set(-5, 0, 5);
    scene.add(blueLight);

    // Group to hold all models - allows moving them all together for responsive layout
    modelGroup = new THREE.Group();
    scene.add(modelGroup);
  }

  async function loadModels() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    loader.setDRACOLoader(dracoLoader);

    const loadPromises = Object.entries(modelPaths).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        loader.load(
          path,
          (gltf) => {
            const model = gltf.scene;

            // Fix tangents if needed
            model.traverse((child) => {
              if (child.isMesh) {
                if (child.material.normalMap && !child.geometry.attributes.tangent) {
                   if (child.geometry.attributes.uv) child.geometry.computeTangents();
                   else child.material.normalMap = null;
                }
              }
            });

            // Normalize Model Size & Position
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // 1. Center the model at 0,0,0 local space (by offsetting child meshes or wrapping in group, simple offset here)
            // Note: Since we are adding 'model' which is a Group usually, we can just center it relative to its pivot if pivot is weird
            // But GLTF usually has pivot at 0,0,0 world.
            // Best way: Wrap in a container specific for this model that corrects pivot
            
            const pivotContainer = new THREE.Group();
            pivotContainer.add(model);
            
            // Re-calc box to be sure
            const box2 = new THREE.Box3().setFromObject(model);
            const center2 = box2.getCenter(new THREE.Vector3());
            
            model.position.x = -center2.x;
            model.position.y = -center2.y;
            model.position.z = -center2.z;

            // 2. Scale container to standard size (approx 3.5 units)
            const targetSize = 3.5; 
            const scale = targetSize / maxDim;
            pivotContainer.scale.setScalar(scale);

            // Store original scale
            pivotContainer.userData.originalScale = scale;
            
            // Set initial visibility
            pivotContainer.visible = false;
            
            // Store specific rotation preferences and rotate the CONTAINER
            if (key === 'building') pivotContainer.rotation.y = Math.PI;
            if (key === 'chair') pivotContainer.rotation.y = Math.PI;

            // Handle Animations (Specifically for Skier / KGirls)
            if (key === 'skier' && gltf.animations && gltf.animations.length > 0) {
               const mixer = new THREE.AnimationMixer(model);
               const clip = THREE.AnimationClip.findByName(gltf.animations, "Take 01");
               
               if (clip) {
                   const action = mixer.clipAction(clip);
                   action.play();
                   mixers[key] = mixer;
               } else {
                   // Fallback: play first animation if specific one not found
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                    mixers[key] = mixer;
               }
            }

            // Save to dictionary and add to the shared group
            models[key] = pivotContainer;
            modelGroup.add(pivotContainer);
            
            resolve();
          },
          undefined,
          reject
        );
      });
    });

    await Promise.all(loadPromises);
    
    // Show first model
    if (models.lowPoly) {
       models.lowPoly.visible = true;
    }
    
    isLoading = false;
  }

  function setupLayout() {
    if (!modelGroup) return;

    const width = window.innerWidth;
    const isMobile = width < 768;

    if (isMobile) {
        // Mobile: Center horizontally, move up slightly
        modelGroup.position.x = 0;
        modelGroup.position.y = 1.0; 
        camera.position.z = 10; // Zoom out a bit more on mobile
    } else {
        // Desktop: Move to the right side
        // Calculate position based on aspect ratio to be roughly 25% from right edge
        const aspect = width / window.innerHeight;
        // Visible width at z=0 with camera.position.z=8 and fov=45
        const vFov = (camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFov / 2) * camera.position.z;
        const visibleWidth = height * aspect;
        
        // Place it at 1/4 of the width (right side)
        modelGroup.position.x = visibleWidth * 0.25; 
        modelGroup.position.y = 0;
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setupLayout();
  }

  function animate() {
    requestAnimationFrame(animate);
    
    // Update Animation Mixers
    const delta = clock.getDelta();
    Object.values(mixers).forEach(mixer => mixer.update(delta));
    
    renderer.render(scene, camera);
  }

  async function setupScrollAnimations() {
    try {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.gsap || gsapModule.default || gsapModule;
      const stModule = await import("gsap/ScrollTrigger");
      const ScrollTrigger = stModule.ScrollTrigger || stModule.default || stModule;
      gsap.registerPlugin(ScrollTrigger);

      const switchModel = (nextModel) => {
         Object.values(models).forEach(m => {
            if (m !== nextModel) m.visible = false;
         });
         
         if (nextModel) { 
             nextModel.visible = true;
             
             // Pop-in animation
             gsap.fromTo(nextModel.scale, 
                { x: 0, y: 0, z: 0 },
                { 
                    x: nextModel.userData.originalScale, 
                    y: nextModel.userData.originalScale, 
                    z: nextModel.userData.originalScale, 
                    duration: 0.6,
                    ease: "back.out(1.7)",
                    overwrite: true
                }
             );
             
             // Spin entry
             // We adjust rotation relative to whatever current rotation is or base
             const baseRot = (models.building === nextModel || models.chair === nextModel) ? Math.PI : 0;
            
             gsap.fromTo(nextModel.rotation, 
                { y: baseRot - Math.PI },
                {
                    y: baseRot,
                    duration: 0.8,
                    ease: "power2.out",
                    overwrite: true
                }
             );
         }
      };

      // Define sections and their corresponding models
      const sections = [
        { trigger: ".section-1", model: models.lowPoly },
        { trigger: ".section-2", model: models.skier },
        { trigger: ".section-3", model: models.chair },
        { trigger: ".section-4", model: models.building },
      ];

      sections.forEach(({ trigger, model }) => {
        if (!model) return;

        ScrollTrigger.create({
            trigger: trigger,
            start: "top 60%",
            end: "bottom 60%",
            onEnter: () => switchModel(model),
            onEnterBack: () => switchModel(model)
        });

        // Continuous Rotation on Scroll
        gsap.to(model.rotation, {
            y: "+=2", // Rotate 2 radians over the scroll duration
            ease: "none",
            scrollTrigger: {
                trigger: trigger,
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            }
        });
      });

      scrollCleanup = () => ScrollTrigger.getAll().forEach(t => t.kill());

    } catch (e) {
      console.warn("GSAP error:", e);
    }
  }
  
  const handleScrollClick = () => {
    const isBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    window.scrollTo({ 
        top: isBottom ? 0 : window.innerHeight, 
        behavior: "smooth" 
    });
  };
</script>

{#if isLoading}
  <Spinner />
{/if}

<svelte:window bind:scrollY />

<div class="relative w-full bg-[#0a0a0a] overflow-x-hidden">
  
  <!-- 3D Canvas Background -->
  <div class="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none">
    <canvas bind:this={canvas} class="w-full h-full block"></canvas>
  </div>

  <!-- Content Overlay -->
  <div class="relative z-10 w-full">
    
    <!-- Section 1 -->
    <section class="section-1 min-h-screen flex items-center p-6 md:p-12 pointer-events-none">
      <div class="w-full md:w-5/12 ml-0 md:ml-12 p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 pointer-events-auto transform transition-all hover:bg-black/50 hover:border-white/20">
        <h1 class="text-3xl md:text-5xl font-bold mb-4 text-white font-['Montserrat']">
            Personagens Low Poly
        </h1>
        <p class="text-xl text-indigo-400 font-semibold mb-6">Estilo e Performance</p>
        <p class="text-base md:text-lg text-gray-300 leading-relaxed">
          Personagens otimizados com estilo visual único, perfeitos para jogos
          mobile e web onde a performance é crucial sem perder a identidade
          visual. Nossos modelos garantem altas taxas de quadros em qualquer dispositivo.
        </p>
      </div>
    </section>

    <!-- Section 2 -->
    <section class="section-2 min-h-screen flex items-center p-6 md:p-12 pointer-events-none">
      <div class="w-full md:w-5/12 ml-0 md:ml-12 p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 pointer-events-auto transform transition-all hover:bg-black/50 hover:border-white/20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4 text-white font-['Montserrat']">
            Animação e Movimento
        </h2>
        <p class="text-xl text-blue-400 font-semibold mb-6">Vida em cada frame</p>
        <p class="text-base md:text-lg text-gray-300 leading-relaxed">
          Modelos preparados para animação (rigging) profissional, permitindo movimentos
          fluidos e naturais para qualquer tipo de ação, esporte ou combate. 
          Compatível com Mixamo e pipelines de animação padrão da indústria.
        </p>
      </div>
    </section>

    <!-- Section 3 -->
    <section class="section-3 min-h-screen flex items-center p-6 md:p-12 pointer-events-none">
       <div class="w-full md:w-5/12 ml-0 md:ml-12 p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 pointer-events-auto transform transition-all hover:bg-black/50 hover:border-white/20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4 text-white font-['Montserrat']">
            Props e Objetos
        </h2>
        <p class="text-xl text-purple-400 font-semibold mb-6">Detalhamento Imersivo</p>
        <p class="text-base md:text-lg text-gray-300 leading-relaxed">
          Objetos de cena detalhados como esta cadeira gamer, criando ambientes
          ricos e verossímeis. Texturas PBR de alta qualidade para realismo
          maximo em renders e games next-gen.
        </p>
      </div>
    </section>

    <!-- Section 4 -->
    <section class="section-4 min-h-screen flex items-center p-6 md:p-12 pointer-events-none">
       <div class="w-full md:w-5/12 ml-0 md:ml-12 p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 pointer-events-auto transform transition-all hover:bg-black/50 hover:border-white/20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4 text-white font-['Montserrat']">
            Arquitetura e Cenários
        </h2>
        <p class="text-xl text-teal-400 font-semibold mb-6">Escala e Complexidade</p>
        <p class="text-base md:text-lg text-gray-300 leading-relaxed">
          Construções completas e modularizadas. De pequenas casas a arranha-céus,
          mantendo a coerência visual e otimização de draw calls para grandes
          cenários abertos.
        </p>
      </div>
    </section>

  </div>

  <!-- Scroll Button -->
  <button
    on:click={handleScrollClick}
    class="fixed bottom-8 right-8 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full border border-white/10 shadow-lg transition-all duration-300 animate-bounce flex items-center gap-2 group pointer-events-auto"
  >
    <span class="font-semibold text-sm">
        {scrollY > 100 ? "Voltar ao topo" : "Explorar"}
    </span>
    <i class="{scrollY > 100 ? 'fa-arrow-up' : 'fa-arrow-down'} fa-solid group-hover:translate-y-0.5 transition-transform"></i>
  </button>
</div>
