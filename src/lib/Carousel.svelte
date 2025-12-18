<script>
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";

    export let slides = [];
    export let autoplayInterval = 3000;

    let currentIndex = 0;
    let intervalId;
    let isHovering = false;
    let videoPlayed = false; // Track if user has played a video
    let players = {}; // Store YouTube player instances
    let youtubeApiReady = false;

    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        videoPlayed = false; // Reset video played flag on manual navigation
        startAutoplay();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        videoPlayed = false; // Reset video played flag on manual navigation
        startAutoplay();
    }

    function goToSlide(index) {
        currentIndex = index;
        videoPlayed = false; // Reset video played flag on manual navigation
        startAutoplay();
    }

    function startAutoplay() {
        stopAutoplay();
        if (!videoPlayed) {
            intervalId = setInterval(() => {
                if (!isHovering && !videoPlayed) {
                    nextSlide();
                }
            }, autoplayInterval);
        }
    }

    function stopAutoplay() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function handleMouseEnter() {
        isHovering = true;
    }

    function handleMouseLeave() {
        isHovering = false;
    }

    // Load YouTube IFrame API
    function loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            youtubeApiReady = true;
            initializePlayers();
            return;
        }

        // Load the API if not already loaded
        if (!window.onYouTubeIframeAPIReady) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                youtubeApiReady = true;
                initializePlayers();
            };
        }
    }

    // Initialize YouTube players for video slides
    function initializePlayers() {
        slides.forEach((slide, index) => {
            if (slide.type === "video" && slide.videoId) {
                const iframeId = `youtube-player-${index}`;
                const iframe = document.getElementById(iframeId);

                if (iframe && window.YT && window.YT.Player) {
                    players[index] = new window.YT.Player(iframeId, {
                        events: {
                            onStateChange: (event) => {
                                // YT.PlayerState.PLAYING = 1
                                if (event.data === 1) {
                                    videoPlayed = true;
                                    stopAutoplay();
                                }
                            },
                        },
                    });
                }
            }
        });
    }

    onMount(() => {
        startAutoplay();
        loadYouTubeAPI();
    });

    onDestroy(() => {
        stopAutoplay();
        // Destroy YouTube players
        Object.values(players).forEach((player) => {
            if (player && player.destroy) {
                player.destroy();
            }
        });
    });
</script>

<div
    class="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl group"
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    role="region"
    aria-label="Media Carousel"
>
    <!-- Slides -->
    <div class="relative w-full h-full">
        {#each slides as slide, index}
            {#if index === currentIndex}
                <div
                    class="absolute inset-0 w-full h-full transition-opacity duration-500"
                    in:fade={{ duration: 300 }}
                    out:fade={{ duration: 300 }}
                >
                    {#if slide.type === "video"}
                        <iframe
                            id={`youtube-player-${index}`}
                            src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1`}
                            title={slide.alt || "YouTube Video"}
                            class="w-full h-full object-cover"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    {:else if slide.type === "image"}
                        {#if slide.link}
                            <a
                                href={slide.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="block w-full h-full cursor-pointer"
                            >
                                <img
                                    src={slide.src}
                                    alt={slide.alt}
                                    class="w-full h-full object-cover"
                                />
                            </a>
                        {:else}
                            <img
                                src={slide.src}
                                alt={slide.alt}
                                class="w-full h-full object-cover"
                            />
                        {/if}
                    {/if}

                    <!-- Label Overlay -->
                    <div
                        class="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                    >
                        <p
                            class="text-center font-semibold text-sm md:text-base"
                        >
                            {slide.label}
                        </p>
                    </div>
                </div>
            {/if}
        {/each}
    </div>

    <!-- Controls -->
    <button
        class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-white"
        on:click={prevSlide}
        aria-label="Previous slide"
    >
        <i class="fas fa-chevron-left text-xl"></i>
    </button>

    <button
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-white"
        on:click={nextSlide}
        aria-label="Next slide"
    >
        <i class="fas fa-chevron-right text-xl"></i>
    </button>

    <!-- Indicators -->
    <div
        class="absolute bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
        {#each slides as _, index}
            <button
                class="w-2 h-2 rounded-full transition-all duration-300 {index ===
                currentIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/80'}"
                on:click={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
            ></button>
        {/each}
    </div>
</div>

<style>
    /* Ensure iframe covers the container */
    iframe {
        border: none;
    }
</style>
