<script>
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import Spinner from "./Spinner.svelte";

    export let sharedVideoElement = null; // The text prompt asks to share camera
    export let isCameraReady = false;

    let container;
    let mindarThree = null;
    let threeInstance = null;
    let avatar = null;
    let isRunning = false;
    let isLoading = false; // Start false, only show when clicking start
    let isIdle = true; // State to track if we are in idle mode (pre-start)

    const dispatch = createEventDispatcher();

    class Avatar {
        constructor(THREE, GLTFLoader) {
            this.THREE = THREE;
            this.GLTFLoader = GLTFLoader;
            this.gltf = null;
            this.morphTargetMeshes = [];
            this.mixer = null; // For animations if any
            this.root = null;
        }
        async init() {
            const url = "https://assets.codepen.io/9177687/raccoon_head.glb";
            const gltf = await new Promise((resolve, reject) => {
                const loader = new this.GLTFLoader();
                loader.load(
                    url,
                    (gltf) => {
                        resolve(gltf);
                    },
                    undefined,
                    (err) => reject(err),
                );
            });
            gltf.scene.traverse((object) => {
                if (object.isBone && !this.root) {
                    this.root = object;
                }
                if (!object.isMesh) return;
                const mesh = object;
                if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences)
                    return;
                this.morphTargetMeshes.push(mesh);
            });
            this.gltf = gltf;
        }
        updateBlendshapes(blendshapes) {
            const categories = blendshapes.categories;
            let coefsMap = new Map();
            for (let i = 0; i < categories.length; ++i) {
                coefsMap.set(categories[i].categoryName, categories[i].score);
            }
            for (const mesh of this.morphTargetMeshes) {
                if (
                    !mesh.morphTargetDictionary ||
                    !mesh.morphTargetInfluences
                ) {
                    continue;
                }
                for (const [name, value] of coefsMap) {
                    if (
                        !Object.keys(mesh.morphTargetDictionary).includes(name)
                    ) {
                        continue;
                    }
                    const idx = mesh.morphTargetDictionary[name];
                    mesh.morphTargetInfluences[idx] = value;
                }
            }
        }
    }

    // Initialize 3D scene immediately
    const initScene = async () => {
        try {
            const THREE = await import(
                "https://unpkg.com/three@0.160.0/build/three.module.js"
            );
            threeInstance = THREE;
            const { GLTFLoader } = await import(
                "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"
            );
            const { MindARThree } = await import(
                "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-face-three.prod.js"
            );

            if (!container) return; // Guard

            mindarThree = new MindARThree({
                container: container,
            });

            const { renderer, scene, camera } = mindarThree;

            // Allow alpha for transparent background so we can see the image behind
            renderer.setClearColor(0x000000, 0);

            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            scene.add(light);

            // We need the anchor for later, but for now we might not use it
            const anchor = mindarThree.addAnchor(1);

            avatar = new Avatar(THREE, GLTFLoader);
            await avatar.init();

            // Setup Avatar Scale
            avatar.gltf.scene.scale.set(2, 2, 2);

            // IDLE SETUP:
            // Add avatar directly to scene initially (not to anchor)
            scene.add(avatar.gltf.scene);

            // Position camera for Idle view
            camera.position.set(0, 0, 5); // Move back to see the model
            avatar.gltf.scene.position.set(0, -0.5, 0); // Center it roughly

            // Animation Loop
            const iconClock = new THREE.Clock();

            renderer.setAnimationLoop(() => {
                const delta = iconClock.getElapsedTime();

                if (isRunning) {
                    // ACTIVE MODE (AR)
                    const estimate = mindarThree.getLatestEstimate();
                    if (estimate && estimate.blendshapes) {
                        avatar.updateBlendshapes(estimate.blendshapes);
                    }
                } else {
                    // IDLE MODE
                    // Subtle floating animation
                    if (avatar && avatar.gltf) {
                        avatar.gltf.scene.position.y =
                            -0.5 + Math.sin(delta * 2) * 0.05;
                        avatar.gltf.scene.rotation.y =
                            Math.sin(delta * 1) * 0.1;
                    }
                }
                renderer.render(scene, camera);
            });

            // Initial resize
            handleResize();
            isLoading = false;
        } catch (e) {
            console.error("Mocap init error:", e);
            isLoading = false;
        }
    };

    const startMocap = async () => {
        if (isRunning || !mindarThree) return;
        isLoading = true;

        try {
            await mindarThree.start();
            isRunning = true;
            isIdle = false;

            // Switch Avatar to Anchor
            const { scene } = mindarThree;
            const anchor = mindarThree.addAnchor(1); // Get existing anchor (index 1 is what was used before, typical face mesh index?)
            // Actually mindarThree.addAnchor returns the anchor object. We called it in init.
            // But we didn't save it. Let's retrieve or recreate.
            // MindAR docs: addAnchor(frameIndex). If we call it again for same index, it might duplicate or return same.
            // Safer to save it in init. Refactoring init slightly to save anchor.
            // Re-fetching anchor from the instance might be tricky without reference.
            // Let's just grab the one we need. The init code added one.
            // mindarThree.anchors is visible?

            // Re-traverse or just re-add logic.
            // Better: Let's fix init to save anchor.
            // HACK for now: we know we added it.
            // But simpler: just add it to the anchor group now.

            // To be robust, let's keep track of anchor in a variable outside.
        } catch (e) {
            console.error("Start error", e);
        } finally {
            isLoading = false;
        }
    };

    let faceAnchor;

    const initAndLoop = async () => {
        try {
            const THREE = await import(
                "https://unpkg.com/three@0.160.0/build/three.module.js"
            );
            threeInstance = THREE;
            const { GLTFLoader } = await import(
                "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"
            );
            const { MindARThree } = await import(
                "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-face-three.prod.js"
            );

            if (!container) return;

            mindarThree = new MindARThree({
                container: container,
            });

            const { renderer, scene, camera } = mindarThree;
            renderer.setClearColor(0x000000, 0);

            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            scene.add(light);

            faceAnchor = mindarThree.addAnchor(1);

            avatar = new Avatar(THREE, GLTFLoader);
            await avatar.init();
            avatar.gltf.scene.scale.set(2, 2, 2);

            // scene.add(avatar.gltf.scene);

            camera.position.set(0, 0, 3);
            avatar.gltf.scene.position.set(0, -0.3, 0);

            const clock = new THREE.Clock();
            renderer.setAnimationLoop(() => {
                const t = clock.getElapsedTime();

                if (isRunning) {
                    const estimate = mindarThree.getLatestEstimate();
                    if (estimate && estimate.blendshapes) {
                        avatar.updateBlendshapes(estimate.blendshapes);
                    }
                } else {
                    // IDLE MODE: No 3D model visible (GIF shows)
                    if (avatar && avatar.gltf) {
                        // Ensure it's hidden if somehow present, or just do nothing as it shouldn't be in scene
                    }
                }
                renderer.render(scene, camera);
            });

            handleResize();
            isLoading = false;
        } catch (e) {
            console.error(e);
            isLoading = false;
        }
    };

    const startCamera = async () => {
        if (isRunning) return;
        isLoading = true;
        try {
            await mindarThree.start();
            isRunning = true;

            if (avatar && faceAnchor) {
                mindarThree.scene.remove(avatar.gltf.scene);
                faceAnchor.group.add(avatar.gltf.scene);

                avatar.gltf.scene.position.set(0, -0.3, 0); // Adjust as needed for face mount
                avatar.gltf.scene.rotation.set(0, 0, 0);
                avatar.gltf.scene.scale.set(2, 2, 2);
                // Hide video element (We want only the model + background)
                const video = mindarThree.video;
                if (video) video.style.opacity = "0";
            }

            handleResize();
        } catch (e) {
            console.error("Start AR failed", e);
        } finally {
            isLoading = false;
        }
    };

    const stopCamera = () => {
        if (!isRunning || !mindarThree) return;

        mindarThree.stop();
        isRunning = false;

        // Move Avatar back to Scene (Idle)
        if (avatar && faceAnchor) {
            faceAnchor.group.remove(avatar.gltf.scene);
            // mindarThree.scene.add(avatar.gltf.scene); // Don't add back to scene, we go to GIF
        }

        // Hide video if it persists
        const video = mindarThree.video;
        if (video) video.style.opacity = "0";

        // Reset Camera
        mindarThree.camera.position.set(0, 0, 3);
        mindarThree.camera.lookAt(0, 0, 0);
    };

    // Clean up
    let resizeObserver;

    const handleResize = () => {
        if (!container || !mindarThree) return;
        const { renderer, camera, video } = mindarThree;
        if (!renderer || !camera) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // If video is not ready (idle), we just size renderer to container
        if (!video || !video.videoWidth) {
            renderer.setSize(containerWidth, containerHeight);
            camera.aspect = containerWidth / containerHeight;
            camera.updateProjectionMatrix();
            return;
        }

        // Existing logic for AR resize
        if (video.videoWidth && video.videoHeight) {
            // ... existing cover logic ...
            const videoAspect = video.videoWidth / video.videoHeight;
            const containerAspect = containerWidth / containerHeight;
            let finalWidth, finalHeight;
            if (containerAspect > videoAspect) {
                finalWidth = containerWidth;
                finalHeight = finalWidth / videoAspect;
            } else {
                finalHeight = containerHeight;
                finalWidth = finalHeight * videoAspect;
            }
            renderer.setSize(finalWidth, finalHeight);
            camera.aspect = finalWidth / finalHeight;
            camera.updateProjectionMatrix();

            // ... centering styles ...
            const enforceStyle = (el, isVideo = false) => {
                if (!el) return;
                el.style.position = "absolute";
                el.style.width = `${finalWidth}px`;
                el.style.height = `${finalHeight}px`;
                el.style.top = "50%";
                el.style.left = "50%";
                el.style.objectFit = "fill";
                if (isVideo) {
                    el.style.transform = "translate(-50%, -50%) scaleX(-1)";
                } else {
                    el.style.transform = "translate(-50%, -50%)";
                }
            };
            enforceStyle(renderer.domElement);
            enforceStyle(video, true);
        }
    };

    onMount(() => {
        initAndLoop();
        resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        if (container) {
            resizeObserver.observe(container);
        }
    });

    onDestroy(() => {
        stopCamera(); // logic to stop
        if (resizeObserver) resizeObserver.disconnect();
    });
