<script>
  import { onMount, onDestroy } from "svelte";
  import * as THREE from "three";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
  import { Octree } from "three/examples/jsm/math/Octree.js";
  import { Capsule } from "three/examples/jsm/math/Capsule.js";
  import Spinner from "./Spinner.svelte";
  import { contactModalState } from "./modalStore.js";
  import ContactModal from "./ContactModal.svelte";

  let canvas;
  let scene, camera, renderer;
  let model, mixer;
  let actions = {};
  let activeAction, previousAction;
  let clock = new THREE.Clock();
  let isLoading = true;
  let isDestroyed = false; // Flag to prevent animation after destroy
  let animationId; // Track animation frame to cancel it properly
  let cubes = []; // Now cartouches
  let sphere; // Now Miku
  let mikuMixer; // Separate mixer for Miku
  let mikuAction;
  let clown; // Clown character
  let clownMixer; // Separate mixer for Clown
  let clownActions = {}; // Clown animations
  let zombie; // Zombie character
  let zombieMixer;
  let zombieAction;
  let zombieRisingAction; // Rising animation

  // Game Constants
  const FIREBALL_COOLDOWN = 1; // 1 second
  const THUNDER_COOLDOWN = 60.0; // 60 seconds
  const ZOMBIE_RESPAWN_TIME = 60.0; // 60 seconds (Tripled)

  let zombieIdleAction; // Idle animation

  let zombieWalkAction; // Walk animation
  let isZombieRising = false; // Track if zombie is currently rising
  let zombieRespawnTimer = ZOMBIE_RESPAWN_TIME; // Start with countdown
  let isZombieChasing = false; // Track chasing state
  let zombieCollider = new Capsule(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
    0.35,
  );
  let zombieVelocity = new THREE.Vector3();
  let zombieOnFloor = false;
  let zombieFinalY = 0; // Store final Y position after rising
  let welcomeSign; // Welcome sign model
  let destinationMarker; // Visual marker for click destination
  let markerRipple; // Animated ripple effect
  let textLabels = []; // 3D text labels for cartouches and characters
  let environmentalModels = []; // Environmental decorations (trees, rocks, bushes, etc.)
  let collisionObstacles = []; // Collision spheres for individual meshes

  let birds = [];
  let clouds = [];
  let floatingTexts = []; // Store floating damage numbers

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

  // Cartouche data with comprehensive portfolio information
  const cartoucheData = [
    {
      name: "N64 Classics",
      description:
        "Explore the golden era of Nintendo 64 gaming with classic titles and nostalgic memories.",
      longDescription:
        "A comprehensive collection showcasing the best of Nintendo 64 era gaming. Features include authentic retro graphics, classic gameplay mechanics, and a nostalgic journey through gaming history. Built with modern web technologies to bring these classics to your browser.",
      images: [
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
        "https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=800",
        "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif", // GIF in carousel
      ],
      technologies: ["Three.js", "WebGL", "JavaScript", "Svelte"],
      links: [
        { platform: "demo", url: "https://example.com/n64-classics" },
        {
          platform: "github",
          url: "https://github.com/yourusername/n64-classics",
        },
        { platform: "itch", url: "https://yourusername.itch.io/n64-classics" },
      ],
      year: "2024",
    },
    {
      name: "Adventure Zone",
      description:
        "Embark on epic adventures through mysterious lands and challenging quests.",
      longDescription:
        "An immersive 3D adventure game featuring procedurally generated worlds, dynamic quests, and engaging storylines. Players explore vast landscapes, solve puzzles, and battle enemies in this action-packed adventure experience.",
      images: [
        "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800",
        "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800",
        "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
        "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
      ],
      technologies: ["Unity", "C#", "Blender", "Photoshop"],
      links: [
        { platform: "steam", url: "https://store.steampowered.com/app/123456" },
        {
          platform: "github",
          url: "https://github.com/yourusername/adventure-zone",
        },
      ],
      year: "2024",
    },
    {
      name: "Racing Arena",
      description:
        "Feel the adrenaline rush with high-speed racing games and competitive challenges.",
      longDescription:
        "High-octane racing simulator with realistic physics, multiple tracks, and competitive multiplayer modes. Features stunning graphics, customizable vehicles, and an advanced AI system for challenging opponents.",
      images: [
        "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800",
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800",
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
        "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
      ],
      technologies: ["Unreal Engine", "C++", "Blueprint", "Maya"],
      links: [
        { platform: "epic", url: "https://store.epicgames.com/p/racing-arena" },
        { platform: "steam", url: "https://store.steampowered.com/app/789012" },
        { platform: "demo", url: "https://example.com/racing-arena" },
      ],
      year: "2023",
    },
    {
      name: "Puzzle Palace",
      description:
        "Test your mind with brain-teasing puzzles and strategic gameplay.",
      longDescription:
        "A collection of mind-bending puzzles and logic challenges designed to test your problem-solving skills. Features progressive difficulty, hint system, and beautiful minimalist design. Perfect for puzzle enthusiasts of all skill levels.",
      images: [
        "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=800",
        "https://images.unsplash.com/photo-1587731556938-38755b4803a6?w=800",
        "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800",
        "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
      ],
      technologies: ["React", "TypeScript", "CSS3", "Node.js"],
      links: [
        { platform: "demo", url: "https://example.com/puzzle-palace" },
        {
          platform: "github",
          url: "https://github.com/yourusername/puzzle-palace",
        },
        { platform: "itch", url: "https://yourusername.itch.io/puzzle-palace" },
      ],
      year: "2023",
    },
    {
      name: "Action Hub",
      description:
        "Experience intense action-packed gameplay with explosive combat and thrilling battles.",
      longDescription:
        "Fast-paced action game featuring dynamic combat systems, special abilities, and epic boss battles. Combines fluid movement mechanics with strategic gameplay elements for an unforgettable gaming experience.",
      images: [
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
        "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800",
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800",
        "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
      ],
      technologies: ["Godot", "GDScript", "Aseprite", "GIMP"],
      links: [
        { platform: "itch", url: "https://yourusername.itch.io/action-hub" },
        {
          platform: "github",
          url: "https://github.com/yourusername/action-hub",
        },
      ],
      year: "2024",
    },
  ];
  let selectedCartouche = null; // Track which cartouche was clicked
  let currentImageIndex = 0; // Track current image in carousel

  // Game State
  let targetPosition = null;
  let targetObject = null;
  let showModal = false;
  let currentProject = null; // Store current project data for modal
  let showDialogue = false;
  let isMoving = false;
  let isInDialogue = false;
  let showHelpModal = false; // Help modal for welcome sign

  // Dialogue State
  let displayedText = "";
  let fullText = "Greetings, traveler! Do you wish to continue your journey?";
  let typingInterval;
  let showButtons = false;
  let currentNPC = null; // Track which NPC is being talked to
  let showTextInput = false; // For clown's joke input
  let playerJoke = ""; // Store player's joke input
  let showCloseButton = false; // For clown's close button after response

  // Selfie State
  let isTakingSelfie = false;
  let showFlash = false;

  // Audio State
  let typeSounds = [];
  let stepSounds = [];
  let jumpSound;
  let okSound;
  let byebyeSound;
  let shutterSound1;
  let shutterSound2;
  // New Sounds
  let zombieIdleSound;
  let zombieHitSound;
  let zombieDieSound;
  let fireballThrowSound;
  let fireballHitSound;
  let thunderSound;

  let bgMusic;
  let isMusicPlaying = true; // Default to true

  // Audio Mixer State
  let volBgMusic = 0.1;
  let volType = 0.2;
  let volStep = 0.1;
  let volJump = 0.2;
  let volOk = 0.2;
  let volBye = 0.2;
  let volShutter = 0.2;
  let volFireball = 0.1;
  let volThunder = 0.1;
  let volZombie = 0.2; // New Zombie volume
  let volMaster = 1.0; // Global Master Volume

  let showAudioMixer = true; // Show/hide audio mixer HUD
  let showVolumeSlider = false; // Legacy slider visibility

  let attackMode = null; // 'fireball' or 'thunder'
  let projectiles = []; // Store active projectiles
  let effects = []; // Store active visual effects
  let dustParticles = []; // Store dust effect particles

  // Power Cooldowns
  let fireballCooldown = 0; // Current cooldown time remaining
  let thunderCooldown = 0;
  // Constants moved to top
  let currentStep = 0;

  // Pause State
  let isPaused = false;

  function togglePause() {
    if (showGameOverModal) return; // Cannot pause on Game Over (it's already effectively paused)
    isPaused = !isPaused;
    if (isPaused) {
      // Pause music if desired, or keep it running?
      // "logic stops, animation continues"
      console.log("Game Paused");

      // Force Zombie to Idle Animation (so he doesn't freeze mid-walk)
      if (zombie && !zombie.userData.isDead) {
        // Use existing helper if available, or direct mixer manipulation
        // We saw fadeToActionZombie earlier
        if (typeof fadeToActionZombie === "function") {
          fadeToActionZombie(zombieIdleAction, 0.2);
        }
      }
    } else {
      console.log("Game Resumed");
      // Reset clock delta to avoid large jump
      clock.getDelta();
    }
  }

  // VFX Pools - Pre-created to avoid shader compilation stutter
  let fireballGeometry = null;
  let fireballMaterial = null;
  let thunderMaterial = null;
  let thunderGlowMaterial = null;
  let lastStepTime = 0;
  const STEP_INTERVAL = 0.3; // Seconds between steps

  // Keyboard State
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false,
  };

  // Physics/Movement Config
  const GRAVITY = 30;
  const JUMP_FORCE = 5; // Reduced from 15
  const MOVE_SPEED = 20;
  const ROTATION_SPEED = 10;
  const ARRIVAL_THRESHOLD = 0.2;

  // Physics State
  const worldOctree = new Octree();
  const rockOctree = new Octree();
  let rocksGroup = new THREE.Group();
  const playerCollider = new Capsule(
    new THREE.Vector3(-0.65, 0.33, 3.62), // Start (adjusted for -0.02 ground level: 0.33 - 0.35 = -0.02)
    new THREE.Vector3(-0.65, 1.33, 3.62), // End (height 1.0)
    0.35,
  );

  let playerVelocity = new THREE.Vector3();
  let playerDirection = new THREE.Vector3();
  let playerOnFloor = false;
  let isGrounded = false; // Keep for compatibility with animation logic

  let hasPlayedLandingSound = false;
  let isPlayingOneShotAnimation = false;

  // Position Capture HUD
  let playerPosition = { x: 0, y: 0, z: 0 };
  let showHud = true;
  let isFirstPerson = false;
  let cameraRotation = { x: 0, y: 0 };

  // Player Stats
  let playerHp = 10;
  const playerMaxHp = 10;
  let isPlayerImmune = false;
  let playerImmunityTimer = 0;
  let immunityBlinkTimer = 0;

  let showGameOverModal = false;

  function copyPosition() {
    const posStr = `x: ${playerPosition.x}, y: ${playerPosition.y}, z: ${playerPosition.z}`;
    const posCode = `position.set(${playerPosition.x}, ${playerPosition.y}, ${playerPosition.z})`;
    navigator.clipboard.writeText(posCode).then(() => {
      console.log("Copied position:", posCode);
      // Optional: Visual feedback
      const btn = document.querySelector(".hud-copy-btn");
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "COPIED!";
        setTimeout(() => (btn.innerText = originalText), 1000);
      }
    });
  }

  function copyAudioDefaults() {
    const defaults = `
    let volBgMusic = ${volBgMusic};
    let volType = ${volType};
    let volStep = ${volStep};
    let volJump = ${volJump};
    let volOk = ${volOk};
    let volBye = ${volBye};
    let volShutter = ${volShutter};
    let volZombie = ${volZombie};
    `.trim();

    navigator.clipboard.writeText(defaults).then(() => {
      console.log("Copied audio defaults:", defaults);
      const btn = document.querySelector(".hud-copy-audio-btn");
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "COPIED!";
        setTimeout(() => (btn.innerText = originalText), 1000);
      }
    });
  }

  function updateChannelVolume(channel, value) {
    // Ensure value is float
    value = parseFloat(value);

    switch (channel) {
      case "music":
        volBgMusic = value;
        if (bgMusic) bgMusic.volume = volBgMusic * volMaster;
        break;
      case "type":
        volType = value;
        typeSounds.forEach((s) => (s.volume = volType * volMaster));
        if (typeSounds[0] && Math.random() > 0.8) {
          typeSounds[0].currentTime = 0;
          typeSounds[0].play().catch(() => {});
        }
        break;
      case "step":
        volStep = value;
        stepSounds.forEach((s) => (s.volume = volStep * volMaster));
        if (stepSounds[0] && Math.random() > 0.8) {
          stepSounds[0].currentTime = 0;
          stepSounds[0].play().catch(() => {});
        }
        break;
      case "jump":
        volJump = value;
        if (jumpSound) {
          jumpSound.volume = volJump * volMaster;
          if (Math.random() > 0.8) {
            jumpSound.currentTime = 0;
            jumpSound.play().catch(() => {});
          }
        }
        break;
      case "ok":
        volOk = value;
        if (okSound) {
          okSound.volume = volOk * volMaster;
          if (Math.random() > 0.8) {
            okSound.currentTime = 0;
            okSound.play().catch(() => {});
          }
        }
        break;
      case "bye":
        volBye = value;
        if (byebyeSound) {
          byebyeSound.volume = volBye * volMaster;
          if (Math.random() > 0.8) {
            byebyeSound.currentTime = 0;
            byebyeSound.play().catch(() => {});
          }
        }
        break;
      case "shutter":
        volShutter = value;
        if (shutterSound1) {
          shutterSound1.volume = volShutter * volMaster;
          if (Math.random() > 0.8) {
            shutterSound1.currentTime = 0;
            shutterSound1.play().catch(() => {});
          }
        }
        break;
      case "fireball":
        volFireball = value;
        if (fireballThrowSound)
          fireballThrowSound.volume = volFireball * volMaster;
        if (fireballHitSound) fireballHitSound.volume = volFireball * volMaster;
        break;
      case "thunder":
        volThunder = value;
        if (thunderSound) thunderSound.volume = volThunder * volMaster;
        break;
      case "zombie":
        volZombie = value;
        if (zombieIdleSound) zombieIdleSound.volume = volZombie * volMaster;
        if (zombieHitSound) zombieHitSound.volume = volZombie * volMaster;
        if (zombieDieSound) zombieDieSound.volume = volZombie * volMaster;
        break;
    }
  }

  // Shader Code

  onMount(() => {
    init();
    animate();

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    // Add mouse move listener for pointer lock
    document.addEventListener("mousemove", onMouseMove);

    // Load Sounds
    typeSounds = [
      new Audio("/audio/npc-type1.mp3"),
      new Audio("/audio/npc-type2.mp3"),
      new Audio("/audio/npc-type3.mp3"),
    ];

    stepSounds = [new Audio("/audio/step1.mp3"), new Audio("/audio/step2.mp3")];

    jumpSound = new Audio("/audio/jump1.mp3");
    okSound = new Audio("/audio/ok.mp3");
    byebyeSound = new Audio("/audio/byebye.mp3");
    shutterSound1 = new Audio("/audio/click.wav");
    shutterSound2 = new Audio("/audio/click2.wav");

    // New Sounds
    zombieIdleSound = new Audio("/audio/zombie-idle.m4a");
    zombieHitSound = new Audio("/audio/zombie-hit.m4a");
    zombieDieSound = new Audio("/audio/zombie-die.m4a");
    fireballThrowSound = new Audio("/audio/fireball-trow.wav");
    fireballHitSound = new Audio("/audio/fireball-hit.wav");
    thunderSound = new Audio("/audio/thunder.m4a");

    bgMusic = new Audio("/audio/conker-windy-theme.mp3");
    bgMusic.loop = true;
    bgMusic.volume = volBgMusic; // Low background music

    // Set volumes
    typeSounds.forEach((s) => {
      s.load();
      s.volume = volType;
    });
    stepSounds.forEach((s) => {
      s.load();
      s.volume = volStep;
    });
    jumpSound.load();
    jumpSound.volume = volJump;
    okSound.load();
    okSound.volume = volOk;
    byebyeSound.load();
    byebyeSound.volume = volBye;
    shutterSound1.load();
    shutterSound1.volume = volShutter;
    shutterSound2.load();
    shutterSound2.volume = volShutter;

    // Load new sounds
    zombieIdleSound.load();
    zombieIdleSound.volume = volZombie;
    zombieHitSound.load();
    zombieHitSound.volume = volZombie;
    zombieDieSound.load();
    zombieDieSound.volume = volZombie;
    fireballThrowSound.load();
    fireballThrowSound.volume = volFireball;
    fireballHitSound.load();
    fireballHitSound.volume = volFireball;
    thunderSound.load();
    thunderSound.volume = volThunder;
    shutterSound2.volume = volShutter;

    // Global Singleton Pattern to prevent duplicates
    if (window.globalBgMusic) {
      window.globalBgMusic.pause();
      window.globalBgMusic = null;
    }
    window.globalBgMusic = bgMusic;

    // Preload sounds
    typeSounds.forEach((s) => s.load());
    stepSounds.forEach((s) => s.load());
    jumpSound.load();
    okSound.load();
    byebyeSound.load();
    shutterSound1.load();
    shutterSound2.load();
    bgMusic.load();

    // Try to play music immediately
    bgMusic.play().catch((e) => {
      console.log("Autoplay prevented:", e);
      isMusicPlaying = false; // Reset state if autoplay fails
    });

    if (typeof window !== "undefined") {
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      document.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      // Cleanup handled by onDestroy
    };
  });

  onDestroy(() => {
    isDestroyed = true;
    if (animationId) cancelAnimationFrame(animationId); // Stop the loop immediately
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
    }

    // Stop music
    if (bgMusic) {
      bgMusic.pause();
      bgMusic = null;
    }
    if (typeof window !== "undefined" && window.globalBgMusic === bgMusic) {
      window.globalBgMusic = null;
    }

    if (scene) {
      scene.traverse(disposeNode);
    }

    // Dispose Mixers
    if (mixer) mixer.stopAllAction();
    if (mikuMixer) mikuMixer.stopAllAction();
    if (clownMixer) clownMixer.stopAllAction();
    if (zombieMixer) zombieMixer.stopAllAction();

    birds = [];
    clouds = [];
    projectiles = [];
    effects = [];

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement = null;
      renderer = null;
    }
  });

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

  function init() {
    if (typeof window === "undefined") return;
    // Scene
    scene = new THREE.Scene();

    const textureLoader = new THREE.TextureLoader(); // Kept for other textures but not skybox

    // Skybox - Plain Blue (Optimized/Visual Upgrade)
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 3000, 4900);

    scene.add(rocksGroup);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01, // Reduced near plane to prevent clipping when close to models
      5000,
    );
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights (Optimized for Sunny Look)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x606060, 2.0);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbdd, 3.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.05;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.top = 300;
    dirLight.shadow.camera.bottom = -300;
    dirLight.shadow.camera.left = -300;
    dirLight.shadow.camera.right = 300;
    scene.add(dirLight);

    createClouds();
    createBirds();

    // --- Loading Manager (Synchronize Map + Player) ---
    const manager = new THREE.LoadingManager();
    manager.onLoad = function () {
      console.log("Loading complete!");
      isLoading = false;

      // Pre-compile VFX shaders to prevent stutter
      warmupVFX();

      // Fix initial floating/falling: Ensure player is on ground if possible
      // Or just let physics handle it naturally now that collision is ready.
      if (model) {
        // Reset Y speed to avoid accumulated gravity
        playerVelocity.y = 0;
        // Optional: Snap to known safe spot?
        // model.position.y = 10;
      }
    };

    // Map
    const mapLoader = new GLTFLoader(manager);
    mapLoader.load("/models/map/low_poly_forest_1.glb", (gltf) => {
      const map = gltf.scene;
      map.scale.set(1, 1, 1); // Adjust scale if needed
      map.position.set(0, 0, 0);

      map.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Ensure all map meshes are identified as part of the environment
          child.name = "environment_mesh";
        }
      });

      map.name = "map_root";
      scene.add(map);

      // --- Physics: Populate Octree ---
      // IMPORTANT: Populate Octree immediately when map loads
      worldOctree.fromGraphNode(map);

      createRockBorder();
      rockOctree.fromGraphNode(rocksGroup);

      // Initialize characters and interactive elements AFTER map is loaded
      createCartouches();
      createMiku();
      createClown();
      createWelcomeSign();
      createZombie();
      // createWelcomeSign(); // Removed duplicate
      createDestinationMarker();
    });

    // Load Player Model
    const loader = new GLTFLoader(manager);
    loader.load(
      "/models/p1.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(0.66, 0.66, 0.66); // Reduced scale to match map (1/3 smaller)
        scene.add(model);

        model.traverse((object) => {
          if (object.isMesh) object.castShadow = true;
        });

        // Animations
        mixer = new THREE.AnimationMixer(model);

        mixer.addEventListener("finished", (e) => {
          if (
            e.action === actions["Agree"] ||
            e.action === actions["Disagree"]
          ) {
            endDialogue();
          }
        });

        const idleAnim =
          gltf.animations.find((a) => a.name.toLowerCase().includes("idle")) ||
          gltf.animations[0];
        const walkAnim =
          gltf.animations.find((a) => a.name.toLowerCase().includes("walk")) ||
          gltf.animations[1];
        const fallAnim =
          gltf.animations.find((a) => a.name.toLowerCase().includes("fall")) ||
          gltf.animations[2];
        const agreeAnim = gltf.animations.find((a) =>
          a.name.toLowerCase().includes("agree"),
        );
        const disagreeAnim = gltf.animations.find((a) =>
          a.name.toLowerCase().includes("disagree"),
        );
        const hitAnim = gltf.animations.find((a) =>
          a.name.toLowerCase().includes("hit"),
        );
        const curseAnim = gltf.animations.find((a) =>
          a.name.toLowerCase().includes("curse"),
        );

        if (idleAnim) actions["Idle"] = mixer.clipAction(idleAnim);
        if (walkAnim) {
          actions["Walking"] = mixer.clipAction(walkAnim);
          actions["Walking"].timeScale = 1.4;
        }
        if (fallAnim) actions["Fall"] = mixer.clipAction(fallAnim);
        if (agreeAnim) actions["Agree"] = mixer.clipAction(agreeAnim);
        if (disagreeAnim) actions["Disagree"] = mixer.clipAction(disagreeAnim);
        if (hitAnim) actions["Hit"] = mixer.clipAction(hitAnim);
        if (curseAnim) actions["Curse"] = mixer.clipAction(curseAnim);

        activeAction = actions["Idle"];
        if (activeAction) activeAction.play();

        // Removed individual isLoading = false
      },
      undefined,
      (e) => {
        console.error(e);
        // Error handling if player fails?
      },
    );
  }

  function createRockBorder() {
    // Low poly rock geometry
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a, // Grey rock color
      flatShading: true,
      roughness: 0.8,
    });

    const range = 60; // Scan range (matches shield radius)
    const step = 3; // Tighter scan for better continuity
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    // Map to store valid ground positions: "x,z" -> y
    const grid = new Map();

    // Pass 1: Scan the grid to find ground
    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        raycaster.set(new THREE.Vector3(x, 100, z), down);
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
      // We push slightly more to ensure the "thin" rock sits mostly off-cliff or exactly on edge
      const jitter = 0.5;
      const pushDist = 0.5; // Adjusted push distance
      rock.position.set(
        x + pushX * pushDist + (Math.random() - 0.5) * jitter,
        y - 0.5 + Math.random() * 0.5,
        z + pushZ * pushDist + (Math.random() - 0.5) * jitter,
      );

      // 2. Rotation: Align with the edge
      // Look at the "void" direction.
      // After looking: Z-axis points to void. X-axis is along the cliff edge.
      const targetPos = rock.position
        .clone()
        .add(new THREE.Vector3(pushX, 0, pushZ));
      rock.lookAt(targetPos);

      // Add random roll/tilt for natural look
      rock.rotateZ((Math.random() - 0.5) * 0.5);
      rock.rotateX((Math.random() - 0.5) * 0.5);

      // 3. Scale: "Thin but Long" ("in compriment big")
      // Z (Depth/Thickness): Thin (points to void)
      // X (Width/Length): Wide (runs along cliff to fill gaps)
      // Y (Height): Tall
      const thickness = 1.2 + Math.random() * 0.8; // Thin (~1.2 - 2.0)
      const length = step * 1.8; // Long enough to overlap neighbors (3 * 1.8 = 5.4)
      const height = 4.0 + Math.random() * 3.0; // Tall (~4 - 7)

      rock.scale.set(length, height, thickness);

      rock.castShadow = true;
      rock.receiveShadow = true;
      rock.name = "environment_mesh"; // Collision integration

      rocksGroup.add(rock);
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

    console.log("Procedural Rock Border generated.");
  }

  function placeObjectOnGround(object, x, z, yOffset = 0) {
    const raycaster = new THREE.Raycaster();
    const start = new THREE.Vector3(x, 50, z);
    const dir = new THREE.Vector3(0, -1, 0);
    raycaster.set(start, dir);
    raycaster.camera = camera; // Fix for sprites

    // Intersect with everything in scene
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Find the ground (environment mesh)
    const ground = intersects.find(
      (i) =>
        i.object.name === "environment_mesh" ||
        i.object.name === "map_root" ||
        i.object.name === "floor", // Keep for backward compatibility if needed
    );

    if (ground) {
      console.log(
        `Placed ${object.name || "object"} at ${x}, ${ground.point.y + yOffset}, ${z}`,
      );
      object.position.set(x, ground.point.y + yOffset, z);
    } else {
      console.warn(
        `Could not find ground for ${object.name || "object"} at ${x}, ${z}. Using default Y.`,
      );
      // Fallback
      object.position.set(x, yOffset, z);
    }
  }

  function warmupVFX() {
    // 1. Audio Warmup (Prevent First-Play Lag)
    const soundsToWarmup = [
      fireballThrowSound,
      fireballHitSound,
      thunderSound,
      zombieIdleSound,
      zombieHitSound,
      zombieDieSound,
      // Add particle/explosion sounds if any specific ones exist besides fireballHit
    ];

    soundsToWarmup.forEach((sound) => {
      if (sound) {
        // Play at 0 volume to force decoding
        const originalVol = sound.volume;
        sound.volume = 0;
        sound.play().catch(() => {});
        // Stop immediately
        setTimeout(() => {
          sound.pause();
          sound.currentTime = 0;
          sound.volume = originalVol;
        }, 10);
      }
    });

    // 2. Geometry & Shader Warmup
    // Pre-create fireball geometry and material
    fireballGeometry = new THREE.IcosahedronGeometry(0.2, 0);
    fireballMaterial = new THREE.MeshLambertMaterial({
      color: 0xff4500,
      flatShading: true,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });

    // Pre-create thunder materials
    thunderMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    thunderGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
    });

    // Pre-create Particle Material (used in createDust/createParticle)
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });

    // Create invisible dummy objects to force shader compilation
    const dummyGroup = new THREE.Group();

    // A. Fireball
    const dummyFireball = new THREE.Mesh(fireballGeometry, fireballMaterial);
    const dummyLight = new THREE.PointLight(0xffaa00, 2, 5);
    dummyFireball.add(dummyLight);
    dummyGroup.add(dummyFireball);

    // B. Thunder (TubeGeometry) - Complex geometry often causes stutter
    // Create a simple path for the tube
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const tubeGeo = new THREE.TubeGeometry(path, 2, 0.08, 8, false);
    const dummyThunder = new THREE.Mesh(tubeGeo, thunderMaterial);
    const dummyThunderGlow = new THREE.Mesh(tubeGeo, thunderGlowMaterial);
    dummyGroup.add(dummyThunder);
    dummyGroup.add(dummyThunderGlow);

    // C. Particles (BoxGeometry)
    const boxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const dummyParticle = new THREE.Mesh(boxGeo, particleMaterial);
    dummyGroup.add(dummyParticle);

    // Position far away
    dummyGroup.position.set(0, -5000, 0);
    scene.add(dummyGroup);

    // Force a render to compile shaders
    // Note: renderer.compile is preferred over render() for this
    renderer.compile(scene, camera);

    // Cleanup
    scene.remove(dummyGroup);
    dummyLight.dispose();
    dummyGroup.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        // Don't dispose materials we want to keep reusing!
        // But we can dispose the dummy particle material if we create new ones every time.
        // In this code, particle materials ARE created new every time (bad practice but existing).
        // So we should at least compile 'MeshBasicMaterial' with these settings.
      }
    });

    // Clean up temporary geometries
    tubeGeo.dispose();
    boxGeo.dispose();
    particleMaterial.dispose(); // Dispose this temp one

    console.log("VFX warmup complete - shaders & audio pre-loaded");
  }

  function createCartouches() {
    const loader = new GLTFLoader();
    loader.load("/models/cartouche_n64.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.083, 0.083, 0.083); // Scaled to 1/3 of previous size (0.25 / 3)

      const clone = model.clone();

      // Random Color
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.setHex(Math.random() * 0xffffff);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Fixed Position: Cartouche
      const x = -0.8;
      const z = 1.77;
      placeObjectOnGround(clone, x, z, 0.5);

      // Add custom property for floating animation
      clone.userData = {
        initialY: clone.position.y,
        floatSpeed: 1 + Math.random(),
        floatOffset: Math.random() * Math.PI * 2,
        cartoucheIndex: 2,
      };

      clone.name = "interactive_cube";
      scene.add(clone);
      addDynamicHitbox(clone, 0.2); // Add hitbox with padding
      cubes.push(clone);

      // Calculate precise top position for label
      const box = new THREE.Box3().setFromObject(clone);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const topY = box.max.y;

      // Position just above the model
      const labelPos = new THREE.Vector3(center.x, topY + 0.3, center.z);
      createTextLabel("Contato", labelPos);

      // Add to collision system
      collisionObstacles.push({
        position: clone.position,
        radius: 0.25, // Tighter collision to allow interaction
      });

      // Store for pumpkins (legacy)
      window.cartouchePositions = [
        { x: clone.position.x, z: clone.position.z, angle: 0 },
      ];
    });
  }

  function createMiku() {
    const loader = new GLTFLoader();
    loader.load("/models/miku-br.glb", (gltf) => {
      const mikuMesh = gltf.scene;

      // 1. Setup inner mesh (Pose & Scale)
      mikuMesh.scale.set(0.176, 0.176, 0.176); // 80% scale
      mikuMesh.rotation.x = 0.115; // Tilt forward (Michael Jackson style)

      mikuMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 2. Setup Container (Position & Tracking)
      sphere = new THREE.Group();
      sphere.name = "interactive_sphere";
      sphere.add(mikuMesh);

      // Fixed Position: Miku Container (User specifed)
      sphere.position.set(0.75, -0.05, 6.8);

      scene.add(sphere);

      // 3. Setup Hitbox on Container
      // Removed hardcoded hitbox
      addDynamicHitbox(sphere, 0.5); // Dynamic hitbox
      // Fix for addDynamicHitbox finding 'hitbox' tag on self:
      // The function looks recursively, so it will find internal meshes.
      sphere.name = "interactive_sphere";

      // Add collision
      collisionObstacles.push({
        position: sphere.position,
        radius: 0.25, // Tighter collision for Miku (thin model)
      });

      // 4. Setup Animation on INNER mesh
      mikuMixer = new THREE.AnimationMixer(mikuMesh);
      const action =
        gltf.animations.find((a) => a.name === "ArmatureAction") ||
        gltf.animations[0];
      if (action) {
        mikuAction = mikuMixer.clipAction(action);
        mikuAction.play();
      }
    });
  }

  function createClown() {
    const loader = new GLTFLoader();
    loader.load("/models/clown.glb", (gltf) => {
      clown = gltf.scene;
      // Fixed Position: Clown
      placeObjectOnGround(clown, -2.88, 2.48, 0);
      clown.scale.set(0.5, 0.5, 0.5);

      clown.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      clown.name = "interactive_clown";
      scene.add(clown);

      const hitboxGeo = new THREE.BoxGeometry(2, 4, 2);
      const hitboxMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.position.y = 2;
      hitbox.name = "hitbox";
      //clown.add(hitbox); // Remove hardcoded
      addDynamicHitbox(clown, 0.5);

      // Add collision
      collisionObstacles.push({
        position: clown.position,
        radius: 0.35, // Tighter collision for Clown
      });

      clownMixer = new THREE.AnimationMixer(clown);
      const happyAnim = gltf.animations.find((a) =>
        a.name.toLowerCase().includes("happy"),
      );
      const wavingAnim = gltf.animations.find((a) =>
        a.name.toLowerCase().includes("wav"),
      );
      const laughingAnim = gltf.animations.find((a) =>
        a.name.toLowerCase().includes("laugh"),
      );
      const idleAnim = gltf.animations.find((a) =>
        a.name.toLowerCase().includes("idle"),
      );

      if (happyAnim) clownActions["happy"] = clownMixer.clipAction(happyAnim);
      if (wavingAnim)
        clownActions["waving"] = clownMixer.clipAction(wavingAnim);
      if (laughingAnim)
        clownActions["laughing"] = clownMixer.clipAction(laughingAnim);
      if (idleAnim) clownActions["idle"] = clownMixer.clipAction(idleAnim);

      if (clownActions["happy"]) {
        clownActions["happy"].play();
      } else if (gltf.animations[0]) {
        const fallbackAction = clownMixer.clipAction(gltf.animations[0]);
        fallbackAction.play();
        clownActions["happy"] = fallbackAction;
      }

      clownMixer.addEventListener("finished", (e) => {
        if (e.action === clownActions["waving"]) {
          if (clownActions["happy"]) {
            clownActions["happy"].reset().fadeIn(0.3).play();
          }
        }
      });
    });
  }

  function createWelcomeSign() {
    const loader = new GLTFLoader();
    loader.load("/models/map/psx_welcome_sign.glb", (gltf) => {
      welcomeSign = gltf.scene;
      // Fixed Position: Welcome Sign
      placeObjectOnGround(welcomeSign, 0.64, 3.39, 0);
      welcomeSign.scale.set(0.56, 0.56, 0.56);
      welcomeSign.rotation.y = Math.PI * 2;

      welcomeSign.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      welcomeSign.name = "interactive_welcome";
      scene.add(welcomeSign);
      addDynamicHitbox(welcomeSign, 0.2);

      collisionObstacles.push({
        position: welcomeSign.position.clone(),
        radius: 0.3,
      });

      // Calculate precise top position
      welcomeSign.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(welcomeSign);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const topY = box.max.y;

      const labelPos = new THREE.Vector3(center.x, topY + 0.4, center.z);

      createMultiLineTextLabel(["Bem Vindo!", "Informações"], labelPos);
    });
  }

  function createZombie() {
    console.log("[Zombie] createZombie called. Loading model...");
    const loader = new GLTFLoader();
    loader.load("/models/hl1-zombie.glb", (gltf) => {
      const zombieModel = gltf.scene;

      // Initialize Game State
      zombieModel.userData = {
        hp: 10,
        maxHp: 10,
        isDead: true, // Start DEAD
        lastHitAnim: null,
        gltf: gltf, // Store for accessing animations later
        attackCooldown: 0,
        isAttacking: false,
      };

      zombieModel.scale.set(0.015, 0.015, 0.015);

      // Position: Right of Miku (Miku is at 0.75, 0, 6.8)
      placeObjectOnGround(zombieModel, 2.0, 6.8);

      // Store the final Y position (ground level)
      zombieFinalY = zombieModel.position.y;

      // Start zombie underground
      const undergroundOffset = -2.0;
      zombieModel.position.y = zombieFinalY + undergroundOffset;

      zombieModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      zombieModel.name = "interactive_zombie";
      zombieModel.visible = false; // Start INVISIBLE
      scene.add(zombieModel);

      // Store reference
      zombie = zombieModel;

      // STRONG STYLE: Disable auto matrix update to prevent mixer from overriding position
      // We will manually update matrix in animate loop if needed, or rely on position writes
      // Actually, mixer updates position/quaternion properties, then updateMatrix calls happen before render.
      // But if we remove tracks, mixer won't touch position.
      // MatrixAutoUpdate should stay true so our manual position updates propagate.
      // But we can ensure position is strictly controlled.

      // Safety: Ensure it renders
      zombie.matrixAutoUpdate = true;

      // Hitbox
      addDynamicHitbox(zombieModel, 0.5);

      // Collision System (Static interaction for clicking)
      // Note: dynamic physics collision is handled by zombieCollider now
      collisionObstacles.push({
        position: zombieModel.position,
        radius: 0.35,
      });

      // Initialize Collider to match model position (even if underground initially)
      zombieCollider.start.set(
        zombieModel.position.x,
        zombieModel.position.y + 0.35,
        zombieModel.position.z,
      );
      zombieCollider.end.set(
        zombieModel.position.x,
        zombieModel.position.y + 1.35,
        zombieModel.position.z,
      );

      // Animation Setup
      zombieMixer = new THREE.AnimationMixer(zombieModel);

      // Get animations
      if (gltf.animations.length > 19) {
        zombieRisingAction = zombieMixer.clipAction(gltf.animations[10]);
        zombieIdleAction = zombieMixer.clipAction(gltf.animations[13]);

        // Sanitize Walking Animation: Remove Position Tracks (Root Motion)
        // This prevents the animation from moving the mesh, which fights with our physics
        const walkClip = gltf.animations[19].clone();
        walkClip.tracks = walkClip.tracks.filter(
          (t) => !t.name.includes(".position"),
        );

        zombieWalkAction = zombieMixer.clipAction(walkClip); // Walking
        zombieWalkAction.setEffectiveTimeScale(2.0); // 2.0x speed

        // Configure animations
        zombieRisingAction.setLoop(THREE.LoopOnce, 1);
        zombieRisingAction.clampWhenFinished = true;

        // DO NOT Start rising animation. Wait for timer.
        console.log("[Zombie] Zombie loaded. Waiting for initial countdown.");
        // zombieRisingAction.play();
        // isZombieRising = true;
        isZombieChasing = false;

        // Listen for animation finish
        zombieMixer.addEventListener("finished", function onRisingFinished(e) {
          if (e.action === zombieRisingAction) {
            console.log("[Zombie] Rising animation finished event.");
            zombieMixer.removeEventListener("finished", onRisingFinished);
            isZombieRising = false;
            playZombieIdle();

            // Transition to idle animation
            zombieIdleAction.reset();
            zombieIdleAction.play();
            zombieAction = zombieIdleAction;

            // Sync collider to surface once risen
            // We can assume he ended up at zombieFinalY
            zombieVelocity.set(0, 0, 0);

            // Sync collider to the new mesh position!
            zombieCollider.start.set(
              zombieModel.position.x,
              zombieModel.position.y + 0.35,
              zombieModel.position.z,
            );
            zombieCollider.end.set(
              zombieModel.position.x,
              zombieModel.position.y + 1.35,
              zombieModel.position.z,
            );

            console.log(
              `[Zombie] Rising finished. Collider synced to Y=${zombieModel.position.y.toFixed(2)}`,
            );
          }
        });

        zombieAction = zombieRisingAction;
      }
    });
  }

  // --- Damage System Visuals ---

  function createDamageNumber(position, amount, color = 0xff0000) {
    const div = document.createElement("div");
    div.textContent = amount > 0 ? `-${amount}` : `${amount}`;
    div.style.color = color === 0xff0000 ? "#ff4444" : "#4444ff";
    div.style.fontWeight = "bold";
    div.style.fontSize = "24px";
    div.style.fontFamily = "'Press Start 2P', cursive";
    div.style.textShadow = "2px 2px 0 #000";
    div.style.position = "absolute";
    div.style.pointerEvents = "none";
    div.style.userSelect = "none";

    // Initial position off-screen, updated in animate
    div.style.left = "-1000px";
    div.style.top = "-1000px";

    const container = document.body; // Or specific game container
    container.appendChild(div);

    floatingTexts.push({
      element: div,
      worldPos: position.clone().add(new THREE.Vector3(0, 2.0, 0)), // Start visible above head
      life: 1.0, // 1 second duration
      velocity: new THREE.Vector3(0, 1.0 + Math.random() * 0.5, 0), // Float up
    });
  }

  function flashModel(model, colorHex) {
    const originalEmissives = new Map();

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        // Store original
        if (child.material.emissive) {
          originalEmissives.set(child.uuid, {
            color: child.material.emissive.clone(),
            intensity: child.material.emissiveIntensity,
          });

          // Apply Flash
          // child.material = child.material.clone(); // Clone to avoid affecting shared materials permanently?
          // Better: Just modify and restore.
          // Note: If materials are shared across instances, cloning might be needed.
          // But here we likely have unique instances or it's okay to flash all of type.
          // Let's assume unique or okay to flash.

          child.material.emissive.setHex(colorHex);
          child.material.emissiveIntensity = 0.8;
        }
      }
    });

    // Restore after 200ms
    setTimeout(() => {
      model.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          const orig = originalEmissives.get(child.uuid);
          if (orig) {
            child.material.emissive.copy(orig.color);
            child.material.emissiveIntensity = orig.intensity;
          } else {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }, 200);
  }

  function takeDamage(target, amount, type) {
    if (!target || !target.userData || target.userData.isDead) return;

    // 1. Deduct HP
    target.userData.hp -= amount;

    // 2. Visual Feedback
    const flashColor = type === "fireball" ? 0xff0000 : 0x00ffff; // Red or Blue
    flashModel(target, flashColor);
    if (type === "thunder") {
      // Double flash for electrocution effect
      setTimeout(() => {
        if (target && target.userData && !target.userData.isDead) {
          flashModel(target, flashColor);
        }
      }, 250);
    }
    createDamageNumber(target.position, amount, flashColor);
    playZombieHit();

    // 3. Play Hit Animation (Random Non-Repeating)
    if (zombieMixer && !isZombieRising) {
      // Stop current
      if (zombieAction) zombieAction.stop();

      // FIX: Reset attacking flag if we interrupted an attack!
      if (target.userData.isAttacking) {
        console.log(
          "[Zombie] Attack interrupted by damage. Resetting isAttacking flag.",
        );
        target.userData.isAttacking = false;
      }

      // Available Hit Anims: 11, 14, 15, 16
      // If we simply use 14, 15, 16 as user listed "The hit by fireball animations are [11] [14] [15] [16]"
      // Wait, [11] is also listed.
      const hitAnims = [11, 14, 15, 16];

      // Filter out last hit
      const available = hitAnims.filter(
        (i) => i !== target.userData.lastHitAnim,
      );

      // Pick random
      const nextAnimIndex =
        available[Math.floor(Math.random() * available.length)];
      target.userData.lastHitAnim = nextAnimIndex;

      // Play
      const clip = zombie.userData.gltf.animations[nextAnimIndex];
      if (clip) {
        const action = zombieMixer.clipAction(clip);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        zombieAction = action;

        // Return to Idle after hit
        const onHitFinished = (e) => {
          if (e.action === action) {
            zombieMixer.removeEventListener("finished", onHitFinished);
            if (!target.userData.isDead) {
              zombieIdleAction.reset().fadeIn(0.2).play();
              zombieAction = zombieIdleAction;
            }
          }
        };
        zombieMixer.addEventListener("finished", onHitFinished);
      }
    }

    // 4. Check Death
    if (target.userData.hp <= 0) {
      handleDeath(target, type);
    }
  }

  function handleDeath(target, type) {
    target.userData.isDead = true;

    let deathAnimIndex = 0;

    // Select Animation based on Damage Type
    if (type === "thunder") {
      deathAnimIndex = 5; // Instantly from thunder
    } else {
      // Fireball or others: Random [3, 4, 6, 7]
      const pool = [3, 4, 6, 7];
      deathAnimIndex = pool[Math.floor(Math.random() * pool.length)];
    }

    const deathAnim = target.userData.gltf.animations[deathAnimIndex];

    if (deathAnim) {
      if (zombieAction) zombieAction.stop();
      const action = zombieMixer.clipAction(deathAnim);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      zombieAction = action;

      // Hide after animation finishes
      const onDeathFinished = (e) => {
        if (e.action === action) {
          zombieMixer.removeEventListener("finished", onDeathFinished);
          target.visible = false; // Disappear instantly
        }
      };
      zombieMixer.addEventListener("finished", onDeathFinished);
    } else {
      console.log("Death animation not found, hiding instantly.");
      target.visible = false;
    }

    // Disable collision
    const idx = collisionObstacles.findIndex(
      (o) => o.position === target.position,
    );
    if (idx !== -1) collisionObstacles.splice(idx, 1);

    // Schedule Respawn via Timer
    zombieRespawnTimer = ZOMBIE_RESPAWN_TIME;
    console.log(`[Zombie] Death handled. Respawn in ${ZOMBIE_RESPAWN_TIME}s`);
  }

  function respawnZombie(target) {
    console.log("[Zombie] respawnZombie TRIGGERED! Resetting zombie.");
    // Reset State
    target.userData.hp = target.userData.maxHp;
    target.userData.isDead = false;
    target.userData.lastHitAnim = null;
    target.visible = true; // Make visible again

    // Position
    // We need to restore him to ground level if he sank
    // Reuse existing zombieFinalY
    target.position.y = zombieFinalY - 2.0; // Start underground again

    // Enable collision again?
    // Actually we just pushed the position reference, so if we didn't remove the object reference...
    // Wait, splice(idx, 1) removed the object from the array. We need to re-add.
    collisionObstacles.push({
      position: target.position,
      radius: 0.35,
    });

    // Animation
    if (zombieAction) zombieAction.stop();
    zombieRisingAction.reset().play();
    zombieAction = zombieRisingAction;
    isZombieRising = true;

    // The existing animate logic will handle the rising and particle effects!
    // We just need to trigger the flag.

    // Re-attach listener for idle transition
    const onRisingFinished = (e) => {
      if (e.action === zombieRisingAction) {
        zombieMixer.removeEventListener("finished", onRisingFinished);
        isZombieRising = false;
        playZombieIdle();
        zombieIdleAction.reset().play();
        zombieAction = zombieIdleAction;

        // Sync collider here too!
        zombieVelocity.set(0, 0, 0);
        zombieCollider.start.set(
          target.position.x,
          target.position.y + 0.35,
          target.position.z,
        );
        zombieCollider.end.set(
          target.position.x,
          target.position.y + 1.35,
          target.position.z,
        );
        console.log(`[Zombie] Respawn Rising finished. Collider synced.`);
      }
    };
    zombieMixer.addEventListener("finished", onRisingFinished);
  }

  function zombieAttack(target) {
    if (
      !zombie ||
      zombie.userData.attackCooldown > 0 ||
      zombie.userData.isDead ||
      zombie.userData.isAttacking
    )
      return;
    // Allow attacking even if player is immune (visual only), damage check is later

    // zombie.userData.isAttacking set inside if(attackAnim) check now for safety
    // zombie.userData.attackCooldown set inside too

    // Face Player
    const lookTarget = target.position.clone();
    lookTarget.y = zombie.position.y;
    zombie.lookAt(lookTarget);

    // Select Attack Anim [0] or [1]
    const attackIndex = Math.random() < 0.5 ? 0 : 1;
    const attackAnim = zombie.userData.gltf.animations[attackIndex];

    if (attackAnim) {
      zombie.userData.isAttacking = true;
      zombie.userData.attackCooldown = 2.0;

      if (zombieAction) zombieAction.stop();
      const action = zombieMixer.clipAction(attackAnim);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1.15; // 15% Faster
      action.play();
      zombieAction = action;

      // Delay damage impact (approx 0.5s into animation / 1.15 speed = ~0.43s)
      setTimeout(() => {
        // Re-check distance and state before applying damage
        // Safety: Don't apply damage if game paused or ended during the swing
        if (isPaused || showGameOverModal) return;

        if (zombie && !zombie.userData.isDead && model) {
          // Attack range slighty larger than collision (0.35 + arm reach ~0.5 = 0.85)
          const dist = zombie.position.distanceTo(model.position);
          // Hit range must be >= stop range (0.9)
          if (dist < 1.2) {
            // Tighter range
            damagePlayer(1);
          }
        }
      }, 400);

      const onAttackFinished = (e) => {
        if (e.action === action) {
          zombieMixer.removeEventListener("finished", onAttackFinished);
          zombie.userData.isAttacking = false;
          console.log("[Zombie] Attack animation finished.");
          if (!zombie.userData.isDead) {
            zombieIdleAction.reset().fadeIn(0.2).play();
            zombieAction = zombieIdleAction;
          }
        }
      };
      zombieMixer.addEventListener("finished", onAttackFinished);

      // Failsafe: Force clear flag after duration + buffer
      const duration = action.getClip().duration / 1.15; // timescale
      setTimeout(
        () => {
          if (zombie && zombie.userData.isAttacking) {
            // Only clear if we are still attacking (didn't get interrupted/finished)
            // Actually hard to track validity of THIS specific attack logic instance vs a new one.
            // But isAttacking should be false by now.
            // We'll trust the event listener primarily, but if it fails...
            // Let's rely on the takeDamage fix for interruption cases.
          }
        },
        duration * 1000 + 500,
      );
    }
  }

  function damagePlayer(amount) {
    if (isPlayerImmune) return;

    playerHp = Math.max(0, playerHp - amount);
    createDamageNumber(model.position, amount, 0xff0000); // Red text on player

    if (playerHp <= 0) {
      showGameOverModal = true;
    }

    // Immunity
    isPlayerImmune = true;
    playerImmunityTimer = 3.0; // 3 seconds

    console.log(`Player hit! HP: ${playerHp}`);
  }

  function resetGame() {
    // Reset Player State
    playerHp = playerMaxHp;
    showGameOverModal = false;
    isPlayerImmune = false;

    if (model) {
      model.visible = true;
      // Reset Position to initial spawn
      model.position.set(-0.65, 0, 3.62);

      // Reset Collider
      playerCollider.start.set(-0.65, 0.33, 3.62);
      playerCollider.end.set(-0.65, 1.33, 3.62);

      // Reset Physics/Movement
      playerVelocity.set(0, 0, 0);
      isMoving = false;
      targetPosition = null;
      targetObject = null;
      hideDestinationMarker();

      // Face default direction (towards sign)
      model.rotation.set(0, 0, 0);
    }

    // Reset Zombie to Countdown Mode
    zombieRespawnTimer = ZOMBIE_RESPAWN_TIME;
    if (zombie) {
      zombie.visible = false;
      zombie.userData.isDead = true;
      zombie.userData.hp = zombie.userData.maxHp;
      if (zombieAction) zombieAction.stop();
      isZombieRising = false;
      isZombieChasing = false;
      // respawnZombie(zombie); // Do NOT spawn immediately
    }
  }

  function createMultiLineTextLabel(lines, position) {
    // Create canvas for text texture
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // High resolution for crisp apple look
    const fontSize = 48;
    const padding = 40;
    const lineHeight = 64;

    // Calculate required size
    context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    let maxWidth = 0;
    lines.forEach((line) => {
      const w = context.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    });

    canvas.width = maxWidth + padding * 2;
    canvas.height = lines.length * lineHeight + padding * 1.5;

    // Redraw because resizing clears canvas
    // Re-set font
    context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // 1. Draw Liquid Glass Background
    // Rounded Rectangle
    const radius = 30;
    const x = 0;
    const y = 0;
    const w = canvas.width;
    const h = canvas.height;

    // Gradient fill (Glassy)
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.25)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");

    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();

    // Shadow for depth
    context.shadowColor = "rgba(0, 0, 0, 0.15)";
    context.shadowBlur = 15;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 5;

    context.fillStyle = gradient;
    context.fill();

    // Border (Frosty edge)
    context.shadowColor = "transparent"; // clear shadow for border
    context.strokeStyle = "rgba(255, 255, 255, 0.4)";
    context.lineWidth = 2;
    context.stroke();

    // 2. Draw Text
    context.shadowColor = "rgba(0,0,0,0.2)";
    context.shadowBlur = 4;
    context.fillStyle = "#ffffff";

    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Position
    sprite.position.copy(position);

    // Scale down - "Small and very little"
    // Maintain aspect ratio
    const scaleFactor = 0.0025; // Scale pixels to world units (very small)
    sprite.scale.set(
      canvas.width * scaleFactor,
      canvas.height * scaleFactor,
      1,
    );

    scene.add(sprite);
    textLabels.push(sprite);

    return sprite;
  }

  function createTextLabel(text, position) {
    // Determine canvas size based on text length
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Config
    const fontSize = 48;
    const paddingH = 50;
    const paddingV = 25;

    context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    const textWidth = context.measureText(text).width;

    canvas.width = textWidth + paddingH * 2;
    canvas.height = fontSize + paddingV * 2;

    // Reset Context after resize
    context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // 1. Draw Liquid Glass Background
    const radius = 25; // Fully rounded sides if height is close? Or just rounded rect
    const w = canvas.width;
    const h = canvas.height;

    // Gradient
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.25)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");

    context.beginPath();
    // RoundRect
    if (context.roundRect) {
      context.roundRect(0, 0, w, h, radius);
    } else {
      // Fallback for browsers not supporting roundRect
      context.moveTo(radius, 0);
      context.lineTo(w - radius, 0);
      context.quadraticCurveTo(w, 0, w, radius);
      context.lineTo(w, h - radius);
      context.quadraticCurveTo(w, h, w - radius, h);
      context.lineTo(radius, h);
      context.quadraticCurveTo(0, h, 0, h - radius);
      context.lineTo(0, radius);
      context.quadraticCurveTo(0, 0, radius, 0);
    }

    // Shadow
    context.shadowColor = "rgba(0, 0, 0, 0.15)";
    context.shadowBlur = 10;
    context.shadowOffsetY = 4;

    context.fillStyle = gradient;
    context.fill();

    // Border
    context.shadowColor = "transparent";
    context.strokeStyle = "rgba(255, 255, 255, 0.4)";
    context.lineWidth = 2;
    context.stroke();

    // 2. Draw Text
    context.fillStyle = "#ffffff";
    context.shadowColor = "rgba(0,0,0,0.2)";
    context.shadowBlur = 4;
    context.fillText(text, w / 2, h / 2 + 2); // Slight offset for baseline adjustment

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Position
    sprite.position.copy(position);

    // Scale - small
    const scaleFactor = 0.0025;
    sprite.scale.set(
      canvas.width * scaleFactor,
      canvas.height * scaleFactor,
      1,
    );

    scene.add(sprite);
    textLabels.push(sprite);

    return sprite;
  }

  function createDestinationMarker() {
    // Permanent circular marker
    const markerGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    destinationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    destinationMarker.rotation.x = -Math.PI / 2;
    destinationMarker.position.y = 0.05; // Slightly above floor
    destinationMarker.visible = false;
    scene.add(destinationMarker);

    // Animated ripple effect
    const rippleGeometry = new THREE.RingGeometry(0.15, 0.25, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });
    markerRipple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    markerRipple.rotation.x = -Math.PI / 2;
    markerRipple.position.y = 0.1; // Slightly above marker
    markerRipple.visible = false;
    markerRipple.userData = {
      animationTime: 0,
      isAnimating: false,
    };
    scene.add(markerRipple);
  }

  // createEnvironmentalModels removed

  function checkInteraction() {
    if (showModal || showDialogue || !model) return;

    // Use a larger proximity threshold for "being near something"
    // But check actual distance to the HITBOX surface for interaction
    const searchRadius = 3.0;
    const playerPos = model.position.clone();

    // Helper to check distance to an object's hitbox
    const isTouching = (obj, distanceThreshold = 0.8) => {
      if (!obj) return false;
      const hitbox = obj.getObjectByName("hitbox");
      if (!hitbox) {
        // Fallback to center distance if no hitbox
        const d = new THREE.Vector2(obj.position.x, obj.position.z).distanceTo(
          new THREE.Vector2(playerPos.x, playerPos.z),
        );
        return d < distanceThreshold;
      }

      // Update matrices to ensure world bounds are correct
      hitbox.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(hitbox);

      // Expand box slightly for interaction zone? Or just measure distance
      // distanceToPoint returns 0 if inside
      const dist = box.distanceToPoint(playerPos);
      return dist < distanceThreshold;
    };

    // Check Cartouches
    for (const cube of cubes) {
      if (isTouching(cube, 0.8)) {
        // 0.8 meter reach
        // Stop movement
        isMoving = false;
        targetPosition = null;
        targetObject = null;
        hideDestinationMarker();
        if (activeAction !== actions["Idle"] && !isPlayingOneShotAnimation) {
          fadeToAction("Idle", 0.2);
        }

        // Auto-Pause for Reading
        if (!isPaused) {
          togglePause(); // This handles the flag and the zombie idle switch
        }

        contactModalState.set({ isOpen: true, title: "Jogos" });
        return;
      }
    }

    // Check Miku
    if (isTouching(sphere, 1.2)) {
      isMoving = false;
      targetPosition = null;
      targetObject = null;
      hideDestinationMarker();
      if (activeAction !== actions["Idle"] && !isPlayingOneShotAnimation) {
        fadeToAction("Idle", 0.2);
      }

      // Face Miku
      const direction = new THREE.Vector3()
        .subVectors(sphere.position, model.position)
        .normalize();
      const targetRotation = Math.atan2(direction.x, direction.z);
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
      model.quaternion.copy(q);

      startDialogue("miku");
      return;
    }

    // Check Clown
    if (isTouching(clown, 1.2)) {
      isMoving = false;
      targetPosition = null;
      targetObject = null;
      hideDestinationMarker();
      if (activeAction !== actions["Idle"] && !isPlayingOneShotAnimation) {
        fadeToAction("Idle", 0.2);
      }

      // Face Clown
      const direction = new THREE.Vector3()
        .subVectors(clown.position, model.position)
        .normalize();
      const targetRotation = Math.atan2(direction.x, direction.z);
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
      model.quaternion.copy(q);

      startDialogue("clown");
      return;
    }

    // Check Welcome Sign
    if (isTouching(welcomeSign, 1.2)) {
      isMoving = false;
      targetPosition = null;
      targetObject = null;
      hideDestinationMarker();
      if (activeAction !== actions["Idle"] && !isPlayingOneShotAnimation) {
        fadeToAction("Idle", 0.2);
      }

      // Face Sign
      const direction = new THREE.Vector3()
        .subVectors(welcomeSign.position, model.position)
        .normalize();
      const targetRotation = Math.atan2(direction.x, direction.z);
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
      model.quaternion.copy(q);

      // Auto-Pause for Reading
      if (!isPaused) {
        togglePause();
      }

      showHelpModal = true;
      return;
    }
  }

  // Modal Functions
  function closeModal() {
    showModal = false;
    currentProject = null;
    currentImageIndex = 0;
    // Resume Game
    if (isPaused) {
      togglePause();
    }
  }

  function closeHelpModal() {
    showHelpModal = false;
    // Resume Game
    if (isPaused) {
      togglePause();
    }
  }

  function nextImage() {
    if (currentProject && currentProject.images) {
      currentImageIndex =
        (currentImageIndex + 1) % currentProject.images.length;
    }
  }

  function prevImage() {
    if (currentProject && currentProject.images) {
      currentImageIndex =
        (currentImageIndex - 1 + currentProject.images.length) %
        currentProject.images.length;
    }
  }

  function goToImage(index) {
    currentImageIndex = index;
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case "w":
        keys.w = true;
        break;
      case "a":
        keys.a = true;
        break;
      case "s":
        keys.s = true;
        break;
      case "d":
        keys.d = true;
        break;
      case " ":
        keys.space = true;
        break;
      case "shift":
        keys.shift = true;
        break;
      case "e":
      case "enter":
        checkInteraction();
        break;
      case "1":
        toggleFireballMode();
        break;
      case "2":
        toggleThunderMode();
        break;
      case "f3":
        toggleFirstPerson();
        break;
    }
  }

  function toggleFirstPerson() {
    isFirstPerson = !isFirstPerson;
    if (isFirstPerson) {
      document.body.requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }

  function onMouseMove(event) {
    if (isFirstPerson && document.pointerLockElement === document.body) {
      cameraRotation.y -= event.movementX * 0.002;
      cameraRotation.x -= event.movementY * 0.002;
      // Clamp pitch to avoid flipping
      cameraRotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, cameraRotation.x),
      );
    }
  }

  function toggleFireballMode() {
    attackMode = attackMode === "fireball" ? null : "fireball";
  }

  function toggleThunderMode() {
    attackMode = attackMode === "thunder" ? null : "thunder";
  }

  function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
      case "w":
        keys.w = false;
        break;
      case "a":
        keys.a = false;
        break;
      case "s":
        keys.s = false;
        break;
      case "d":
        keys.d = false;
        break;
      case " ":
        keys.space = false;
        break;
      case "shift":
        keys.shift = false;
        break;
    }
  }

  function addDynamicHitbox(object, padding = 0) {
    // Store original transforms
    const originalPosition = object.position.clone();
    const originalQuaternion = object.quaternion.clone();
    const originalScale = object.scale.clone();

    // Reset transform to Identity to get Local Axis-Aligned Bounding Box
    // This allows us to create a hitbox that fits the object's contents
    // and is attached TO the object, automatically handling future rotation/scaling.
    object.position.set(0, 0, 0);
    object.quaternion.set(0, 0, 0, 1);
    object.scale.set(1, 1, 1);
    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3();
    box.setFromObject(object);

    // Restore transforms
    object.position.copy(originalPosition);
    object.quaternion.copy(originalQuaternion);
    object.scale.copy(originalScale);
    object.updateWorldMatrix(true, true); // Restore matrix

    // If box is empty, fallback or return
    if (box.isEmpty()) return;

    // Get dimensions (Since object was 1,1,1, this is the unscaled local size)
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Apply padding (relative to unscaled size)
    size.addScalar(padding);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });

    // Check for existing hitbox
    const old = object.getObjectByName("hitbox");
    if (old) object.remove(old);

    const hitbox = new THREE.Mesh(geometry, material);
    hitbox.name = "hitbox";
    hitbox.userData.isHitbox = true;

    // Position current center matches the box center
    hitbox.position.copy(center);

    object.add(hitbox);
  }

  function handleCanvasClick(event) {
    if (showModal || showDialogue) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Filter out sprites
    const eligibleObjects = scene.children.filter(
      (child) => !(child instanceof THREE.Sprite),
    );
    const intersects = raycaster.intersectObjects(eligibleObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let object = hit.object;

      // Direct Hitbox Check
      if (object.name === "hitbox") {
        object = object.parent;
      }

      // Traverse up to find the interactive object
      while (
        object.parent &&
        object.name !== "interactive_zombie" &&
        object.name !== "interactive_cube" &&
        object.name !== "interactive_sphere" &&
        object.name !== "interactive_clown" &&
        object.name !== "interactive_welcome" &&
        object.name !== "interactive_welcome" &&
        object.name !== "floor" &&
        object.name !== "environment_mesh"
      ) {
        object = object.parent;
      }

      // Add visual feedback for interactive objects
      if (
        object.name === "interactive_cube" ||
        object.name === "interactive_sphere" ||
        object.name === "interactive_clown" ||
        object.name === "interactive_welcome"
      ) {
        addClickFeedback(object, hit.point);
      }

      // Handle Map Click (Movement or Attack)
      if (
        object.name === "floor" ||
        object.name === "environment_mesh" ||
        object.name === "map_root"
      ) {
        if (attackMode) {
          performAttack(hit.point);
        } else {
          targetPosition = hit.point;
          targetObject = null;
          isMoving = true;
          showDestinationMarker(hit.point);
        }
      }
      // Handle Interactive Objects
      else if (object.name === "interactive_zombie") {
        if (attackMode) {
          performAttack(hit.point);
        }
      } else if (object.name === "interactive_cube") {
        // Walk to cartouche like Miku/Clown
        const direction = new THREE.Vector3()
          .subVectors(object.position, model.position)
          .normalize();
        targetPosition = object.position
          .clone()
          .sub(direction.multiplyScalar(0.7)); // Closer
        // Don't force Y=0, let gravity handle it
        // targetPosition.y = 0;

        targetObject = object;
        isMoving = true;
        showDestinationMarker(targetPosition);
      } else if (object.name === "interactive_sphere") {
        const direction = new THREE.Vector3()
          .subVectors(object.position, model.position)
          .normalize();
        targetPosition = object.position
          .clone()
          .sub(direction.multiplyScalar(0.8)); // Closer
        // targetPosition.y = 0;

        targetObject = object;
        isMoving = true;
        showDestinationMarker(targetPosition);
      } else if (object.name === "interactive_clown") {
        const direction = new THREE.Vector3()
          .subVectors(object.position, model.position)
          .normalize();
        targetPosition = object.position
          .clone()
          .sub(direction.multiplyScalar(0.8)); // Closer
        // targetPosition.y = 0;

        targetObject = object;
        isMoving = true;
        showDestinationMarker(targetPosition);
      } else if (object.name === "interactive_welcome") {
        // Walk to welcome sign like other interactive objects
        const direction = new THREE.Vector3()
          .subVectors(object.position, model.position)
          .normalize();
        targetPosition = object.position
          .clone()
          .sub(direction.multiplyScalar(0.9)); // Closer
        // targetPosition.y = 0;

        targetObject = object;
        isMoving = true;
        showDestinationMarker(targetPosition);
      }
    }
  }

  function addClickFeedback(object, clickPoint) {
    // Add outline effect to the object
    object.traverse((child) => {
      if (child.isMesh && child.name !== "hitbox") {
        // Ignore hitbox
        // Store original emissive color on the MATERIAL to handle shared materials
        if (!child.material.userData.originalEmissive) {
          child.material.userData.originalEmissive = child.material.emissive
            ? child.material.emissive.clone()
            : new THREE.Color(0x000000);
          child.material.userData.originalEmissiveIntensity =
            child.material.emissiveIntensity !== undefined
              ? child.material.emissiveIntensity
              : 0;
        }

        // Flash emissive color
        if (child.material.emissive) {
          child.material.emissive.setHex(0xffffff);
          child.material.emissiveIntensity = 0.5;
        }
      }
    });

    // Reset emissive after a short delay
    setTimeout(() => {
      object.traverse((child) => {
        if (child.isMesh && child.name !== "hitbox") {
          // Restore from MATERIAL userData
          if (child.material.userData.originalEmissive) {
            if (child.material.emissive) {
              child.material.emissive.copy(
                child.material.userData.originalEmissive,
              );
              child.material.emissiveIntensity =
                child.material.userData.originalEmissiveIntensity;
            }
          }
        }
      });
    }, 300);
  }
  function fadeToAction(name, duration) {
    previousAction = activeAction;
    activeAction = actions[name];

    if (previousAction !== activeAction) {
      previousAction.fadeOut(duration);
      activeAction.reset().fadeIn(duration).play();
    }
  }

  function updatePlayer(delta) {
    if (isLoading || isInDialogue || showModal || !model) return;

    // 1. Input Handling
    const inputVector = new THREE.Vector3();

    // WASD Input
    if (keys.w || keys.s || keys.a || keys.d) {
      // Cancel Click-Move
      if (targetPosition || isMoving) {
        targetPosition = null;
        isMoving = false;
        targetObject = null;
        hideDestinationMarker();
      }

      if (keys.w) inputVector.z -= 1;
      if (keys.s) inputVector.z += 1;
      if (keys.a) inputVector.x -= 1;
      if (keys.d) inputVector.x += 1;
    }
    // Click-Move Input
    else if (targetPosition && isMoving) {
      const playerPosFlat = new THREE.Vector3(
        model.position.x,
        0,
        model.position.z,
      );
      const targetPosFlat = new THREE.Vector3(
        targetPosition.x,
        0,
        targetPosition.z,
      );

      if (playerPosFlat.distanceTo(targetPosFlat) < 0.2) {
        isMoving = false;
        targetPosition = null;
        hideDestinationMarker();
        if (targetObject) {
          if (targetObject.name === "interactive_cube")
            contactModalState.set({ isOpen: true, title: "Jogos" });
          else if (targetObject.name === "interactive_sphere")
            startDialogue("miku");
          else if (targetObject.name === "interactive_clown")
            startDialogue("clown");
          else if (targetObject.name === "interactive_welcome")
            showHelpModal = true;

          const dir = new THREE.Vector3()
            .subVectors(targetObject.position, model.position)
            .normalize();
          dir.y = 0;
          if (dir.lengthSq() > 0) {
            const q = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              Math.atan2(dir.x, dir.z),
            );
            model.quaternion.copy(q);
          }
          targetObject = null;
        }
      } else {
        inputVector.subVectors(targetPosFlat, playerPosFlat).normalize();
      }
    }

    // 2. Friction / Damping (Ground vs Air)
    let damping = Math.exp(-4 * delta) - 1;

    if (playerOnFloor) {
      if (inputVector.lengthSq() === 0) {
        // High friction when stopping (Anti-Ice)
        damping = Math.exp(-15 * delta) - 1;

        // Trigger Dust if stopping from speed
        if (playerVelocity.lengthSq() > 5) {
          createDust(model.position);
        }
      }
    } else {
      playerVelocity.y -= GRAVITY * delta;
      damping *= 0.1; // Less friction in air
    }

    playerVelocity.addScaledVector(playerVelocity, damping);

    // 3. Acceleration
    if (inputVector.lengthSq() > 0) {
      inputVector.normalize();
      playerDirection.copy(inputVector);

      const targetRotation = Math.atan2(playerDirection.x, playerDirection.z);
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        targetRotation,
      );
      model.quaternion.slerp(q, ROTATION_SPEED * delta);

      const speed = playerOnFloor ? MOVE_SPEED : MOVE_SPEED * 0.2;
      playerVelocity.add(inputVector.multiplyScalar(speed * delta));
    }

    // 4. Apply Velocity to Collider
    const deltaPosition = playerVelocity.clone().multiplyScalar(delta);
    playerCollider.translate(deltaPosition);

    // 5. Collision Resolution
    playerCollisions();

    // 6. Sync Model
    model.position.copy(playerCollider.start);
    model.position.y -= 0.35;

    // 7. Logic Updates
    if (playerOnFloor) {
      // Just Landed
      if (!isGrounded && playerVelocity.y < -2.0) {
        createDust(model.position);
      }

      if (keys.space) {
        playerVelocity.y = JUMP_FORCE;
        playerOnFloor = false;
        playJumpSound();
      }
    }

    isGrounded = playerOnFloor;
    updateAnimations(inputVector);
  }

  function playerCollisions() {
    const result1 = worldOctree.capsuleIntersect(playerCollider);
    const result2 = rockOctree.capsuleIntersect(playerCollider);

    let result = null;
    if (result1 && result2) {
      // If hitting both, pick the one with greater penetration depth?
      // Or simply process both sequentially. Sequential is safer for simple collision.
      // Let's process result1 then result2.
      // Actually, standard composite handling:
      result = result1; // Fallback
    } else if (result1) {
      result = result1;
    } else if (result2) {
      result = result2;
    }

    playerOnFloor = false;

    if (result1) {
      playerOnFloor = result1.normal.y > 0.35;
      if (!playerOnFloor) {
        playerVelocity.addScaledVector(
          result1.normal,
          -result1.normal.dot(playerVelocity),
        );
      }
      playerCollider.translate(result1.normal.multiplyScalar(result1.depth));
    }

    if (result2) {
      // Check floor (rocks can be floor too if flat enough)
      const rockFloor = result2.normal.y > 0.35;
      playerOnFloor = playerOnFloor || rockFloor;

      if (!rockFloor) {
        playerVelocity.addScaledVector(
          result2.normal,
          -result2.normal.dot(playerVelocity),
        );
      }
      playerCollider.translate(result2.normal.multiplyScalar(result2.depth));
    }

    // Original single-check logic removal
    // if (result) { ... }

    // --- Dynamic Obstacle Collision (Spheres vs Player Capsule) ---
    // We treat obstacles as infinite vertical cylinders for movement, OR valid spheres.
    // Given the requirement "can't be running through their meshes", and they are standing on ground...
    // simpler 2D distance check (or 3D sphere vs Capsule) works.
    // Let's use 3D Sphere vs Capsule for robustness, assuming obstacles are roughly player height.

    for (const obstacle of collisionObstacles) {
      // Find closest point on capsule line segment to obstacle center
      _vector.copy(obstacle.position); // Obstacle center
      // Obstacle Y might be 0 (ground). If it's 0, sphere is half-buried.
      // Let's adjust obstacle center to be "body height" if it's too low.
      // Most pivots are at feet. So effectively we want a cylinder check.
      // We can clamp the obstacle Y to be within the player's vertical range for the distance check.

      const playerBottom = playerCollider.start.y;
      const playerTop = playerCollider.end.y;

      // Clamp obstacle Y to be within player's height range (effectively a cylinder check)
      // center.y is modified just for the distance calculation
      const clampedY = Math.max(
        playerBottom,
        Math.min(playerTop, obstacle.position.y + 1.0), // Assume body center ~ 1m up if pivot is 0
      );
      // Actually, if we want strict cylinder, we just ignore Y completely (2D distance).
      // Let's do 2D distance for robust "blocking".
      // ... But we might want to jump OVER things?
      // Miku is tall, Cartouche is floating.
      // Let's use the explicit radius.

      // Hybrid: Check 2D distance first.
      const distSq =
        (playerCollider.start.x - obstacle.position.x) ** 2 +
        (playerCollider.start.z - obstacle.position.z) ** 2;

      const combinedRadius = playerCollider.radius + obstacle.radius;

      if (distSq < combinedRadius * combinedRadius) {
        // Collision detected (2D projection)
        const dist = Math.sqrt(distSq);
        const overlap = combinedRadius - dist;

        // Normal vector pointing AWAY from obstacle
        _diff
          .set(
            playerCollider.start.x - obstacle.position.x,
            0,
            playerCollider.start.z - obstacle.position.z,
          )
          .normalize();

        // If centers are exactly same (rare), pick random direction
        if (dist < 0.001) _diff.set(1, 0, 0);

        // Displace player
        // We assume massive obstacles (player moves, obstacle stays)
        const displacement = _diff.multiplyScalar(overlap);
        playerCollider.translate(displacement);

        // Kill velocity into the obstacle
        // Project velocity onto normal
        const vDotN = playerVelocity.dot(_diff);
        if (vDotN < 0) {
          // Moving towards obstacle
          // Remove that component
          _vector.copy(_diff).multiplyScalar(vDotN);
          playerVelocity.sub(_vector);
        }
      }
    }
  }

  // Backward compatibility alias
  // Backward compatibility alias
  const updateMovement = updatePlayer;

  function updateAnimations(inputVector) {
    if (!isGrounded && playerVelocity.y < -2) {
      if (activeAction !== actions["Fall"]) fadeToAction("Fall", 0.1);
      return;
    }
    if (inputVector.lengthSq() > 0.01) {
      if (activeAction !== actions["Walking"]) fadeToAction("Walking", 0.2);
      if (isGrounded) {
        const currentTime = clock.getElapsedTime();
        if (currentTime - lastStepTime > 0.3) {
          playStepSound();
          lastStepTime = currentTime;
        }
      }
    } else {
      if (activeAction !== actions["Idle"] && !isPlayingOneShotAnimation) {
        fadeToAction("Idle", 0.2);
      }
    }
  }

  function updateCamera() {
    if (!model) return;

    if (isTakingSelfie && sphere) {
      const pToM = new THREE.Vector3()
        .subVectors(sphere.position, model.position)
        .normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(pToM, up).normalize();
      const isMobile = window.innerWidth < 768;
      const topViewOffset = 0.5; // Slight top-down view
      // User requested "much closer and low"
      // Previous: distance 4.0, y + 2.2
      // New: distance 1.8, y + 1.2
      const cameraDistance = isMobile ? 3.0 : 1.8;
      const selfieCamPos = sphere.position
        .clone()
        .add(pToM.multiplyScalar(cameraDistance))
        // Move camera slightly to the side (right) to frame both better?
        // Original: right * -1.8. Let's keep it but maybe reduce if we are closer
        .add(right.multiplyScalar(-0.6)); // Reduced side offset since we are closer

      selfieCamPos.y = sphere.position.y + 0.8; // Much lower (approx Miku's eye level or lower)
      camera.position.lerp(selfieCamPos, 0.1);

      // Look at a point between them?
      // User said "Miku selfie camera...".
      // Usually a selfie is high-up looking down, but user said "low".
      // Let's target Miku's face height.
      const lookAtPos = sphere.position
        .clone()
        .add(new THREE.Vector3(0, 0.8, 0)); // Look at Miku's head height
      camera.lookAt(lookAtPos);
    } else if (isInDialogue) {
      // Unified Over-the-Shoulder Camera for NPCs (Miku & Clown)
      if (currentNPC === "miku" || currentNPC === "clown") {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
          model.quaternion,
        );
        const back = new THREE.Vector3(0, 0, 1).applyQuaternion(
          model.quaternion,
        );
        const shoulderPos = model.position
          .clone()
          .add(right.multiplyScalar(0.7)) // 0.7m right
          .add(back.multiplyScalar(-1.3)) // -1.3m back (Over shoulder)
          .add(new THREE.Vector3(0, 0.1, 0)); // Slightly up

        camera.position.lerp(shoulderPos, 0.1);

        // Determine Look At Target
        let targetPos = null;
        if (currentNPC === "miku" && sphere) {
          // Miku head offset
          targetPos = sphere.position.clone().add(new THREE.Vector3(0, 0.7, 0));
        } else if (currentNPC === "clown" && clown) {
          // Clown head offset (Clown is scaled 0.6, roughly similar height or slightly shorter)
          targetPos = clown.position.clone().add(new THREE.Vector3(0, 0.8, 0));
        }

        if (targetPos) {
          camera.lookAt(targetPos);
        }
      } else {
        // Fallback/Standard dialogue camera (Front view) for others (e.g. Welcome Sign)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
          model.quaternion,
        );
        const back = new THREE.Vector3(0, 0, 1).applyQuaternion(
          model.quaternion,
        );
        const dialogueCamPos = model.position
          .clone()
          .add(right.multiplyScalar(2.5))
          .sub(back.multiplyScalar(4.0))
          .add(new THREE.Vector3(0, 2.0, 0));
        const lookAtPos = model.position
          .clone()
          .add(new THREE.Vector3(0, 1.3, 0));
        camera.position.lerp(dialogueCamPos, 0.05);

        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        currentLookAt.multiplyScalar(10).add(camera.position);
        currentLookAt.lerp(lookAtPos, 0.05);
        camera.lookAt(currentLookAt);
      }
    } else if (isFirstPerson) {
      // First Person View
      const headOffset = new THREE.Vector3(0, 1.6, 0); // Head height
      const targetCamPos = model.position.clone().add(headOffset);
      camera.position.copy(targetCamPos);

      // Apply rotation
      const euler = new THREE.Euler(0, 0, 0, "YXZ");
      euler.x = cameraRotation.x;
      euler.y = cameraRotation.y;
      camera.quaternion.setFromEuler(euler);
    } else {
      const offset = new THREE.Vector3(0, 5, 5);
      const targetCamPos = model.position.clone().add(offset);
      camera.position.lerp(targetCamPos, 0.05);
      camera.lookAt(model.position);
    }
  }

  function startDialogue(npc) {
    currentNPC = npc;
    isInDialogue = true;
    showDialogue = true;
    showButtons = false;
    showTextInput = false;
    displayedText = "";
    playerJoke = "";

    if (npc === "miku") {
      fullText = "Eai mano, tô tirando uma selfie, quer entrar tambem?";
    } else if (npc === "clown") {
      fullText = "Hi, im doing nothing, would you mind telling me a joke?";
      // Play waving animation
      if (clownActions["waving"]) {
        if (clownActions["happy"]) clownActions["happy"].fadeOut(0.2);
        clownActions["waving"]
          .reset()
          .setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
        clownActions["waving"].play();
      }
    }

    typeEffect();
  }

  function typeEffect() {
    let i = 0;
    if (typingInterval) clearInterval(typingInterval);

    typingInterval = setInterval(() => {
      displayedText += fullText.charAt(i);
      playTypeSound();
      i++;
      if (i > fullText.length - 1) {
        clearInterval(typingInterval);
        if (currentNPC === "miku") {
          showButtons = true;
        } else if (currentNPC === "clown") {
          // Show text input only if we haven't received a joke yet
          if (!showCloseButton) {
            showTextInput = true;
          } else {
            // Show close button after clown's response
            showButtons = true;
          }
        }
      }
    }, 50);
  }

  function playTypeSound() {
    const soundIndex = Math.floor(Math.random() * typeSounds.length);
    const sound = typeSounds[soundIndex];
    if (sound) {
      sound.currentTime = 0;
      sound.volume = volType * volMaster;
      sound.play().catch(() => {});
    }
  }

  function playStepSound() {
    const sound = stepSounds[currentStep];
    if (sound) {
      sound.currentTime = 0;
      sound.volume = volStep * volMaster;
      sound.play().catch(() => {});
      currentStep = (currentStep + 1) % stepSounds.length;
    }
  }

  function playJumpSound() {
    if (jumpSound) {
      jumpSound.currentTime = 0;
      jumpSound.volume = volJump * volMaster;
      jumpSound.play().catch(() => {});
    }
  }

  function playOkSound() {
    if (okSound) {
      okSound.currentTime = 0;
      okSound.volume = volOk * volMaster;
      okSound.play().catch(() => {});
    }
  }

  function playByeByeSound() {
    if (byebyeSound) {
      byebyeSound.currentTime = 0;
      byebyeSound.volume = volBye * volMaster;
      byebyeSound.play().catch(() => {});
    }
  }

  function playShutterSound() {
    let s = Math.random() > 0.5 ? shutterSound1 : shutterSound2;
    if (s) {
      s.currentTime = 0;
      s.volume = volShutter * volMaster;
      s.play().catch(() => {});
    }
  }

  // --- NEW SOUND HELPERS ---
  function playZombieIdle() {
    if (zombieIdleSound && volZombie > 0) {
      zombieIdleSound.currentTime = 0;
      zombieIdleSound.volume = volZombie * volMaster;
      zombieIdleSound.play().catch(() => {});
    }
  }

  function playZombieHit() {
    if (zombieHitSound && volZombie > 0) {
      zombieHitSound.currentTime = 0;
      zombieHitSound.volume = volZombie * volMaster;
      zombieHitSound.play().catch(() => {});
    }
  }

  function playZombieDie() {
    if (zombieDieSound && volZombie > 0) {
      zombieDieSound.currentTime = 0;
      zombieDieSound.volume = volZombie * volMaster;
      zombieDieSound.play().catch(() => {});
    }
  }

  function playFireballThrow() {
    if (fireballThrowSound && volFireball > 0) {
      fireballThrowSound.currentTime = 0;
      fireballThrowSound.volume = volFireball * volMaster;
      fireballThrowSound.play().catch(() => {});
    }
  }

  function playFireballHit() {
    if (fireballHitSound && volFireball > 0) {
      fireballHitSound.currentTime = 0;
      fireballHitSound.volume = volFireball * volMaster;
      fireballHitSound.play().catch(() => {});
    }
  }

  function playThunderSound() {
    if (thunderSound && volThunder > 0) {
      thunderSound.currentTime = 0;
      thunderSound.volume = volThunder * volMaster;
      thunderSound.play().catch(() => {});
    }
  }

  let lastVolMaster = 1.0;

  // Helper to apply current master volume to ALL sounds
  function applyVolumes() {
    // Update Background Music
    if (bgMusic) bgMusic.volume = volBgMusic * volMaster;

    // Update Arrays of Sounds
    typeSounds.forEach((s) => (s.volume = volType * volMaster));
    stepSounds.forEach((s) => (s.volume = volStep * volMaster));

    // Update Single Sounds
    if (jumpSound) jumpSound.volume = volJump * volMaster;
    if (okSound) okSound.volume = volOk * volMaster;
    if (byebyeSound) byebyeSound.volume = volBye * volMaster;
    if (shutterSound1) shutterSound1.volume = volShutter * volMaster;
    if (shutterSound2) shutterSound2.volume = volShutter * volMaster;

    // Update New Sounds (Zombie, Powers)
    if (zombieIdleSound) zombieIdleSound.volume = volZombie * volMaster;
    if (zombieHitSound) zombieHitSound.volume = volZombie * volMaster;
    if (zombieDieSound) zombieDieSound.volume = volZombie * volMaster;

    if (fireballThrowSound) fireballThrowSound.volume = volFireball * volMaster;
    if (fireballHitSound) fireballHitSound.volume = volFireball * volMaster;
    if (thunderSound) thunderSound.volume = volThunder * volMaster;
  }

  function toggleMusic() {
    if (volMaster > 0) {
      // MUTE
      lastVolMaster = volMaster; // Save current volume
      volMaster = 0;
      applyVolumes();

      // Also pause music track to save resources/logic
      if (bgMusic) bgMusic.pause();
      isMusicPlaying = false;
    } else {
      // UNMUTE
      volMaster = lastVolMaster || 1.0; // Restore volume
      if (volMaster === 0) volMaster = 1.0; // Safety check
      applyVolumes();

      // Resume music
      if (bgMusic) bgMusic.play().catch(() => {});
      isMusicPlaying = true;
    }
  }

  function updateVolume(event) {
    volMaster = parseFloat(event.target.value);
    applyVolumes();

    // Auto-update specific mute state if slider dragged to 0
    if (volMaster === 0 && isMusicPlaying) {
      if (bgMusic) bgMusic.pause();
      isMusicPlaying = false;
    } else if (volMaster > 0 && !isMusicPlaying) {
      if (bgMusic) bgMusic.play().catch(() => {});
      isMusicPlaying = true;
    }
  }

  function handleYes() {
    playOkSound(); // Use the new sound function

    if (currentNPC === "miku") {
      takeSelfie();
      return;
    }

    if (actions["Agree"]) {
      // Stop previous action immediately instead of fading out
      if (activeAction && activeAction !== actions["Agree"]) {
        activeAction.stop();
      }

      const agreeAction = actions["Agree"];
      agreeAction.reset();
      agreeAction.setLoop(THREE.LoopOnce, 1);
      agreeAction.clampWhenFinished = true;
      agreeAction.timeScale = 1;
      agreeAction.play();

      activeAction = agreeAction;
      isPlayingOneShotAnimation = true;

      mixer.addEventListener("finished", function restoreIdle(e) {
        if (e.action === agreeAction) {
          mixer.removeEventListener("finished", restoreIdle);
          isPlayingOneShotAnimation = false;
          setTimeout(() => {
            endDialogue();
          }, 100);
        }
      });
    } else {
      endDialogue();
    }
  }

  function handleNo() {
    byebyeSound.currentTime = 0;
    byebyeSound.volume = volume;
    byebyeSound.play().catch(() => {});

    if (currentNPC === "miku") {
      endDialogue();
      return;
    }

    if (actions["Disagree"]) {
      // Stop previous action immediately instead of fading out
      if (activeAction && activeAction !== actions["Disagree"]) {
        activeAction.stop();
      }

      const disagreeAction = actions["Disagree"];
      disagreeAction.reset();
      disagreeAction.setLoop(THREE.LoopOnce, 1);
      disagreeAction.clampWhenFinished = true;
      disagreeAction.timeScale = 1;
      disagreeAction.play();

      activeAction = disagreeAction;
      isPlayingOneShotAnimation = true;

      mixer.addEventListener("finished", function restoreIdle(e) {
        if (e.action === disagreeAction) {
          mixer.removeEventListener("finished", restoreIdle);
          isPlayingOneShotAnimation = false;
          setTimeout(() => {
            endDialogue();
          }, 100);
        }
      });
    } else {
      endDialogue();
    }
  }

  function takeSelfie() {
    // 1. Hide dialogue UI
    showDialogue = false;

    // 2. Set selfie state to position camera and Miku
    isTakingSelfie = true;

    // 3. Wait for camera to move and Miku to rotate (give it a moment)
    setTimeout(() => {
      // 4. Flash effect
      showFlash = true;
      shutterSound1.currentTime = 0;
      shutterSound2.currentTime = 0;
      shutterSound1.volume = volume;
      shutterSound2.volume = volume;
      shutterSound1.play().catch(() => {});
      shutterSound2.play().catch(() => {});

      // 5. Take screenshot after a slight delay to ensure flash is visible or just before?
      // Actually, we want the screenshot of the scene, NOT the flash overlay.
      // So we take screenshot immediately, then show flash.
      // But we need to wait for the camera to be in position.

      // Let's render once manually to ensure frame is updated if needed,
      // but the animation loop is running so it should be fine.

      // Capture image
      try {
        const dataURL = renderer.domElement.toDataURL("image/png");

        // Create download link
        const link = document.createElement("a");
        link.download = "miku-selfie.png";
        link.href = dataURL;
        link.click();
      } catch (e) {
        console.error("Failed to take screenshot:", e);
      }

      // Hide flash after animation
      setTimeout(() => {
        showFlash = false;
        isTakingSelfie = false;
        endDialogue();
      }, 500); // Flash duration
    }, 1000); // Wait 1 second for camera to settle
  }

  function endDialogue() {
    isInDialogue = false;
    showDialogue = false;
    showTextInput = false;
    showButtons = false;
    showCloseButton = false;

    // If closing clown dialogue, return clown to happy animation
    if (currentNPC === "clown" && clownActions["happy"]) {
      if (clownActions["laughing"]) clownActions["laughing"].fadeOut(0.3);
      if (clownActions["idle"]) clownActions["idle"].fadeOut(0.3);
      clownActions["happy"].reset().fadeIn(0.5).play();
    }

    currentNPC = null;
    playerJoke = "";
    if (typingInterval) clearInterval(typingInterval);
    if (actions["Idle"]) {
      fadeToAction("Idle", 0.3);
    }
  }

  function handleJokeSubmit() {
    if (!playerJoke.trim()) return;

    // Random algorithm: 50% chance the joke is funny
    const isFunny = Math.random() > 0.5;

    showTextInput = false;
    displayedText = "";

    // Set flag to show close button after response
    showCloseButton = true;

    if (isFunny) {
      fullText = "HAHAHAHA";
      // Play laughing animation and keep it
      if (clownActions["laughing"]) {
        if (clownActions["waving"]) clownActions["waving"].stop();
        if (clownActions["happy"]) clownActions["happy"].fadeOut(0.2);
        const laughAction = clownActions["laughing"];
        laughAction.reset();
        laughAction.setLoop(THREE.LoopRepeat); // Loop the laughing
        laughAction.play();
      }
    } else {
      fullText = "I wouldnt make a joke with that";
      // Play idle animation and keep it
      if (clownActions["idle"]) {
        if (clownActions["waving"]) clownActions["waving"].stop();
        if (clownActions["happy"]) clownActions["happy"].fadeOut(0.2);
        const idleAction = clownActions["idle"];
        idleAction.reset();
        idleAction.setLoop(THREE.LoopRepeat); // Loop the idle
        idleAction.play();
      }
    }

    typeEffect();
  }

  function handleJokeKeydown(event) {
    if (event.key === "Enter") {
      handleJokeSubmit();
    }
  }

  function createClouds() {
    const cloudCount = 20;
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
      flatShading: true,
      roughness: 0.0,
      opacity: 0.85,
      transparent: true,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      const x = (Math.random() - 0.5) * 800;
      const y = 50 + Math.random() * 50;
      const z = -100 + (Math.random() - 0.5) * 600;

      cloud.position.set(x, y, z);

      const scale = 8 + Math.random() * 8;
      cloud.scale.set(scale, scale * 0.6, scale);

      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffCount; j++) {
        const puff = new THREE.Mesh(geometry, material);
        puff.position.set(
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.5,
        );
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

      cloud.userData = {
        velocity: (0.2 + Math.random() * 1.0) * 0.1,
      };

      scene.add(cloud);
      clouds.push(cloud);
    }
  }

  function createBirds() {
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

    _lookAtPos.copy(bird.position).add(bird.userData.velocity);
    bird.lookAt(_lookAtPos);

    if (bird.userData.wings) {
      bird.userData.wings.rotation.z =
        Math.sin(time * 15 + bird.userData.wingPhase) * 0.5;
    }
  }

  function updateZombiePhysics(delta) {
    if (!zombie || zombie.userData.isDead || isZombieRising) return;

    // 1. Gravity
    zombieVelocity.y -= GRAVITY * delta;

    // 2. Chasing Logic (Velocity Setting)
    const distanceToPlayer = model.position.distanceTo(zombie.position);
    const CHASE_TRIGGER_DIST = 12.0;
    // Reduce stop distance to 1.0 (closer than hit range of 0.95-1.1) to ensure he can hit
    const ATTACK_RANGE = 0.9;
    const ZOMBIE_SPEED = 1.2;

    if (!isZombieChasing) {
      // Idle State Checks
      if (distanceToPlayer < CHASE_TRIGGER_DIST) {
        console.log(
          `[Zombie] Player detected! Distance: ${distanceToPlayer.toFixed(2)}. Switching to CHASE state.`,
        );
        isZombieChasing = true;
        // Switch animation
        if (zombieAction !== zombieWalkAction) {
          fadeToActionZombie(zombieWalkAction, 0.2);
        }
      } else {
        // Stop horizontal movement if idle
        zombieVelocity.x = 0;
        zombieVelocity.z = 0;
      }
    } else {
      // Chasing State Checks
      if (distanceToPlayer > CHASE_TRIGGER_DIST * 1.5) {
        // Give up if too far (optional, or keep chasing forever)
        // Let's keep chasing for now as per "chase player" instruction,
        // but maybe stop if waaaay far. For now, stick to user req: "follow player... like a zombie game AI"
      }

      // Move towards player
      if (distanceToPlayer > ATTACK_RANGE) {
        const direction = new THREE.Vector3().subVectors(
          model.position,
          zombie.position,
        );
        direction.y = 0;
        direction.normalize();

        // Smooth Rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          targetRotation,
        );
        zombie.quaternion.slerp(q, 5.0 * delta); // Slerp speed

        // Set Velocity (No momentum, constant speed)
        zombieVelocity.x = direction.x * ZOMBIE_SPEED;
        zombieVelocity.z = direction.z * ZOMBIE_SPEED;

        // Ensure walking anim
        if (zombieAction !== zombieWalkAction && !zombie.userData.isAttacking) {
          fadeToActionZombie(zombieWalkAction, 0.2);
        }
      } else {
        // Reached Player
        if (zombieVelocity.x !== 0 || zombieVelocity.z !== 0) {
          console.log(
            `[Zombie] Reached player (Distance: ${distanceToPlayer.toFixed(2)}). Stopping.`,
          );
        }
        zombieVelocity.x = 0;
        zombieVelocity.z = 0;

        // Switch to Idle
        if (zombieAction !== zombieIdleAction && !zombie.userData.isAttacking) {
          console.log("[Zombie] Transitioning to IDLE (Reached Player).");
          fadeToActionZombie(zombieIdleAction, 0.2);
        }

        // Trigger Attack if ready
        if (zombie.userData.attackCooldown <= 0) {
          console.log("[Zombie] Attack Cooldown ready. Attacking!");
          zombieAttack(model);
        }
      }
    }

    // 3. Apply Velocity to Collider
    const deltaPosition = zombieVelocity.clone().multiplyScalar(delta);
    zombieCollider.translate(deltaPosition);

    // 4. Terrain Collision Resolution
    zombieCollisions();

    // 5. Player Hard Collision (Stop on Contact)
    // Check overlap with player collider
    const r1 = zombieCollider.radius;
    const r2 = playerCollider.radius;
    const combinedRadius = r1 + r2;

    // 2D Distance check for movement blocking (Y handled by gravity/terrain)
    const dx = zombieCollider.start.x - playerCollider.start.x;
    const dz = zombieCollider.start.z - playerCollider.start.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < combinedRadius * combinedRadius) {
      const dist = Math.sqrt(distSq);
      const overlap = combinedRadius - dist;

      if (dist > 0.001) {
        // Normal pointing from Player TO Zombie (Push zombie back)
        const nx = dx / dist;
        const nz = dz / dist;

        // Hard Stop: Push zombie out of player exactly by overlap amount
        const pushBack = new THREE.Vector3(nx * overlap, 0, nz * overlap);
        zombieCollider.translate(pushBack);

        // Kill velocity towards player
        const vDotN = zombieVelocity.x * nx + zombieVelocity.z * nz;
        if (vDotN < 0) {
          // Normalize impact of collision on velocity
          zombieVelocity.x -= vDotN * nx;
          zombieVelocity.z -= vDotN * nz;
        }
      } else {
        // Rare case: Exact center overlap
        // Push back arbitrary amount in arbitrary direction (e.g. +X) to separate them
        const pushBack = new THREE.Vector3(1.0, 0, 0);
        zombieCollider.translate(pushBack);
      }

      // CRITICAL: Re-run terrain collision to ensure we didn't push into a wall/floor
      zombieCollisions();
    }

    // 6. Sync Mesh
    zombie.position.copy(zombieCollider.start);
    zombie.position.y -= 0.35; // Offset for collider center

    // Safety Fallback (Stronger check)
    if (zombie.position.y < -100) {
      if (!zombie.userData.isDead) {
        // Only respawn if alive-ish
        respawnZombie(zombie);
      }
    }
  }

  function zombieCollisions() {
    const result1 = worldOctree.capsuleIntersect(zombieCollider);
    const result2 = rockOctree.capsuleIntersect(zombieCollider);

    zombieOnFloor = false;

    if (result1) {
      zombieOnFloor = result1.normal.y > 0.35;
      if (!zombieOnFloor) {
        zombieVelocity.addScaledVector(
          result1.normal,
          -result1.normal.dot(zombieVelocity),
        );
      }
      zombieCollider.translate(result1.normal.multiplyScalar(result1.depth));
    }

    if (result2) {
      const rockFloor = result2.normal.y > 0.35;
      zombieOnFloor = zombieOnFloor || rockFloor;
      if (!rockFloor) {
        zombieVelocity.addScaledVector(
          result2.normal,
          -result2.normal.dot(zombieVelocity),
        );
      }
      zombieCollider.translate(result2.normal.multiplyScalar(result2.depth));
    }

    // Grounding: If on floor, zero out falling speed to prevent accumulation
    if (zombieOnFloor) {
      zombieVelocity.y = Math.max(0, zombieVelocity.y);
    }
  }

  function fadeToActionZombie(action, duration) {
    if (zombieAction === action) return;
    const prev = zombieAction;
    zombieAction = action;
    if (prev) prev.fadeOut(duration);
    zombieAction.reset().fadeIn(duration).play();
  }

  function animate() {
    if (isDestroyed) return;

    // Request next frame first
    animationId = requestAnimationFrame(animate);

    // Cap delta to prevent physics explosions during lag/loading
    // If delta is too high (e.g. tab backgrounded), clamp it to 0.1s (10/60 fps)
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 0.1);
    const time = clock.getElapsedTime();

    // Update Birds
    birds.forEach((bird) => {
      flock(bird, birds);
      updateBird(bird, time);
    });

    // Update Clouds
    clouds.forEach((cloud) => {
      cloud.position.x += cloud.userData.velocity;
      if (cloud.position.x > 300) {
        cloud.position.x = -300;
        cloud.position.z = (Math.random() - 0.5) * 600;
      }
    });

    if (mixer) mixer.update(delta);
    if (mikuMixer) mikuMixer.update(delta);
    if (clownMixer) clownMixer.update(delta);
    // Zombie mixer need to be updated always for idle animation?
    // User said: "animation etc ocnintue"
    if (zombieMixer) zombieMixer.update(delta);

    // --- PAUSABLE GAME LOGIC ---
    if (!isPaused && !showGameOverModal) {
      // Update Zombie Rising Animation
      if (isZombieRising && zombie) {
        // Move zombie upward smoothly
        const risingSpeed = 1.0; // Units per second
        zombie.position.y += risingSpeed * delta;

        // Clamp to final position (don't go above ground level)
        if (zombie.position.y >= zombieFinalY) {
          zombie.position.y = zombieFinalY;
        }

        // Spawn dirt particles continuously during rise
        // Spawn rate: ~30 particles per second for dramatic effect
        const particleSpawnChance = delta * 30;
        if (Math.random() < particleSpawnChance) {
          // Create dirt particle at zombie's current position
          const particlePos = zombie.position.clone();
          particlePos.y += 0.2; // Slightly above ground
          particlePos.x += (Math.random() - 0.5) * 0.5; // Random spread
          particlePos.z += (Math.random() - 0.5) * 0.5;

          createDust(particlePos);
        }
      }

      // Zombie AI Behavior (Physics & Logic)
      updateZombiePhysics(delta);

      // Cooldown Update
      if (zombie && zombie.userData.attackCooldown > 0) {
        zombie.userData.attackCooldown -= delta;
      }

      // Respawn Timer
      if (zombieRespawnTimer > 0) {
        zombieRespawnTimer -= delta;
        if (zombieRespawnTimer <= 0) {
          zombieRespawnTimer = 0;
          if (zombie) respawnZombie(zombie);
        }
      }

      // Player Immunity Blinking
      if (isPlayerImmune) {
        playerImmunityTimer -= delta;
        immunityBlinkTimer += delta;

        // Blink fast (every 0.1s)
        if (immunityBlinkTimer > 0.1) {
          model.visible = !model.visible;
          immunityBlinkTimer = 0;
        }

        if (playerImmunityTimer <= 0) {
          isPlayerImmune = false;
          model.visible = true; // Ensure visible at end
        }
      } else if (model) {
        model.visible = true;
      }

      // Update Power Cooldowns
      if (fireballCooldown > 0) {
        fireballCooldown = Math.max(0, fireballCooldown - delta);
      }
      if (thunderCooldown > 0) {
        thunderCooldown = Math.max(0, thunderCooldown - delta);
      }

      updateMovement(delta);
    } else {
      // Logic when PAUSED or GAME OVER
      // We might want to ensure things are in a safe state?
      // For now, simply skipping the updates freezes positions and logic.
    }
    // --- END PAUSABLE LOGIC ---

    // Miku faces player or camera

    // Miku faces player or camera
    if (sphere && model) {
      if (isTakingSelfie) {
        // Face the "camera" (which is in front of her)
        // Actually, if she takes a selfie, she should face the camera position.
        // We'll position the camera in front of her.
        // So she should look at the camera.
        // Or simply rotate 180 from player if player is behind?
        // The request says: "turn miku 180º So her back is p1.glb front"
        // This means she faces the SAME direction as the player (who is facing her back? No, player faces Miku).
        // If player faces Miku, and Miku turns 180, she shows her back to the player?
        // "So her back is p1.glb front" -> Player's front sees Miku's back?
        // "we will take a photo of by puttin a camera in miku front, pointing to p1.glb"
        // So Camera -> Miku (Front) -> Player (Front)
        // So Miku needs to face the Camera. Player needs to face Miku's back?
        // No, "Miku front, pointing to p1.glb".
        // If Camera points to P1, and Miku is in between...
        // Camera -> Miku -> Player.
        // So Miku faces Camera. Player faces Camera (over Miku's shoulder?).
        // Request: "turn miku 180º So her back is p1.glb front"
        // If Miku was facing player, turning 180 means she faces AWAY from player.
        // So Player sees Miku's back.
        // Camera is "in miku front". Miku's front is now facing AWAY from player.
        // So Camera is looking at Miku's Face and Player's Face (if player is behind her).
        // Yes, that's a selfie!

        // So Miku should look at the Camera position.
        // We'll calculate camera position in updateCamera and use it here?
        // Or just rotate her relative to player.

        // Let's just make her look AWAY from the player.
        const directionToPlayer = new THREE.Vector3().subVectors(
          model.position,
          sphere.position,
        );
        const targetPos = sphere.position.clone().sub(directionToPlayer); // Point away from player
        sphere.lookAt(targetPos);
      } else {
        // Face player (Y-axis only)
        // We construct a target at the same height as Miku to ensure no vertical tilt
        const target = model.position.clone();
        target.y = sphere.position.y;
        sphere.lookAt(target);
        // Correcting Miku's rotation: User requested "rotate her from her perspective a little bit to right"
        // to align face with player. Right = Clockwise (Negative Y).
        sphere.rotateY(-0.5);
      }
    }

    // Clown faces player
    if (clown && model) {
      // Create a target position at the same height as the clown to ensure only horizontal rotation
      const targetPos = model.position.clone();
      targetPos.y = clown.position.y;

      clown.lookAt(targetPos);
      clown.rotateY(-Math.PI / 5); // Invert rotation offset
    }

    // Animate Cartouches
    cubes.forEach((cartouche) => {
      if (cartouche.userData) {
        cartouche.position.y =
          cartouche.userData.initialY +
          Math.abs(
            Math.sin(
              time * cartouche.userData.floatSpeed +
                cartouche.userData.floatOffset,
            ) * 0.15,
          );
        // cartouche.rotation.y += delta * 0.5; // Removed spinning
      }
    });

    // Animate destination marker ripple
    if (markerRipple && markerRipple.userData.isAnimating) {
      markerRipple.userData.animationTime += delta;
      const t = markerRipple.userData.animationTime;

      if (t < 0.5) {
        // Animation duration: 0.5 seconds
        const progress = t / 0.5;
        const scale = 1 + progress * 0.8; // Scale from 1 to 1.8
        markerRipple.scale.set(scale, scale, 1);
        markerRipple.material.opacity = 1 - progress; // Fade out
      } else {
        // Reset animation
        markerRipple.userData.isAnimating = false;
        markerRipple.visible = false;
        markerRipple.scale.set(1, 1, 1);
        markerRipple.material.opacity = 1;
      }
    }

    // Animate Projectiles and Effects
    // Should projectiles freeze? Usually yes.
    if (!isPaused && !showGameOverModal) {
      updateVFX(delta);
    }

    // Animate Plasma Shield

    // (Cooldowns moved inside main pause block above)

    // (updateMovement moved inside main pause block above)

    updateCamera(); // Camera should likely stay active for look-around if possible?
    // Actually updateCamera depends on model position, which is frozen.
    // So updateCamera is safe to run (it will just keep camera at same spot).
    // EXCEPT if it interpolates.
    // Let's keep camera active so user can look around if we implemented look controls.
    // Our updateCamera is mostly follow-cam. If model doesn't move, cam settles.

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    // Update HUD
    if (model) {
      playerPosition = {
        x: parseFloat(model.position.x.toFixed(2)),
        y: parseFloat(model.position.y.toFixed(2)),
        z: parseFloat(model.position.z.toFixed(2)),
      };
    }

    // Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life -= delta;

      // Move up
      ft.worldPos.add(ft.velocity.clone().multiplyScalar(delta));

      // Project to Screen
      const screenPos = ft.worldPos.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

      ft.element.style.left = `${x}px`;
      ft.element.style.top = `${y}px`;
      ft.element.style.opacity = ft.life; // Fade out

      if (ft.life <= 0) {
        if (ft.element.parentNode)
          ft.element.parentNode.removeChild(ft.element);
        floatingTexts.splice(i, 1);
      }
    }
  }

  function performAttack(targetPoint) {
    if (!model) return;

    // Stop any ongoing movement to prevent getting stuck in walking animation
    isMoving = false;
    targetPosition = null;
    targetObject = null;
    hideDestinationMarker();

    // Face target
    const direction = new THREE.Vector3()
      .subVectors(targetPoint, model.position)
      .normalize();
    const targetRotation = Math.atan2(direction.x, direction.z);
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
    model.quaternion.copy(q);

    if (attackMode === "fireball") {
      // Check cooldown
      if (fireballCooldown > 0) return;

      // Set cooldown
      fireballCooldown = FIREBALL_COOLDOWN;

      playOneShotAnimation("Hit");
      // Reduced delay to 100ms
      setTimeout(() => {
        // Calculate start position: Right hand side (Inverted logic as requested)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
          model.quaternion,
        );
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
          model.quaternion,
        );
        const startPos = model.position
          .clone()
          .add(new THREE.Vector3(0, 0.9, 0)) // Height
          .add(right.multiplyScalar(-0.4)) // Move to the "true" right (inverted from previous)
          .add(forward.multiplyScalar(0.1)); // Forward offset (moved back from 0.5)

        createFireball(startPos, targetPoint);
        playFireballThrow();
      }, 100);
    } else if (attackMode === "thunder") {
      // Check cooldown
      if (thunderCooldown > 0) return;

      // Set cooldown
      thunderCooldown = THUNDER_COOLDOWN;

      playOneShotAnimation("Curse");
      // Reduced delay to 200ms
      setTimeout(() => {
        createThunder(targetPoint);
        playThunderSound();
      }, 200);
    }
  }

  function playOneShotAnimation(name) {
    if (actions[name]) {
      // Stop previous action immediately instead of fading out
      if (activeAction && activeAction !== actions[name]) {
        activeAction.stop();
      }

      const action = actions[name];
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1.0; // Ensure normal speed

      // Set flag to prevent interruption
      isPlayingOneShotAnimation = true;

      // Debug: Log animation info
      console.log(
        `Playing ${name} animation - Duration: ${action.getClip().duration}s`,
      );

      action.play();
      activeAction = action;

      mixer.addEventListener("finished", function restoreIdle(e) {
        if (e.action === action) {
          mixer.removeEventListener("finished", restoreIdle);
          console.log(`${name} animation finished`);
          // Clear flag before transitioning back to Idle
          isPlayingOneShotAnimation = false;
          // Wait a tiny bit before fading back to ensure full pose is seen
          setTimeout(() => {
            fadeToAction("Idle", 0.3);
          }, 100);
        }
      });
    } else {
      console.warn(`Animation "${name}" not found in actions`);
    }
  }

  function createFireball(start, end) {
    // Reuse pre-created geometry and material
    const fireball = new THREE.Mesh(fireballGeometry, fireballMaterial);
    fireball.position.copy(start);
    fireball.scale.set(0.3, 0.3, 0.3); // Make it smaller
    scene.add(fireball);

    // Add light to fireball
    const light = new THREE.PointLight(0xffaa00, 2, 5);
    fireball.add(light);

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const speed = 8; // Slower speed (was 20)

    projectiles.push({
      mesh: fireball,
      direction: direction,
      speed: speed,
      target: end,
      type: "fireball",
    });
  }

  function createThunder(target) {
    const startY = 20;
    const start = target.clone().setY(startY);
    const end = target.clone();

    const points = [];
    let current = start.clone();
    const segments = 10;
    const stepY = (startY - end.y) / segments;

    points.push(current.clone());

    for (let i = 0; i < segments; i++) {
      current.y -= stepY;
      if (i < segments - 1) {
        // Add random jagged offset
        current.x += (Math.random() - 0.5) * 2.0;
        current.z += (Math.random() - 0.5) * 2.0;
      } else {
        // Last point is exactly target
        current.copy(end);
      }
      points.push(current.clone());
    }

    // Create the geometry from points
    // Using a thick line (TubeGeometry) for the core
    const path = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(path, segments, 0.08, 8, false);
    const thunderCore = new THREE.Mesh(geometry, thunderMaterial);
    scene.add(thunderCore);

    // Outer glow (larger tube)
    const glowGeometry = new THREE.TubeGeometry(path, segments, 0.2, 8, false);
    const thunderGlow = new THREE.Mesh(glowGeometry, thunderGlowMaterial);
    scene.add(thunderGlow);

    // Flash light
    const light = new THREE.PointLight(0x00ffff, 5, 20);
    light.position.copy(target).add(new THREE.Vector3(0, 2, 0));
    scene.add(light);

    // Add to effects list to handle removal
    effects.push({
      meshes: [thunderCore, thunderGlow],
      light: light,
      life: 1.0, // Longer duration for lightning
      type: "thunder",
    });

    // 5. Area Damage
    if (zombie && !zombie.userData.isDead) {
      const dist = zombie.position.distanceTo(target);

      // ... damage logic ... (existing)
      // THIS CHUNK IS JUST CONTEXT TO FIND WHERE TO ADD ZOMBIE AI LOOP UPDATE
      // Actually, let's insert the Zombie AI logic in the main 'animate' function
      // searching for 'if (zombie) {' in animate seems safer.
    }

    // 5. Area Damage
    if (zombie && !zombie.userData.isDead) {
      const dist = zombie.position.distanceTo(target);

      let damage = 0;
      // "in the very place of thunder the damage will be 10"
      // "and gradually as the distance of the thunder area, it goes down to 5, and 2.5"

      // Let's define radii
      if (dist < 0.5) {
        damage = 10;
      } else if (dist < 1.0) {
        damage = 5;
      } else if (dist < 1.5) {
        damage = 2.5;
      }

      if (damage > 0) {
        // Delay damage slightly to match visual strike
        setTimeout(() => {
          takeDamage(zombie, damage, "thunder");
        }, 100);
      }
    }
  }

  function createDust(position) {
    if (!model) return;
    // Simple white cube for low poly style
    const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12); // Small cubes
    const material = new THREE.MeshBasicMaterial({
      color: 0xbc9e4a, // Darkened dust color
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(geometry, material);

    // Spawn at feet with spread
    particle.position
      .copy(position)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.0,
          0.1,
          (Math.random() - 0.5) * 1.0,
        ),
      );

    // Random rotation
    particle.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    scene.add(particle);

    dustParticles.push({
      mesh: particle,
      life: 0.5 + Math.random() * 0.5, // 0.5-1.0s life
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2,
      ),
      rotationSpeed: new THREE.Vector3(
        Math.random() * 5,
        Math.random() * 5,
        Math.random() * 5,
      ),
    });
  }

  function createParticle(position, color) {
    // Reuse dust logic but with custom colors
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
    });
    const particle = new THREE.Mesh(geometry, material);

    particle.position.copy(position);

    // Random rotation
    particle.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    scene.add(particle);

    // Higher speed for explosion
    const speed = 5 + Math.random() * 5;
    const velocity = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar(speed);

    dustParticles.push({
      mesh: particle,
      life: 0.3 + Math.random() * 0.3, // Short life
      velocity: velocity,
      rotationSpeed: new THREE.Vector3(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10,
      ),
    });
  }

  function createExplosion(position) {
    // 1. Particle Burst
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      createParticle(position, 0xffaa00); // Orange particles
    }

    // 2. Flash Light
    const light = new THREE.PointLight(0xffaa00, 5, 10);
    light.position.copy(position);
    scene.add(light);

    // Add to effects to fade out
    effects.push({
      light: light,
      life: 0.2, // Very short flash
      type: "explosion_flash",
    });
  }

  function updateVFX(delta) {
    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.mesh.position.add(p.direction.clone().multiplyScalar(p.speed * delta));

      // Rotate fireball
      if (p.type === "fireball") {
        p.mesh.rotation.x += delta * 10;
        p.mesh.rotation.z += delta * 10;
      }

      // Check Collision with Zombie
      if (zombie && !zombie.userData.isDead && p.type === "fireball") {
        // Simple distance check for now
        // Zombie center is roughly position + height/2
        const zombieCenter = zombie.position
          .clone()
          .add(new THREE.Vector3(0, 1.0, 0));
        if (p.mesh.position.distanceTo(zombieCenter) < 1.0) {
          takeDamage(zombie, 5, "fireball");
          createExplosion(p.mesh.position);
          playFireballHit();
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          continue; // Next projectile
        }
      }

      // Check if reached target (or close enough)
      if (p.mesh.position.distanceTo(p.target) < 1.0 || p.mesh.position.y < 0) {
        createExplosion(p.mesh.position);
        playFireballHit();
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }

    // Update Effects
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.life -= delta;
      if (effect.life <= 0) {
        if (effect.meshes) {
          effect.meshes.forEach((m) => {
            scene.remove(m);
            if (m.geometry) m.geometry.dispose();
          });
        }
        scene.remove(effect.light);
        effects.splice(i, 1);
      }
    }

    // Update Dust
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.life -= delta * 2.0; // Fade out speed

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.mesh.scale.multiplyScalar(0.9); // Shrink
      p.mesh.material.opacity = p.life;
      p.mesh.rotation.x += p.rotationSpeed.x * delta;
      p.mesh.rotation.y += p.rotationSpeed.y * delta;

      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        dustParticles.splice(i, 1);
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= delta;
      if (e.life <= 0) {
        if (e.meshes) {
          e.meshes.forEach((m) => {
            m.geometry.dispose();
            m.material.dispose();
            scene.remove(m);
          });
        } else if (e.mesh) {
          // Legacy support if needed, or just cleanup
          scene.remove(e.mesh);
        }

        if (e.light) scene.remove(e.light);
        effects.splice(i, 1);
      } else {
        // Fade out
        if (e.meshes) {
          e.meshes.forEach((m) => {
            if (m.material.transparent) {
              m.material.opacity = e.life / 0.2;
            }
          });
        }
      }
    }
  }

  function showDestinationMarker(position) {
    if (!destinationMarker || !markerRipple) return;

    // Position permanent marker
    destinationMarker.position.x = position.x;
    destinationMarker.position.z = position.z;
    destinationMarker.visible = true;

    // Start ripple animation
    markerRipple.position.x = position.x;
    markerRipple.position.z = position.z;
    markerRipple.visible = true;
    markerRipple.scale.set(1, 1, 1);
    markerRipple.material.opacity = 1;
    markerRipple.userData.animationTime = 0;
    markerRipple.userData.isAnimating = true;
  }

  function hideDestinationMarker() {
    if (destinationMarker) destinationMarker.visible = false;
    if (markerRipple) {
      markerRipple.visible = false;
      markerRipple.userData.isAnimating = false;
    }
  }

  function createTerrainMaterial() {
    // Generate Biome Map (FBM Noise)
    const size = 512;
    const data = new Uint8Array(4 * size * size);
    const gridScale = 15.0; // Higher scale for detailed outer map

    // Value Noise 2D
    function noise(x, y) {
      const X = Math.floor(x);
      const Y = Math.floor(y);
      const fx = x - X;
      const fy = y - Y;

      function hash(n) {
        return Math.abs(Math.sin(n * 12.9898 + 78.233) * 43758.5453123) % 1;
      }
      function val(x, y) {
        const n = x + y * 57;
        return hash(n);
      }

      const v00 = val(X, Y);
      const v10 = val(X + 1, Y);
      const v01 = val(X, Y + 1);
      const v11 = val(X + 1, Y + 1);

      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);

      return (
        v00 * (1 - ux) * (1 - uy) +
        v10 * ux * (1 - uy) +
        v01 * (1 - ux) * uy +
        v11 * ux * uy
      );
    }

    // Fractal Brownian Motion
    function fbm(x, y, octaves) {
      let val = 0;
      let amp = 0.5;
      let freq = 1;
      for (let i = 0; i < octaves; i++) {
        val += noise(x * freq, y * freq) * amp;
        freq *= 2;
        amp *= 0.5;
      }
      return val;
    }

    function smoothstep(min, max, value) {
      var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }

    for (let i = 0; i < size * size; i++) {
      // UV Coordinates (0 to 1)
      const u = (i % size) / size;
      const v = Math.floor(i / size) / size;

      // Noise Coordinates
      const x = u * gridScale;
      const y = v * gridScale;

      // Distance from center (0.5, 0.5)
      const dx = u - 0.5;
      const dy = v - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Procedural Noise for Outer World
      let nProcedural = fbm(x, y, 4);

      // Zone Noise (for organic boundaries)
      let nZone = fbm(x * 0.5, y * 0.5, 2);

      // Perturb distance
      const perturbedDist = dist + (nZone - 0.5) * 0.015;

      // --- ZONING LOGIC ---
      // Center (Grass): Radius < 0.02 (approx 40 units)
      // Ring (Dirt): Radius 0.02 - 0.05 (approx 40-100 units)
      // Outer (Procedural): Radius > 0.05

      let dirtWeight = 0;
      let stoneWeight = 0;

      if (perturbedDist < 0.02) {
        // CENTER: Pure Grass
        dirtWeight = 0;
        stoneWeight = 0;
      } else if (perturbedDist < 0.05) {
        // RING: Pure Dirt
        dirtWeight = 1.0;
        stoneWeight = 0;
      } else {
        // OUTER: Procedural Generation
        // Map noise to biomes:
        // 0.0 - 0.4: Grass
        // 0.4 - 0.7: Dirt
        // 0.7 - 1.0: Stone

        if (nProcedural < 0.4) {
          dirtWeight = 0;
          stoneWeight = 0;
        } else if (nProcedural < 0.7) {
          dirtWeight = 1.0;
          stoneWeight = 0;
        } else {
          dirtWeight = 0;
          stoneWeight = 1.0;
        }
      }

      // Write to texture
      data[i * 4] = Math.floor(dirtWeight * 255); // R: Dirt
      data[i * 4 + 1] = Math.floor(stoneWeight * 255); // G: Stone
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }

    const biomeMap = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    biomeMap.wrapS = THREE.RepeatWrapping;
    biomeMap.wrapT = THREE.RepeatWrapping;
    biomeMap.minFilter = THREE.LinearFilter;
    biomeMap.magFilter = THREE.LinearFilter;
    biomeMap.needsUpdate = true;

    // Load textures
    const textureLoader = new THREE.TextureLoader();

    // Get max anisotropy for smoother textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Grass texture
    const grassTexture = textureLoader.load("/game/textures/grass-flower.jpg");
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(400, 400);
    grassTexture.anisotropy = maxAnisotropy; // Smooth filtering
    grassTexture.minFilter = THREE.LinearMipmapLinearFilter; // Better mipmapping
    grassTexture.magFilter = THREE.LinearFilter;

    // Dirt texture
    const dirtTexture = textureLoader.load("/game/textures/dirt.jpg");
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(400, 400);
    dirtTexture.anisotropy = maxAnisotropy;
    dirtTexture.minFilter = THREE.LinearMipmapLinearFilter;
    dirtTexture.magFilter = THREE.LinearFilter;

    // Stone texture (using dark-grass as stone)
    const stoneTexture = textureLoader.load("/game/textures/dark-grass.jpg");
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.repeat.set(400, 400);
    stoneTexture.anisotropy = maxAnisotropy;
    stoneTexture.minFilter = THREE.LinearMipmapLinearFilter;
    stoneTexture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshStandardMaterial({
      roughness: 1,
      metalness: 0,
      map: biomeMap,
    });

    material.onBeforeCompile = (shader) => {
      // Textures instead of solid colors
      shader.uniforms.uTextureGrass = { value: grassTexture };
      shader.uniforms.uTextureDirt = { value: dirtTexture };
      shader.uniforms.uTextureStone = { value: stoneTexture };
      shader.uniforms.tBiome = { value: biomeMap };

      shader.fragmentShader =
        `
        uniform sampler2D uTextureGrass;
        uniform sampler2D uTextureDirt;
        uniform sampler2D uTextureStone;
        uniform sampler2D tBiome;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        // Sample Biome Map
        vec4 biome = texture2D(tBiome, vMapUv);
        
        // Sample textures with tiled UVs
        vec2 tiledUV = vMapUv * 400.0; // Match the repeat value
        vec3 grassColor = texture2D(uTextureGrass, tiledUV).rgb;
        vec3 dirtColor = texture2D(uTextureDirt, tiledUV).rgb;
        vec3 stoneColor = texture2D(uTextureStone, tiledUV).rgb;
        
        // Base Color (Grass)
        vec3 finalColor = grassColor;
        
        // Mix Dirt
        // Red channel contains dirt weight
        float dirtFactor = smoothstep(0.4, 0.6, biome.r);
        finalColor = mix(finalColor, dirtColor, dirtFactor);

        // Mix Stone
        // Green channel contains stone weight
        float stoneFactor = smoothstep(0.4, 0.6, biome.g);
        finalColor = mix(finalColor, stoneColor, stoneFactor);

        // Apply to diffuseColor
        diffuseColor = vec4(finalColor, opacity);
        `,
      );
    };

    return material;
  }
