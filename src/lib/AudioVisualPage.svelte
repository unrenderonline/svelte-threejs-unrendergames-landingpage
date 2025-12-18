<script>
    import { onMount, onDestroy } from "svelte";
    import Spinner from "./Spinner.svelte";
    import MocapComponent from "./MocapComponent.svelte";
    import { gsap } from "gsap";
    import { ScrollTrigger } from "gsap/ScrollTrigger";

    gsap.registerPlugin(ScrollTrigger);

    let scrollContainer;
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
    let cameraStream = null;
    let cameraPermissionGranted = false;
    let showMocap = false;

    // Camera permission request
    async function requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            cameraStream = stream;
            cameraPermissionGranted = true;
            // We don't stop the tracks immediately so the light stays on/permission persists,
            // or we can stop and let components re-request.
            // For now, we keep it active as "Shared Camera" concept.
        } catch (err) {
            console.error("Camera permission denied", err);
        }
    }

    // Helper to create text textures
    function createTextTexture(text, color, bgColor, rotation = 0) {
        const canvas = document.createElement("canvas");
        // High res for full screen
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 2048, 2048);

        ctx.save();
        ctx.translate(1024, 1024);
        ctx.rotate(rotation);
        ctx.translate(-1024, -1024);

        // Text
        ctx.fillStyle = color;
        ctx.font = 'bold 80px "Montserrat", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const lines = text.split("\n");
        const lineHeight = 120;
        const startY = 1024 - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, 1024, startY + i * lineHeight);
        });

        ctx.restore();

        return canvas;
    }

    onMount(async () => {
        if (!isInitialized) {
            const THREE = await import("three");

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);

            // Camera setup
            // Increase distance and decrease FOV to flatten perspective slightly
            const cameraZ = 20;
            const fov = 25; // Adjusted for new distance roughly maintaining scale
            camera = new THREE.PerspectiveCamera(
                fov,
                window.innerWidth / window.innerHeight,
                0.1,
                1000,
            );
            camera.position.set(0, 0, cameraZ);

            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio || 1);
            renderer.domElement.style.position = "fixed";
            renderer.domElement.style.top = "0";
            renderer.domElement.style.left = "0";
            renderer.domElement.style.zIndex = "1"; // Canvas behind CSS
            container.appendChild(renderer.domElement);

            // Import CSS3D
            const { CSS3DRenderer, CSS3DObject } = await import(
                "https://unpkg.com/three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js"
            );

            // CSS3D Renderer
            const cssRenderer = new CSS3DRenderer();
            cssRenderer.setSize(window.innerWidth, window.innerHeight);
            cssRenderer.domElement.style.position = "fixed";
            cssRenderer.domElement.style.top = "0";
            cssRenderer.domElement.style.left = "0";
            cssRenderer.domElement.style.zIndex = "2"; // CSS on top
            // Allow scroll to pass through the renderer area, but enable events on children (mocapDiv)
            cssRenderer.domElement.style.pointerEvents = "none";
            container.appendChild(cssRenderer.domElement);

            // Calculate visible height at z=0 (where the front face will be)
            const vFOV = THREE.MathUtils.degToRad(fov);
            const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraZ;
            const visibleWidth = visibleHeight * camera.aspect;

            // Textures
            // Use unified background color to hide cube edges
            const bgColor = "#000000";

            // Face 1: Front
            const face1Canvas = createTextTexture(
                "AUDIOVISUAL\n\nReal-time 3D for VFX\nGreen Screen & Virtual Sets\nMovie & TV Production\n\n(3D Spatial Audio Available)",
                "#ffffff",
                bgColor,
            );
            const face1Texture = new THREE.CanvasTexture(face1Canvas);
            face1Texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

            // Face 2: Bottom (Rotates up)
            // Removed rotation so text is upright relative to the shared edge
            const face2Canvas = createTextTexture(
                "ANIMATION & VIRTUAL\n\nPrerender Scene Making\nCartoons & Animation Process\nVirtual Puppetry\nReal-time Game Engines\nMotion Capture & Control",
                "#ffffff",
                bgColor,
            );
            const face2Texture = new THREE.CanvasTexture(face2Canvas);
            face2Texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

            const materials = [
                new THREE.MeshBasicMaterial({ color: 0x000000 }), // Right
                new THREE.MeshBasicMaterial({ color: 0x000000 }), // Left
                new THREE.MeshBasicMaterial({ color: 0x000000 }), // Top
                new THREE.MeshBasicMaterial({ map: face2Texture }), // Bottom (Face 2)
                new THREE.MeshBasicMaterial({ map: face1Texture }), // Front (Face 1)
                new THREE.MeshBasicMaterial({ color: 0x000000 }), // Back
            ];

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            cube = new THREE.Mesh(geometry, materials);

            // Initial sizing
            cube.scale.set(visibleWidth, visibleHeight, visibleHeight);
            // Position the cube so its front face is at z=0.
            // Cube depth is visibleHeight. Center z is -visibleHeight/2.
            cube.position.z = -visibleHeight / 2;

            scene.add(cube);

            // Mocap CSS3D Object
            // We want to attach the Mocap layout to Face 2 (Bottom).
            // Face 2 is at y = -0.5 (relative to unit cube), with specific rotation.
            // Since we scale the cube, we must be careful. CSS3DObject inherits scale if attached to mesh.
            // But HTML elements don't scale nicely with CSS3D if parent is scaled with 'scale.set'.
            // Actually, CSS3DObject *does* scale the DOM element via matrix3d.
            // So if the cube is 20 units big, the DIV will be blown up 20x.
            // We need the DIV to be high-res (e.g. 1024px) but visually fit the face (1 unit).
            // So we scale the CSS3DObject down by 1/visibleHeight. Or set size appropriately.

            // Create a wrapper for the CSS Object
            // Create a wrapper for the CSS Object
            const mocapDiv = document.createElement("div");

            // To prevent clipping/stretching issues, we make the DIV match the aspect ratio of the target face ON SCREEN.
            // When face 2 is viewed, it fills the screen. So the aspect ratio is window.innerWidth / window.innerHeight.
            // We set the resolution high enough for clarity.
            const targetWidth = window.innerWidth;
            const targetHeight = window.innerHeight;

            mocapDiv.style.width = targetWidth + "px";
            mocapDiv.style.height = targetHeight + "px";
            mocapDiv.style.background = "#000"; // Keep black background for seamless blend
            mocapDiv.style.pointerEvents = "auto";
            mocapDiv.style.display = "flex";
            mocapDiv.style.flexDirection = "column";
            mocapDiv.style.alignItems = "center";
            mocapDiv.style.justifyContent = "center";
            mocapDiv.style.padding = "2rem";
            mocapDiv.style.boxSizing = "border-box";

            // Create Layout Container
            const layoutContainer = document.createElement("div");
            layoutContainer.style.position = "relative"; // For absolute children
            layoutContainer.style.width = "100%";
            layoutContainer.style.height = "100%";
            layoutContainer.style.overflow = "hidden"; // Keep content inside face
            mocapDiv.appendChild(layoutContainer);

            // Helper to animate Orbiting
            const animateOrbit = (
                el,
                radiusX,
                radiusY,
                duration,
                centerX,
                centerY,
                scale = 1,
            ) => {
                const phase = Math.random() * Math.PI * 2;
                const proxy = { t: 0 };

                // Randomize direction
                const direction = Math.random() > 0.5 ? 1 : -1;

                gsap.to(proxy, {
                    t: Math.PI * 2 * direction,
                    duration: duration,
                    repeat: -1,
                    ease: "none",
                    onUpdate: () => {
                        const currentT = proxy.t + phase;
                        // Ellptical orbit
                        const x =
                            centerX +
                            Math.cos(currentT) * radiusX -
                            el.offsetWidth / 2;
                        const y =
                            centerY +
                            Math.sin(currentT) * radiusY -
                            el.offsetHeight / 2;

                        el.style.left = `${x}px`;
                        el.style.top = `${y}px`;
                    },
                });
            };

            // GIFs
            const gifPaths = [
                "/images/fortnite_dance.gif",
                "/images/fortnite_dance2.gif",
                "/images/roblox-dance.gif",
                "/images/icegif-1248.gif",
            ];

            const centerX = targetWidth / 2;
            const centerY = targetHeight / 2;

            // --- TEXT ELEMENTS ---
            const textData = [
                { title: "Spatial Motion", desc: "Real-time facial tracking" },
                { title: "Interactive 3D", desc: "Immersive web experiences" },
                { title: "Gesture Control", desc: "Next-gen UI interaction" },
            ];

            const createTextGroup = (data) => {
                const container = document.createElement("div");
                container.style.position = "absolute";
                container.style.width = "300px"; // Fixed width for text wrapping
                container.style.textAlign = "center";
                container.style.pointerEvents = "none";
                container.style.zIndex = "40"; // HIGHEST: Text on top of Mocap

                const t = document.createElement("div");
                t.innerText = data.title;
                t.style.fontFamily =
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
                t.style.fontSize = "2.5rem"; // Slightly smaller to fit multiple
                t.style.fontWeight = "800";
                t.style.color = "#ffffff";
                t.style.letterSpacing = "-0.02em";
                t.style.textShadow = "0 4px 20px rgba(0,0,0,0.5)";

                const d = document.createElement("div");
                d.innerText = data.desc;
                d.style.fontFamily =
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
                d.style.fontSize = "1.2rem";
                d.style.fontWeight = "400";
                d.style.color = "rgba(255,255,255,0.8)";
                d.style.marginTop = "0.5rem";

                container.appendChild(t);
                container.appendChild(d);
                return container;
            };

            // Create and Orbit Text Groups
            textData.forEach((data, i) => {
                const el = createTextGroup(data);
                layoutContainer.appendChild(el);

                // Slower orbit for text
                // Larger radius to float outside/around mocap
                // Duration: 40-60s (Very slow)
                const radiusX = 350 + Math.random() * 100;
                const radiusY = 250 + Math.random() * 50;
                const duration = 40 + Math.random() * 20;

                // We pass element, radii, duration, center
                animateOrbit(el, radiusX, radiusY, duration, centerX, centerY);
            });

            // --- MOCAP CONTAINER (CENTER) ---
            const mocapSlot = document.createElement("div");
            mocapSlot.style.width = "400px";
            mocapSlot.style.height = "400px";
            mocapSlot.style.borderRadius = "2.5rem"; // More apple-like rounded
            mocapSlot.style.overflow = "hidden";
            mocapSlot.style.border = "1px solid rgba(255,255,255,0.1)";
            mocapSlot.style.boxShadow = "0 20px 80px rgba(0,0,0,0.6)"; // Deep shadow
            mocapSlot.style.background = "rgba(20,20,20,0.5)"; // Glassy backing
            mocapSlot.style.backdropFilter = "blur(20px)";
            mocapSlot.style.flexShrink = "0";
            mocapSlot.id = "mocap-slot";
            mocapSlot.style.position = "absolute";
            mocapSlot.style.zIndex = "30"; // Middle: Behind Text (40), Above GIFs (10)
            mocapSlot.style.left = `${centerX - 200}px`;
            mocapSlot.style.top = `${centerY - 200}px`;
            layoutContainer.appendChild(mocapSlot);

            // Animate Mocap (Subtle float, not orbit)
            gsap.to(mocapSlot, {
                y: 20,
                duration: 4,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
            });

            // --- ORBITING GIFS ---
            gifPaths.forEach((src, i) => {
                const img = document.createElement("img");
                img.src = src;
                img.style.width = "150px";
                img.style.height = "150px";
                img.style.objectFit = "contain";
                img.style.borderRadius = "1rem";
                img.style.position = "absolute";
                img.style.zIndex = "10";
                img.style.opacity = "0.9";

                layoutContainer.appendChild(img);

                // Slower Orbit parameters for GIFs
                // Duration: 25-40s (Slower than before)
                const radiusX = 400 + Math.random() * 100;
                const radiusY = 300 + Math.random() * 50;
                const duration = 25 + Math.random() * 15;

                // We pass element, radii, duration, center
                animateOrbit(img, radiusX, radiusY, duration, centerX, centerY);
            });

            // We move the existing svelte component container INTO this div?
            // Svelte component is rendered in the body via slot or binding?
            // Currently it's in the markup: <div class="mocap-container" bind:this={mocapContainer}>...</div>
            // We can append that DOM node to our CSS Object div.

            const cssObject = new CSS3DObject(mocapDiv);
            // Position on Bottom Face
            // Center of bottom face is (0, -0.5, 0).
            // Rotation: Face 2 material points 'down'. But we want it to be 'front' when rotated up.
            // Standard Box UV: Bottom face is oriented... let's trial and error or deduction.
            // Bottom face normal is (0, -1, 0).
            // To make an object coplanar with bottom face facing OUT, we rotate X by 90 deg (PI/2).
            cssObject.position.set(0, -0.5, 0);
            cssObject.rotation.x = Math.PI / 2;

            // Scale: The div is targetWidth x targetHeight.
            // The face geometry is 1 unit x 1 unit.
            // We want the div to fit exactly into the 1x1 face.
            // So scale X = 1 / targetWidth. Scale Y = 1 / targetHeight.
            // HOWEVER: The global scaling of the cube (visibleWidth, visibleHeight) stretches this 1x1 face.
            // visibleWidth/visibleHeight = aspect ratio.
            // So the 1x1 face becomes aspect x 1 in world space.
            // If our DIV is aspect x 1 (in pixels ratio), and we scale it to 1x1 (local), it becomes aspect x 1 (world).
            // So if width = 1920, height = 1080.
            // scale X = 1/1920. scale Y = 1/1080.
            // cssObject local size becomes 1x1.
            // Cube stretches it to visibleWidth x visibleHeight.
            // visibleWidth/visibleHeight is ALSO 1920/1080.
            // So the final aspect ratio is preserved perfectly.
            cssObject.scale.set(
                1 / targetWidth,
                1 / targetHeight,
                1 / targetWidth,
            ); // Z scale matters less but keep consistent-ish

            cube.add(cssObject);

            // Allow access to append content
            // We need a way to move the Svelte element into 'mocapDiv'
            // We can do this in a reactive statement or right here if we use a global variable or querySelector.
            // Let's use a querySelector for the container we want to move.
            // But we need to make sure Svelte has rendered it.

            const moveMocapToCube = () => {
                console.log("Attempting to move Mocap component...");
                const existingContainer = document.querySelector(
                    ".mocap-content-wrapper",
                );
                const slot = document.getElementById("mocap-slot");

                if (existingContainer && slot) {
                    // Check if it's already there
                    if (slot.contains(existingContainer)) {
                        console.log("Mocap already in slot.");
                        return;
                    }
                    console.log(
                        "Found container and slot, moving...",
                        existingContainer,
                        slot,
                    );

                    // Force visibility before moving
                    existingContainer.style.display = "block !important";
                    existingContainer.style.width = "100%";
                    existingContainer.style.height = "100%";

                    slot.appendChild(existingContainer);

                    // Verify
                    setTimeout(() => {
                        existingContainer.style.display = "block";
                        console.log(
                            "Mocap display set to block. Parent:",
                            existingContainer.parentElement,
                        );
                    }, 100);
                } else {
                    console.warn(
                        "Mocap container or slot not found yet, retrying...",
                        { existingContainer, slot },
                    );
                    setTimeout(moveMocapToCube, 500); // Retry
                }
            };

            // Start checking
            setTimeout(moveMocapToCube, 500);

            // Resize handler
            resizeHandler = function onResize() {
                const w = window.innerWidth;
                const h = window.innerHeight;

                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                cssRenderer.setSize(w, h);

                // Update CSS Object size and scale to maintain correlation
                mocapDiv.style.width = w + "px";
                mocapDiv.style.height = h + "px";
                cssObject.scale.set(1 / w, 1 / h, 1 / w);

                // Re-calculate dimensions
                const vH = 2 * Math.tan(THREE.MathUtils.degToRad(25) / 2) * 20;
                const vW = vH * camera.aspect;

                cube.scale.set(vW, vH, vH);
                cube.position.z = -vH / 2;
            };

            await requestCameraPermission();

            window.addEventListener("resize", resizeHandler);

            function animate() {
                raf = requestAnimationFrame(animate);
                renderer.render(scene, camera);
                cssRenderer.render(scene, camera);
            }

            animate();

            // GSAP ScrollTrigger
            try {
                const gsapModule = await import("gsap");
                const gsap =
                    gsapModule.gsap || gsapModule.default || gsapModule;
                const stModule = await import("gsap/ScrollTrigger");
                const ScrollTrigger =
                    stModule.ScrollTrigger || stModule.default || stModule;
                gsap.registerPlugin(ScrollTrigger);

                // Rotate X by -90 degrees (-PI/2)
                // We want the Bottom face to come to the front.
                // A negative rotation around X moves the Bottom face towards the camera.
                const rotationTween = gsap.to(cube.rotation, {
                    x: -Math.PI / 2, // Rotate -90 degrees to show Bottom face
                    ease: "none",
                    scrollTrigger: {
                        trigger: scrollContainer,
                        start: "top top",
                        end: "bottom-=100 bottom", // Complete rotation slightly before end to ensure full turn
                        scrub: 0.5,
                        pin: false,
                        onUpdate: (self) => {
                            // Show Mocap when progress is near the end (Face 2 visible)
                            if (self.progress > 0.8) {
                                showMocap = true;
                            } else {
                                showMocap = false;
                            }
                        },
                    },
                });

                scrollCleanup = () => {
                    rotationTween.kill();
                    if (ScrollTrigger) {
                        ScrollTrigger.getAll().forEach((t) => t.kill());
                    }
                };
            } catch (e) {
                console.warn("GSAP not available", e);
            }

            isLoading = false;
            isInitialized = true;
        }
    });

    onDestroy(() => {
        if (typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(raf);
        }
        if (typeof window !== "undefined" && resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
        }
        if (scrollCleanup) scrollCleanup();
        if (renderer) renderer.dispose();
        // Clean up scene
        if (scene) {
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((m) => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    });
</script>

{#if isLoading}
    <Spinner />
{/if}

<!-- Container for scrolling height -->
<!-- 250vh gives us enough room to scroll and rotate the cube -->
<div class="scroll-container" bind:this={scrollContainer}>
    <div bind:this={container} class="canvas-container"></div>

    <!-- Optional: Scroll indicators or overlay text if needed, but text is on cube -->
    <div class="scroll-helper">
        <p>
            Rolar para baixo <i
                class="fa-solid fa-arrow-down"
                style="margin-left: 0.5rem;"
            ></i>
        </p>
    </div>
</div>

<!-- Mocap Content Wrapper - Will be moved into CSS3D Object -->
<div class="mocap-content-wrapper" style="display: none;">
    {#if cameraPermissionGranted}
        <!-- active prop is redundant if we just show control visibility, but component uses it? Component doesn't use 'active' prop in code read earlier. -->
        <MocapComponent {cameraStream} />
    {:else}
        <!-- Permission prompt also goes into the 3D face -->
        <div
            class="w-full h-full flex flex-col items-center justify-center bg-black text-white p-10"
        >
            <p>Camera access required for Motion Capture</p>
            <button
                class="mt-4 px-6 py-2 bg-white/20 rounded-xl"
                on:click={requestCameraPermission}
            >
                Enable Camera
            </button>
        </div>
    {/if}
</div>

<style>
    :global(body) {
        margin: 0;
        overflow-x: hidden;
        background-color: #000;
    }

    .scroll-container {
        height: 250vh; /* Adjust for scroll length */
        position: relative;
    }

    .canvas-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none; /* Allow scroll to pass through */
    }

    .scroll-helper {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        left: auto;
        transform: none;
        color: white;
        font-family: "Montserrat", sans-serif;
        opacity: 0.8;
        z-index: 100;
        pointer-events: none;
        animation: bounce 2s infinite;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 0.8rem 1.5rem;
        border-radius: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
