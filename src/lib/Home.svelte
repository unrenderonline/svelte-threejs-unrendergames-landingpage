<script>
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { gsap } from "gsap";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
  import Spinner from "./Spinner.svelte";
  import { contactModalState } from "./modalStore.js";

  let isLoading = true;
  let canvasContainer;
  let renderer, scene, camera;
  let birds = [];
  let mixer;
  let clock = new THREE.Clock();
  let clouds = [];
  let animationId;

  // Shader Code

  // Carousel state
  let currentSlide = 0;
  let isTransitioning = false;
  let touchStartX = 0;
  let touchEndX = 0;
  let autoplayTimer = null;
  let autoplayDelay = 10000; // Default 10 seconds

  // Flocking parameters
  const FLOCK_SIZE = 150;
  const SEPARATION_RADIUS = 10;
  const ALIGNMENT_RADIUS = 20;
  const COHESION_RADIUS = 20;
  const MAX_SPEED = 0.8;
  const MAX_FORCE = 0.03;
  const MIN_HEIGHT = 15;
  const MAX_HEIGHT = 60;
  const BOUNDARY_SIZE = 120;

  // Reusable vectors to avoid garbage collection
  const _diff = new THREE.Vector3();
  const _separation = new THREE.Vector3();
  const _alignment = new THREE.Vector3();
  const _cohesion = new THREE.Vector3();
  const _vector = new THREE.Vector3();
  const _lookAtPos = new THREE.Vector3();

  // Carousel slides data
  const slides = [
    {
      title: "UNRENDER",
      tagline: "Transformando Ideias em Experiências Digitais",
      description:
        "Criamos mundos virtuais imersivos, jogos personalizados e experiências interativas que conectam sua marca com milhões de jogadores ao redor do mundo, gerando engajamento real e resultados mensuráveis.",
      buttons: [
        { text: "ENTRAR EM CONTATO", action: "contact", style: "secondary" },
      ],
    },
    {
      title: "GAMIFICAÇÃO",
      tagline: "Transforme Seu Negócio em Uma Experiência Envolvente",
      description:
        "Aplicamos mecânicas de jogos comprovadas para revolucionar processos empresariais, aumentando participação de usuários em até 300%, impulsionando motivação de equipes e gerando resultados extraordinários através do poder do engajamento lúdico.",
      buttons: [
        { text: "ENTRAR EM CONTATO", action: "contact", style: "secondary" },
      ],
    },
    {
      title: "REALIDADE VIRTUAL",
      tagline: "Mergulhe em Mundos Completamente Imersivos",
      description:
        "Desenvolvemos experiências VR de última geração para treinamento corporativo, entretenimento premium e campanhas de marketing impactantes que transportam seus usuários para ambientes virtuais totalmente imersivos, criando memórias inesquecíveis.",
      buttons: [
        { text: "ENTRAR EM CONTATO", action: "contact", style: "secondary" },
      ],
    },
    {
      title: "REALIDADE MISTA",
      tagline: "O Melhor dos Dois Mundos em Perfeita Harmonia",
      description:
        "Criamos soluções inovadoras de Mixed Reality que fundem perfeitamente o mundo físico com elementos digitais interativos, permitindo que seus usuários manipulem objetos virtuais no espaço real com naturalidade surpreendente.",
      buttons: [
        { text: "ENTRAR EM CONTATO", action: "contact", style: "secondary" },
      ],
    },
    {
      title: "REALIDADE AUMENTADA",
      tagline: "Expanda a Realidade com Camadas Digitais Inteligentes",
      description:
        "Desenvolvemos aplicações AR de alta performance que sobrepõem informações digitais contextuais ao mundo real através de smartphones e tablets, criando experiências interativas que educam, entretêm e convertem usuários em clientes.",
      buttons: [
        { text: "ENTRAR EM CONTATO", action: "contact", style: "secondary" },
      ],
    },
    {
      title: "NOSSOS SERVIÇOS",
      tagline: "Soluções Completas em Experiências Digitais Imersivas",
      description:
        "Explore nossa gama completa de serviços especializados em criação de conteúdo digital de alto impacto, experiências interativas memoráveis e soluções tecnológicas que transformam a forma como sua marca se conecta com o público.",
      buttons: [
        { text: "Jogos", action: "/jogos", style: "service" },
        { text: "Web Interativa", action: "/web-interativa", style: "service" },
        { text: "Modelagem 3D", action: "/modelagem-3d", style: "service" },
        { text: "Fortnite", action: "/fortnite", style: "service" },
        { text: "Roblox", action: "/roblox", style: "service" },
        { text: "AudioVisual", action: "/audiovisual", style: "service" },
      ],
    },
  ];

  // Carousel navigation functions
  function nextSlide(isManual = false) {
    if (isTransitioning) return;
    isTransitioning = true;

    const oldSlide = currentSlide;
    currentSlide = (currentSlide + 1) % slides.length;
    animateSlideTransition(oldSlide, currentSlide);

    // If manual navigation, set longer delay
    if (isManual) {
      autoplayDelay = 30000; // 30 seconds
    }

    // Restart autoplay timer
    startAutoplay();
  }

  function prevSlide(isManual = false) {
    if (isTransitioning) return;
    isTransitioning = true;

    const oldSlide = currentSlide;
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    animateSlideTransition(oldSlide, currentSlide);

    // If manual navigation, set longer delay
    if (isManual) {
      autoplayDelay = 30000; // 30 seconds
    }

    // Restart autoplay timer
    startAutoplay();
  }

  function goToSlide(index, isManual = false) {
    if (isTransitioning || index === currentSlide) return;
    isTransitioning = true;

    const oldSlide = currentSlide;
    currentSlide = index;
    animateSlideTransition(oldSlide, currentSlide);

    // If manual navigation, set longer delay
    if (isManual) {
      autoplayDelay = 30000; // 30 seconds
    }

    // Restart autoplay timer
    startAutoplay();
  }

  function startAutoplay() {
    // Clear existing timer
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
    }

    // Set new timer
    autoplayTimer = setTimeout(() => {
      nextSlide(false); // Auto-advance (not manual)
      autoplayDelay = 10000; // Reset to 10 seconds for auto-advance
    }, autoplayDelay);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function typewriterEffect(element, text, duration = 1.5) {
    if (!element) return;

    element.textContent = "";
    const chars = text.split("");
    const timeline = gsap.timeline();

    chars.forEach((char, index) => {
      timeline.to(
        element,
        {
          duration: duration / chars.length,
          onStart: () => {
            element.textContent += char;
          },
        },
        index * (duration / chars.length),
      );
    });

    return timeline;
  }

  // Timeline storage to manage and kill active animations
  let slideTimelines = {};

  function cleanupSlideAnimations(slideIndex) {
    const slide = document.querySelector(`.slide-${slideIndex}`);
    if (!slide) return;

    const title = slide.querySelector(".slide-title");
    const tagline = slide.querySelector(".slide-tagline");
    const description = slide.querySelector(".slide-description");
    const buttons = slide.querySelectorAll(".slide-button");

    const elements = [title, tagline, description, ...buttons].filter(Boolean);
    gsap.killTweensOf(elements);

    // Also kill the master timeline for this slide if it exists
    if (slideTimelines[slideIndex]) {
      slideTimelines[slideIndex].kill();
      delete slideTimelines[slideIndex];
    }
  }

  function animateSlideContent(slideIndex) {
    const slide = document.querySelector(`.slide-${slideIndex}`);
    if (!slide) return;

    // Ensure state is clean before starting
    cleanupSlideAnimations(slideIndex);

    const title = slide.querySelector(".slide-title");
    const tagline = slide.querySelector(".slide-tagline");
    const description = slide.querySelector(".slide-description");
    const buttons = slide.querySelectorAll(".slide-button");

    const titleText = slides[slideIndex].title;
    const taglineText = slides[slideIndex].tagline;
    const descriptionText = slides[slideIndex].description;

    // Create timeline for sequential animations
    const timeline = gsap.timeline();
    slideTimelines[slideIndex] = timeline;

    if (title) {
      title.textContent = "";
      timeline.add(() => typewriterEffect(title, titleText, 0.8));
    }

    if (tagline) {
      tagline.textContent = "";
      timeline.add(() => typewriterEffect(tagline, taglineText, 1.2), 0.3);
    }

    if (description) {
      description.textContent = "";
      timeline.add(
        () => typewriterEffect(description, descriptionText, 1.8),
        0.6,
      );
    }

    if (buttons.length > 0) {
      gsap.fromTo(
        buttons,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          delay: 1.5,
          ease: "power2.out",
        },
      );
    }
  }

  function animateSlideTransition(from, to) {
    // Kill old animations immediately
    cleanupSlideAnimations(from);

    // Immediately hide old slide content
    const oldSlide = document.querySelector(`.slide-${from}`);
    if (oldSlide) {
      gsap.set(oldSlide, { opacity: 0, display: "none" });
    }

    // Show new slide and start typewriter animation immediately
    const newSlide = document.querySelector(`.slide-${to}`);
    if (newSlide) {
      gsap.set(newSlide, { opacity: 1, display: "block" });
      animateSlideContent(to);

      setTimeout(() => {
        isTransitioning = false;
      }, 300);
    }
  }

  function handleKeydown(e) {
    if (e.key === "ArrowLeft") prevSlide(true); // Manual navigation
    if (e.key === "ArrowRight") nextSlide(true); // Manual navigation
  }

  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide(true); // Manual navigation
      } else {
        prevSlide(true); // Manual navigation
      }
    }
  }

  function handleButtonClick(action) {
    if (action === "contact") {
      openContact();
    } else {
      window.location.href = action;
    }
  }

  // Prevent body scrolling while this fullscreen page is mounted
  onMount(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.overscrollBehavior = "none";

    initThreeJS();

    // Add keyboard listener
    window.addEventListener("keydown", handleKeydown);

    // Start autoplay
    startAutoplay();

    // Simulate loading
    setTimeout(() => {
      isLoading = false;

      // Start animations after loading
      setTimeout(() => {
        initAnimations();
      }, 100);
    }, 2000);
  });

  // Helper for cleaning up ThreeJS objects
  function disposeNode(node) {
    if (node instanceof THREE.Mesh) {
      if (node.geometry) {
        node.geometry.dispose();
      }
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    }
  }

  onDestroy(() => {
    if (browser) {
      if (animationId) cancelAnimationFrame(animationId);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.body.style.overscrollBehavior = "";
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("keydown", handleKeydown);
      stopAutoplay(); // Clean up autoplay timer
    }

    if (scene) {
      scene.traverse(disposeNode);
    }

    // Explicitly clear arrays
    birds = [];
    clouds = [];

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement = null;
      renderer = null;
    }
  });

  function initThreeJS() {
    scene = new THREE.Scene();

    // Skybox - Gradient
    scene.background = createSkyGradient();
    // Fog matching the horizon color of the gradient
    scene.fog = new THREE.Fog(0xed7e4e, 3000, 4900);

    createClouds();

    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      5000,
    );
    // Moved camera forward to Z=25 to be inside the rock borders
    camera.position.set(0, 15, 65);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.appendChild(renderer.domElement);

    // Warmer Hemisphere Light for sunset
    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 2.0); // Warm sky, dark ground
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    // Golden Sunset Light
    const dirLight = new THREE.DirectionalLight(0xffaa33, 3.5);
    dirLight.position.set(50, 20, 50); // Lower angle for long shadows
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.05;
    // Increased shadow map coverage
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.top = 300;
    dirLight.shadow.camera.bottom = -300;
    dirLight.shadow.camera.left = -300;
    dirLight.shadow.camera.right = 300;
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      "/models/map/low_poly_forest_1.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.shadowSide = THREE.DoubleSide;
            }
            // Essential for raycasting
            child.name = "environment_mesh";
          }
        });
        model.scale.set(5, 5, 5);
        model.position.y = -5;
        scene.add(model);
        model.name = "map_root";

        // Force update of matrix world so raycasting works immediately
        model.updateMatrixWorld(true);

        // Generate Rock Border (Scaled 5x)
        // Generate Rock Border (Scaled 5x)
        createRockBorder();
      },
      undefined,
      (error) => {
        console.error("An error happened loading the map:", error);
      },
    );

    const birdGeometry = new THREE.ConeGeometry(0.5, 2, 5);
    birdGeometry.rotateX(Math.PI / 2);
    const birdMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    });

    for (let i = 0; i < FLOCK_SIZE; i++) {
      const bird = new THREE.Mesh(birdGeometry, birdMaterial);

      bird.position.set(
        (Math.random() - 0.5) * 100,
        MIN_HEIGHT + Math.random() * 20,
        (Math.random() - 0.5) * 100,
      );

      bird.userData = {
        velocity: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        )
          .normalize()
          .multiplyScalar(MAX_SPEED),
        acceleration: new THREE.Vector3(),
      };

      const wingGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
      const wings = new THREE.Mesh(wingGeo, birdMaterial);
      bird.add(wings);
      bird.userData.wings = wings;
      bird.userData.wingPhase = Math.random() * Math.PI;

      scene.add(bird);
      birds.push(bird);
    }

    window.addEventListener("resize", onWindowResize);
    animate();
  }

  function createClouds() {
    const cloudCount = 20;
    // Use Dodecahedron but we will scale it to look less like a single rock
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffcccc, // Pinkish clouds
      emissive: 0xff8866, // Warm sunset glow
      emissiveIntensity: 0.3, // Make them glow softly
      flatShading: true,
      roughness: 0.0,
      opacity: 0.85,
      transparent: true,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();

      // Lower clouds to be visible, spread wider
      const x = (Math.random() - 0.5) * 800;
      // Raised clouds slightly as requested
      const y = 50 + Math.random() * 50;
      const z = -100 + (Math.random() - 0.5) * 600;

      cloud.position.set(x, y, z);

      // Randomize scale - larger and flattened vertically
      const scale = 8 + Math.random() * 8;
      cloud.scale.set(scale, scale * 0.6, scale);

      // Create 5-9 puffs per cloud for a denser cluster
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffCount; j++) {
        const puff = new THREE.Mesh(geometry, material);
        // Spread puffs more horizontally
        puff.position.set(
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 0.5, // Less vertical spread within the cloud
          (Math.random() - 0.5) * 1.5,
        );

        // Randomize puff size
        const puffScale = 0.8 + Math.random() * 0.7;
        puff.scale.set(puffScale, puffScale, puffScale);

        puff.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );

        puff.castShadow = false;
        puff.receiveShadow = false;
        cloud.add(puff);
      }

      // Store velocity
      cloud.userData = {
        velocity: (0.2 + Math.random() * 1.0) * 0.1, // Varied drift drift speed
      };

      scene.add(cloud);
      clouds.push(cloud);
    }
  }

  function createRockBorder() {
    // Low poly rock geometry
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a, // Grey rock color
      flatShading: true,
      roughness: 0.8,
    });

    const range = 60 * 5; // Scan range (matches shield radius scaled 5x = 300)
    const step = 3 * 5; // Scaled step (15)
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    // Map to store valid ground positions: "x,z" -> y
    const grid = new Map();

    // Pass 1: Scan the grid to find ground
    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        raycaster.set(new THREE.Vector3(x, 100 * 5, z), down);
        // Intersect with map meshes
        const intersects = raycaster.intersectObjects(scene.children, true);
        const ground = intersects.find(
          (i) =>
            i.object.name === "environment_mesh" ||
            i.object.name === "map_root",
        );

        if (ground) {
          // Store valid ground hit
          grid.set(`${x},${z}`, ground.point.y);
        }
      }
    }

    // Helper function to place a rock
    const placeRock = (x, y, z, pushX, pushZ) => {
      const rock = new THREE.Mesh(geometry, material);

      // 1. Position: Push towards the void
      // Scaled params
      const jitter = 0.5 * 5;
      const pushDist = 0.5 * 5;
      rock.position.set(
        x + pushX * pushDist + (Math.random() - 0.5) * jitter,
        y - 0.5 * 5 + Math.random() * (0.5 * 5),
        z + pushZ * pushDist + (Math.random() - 0.5) * jitter,
      );

      // 2. Rotation: Align with the edge
      const targetPos = rock.position
        .clone()
        .add(new THREE.Vector3(pushX, 0, pushZ));
      rock.lookAt(targetPos);

      // Add random roll/tilt for natural look
      rock.rotateZ((Math.random() - 0.5) * 0.5);
      rock.rotateX((Math.random() - 0.5) * 0.5);

      // 3. Scale: "Thin but Long"
      // Scaled 5x
      const thickness = (1.2 + Math.random() * 0.8) * 5;
      const length = step * 1.8; // Step is already scaled (15), so 15 * 1.8 = 27
      const height = (4.0 + Math.random() * 3.0) * 5;

      rock.scale.set(length, height, thickness);

      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.name = "environment_mesh"; // Collision integration

      scene.add(rock);
    };

    // Pass 2: Detect Edges and Place Rocks
    grid.forEach((y, key) => {
      const [sx, sz] = key.split(",").map(Number);

      // Check 4 local neighbors to determine Void direction
      const neighbors = [
        { key: `${sx + step},${sz}`, dx: 1, dz: 0 },
        { key: `${sx - step},${sz}`, dx: -1, dz: 0 },
        { key: `${sx},${sz + step}`, dx: 0, dz: 1 },
        { key: `${sx},${sz - step}`, dx: 0, dz: -1 },
      ];

      // Calculate push direction based on ALL missing neighbors
      let pushX = 0;
      let pushZ = 0;
      let isEdge = false;

      neighbors.forEach((n) => {
        if (!grid.has(n.key)) {
          isEdge = true;
          // If neighbor is void, push rock TOWARDS it
          pushX += n.dx;
          pushZ += n.dz;
        }
      });

      if (isEdge) {
        // Normalize push vector
        const len = Math.sqrt(pushX * pushX + pushZ * pushZ);
        if (len > 0) {
          pushX = pushX / len;
          pushZ = pushZ / len;
        }
        placeRock(sx, y, sz, pushX, pushZ);
      }
    });

    console.log(
      "Procedural Rock Border generated (Home Page - Synced with JogosPage).",
    );
  }

  function createSkyGradient() {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 0, 512);

    // Brazil Sunset Palette: Blue -> Purple -> Orange
    gradient.addColorStop(0.0, "#3b6978"); // Dusky Blue Top
    gradient.addColorStop(0.3, "#5d44a2"); // Purple transition
    gradient.addColorStop(0.6, "#ed7e4e"); // Sunset Orange
    gradient.addColorStop(1.0, "#fce043"); // Horizon Gold

    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    if (!renderer) return;

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    birds.forEach((bird) => {
      flock(bird, birds);
      updateBird(bird, time);
    });

    // Animate Clouds
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.velocity;
      // Loop around
      if (cloud.position.x > 300) {
        cloud.position.x = -300;
        cloud.position.z = (Math.random() - 0.5) * 600; // Randomize Z on respawn
      }
    });

    if (camera) {
      camera.position.x = Math.sin(time * 0.1) * 10;
      camera.lookAt(0, 15, 0);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    // Schedule next frame ONLY if renderer is still valid
    if (renderer) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function flock(bird, flockBirds) {
    _separation.set(0, 0, 0);
    _alignment.set(0, 0, 0);
    _cohesion.set(0, 0, 0);
    let separationCount = 0;
    let alignmentCount = 0;
    let cohesionCount = 0;

    flockBirds.forEach((other) => {
      if (other !== bird) {
        const dist = bird.position.distanceTo(other.position);

        if (dist < SEPARATION_RADIUS) {
          _diff.subVectors(bird.position, other.position);
          _diff.normalize();
          _diff.divideScalar(dist);
          _separation.add(_diff);
          separationCount++;
        }

        if (dist < ALIGNMENT_RADIUS) {
          _alignment.add(other.userData.velocity);
          alignmentCount++;
        }

        if (dist < COHESION_RADIUS) {
          _cohesion.add(other.position);
          cohesionCount++;
        }
      }
    });

    if (separationCount > 0) {
      _separation.divideScalar(separationCount);
      _separation.normalize();
      _separation.multiplyScalar(MAX_SPEED);
      _separation.sub(bird.userData.velocity);
      _separation.clampLength(0, MAX_FORCE * 1.5);
    }

    if (alignmentCount > 0) {
      _alignment.divideScalar(alignmentCount);
      _alignment.normalize();
      _alignment.multiplyScalar(MAX_SPEED);
      _alignment.sub(bird.userData.velocity);
      _alignment.clampLength(0, MAX_FORCE);
    }

    if (cohesionCount > 0) {
      _cohesion.divideScalar(cohesionCount);
      _cohesion.sub(bird.position);
      _cohesion.normalize();
      _cohesion.multiplyScalar(MAX_SPEED);
      _cohesion.sub(bird.userData.velocity);
      _cohesion.clampLength(0, MAX_FORCE);
    }

    bird.userData.acceleration.add(_separation.multiplyScalar(2.0));
    bird.userData.acceleration.add(_alignment.multiplyScalar(1.0));
    bird.userData.acceleration.add(_cohesion.multiplyScalar(1.0));

    if (bird.position.y < MIN_HEIGHT) {
      bird.userData.acceleration.y += 0.05;
    }
    if (bird.position.y > MAX_HEIGHT) {
      bird.userData.acceleration.y -= 0.02;
    }

    const distFromCenter = bird.position.length();
    if (distFromCenter > BOUNDARY_SIZE) {
      _vector.set(0, 30, 0).sub(bird.position);
      _vector.normalize().multiplyScalar(0.01);
      bird.userData.acceleration.add(_vector);
    }
  }

  function updateBird(bird, time) {
    bird.userData.velocity.add(bird.userData.acceleration);
    bird.userData.velocity.clampLength(0, MAX_SPEED);

    bird.position.add(bird.userData.velocity);

    bird.userData.acceleration.set(0, 0, 0);

    // Use reusable vector for lookAt calculation
    _lookAtPos.copy(bird.position).add(bird.userData.velocity);
    bird.lookAt(_lookAtPos);

    if (bird.userData.wings) {
      bird.userData.wings.rotation.z =
        Math.sin(time * 15 + bird.userData.wingPhase) * 0.5;
    }
  }

  function initAnimations() {
    // Animate initial slide content with typewriter effect
    setTimeout(() => {
      animateSlideContent(0);
    }, 100);

    gsap.from(".carousel-nav", {
      duration: 0.8,
      opacity: 0,
      ease: "power2.out",
      delay: 0.5,
    });
  }

  function openContact() {
    contactModalState.set({ isOpen: true, title: "" });
  }
</script>

{#if isLoading}
  <Spinner />
{/if}

<main
  class="fixed inset-0 text-white overflow-hidden"
  class:hidden={isLoading}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  <!-- 3D Background -->
  <div
    bind:this={canvasContainer}
    class="absolute inset-0 -z-10 bg-sky-300"
  ></div>

  <!-- Glass Overlay (Right Side Blur) -->
  <div
    class="absolute inset-0 z-0 pointer-events-none"
    style="
    background: rgba(0, 0, 0, 0.2); 
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    mask-image: linear-gradient(to right, transparent 0%, black 60%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 60%);
  "
  ></div>

  <!-- Carousel Container -->
  <div
    class="carousel-content absolute bottom-0 right-0 w-full p-4 md:p-8 pb-32 pointer-events-none flex flex-col items-end justify-end"
  >
    <div class="max-w-7xl w-full mx-auto flex flex-col items-end">
      <div
        class="pointer-events-auto text-right space-y-6 md:space-y-8 max-w-3xl relative"
      >
        <!-- Carousel Slides -->
        {#each slides as slide, index}
          <div
            class="slide slide-{index} space-y-4 md:space-y-6"
            class:active={index === currentSlide}
            style="display: {index === currentSlide ? 'block' : 'none'};"
          >
            <!-- Title -->
            <div class="space-y-4 flex flex-col items-end">
              <h1
                class="slide-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg text-[#f99126]"
                style="font-family: 'Montserrat', 'Roboto', 'Inter', sans-serif; text-transform: uppercase; font-weight: 700; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;"
              >
                {slide.title}
              </h1>
              <div class="w-32 h-1 bg-[#f99126] rounded-full shadow-lg"></div>
            </div>

            <!-- Tagline -->
            <h2
              class="slide-tagline text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold drop-shadow-md text-white"
            >
              {slide.tagline}
            </h2>

            <!-- Description -->
            <p
              class="slide-description text-base sm:text-lg md:text-xl drop-shadow-md font-medium text-white"
            >
              {slide.description}
            </p>

            <!-- Buttons -->
            <div
              class="flex flex-wrap gap-3 md:gap-4 justify-end items-center pt-4"
            >
              {#each slide.buttons as button}
                {#if button.style === "secondary"}
                  <button
                    class="slide-button px-6 md:px-8 py-3 md:py-4 bg-white/10 border-2 border-white/30 rounded-full font-bold text-sm md:text-lg hover:bg-white/20 transition-all shadow-lg text-white"
                    on:click={() => handleButtonClick(button.action)}
                  >
                    {button.text}
                  </button>
                {:else if button.style === "service"}
                  <a
                    class="slide-button px-4 md:px-6 py-2 md:py-3 bg-[#f99126]/20 border border-[#f99126]/40 rounded-full font-semibold text-sm md:text-base hover:bg-[#f99126]/30 hover:scale-105 transition-all shadow-md text-white"
                    href={button.action}
                  >
                    {button.text}
                  </a>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Carousel Navigation -->
  <div
    class="carousel-nav absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 pointer-events-auto"
  >
    <!-- Previous Button -->
    <button
      on:click={() => prevSlide(true)}
      class="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg"
      aria-label="Previous slide"
    >
      <svg
        class="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>

    <!-- Dot Indicators -->
    <div class="flex gap-2">
      {#each slides as _, index}
        <button
          on:click={() => goToSlide(index, true)}
          class="w-3 h-3 rounded-full bg-white/40 transition-all duration-300"
          class:bg-[#f99126]={index === currentSlide}
          class:scale-125={index === currentSlide}
          aria-label="Go to slide"
        ></button>
      {/each}
    </div>

    <!-- Next Button -->
    <button
      on:click={() => nextSlide(true)}
      class="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg"
      aria-label="Next slide"
    >
      <svg
        class="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  </div>
</main>

<style>
  .slide {
    transition: opacity 0.5s ease-in-out;
  }

  .slide.active {
    opacity: 1;
  }

  /* Typography */
  .slide-title,
  .slide-tagline,
  .slide-description,
  .slide-button {
    font-family: "Montserrat", "Roboto", "Inter", sans-serif;
  }

  /* Allow horizontal swipe gestures */
  main {
    touch-action: pan-x;
  }
</style>