</script>

<div
    class="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-transparent"
>
    <!-- Background Image -->
    <img
        src="/images/raccoon-scene.jpg"
        alt="Background"
        class="absolute top-0 left-0 w-full h-full object-cover blur-sm z-0"
    />

    <!-- Container for MindAR -->
    <div
        bind:this={container}
        class="mindar-container w-full h-full absolute top-0 left-0 overflow-hidden z-10"
    >
        <!-- Canvas will be injected here by MindAR -->
    </div>

    <!-- Controls -->
    <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40] flex gap-6 pointer-events-auto w-max"
    >
        {#if !isRunning}
            <button
                on:click={startCamera}
                class="group relative px-8 py-3 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 text-white font-semibold text-lg tracking-wide shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:bg-white/30 hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.2)] hover:border-white/50 active:scale-95 transition-all duration-300 overflow-hidden"
            >
                <span class="relative z-10 flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 opacity-90 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                    LIGAR CAMERA
                </span>
                <!-- Light shine effect -->
                <div
                    class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                ></div>
            </button>
        {:else}
            <button
                on:click={stopCamera}
                class="group relative px-8 py-3 rounded-2xl bg-red-500/20 backdrop-blur-xl border border-red-400/30 text-red-50 font-semibold text-lg tracking-wide shadow-[0_8px_32px_0_rgba(255,0,0,0.15)] hover:bg-red-500/30 hover:shadow-[0_8px_32px_0_rgba(255,0,0,0.25)] hover:border-red-400/50 active:scale-95 transition-all duration-300 overflow-hidden"
            >
                <span class="relative z-10 flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 opacity-90 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                        />
                    </svg>
                    PARAR
                </span>
                <!-- Light shine effect -->
                <div
                    class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-red-200/20 to-transparent skew-x-12"
                ></div>
            </button>
        {/if}
    </div>

    {#if !isRunning}
        <img
            src="/images/mocap.gif"
            alt="Mocap Preview"
            class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover pointer-events-none z-20"
        />
    {/if}

    <!-- Loading Spinner -->
    <!-- Loading Spinner -->
    {#if isLoading}
        <Spinner
            showText={false}
            position="absolute"
            background="rgba(0,0,0,0.3)"
        />
    {/if}
</div>

<style>
    /* Ensure container covers area */
    .mindar-container :global(video) {
        /* Video hidden by default until started? MindAR manages this usually. */
        /* We want to make sure it doesn't default to visible in a weird way. */
        /* But generally, when MindAR starts, it injects the video. */
        /* We can rely on JS to toggle opacity or just let it be. */
        top: 0;
        left: 0;
        opacity: 0 !important; /* FORCE HIDE VIDEO FEED */
    }

    .mindar-container :global(canvas) {
        /* Canvas is transparent thanks to constructor options, but ensure it covers */
        pointer-events: none;
    }
</style>