</script>

<main class="fullscreen">
  {#if isLoading}
    <Spinner />
  {/if}

  <!-- Contact Modal -->
  <ContactModal />

  <canvas
    bind:this={canvas}
    on:click={handleCanvasClick}
    class:crosshair={attackMode !== null}
  ></canvas>

  {#if showFlash}
    <div class="flash-overlay"></div>
  {/if}

  <!-- Audio Control with Volume Slider -->
  <div
    class="fixed bottom-4 right-4 z-50 flex items-center gap-3"
    role="group"
    aria-label="Audio controls"
    on:mouseenter={() => (showVolumeSlider = true)}
    on:mouseleave={() => (showVolumeSlider = false)}
  >
    <!-- Volume Slider (Legacy - Music Only) -->
    {#if showVolumeSlider}
      <div
        class="backdrop-blur-md bg-gradient-to-b from-white/30 to-white/10 border border-white/40 rounded-full px-4 py-2 shadow-lg transition-all duration-300 ease-in-out"
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={volMaster}
          on:input={updateVolume}
          aria-label="Master Volume"
          style="--value: {volMaster * 100}%"
          dir="rtl"
          class="volume-slider w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    {/if}

    <!-- Mute/Unmute Button -->
    <button
      class="backdrop-blur-md bg-gradient-to-b from-white/30 to-white/10 border border-white/40 hover:bg-white/20 text-white font-bold p-3 rounded-full shadow-lg transition-all duration-200"
      on:click={toggleMusic}
      aria-label={isMusicPlaying ? "Mute audio" : "Unmute audio"}
    >
      <i
        class="fas {isMusicPlaying
          ? 'fa-volume-up'
          : 'fa-volume-mute'} text-xl drop-shadow-md"
      ></i>
    </button>
  </div>

  <!-- Pause Button -->
  <button
    class="fixed top-24 right-4 z-50 p-3 rounded-full glass-panel text-white hover:bg-white/20 transition-all active:scale-95"
    on:click={togglePause}
    aria-label={isPaused ? "Resume Game" : "Pause Game"}
  >
    <i
      class="fas {isPaused
        ? 'fa-play'
        : 'fa-pause'} text-xl w-6 h-6 flex items-center justify-center"
    ></i>
  </button>

  {#if isPaused}
    <div
      class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
    >
      <div
        class="glass-panel px-8 py-4 rounded-xl border border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.5)] transform scale-100 animate-pulse"
      >
        <h2
          class="text-4xl font-black text-white tracking-[0.2em] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
        >
          PAUSED
        </h2>
      </div>
    </div>
  {/if}

  <!-- Power Cooldown Indicators -->
  <div class="fixed bottom-20 left-4 z-50 flex flex-col gap-3">
    <!-- Fireball Power (1) -->
    <button
      class="relative w-16 h-16 rounded-2xl backdrop-blur-md bg-gradient-to-b from-white/30 to-white/10 border border-white/40 shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      class:ring-2={attackMode === "fireball"}
      class:ring-orange-400={attackMode === "fireball"}
      on:click={toggleFireballMode}
      aria-label="Toggle Fireball (Press 1)"
    >
      <!-- Icon Wrapper -->
      <div class="relative w-full h-full flex items-center justify-center">
        <!-- Background Ghost Icon -->
        <i class="fa-solid fa-fire text-white/30 text-3xl absolute"></i>

        <!-- Foreground Filled Icon (Clipped) -->
        <div
          class="absolute bottom-0 left-0 right-0 overflow-hidden flex items-end justify-center pointer-events-none"
          style="height: {(1 - fireballCooldown / FIREBALL_COOLDOWN) *
            100}%; transition: height 0.1s linear;"
        >
          <!-- Inner Container to keep icon centered relative to button, not clipper -->
          <div class="w-16 h-16 flex items-center justify-center">
            <i
              class="fa-solid fa-fire text-red-500 text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            ></i>
          </div>
        </div>
      </div>
    </button>

    <!-- Thunder Power (2) -->
    <button
      class="relative w-16 h-16 rounded-2xl backdrop-blur-md bg-gradient-to-b from-white/30 to-white/10 border border-white/40 shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      class:ring-2={attackMode === "thunder"}
      class:ring-cyan-400={attackMode === "thunder"}
      on:click={toggleThunderMode}
      aria-label="Toggle Thunder (Press 2)"
    >
      <!-- Icon Wrapper -->
      <div class="relative w-full h-full flex items-center justify-center">
        <!-- Background Ghost Icon -->
        <i class="fa-solid fa-cloud-bolt text-white/30 text-3xl absolute"></i>

        <!-- Foreground Filled Icon (Clipped) -->
        <div
          class="absolute bottom-0 left-0 right-0 overflow-hidden flex items-end justify-center pointer-events-none"
          style="height: {(1 - thunderCooldown / THUNDER_COOLDOWN) *
            100}%; transition: height 0.1s linear;"
        >
          <!-- Inner Container -->
          <div class="w-16 h-16 flex items-center justify-center">
            <i
              class="fa-solid fa-cloud-bolt text-cyan-400 text-3xl drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            ></i>
          </div>
        </div>
      </div>
    </button>
  </div>

  <!-- Health HUD -->
  <div
    class="fixed top-24 left-4 z-50 flex items-center gap-3 glass-panel p-3 rounded-2xl"
  >
    <div class="relative w-10 h-10 flex items-center justify-center">
      <i
        class="fa-solid fa-heart text-red-500 text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
      ></i>
    </div>
    <div class="flex flex-col">
      <span class="text-xs text-white/70 font-bold uppercase tracking-wider"
        >Health</span
      >
      <span class="text-xl text-white font-black leading-none"
        >{playerHp} / {playerMaxHp}</span
      >
    </div>
  </div>

  <!-- Zombie Respawn HUD -->
  {#if zombieRespawnTimer > 0}
    <div
      class="fixed top-24 left-40 z-50 flex items-center gap-3 glass-panel p-3 rounded-2xl animate-pulse"
      style="border-color: rgba(255, 68, 68, 0.5);"
    >
      <div class="relative w-10 h-10 flex items-center justify-center">
        <i
          class="fa-solid fa-skull text-red-500 text-2xl drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]"
        ></i>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-white/70 font-bold uppercase tracking-wider"
          >Respawn In</span
        >
        <span class="text-xl text-white font-black leading-none"
          >{Math.ceil(zombieRespawnTimer)}s</span
        >
      </div>
    </div>
  {/if}

  {#if showGameOverModal}
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div
        class="glass-panel p-8 rounded-3xl text-center flex flex-col items-center gap-6 max-w-sm w-full border border-white/20 shadow-[0_0_50px_rgba(255,0,0,0.3)]"
      >
        <h2
          class="text-4xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        >
          GAME OVER
        </h2>
        <p class="text-white/70">The zombie got you!</p>

        <button
          class="px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 rounded-xl text-white font-bold text-lg shadow-lg hover:scale-105 active:scale-95 transition-all w-full"
          on:click={resetGame}
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  {/if}

  {#if showModal && currentProject}
    <div
      class="modal-backdrop"
      on:click={closeModal}
      on:keydown={(e) => e.key === "Escape" && closeModal()}
      role="button"
      tabindex="-1"
    >
      <div
        class="portfolio-modal"
        on:click|stopPropagation
        on:keydown|stopPropagation
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">{currentProject.name}</h2>
            <p class="modal-subtitle">{currentProject.year}</p>
          </div>
          <button class="close-button" on:click={closeModal} aria-label="Close">
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="modal-body">
          <!-- Image Carousel -->
          <div class="carousel-section">
            <div class="carousel-container">
              <img
                src={currentProject.images[currentImageIndex]}
                alt="{currentProject.name} screenshot {currentImageIndex + 1}"
                class="carousel-image"
              />

              <!-- Navigation Buttons -->
              {#if currentProject.images.length > 1}
                <button
                  class="carousel-btn prev-btn"
                  on:click={prevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  class="carousel-btn next-btn"
                  on:click={nextImage}
                  aria-label="Next image"
                >
                  ›
                </button>
              {/if}
            </div>

            <!-- Thumbnail Indicators -->
            {#if currentProject.images.length > 1}
              <div class="carousel-indicators">
                {#each currentProject.images as _, index}
                  <button
                    class="indicator"
                    class:active={index === currentImageIndex}
                    on:click={() => goToImage(index)}
                    aria-label="Go to image {index + 1}"
                  ></button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Description -->
          <div class="description-section">
            <h3 class="section-title">About</h3>
            <p class="short-description">{currentProject.description}</p>
            <p class="long-description">{currentProject.longDescription}</p>
          </div>

          <!-- Technologies -->
          {#if currentProject.technologies && currentProject.technologies.length > 0}
            <div class="tech-section">
              <h3 class="section-title">Technologies</h3>
              <div class="tech-tags">
                {#each currentProject.technologies as tech}
                  <span class="tech-tag">{tech}</span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Platform Links -->
          {#if currentProject.links && currentProject.links.length > 0}
            <div class="action-buttons">
              {#each currentProject.links as link}
                {#if link.platform === "demo"}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn demo-btn"
                  >
                    <i class="fas fa-rocket"></i>
                    Live Demo
                  </a>
                {:else if link.platform === "github"}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn github-btn"
                  >
                    <i class="fab fa-github"></i>
                    GitHub
                  </a>
                {:else if link.platform === "itch"}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn itch-btn"
                  >
                    <i class="fas fa-gamepad"></i>
                    Itch.io
                  </a>
                {:else if link.platform === "steam"}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn steam-btn"
                  >
                    <i class="fab fa-steam"></i>
                    Steam
                  </a>
                {:else if link.platform === "epic"}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="action-btn epic-btn"
                  >
                    <i class="fas fa-store"></i>
                    Epic Games
                  </a>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Help Modal -->
  {#if showHelpModal}
    <div
      class="modal-backdrop"
      on:click={closeHelpModal}
      on:keydown={(e) => e.key === "Escape" && closeHelpModal()}
      role="button"
      tabindex="-1"
    >
      <div
        class="portfolio-modal help-modal"
        on:click|stopPropagation
        on:keydown|stopPropagation
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Bem Vindo!</h2>
            <p class="modal-subtitle">Controles e Informações</p>
          </div>
          <button
            class="close-button"
            on:click={closeHelpModal}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="modal-body help-content">
          <div class="help-section">
            <h3><i class="fas fa-gamepad"></i> Controles de Movimento</h3>
            <ul>
              <li><strong>W, A, S, D</strong> - Mover personagem</li>
              <li><strong>Clique no chão</strong> - Andar para o local</li>
              <li><strong>Espaço</strong> - Pular</li>
              <li><strong>Shift</strong> - Correr</li>
            </ul>
          </div>

          <div class="help-section">
            <h3><i class="fas fa-magic"></i> Poderes</h3>
            <ul>
              <li>
                <strong>1</strong> - Modo Fireball (Clique no chão para atacar)
              </li>
              <li>
                <strong>2</strong> - Modo Thunder (Clique no chão para atacar)
              </li>
              <li><strong>ESC</strong> - Cancelar modo de ataque</li>
            </ul>
          </div>

          <div class="help-section">
            <h3><i class="fas fa-hand-pointer"></i> Interações</h3>
            <ul>
              <li>
                <strong>Clique nos Cartuchos</strong> - Ver projetos do portfólio
              </li>
              <li>
                <strong>Clique na Miku</strong> - Conversar e tirar selfie
              </li>
              <li><strong>Clique no Paiaço</strong> - Contar piadas</li>
              <li><strong>E ou Enter</strong> - Interagir quando próximo</li>
            </ul>
          </div>

          <div class="help-section">
            <h3><i class="fas fa-volume-up"></i> Áudio</h3>
            <ul>
              <li>
                <strong>Ícone de música</strong> - Controlar música de fundo
              </li>
              <li><strong>Slider de volume</strong> - Ajustar volume</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if showDialogue}
    <div class="dialogue-container">
      <div class="dialogue-box">
        <div class="dialogue-text">
          <p class="speaker-name">
            {currentNPC === "miku" ? "Miku Brasileira" : "Clown"}
          </p>
          <p class="dialogue-content">
            {displayedText}
          </p>
        </div>
        {#if showButtons}
          <div class="dialogue-buttons">
            {#if currentNPC === "miku"}
              <button class="dialogue-btn yes-btn" on:click={handleYes}>
                <span>✓</span> Claro
              </button>
              <button class="dialogue-btn no-btn" on:click={handleNo}>
                <span>✗</span> Negativo
              </button>
            {:else if currentNPC === "clown"}
              <button class="dialogue-btn close-btn" on:click={endDialogue}>
                <span>✓</span> Fechar
              </button>
            {/if}
          </div>
        {/if}
        {#if showTextInput}
          <div class="joke-input-container">
            <input
              type="text"
              class="joke-input"
              placeholder="Type your joke here..."
              bind:value={playerJoke}
              on:keydown={handleJokeKeydown}
            />
            <button class="send-btn" on:click={handleJokeSubmit}>
              <span>➤</span> Contar
            </button>
            <button class="dialogue-btn no-btn" on:click={handleNo}>
              <span>✗</span> Não
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Position Capture HUD -->
  {#if showHud}
    <div class="position-hud">
      <div class="hud-header">
        <h3>📍 Position Capture</h3>
        <button class="hud-toggle" on:click={() => (showHud = false)}>✕</button>
      </div>
      <div class="hud-coords">
        <div class="coord">
          <span class="label">X:</span>
          <span class="value">{playerPosition.x}</span>
        </div>
        <div class="coord">
          <span class="label">Y:</span>
          <span class="value">{playerPosition.y}</span>
        </div>
        <div class="coord">
          <span class="label">Z:</span>
          <span class="value">{playerPosition.z}</span>
        </div>
      </div>
      <button class="hud-copy-btn" on:click={copyPosition}>
        📋 Copy Code
      </button>
    </div>
  {/if}

  <!-- Audio Mixer Tool -->
  {#if showHud && showAudioMixer}
    <div class="position-hud" style="top: 350px;">
      <div class="hud-header">
        <h3>🔊 Audio Mixer</h3>
        <button class="hud-toggle" on:click={() => (showAudioMixer = false)}
          >✕</button
        >
      </div>

      <div
        class="hud-coords"
        style="gap: 0.8rem; max-height: 400px; overflow-y: auto;"
      >
        <!-- Music -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Music</span>
            <span class="value">{Math.round(volBgMusic * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volBgMusic}
            on:input={(e) => updateChannelVolume("music", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Type (Miku) -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Voice (Type)</span>
            <span class="value">{Math.round(volType * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volType}
            on:input={(e) => updateChannelVolume("type", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Steps -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Steps</span>
            <span class="value">{Math.round(volStep * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volStep}
            on:input={(e) => updateChannelVolume("step", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Jump -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Jump</span>
            <span class="value">{Math.round(volJump * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volJump}
            on:input={(e) => updateChannelVolume("jump", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- OK (Interaction) -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Interact (OK)</span>
            <span class="value">{Math.round(volOk * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volOk}
            on:input={(e) => updateChannelVolume("ok", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Bye -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Bye</span>
            <span class="value">{Math.round(volBye * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volBye}
            on:input={(e) => updateChannelVolume("bye", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Shutter -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Camera</span>
            <span class="value">{Math.round(volShutter * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volShutter}
            on:input={(e) => updateChannelVolume("shutter", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- Zombie -->
        <div class="coord" style="flex-direction: column; gap: 0.2rem;">
          <div style="display: flex; justify-content: space-between;">
            <span class="label">Zombie</span>
            <span class="value">{Math.round(volZombie * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volZombie}
            on:input={(e) => updateChannelVolume("zombie", e.target.value)}
            class="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <button
        class="hud-copy-btn hud-copy-audio-btn"
        on:click={copyAudioDefaults}
      >
        📋 Copy Defaults
      </button>
    </div>
  {/if}
</main>

<style>
  .fullscreen {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: #87ceeb;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  canvas.crosshair {
    cursor: crosshair;
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .ui-overlay {
    position: absolute;
    bottom: 2rem;
    left: 0;
    width: 100%;
    pointer-events: none;
    display: flex;
    justify-content: center;
    z-index: 10;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
  }

  /* Portfolio Modal Styles */
  .portfolio-modal {
    background: linear-gradient(
      135deg,
      rgba(20, 20, 40, 0.98),
      rgba(30, 30, 60, 0.98)
    );
    border: 2px solid rgba(100, 150, 255, 0.3);
    border-radius: 1.5rem;
    max-width: 90%;
    width: 900px;
    height: 85vh;
    margin-top: 2rem;
    margin-bottom: 2rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 30px rgba(100, 150, 255, 0.2);
    animation: scaleIn 0.3s ease-out;
    font-family: "Press Start 2P", cursive;
  }

  .portfolio-modal::-webkit-scrollbar {
    width: 8px;
  }

  .portfolio-modal::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .portfolio-modal::-webkit-scrollbar-thumb {
    background: rgba(100, 150, 255, 0.5);
    border-radius: 4px;
  }

  .portfolio-modal::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 150, 255, 0.7);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid rgba(100, 150, 255, 0.2);
    background: linear-gradient(
      135deg,
      rgba(40, 40, 80, 0.5),
      rgba(20, 20, 40, 0.5)
    );
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 1.2rem;
    color: #6fa3ff;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 0 10px rgba(111, 163, 255, 0.5);
  }

  .modal-subtitle {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  .close-button {
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid rgba(239, 68, 68, 0.5);
    color: #ef4444;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
  }

  .close-button:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: #ef4444;
    transform: scale(1.1);
  }

  .modal-body {
    padding: 1.5rem;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Carousel Styles */
  .carousel-section {
    flex-shrink: 0;
    margin-bottom: 0;
  }

  .carousel-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 35vh;
    border-radius: 0.75rem;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(100, 150, 255, 0.2);
  }

  .carousel-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease;
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(100, 150, 255, 0.5);
    color: white;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    font-size: 2rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    backdrop-filter: blur(4px);
  }

  .carousel-btn:hover {
    background: rgba(100, 150, 255, 0.3);
    border-color: #6fa3ff;
    transform: translateY(-50%) scale(1.1);
  }

  .prev-btn {
    left: 1rem;
  }

  .next-btn {
    right: 1rem;
  }

  .carousel-indicators {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .indicator {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: rgba(100, 150, 255, 0.3);
    border: 2px solid rgba(100, 150, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }

  .indicator:hover {
    background: rgba(100, 150, 255, 0.5);
    transform: scale(1.2);
  }

  .indicator.active {
    background: #6fa3ff;
    border-color: #6fa3ff;
    box-shadow: 0 0 10px rgba(111, 163, 255, 0.5);
  }

  /* Description Section */
  .description-section {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
  }

  .section-title {
    font-size: 0.75rem;
    color: #6fa3ff;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-shadow: 0 0 10px rgba(111, 163, 255, 0.3);
    flex-shrink: 0;
  }

  /* Position Capture HUD */
  .position-hud {
    position: fixed;
    top: 100px;
    left: 20px;
    background: rgba(0, 0, 0, 0.85);
    color: #00ff00;
    padding: 1rem;
    border-radius: 12px;
    font-family: "Courier New", monospace;
    z-index: 10000;
    border: 1px solid #00ff00;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
    min-width: 200px;
    backdrop-filter: blur(5px);
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
    border-bottom: 1px solid rgba(0, 255, 0, 0.3);
    padding-bottom: 0.5rem;
  }

  .hud-header h3 {
    margin: 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #fff;
  }

  .hud-toggle {
    background: transparent;
    border: none;
    color: #ff4444;
    cursor: pointer;
    font-weight: bold;
    padding: 0 4px;
  }

  .hud-coords {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .coord {
    display: flex;
    justify-content: space-between;
  }

  .coord .label {
    color: rgba(255, 255, 255, 0.7);
  }

  .coord .value {
    font-weight: bold;
  }

  .hud-copy-btn {
    width: 100%;
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.8rem;
  }

  .hud-copy-btn:hover {
    background: rgba(0, 255, 0, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  }

  .hud-copy-btn:active {
    transform: translateY(1px);
  }

  .short-description {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.65rem;
    line-height: 1.4;
    margin: 0;
    flex-shrink: 0;
  }

  .long-description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.6rem;
    line-height: 1.4;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  /* Technology Tags */
  .tech-section {
    flex-shrink: 0;
  }

  .tech-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .tech-tag {
    background: rgba(100, 150, 255, 0.2);
    border: 1px solid rgba(100, 150, 255, 0.4);
    color: #6fa3ff;
    padding: 0.4rem 0.8rem;
    border-radius: 0.4rem;
    font-size: 0.55rem;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tech-tag:hover {
    background: rgba(100, 150, 255, 0.3);
    border-color: #6fa3ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(100, 150, 255, 0.3);
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .action-btn {
    flex: 1;
    min-width: 120px;
    padding: 0.75rem 1.25rem;
    font-weight: bold;
    font-size: 0.65rem;
    border: 2px solid;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .demo-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    border-color: #34d399;
    color: white;
  }

  .demo-btn:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }

  .github-btn {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border-color: #818cf8;
    color: white;
  }

  .github-btn:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .itch-btn {
    background: linear-gradient(135deg, #fa5c5c, #d13030);
    border-color: #ff7b7b;
    color: white;
  }

  .itch-btn:hover {
    background: linear-gradient(135deg, #d13030, #a82020);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(250, 92, 92, 0.4);
  }

  .steam-btn {
    background: linear-gradient(135deg, #1b2838, #0e1419);
    border-color: #66c0f4;
    color: white;
  }

  .steam-btn:hover {
    background: linear-gradient(135deg, #0e1419, #000000);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 192, 244, 0.4);
  }

  .epic-btn {
    background: linear-gradient(135deg, #0078f2, #005bb5);
    border-color: #2196f3;
    color: white;
  }

  .epic-btn:hover {
    background: linear-gradient(135deg, #005bb5, #004080);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 120, 242, 0.4);
  }

  /* Help Modal Specific Styles */
  .help-modal {
    max-height: 90vh;
  }

  .help-content {
    padding: 1.5rem;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .help-content::-webkit-scrollbar {
    width: 8px;
  }

  .help-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .help-content::-webkit-scrollbar-thumb {
    background: rgba(100, 150, 255, 0.5);
    border-radius: 4px;
  }

  .help-content::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 150, 255, 0.7);
  }

  .help-section {
    margin-bottom: 1.5rem;
  }

  .help-section:last-child {
    margin-bottom: 0;
  }

  .help-section h3 {
    color: #6fa3ff;
    font-size: 1rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-shadow: 0 0 8px rgba(111, 163, 255, 0.4);
  }

  .help-section h3 i {
    font-size: 1.1rem;
  }

  .help-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .help-section li {
    padding: 0.5rem 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    line-height: 1.5;
    border-bottom: 1px solid rgba(100, 150, 255, 0.1);
  }

  .help-section li:last-child {
    border-bottom: none;
  }

  .help-section strong {
    color: #a0c4ff;
    font-weight: 600;
  }

  /* Responsive Styles */
  @media (max-width: 768px) {
    .portfolio-modal {
      width: 90%;
      height: 80vh;
      margin-top: 3rem;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-title {
      font-size: 0.9rem;
    }

    .modal-subtitle {
      font-size: 0.6rem;
    }

    .modal-body {
      padding: 1rem;
      gap: 0.75rem;
    }

    .section-title {
      font-size: 0.65rem;
    }

    .short-description {
      font-size: 0.6rem;
    }

    .long-description {
      font-size: 0.55rem;
      -webkit-line-clamp: 2;
    }

    .tech-tag {
      font-size: 0.5rem;
      padding: 0.3rem 0.6rem;
    }

    .action-btn {
      min-width: 100%;
      font-size: 0.6rem;
      padding: 0.7rem 1rem;
    }

    .carousel-btn {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1.5rem;
    }

    /* Help Modal Mobile Styles */
    .help-modal {
      max-height: 85vh;
      height: auto;
    }

    .help-content {
      padding: 1rem;
      max-height: calc(85vh - 80px);
    }

    .help-section {
      margin-bottom: 1.25rem;
    }

    .help-section h3 {
      font-size: 0.75rem;
    }

    .help-section h3 i {
      font-size: 0.85rem;
    }

    .help-section li {
      font-size: 0.65rem;
      padding: 0.4rem 0;
      line-height: 1.4;
    }
  }

  @media (max-width: 480px) {
    .portfolio-modal {
      width: 95%;
      height: 85vh;
      margin-top: 2rem;
    }

    .modal-header {
      padding: 0.75rem;
    }

    .modal-title {
      font-size: 0.75rem;
    }

    .modal-subtitle {
      font-size: 0.5rem;
    }

    /* Help Modal Extra Small Screen Styles */
    .help-modal {
      max-height: 90vh;
    }

    .help-content {
      padding: 0.75rem;
      max-height: calc(90vh - 70px);
    }

    .help-section {
      margin-bottom: 1rem;
    }

    .help-section h3 {
      font-size: 0.65rem;
      gap: 0.35rem;
    }

    .help-section h3 i {
      font-size: 0.75rem;
    }

    .help-section li {
      font-size: 0.55rem;
      padding: 0.35rem 0;
      line-height: 1.3;
    }

    .close-button {
      width: 2rem;
      height: 2rem;
      font-size: 1.2rem;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .dialogue-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: 2rem;
    z-index: 100;
    pointer-events: none;
  }

  .dialogue-box {
    background: linear-gradient(
      135deg,
      rgba(20, 20, 40, 0.95),
      rgba(40, 40, 80, 0.95)
    );
    border: 3px solid rgba(100, 150, 255, 0.8);
    border-radius: 1rem;
    padding: 1.5rem 2rem;
    max-width: 600px;
    width: 100%;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
    pointer-events: all;
    animation: slideUp 0.3s ease-out;
    font-family: "Press Start 2P", cursive;
  }

  .dialogue-text {
    margin-bottom: 1.5rem;
  }

  .speaker-name {
    color: #6fa3ff;
    font-weight: bold;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 10px rgba(111, 163, 255, 0.5);
  }

  .dialogue-content {
    color: white;
    font-size: 0.8rem;
    line-height: 1.6;
    margin: 0;
  }

  .dialogue-buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .dialogue-btn {
    padding: 0.75rem 1.5rem;
    font-weight: bold;
    font-size: 0.8rem;
    border: 2px solid;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .yes-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    border-color: #34d399;
    color: white;
  }

  .yes-btn:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }

  .no-btn {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: #f87171;
    color: white;
  }

  .no-btn:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .close-btn {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border-color: #60a5fa;
    color: white;
  }

  .close-btn:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .joke-input-container {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .joke-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(100, 150, 255, 0.5);
    border-radius: 0.5rem;
    color: white;
    font-family: "Press Start 2P", cursive;
    font-size: 0.7rem;
    outline: none;
    transition: all 0.2s;
  }

  .joke-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .joke-input:focus {
    border-color: rgba(100, 150, 255, 0.8);
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 10px rgba(100, 150, 255, 0.3);
  }

  .send-btn {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border: 2px solid #818cf8;
    border-radius: 0.5rem;
    color: white;
    font-family: "Press Start 2P", cursive;
    font-size: 0.7rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }

  .send-btn:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .flash-overlay {
    position: fixed;
    inset: 0;
    background: white;
    z-index: 9999;
    animation: flashFade 0.5s ease-out forwards;
    pointer-events: none;
  }

  @keyframes flashFade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  /* Volume Slider Styling */
  .volume-slider {
    background: linear-gradient(
      to left,
      #3b82f6 0%,
      #3b82f6 var(--value, 30%),
      #d1d5db var(--value, 30%),
      #d1d5db 100%
    );
  }

  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
    margin-top: -4px;
  }

  .volume-slider::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.2);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  }

  .volume-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
    margin-top: 0;
  }

  .volume-slider::-moz-range-thumb:hover {
    background: #2563eb;
    transform: scale(1.2);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  }

  .volume-slider::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 4px;
  }

  .volume-slider::-moz-range-track {
    height: 8px;
    border-radius: 4px;
    background: #d1d5db;
  }
</style>
