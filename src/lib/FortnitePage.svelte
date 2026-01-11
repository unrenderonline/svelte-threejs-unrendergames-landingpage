<script>
  import { onMount, onDestroy } from "svelte";
  import { gsap } from "gsap";

  import Carousel from "./Carousel.svelte";

  const carouselSlides = [
    {
      type: "video",
      videoId: "8zC8HRyfRHw",
      alt: "Bradesco e Fortnite",
      label: "Braland: Veja a experiência Bradesco no Fortnite!",
    },
    {
      type: "image",
      src: "/images/fortnite_banner1.jpg",
      alt: "Marketing Dentro do Jogo",
      label: "Marketing in-game com Fortnite",
      link: "#",
    },
    {
      type: "image",
      src: "/images/hellmans.png",
      alt: "Hellmans Fortnite",
      label: "Loot Irresistível: Hellman's e Fortnite",
      link: "https://www.terra.com.br/gameon/plataformas-e-consoles/exclusivo-hellmanns-inaugura-mapa-no-fortnite-com-premios-para-os-jogadores,209f8638890a273a0535de30c301dabby0awzkij.html",
    },
  ];

  // Prevent body scrolling while this fullscreen page is mounted
  onMount(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overflowX = "hidden";
    document.body.style.overscrollBehavior = "none";
  });

  onDestroy(() => {
    // Revert changes
    if (typeof document !== "undefined") {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.body.style.overscrollBehavior = "";
    }
  });

  onMount(() => {
    // Animate title
    gsap.from(".game-title", {
      duration: 1,
      y: -50,
      opacity: 0,
      ease: "power3.out",
    });

    // Animate video container
    gsap.from(".video-container", {
      duration: 1.2,
      x: -100,
      opacity: 0,
      ease: "power3.out",
      delay: 0.3,
    });

    // Animate character image
    gsap.from(".character-image", {
      duration: 1,
      x: -100,
      opacity: 0,
      ease: "power3.out",
      delay: 0.5,
    });

    // Animate dance GIF
    gsap.from(".dance-gif", {
      duration: 1,
      x: 100,
      opacity: 0,
      ease: "power3.out",
      delay: 0.7,
    });

    // Animate description
    gsap.from(".game-description", {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: "power3.out",
      delay: 0.6,
    });

    // Animate features with fromTo to prevent flickering
    gsap.fromTo(
      ".feature-item",
      {
        x: 50,
        opacity: 0,
      },
      {
        duration: 0.8,
        x: 0,
        opacity: 1,
        ease: "power3.out",
        stagger: 0.2,
        delay: 0.9,
      },
    );

    // Floating animation for images
    gsap.to(".floating-image", {
      duration: 3,
      y: "+=10",
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Floating animation for character
    gsap.to(".character-image", {
      duration: 3,
      y: "+=10",
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Floating animation for dance GIF
    gsap.to(".dance-gif", {
      duration: 4,
      y: "+=15",
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
      delay: 0.5,
    });

    // Subtle rotation animation for dance GIF
    gsap.to(".dance-gif img", {
      duration: 6,
      rotation: 5,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Removed pulse animation for feature icons to keep them static
  });
</script>

<main
  class="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden pt-20 lg:pt-24 flex flex-col"
>
  <div
    class="flex-1 min-h-0 flex items-center justify-center w-full p-3 md:p-4 lg:p-6"
  >
    <div
      class="relative grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 xl:gap-12 items-center w-full max-w-7xl max-h-full"
    >
      <!-- YouTube Video - First on mobile, left on desktop -->
      <div class="video-container order-1 lg:order-1">
        <div class="relative">
          <div
            class="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30"
          ></div>
          <div
            class="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full aspect-video max-h-[20vh] lg:max-h-[30vh]"
          >
            <Carousel slides={carouselSlides} />
          </div>
        </div>
      </div>

      <!-- Fortnite Character -->
      <div
        class="character-image absolute left-0 -translate-x-24 top-0 bottom-0 w-48 lg:w-auto lg:-translate-x-48 lg:top-0"
      >
        <img
          src="/images/fortnite-skin1.png"
          alt="Fortnite Character"
          class="h-full w-full object-contain"
        />
      </div>

      <!-- Fortnite Dance GIF -->
      <div
        class="dance-gif absolute right-0 translate-x-12 top-20 bottom-0 w-48 lg:w-auto lg:translate-x-48 lg:top-0 lg:right-0"
      >
        <div class="relative">
          <div
            class="absolute -inset-4 bg-gradient-to-l from-purple-500 to-pink-600 blur-xl opacity-20 animate-pulse"
          ></div>
          <div
            class="relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm p-4 border border-purple-500/20"
          >
            <img
              src="/images/fortnite_dance2.gif"
              alt="Fortnite Dance Animation"
              class="h-full w-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <!-- Game Content - Second on mobile, right on desktop -->
      <div
        class="order-2 lg:order-2 flex flex-col justify-between lg:justify-center h-full min-h-0 py-2 lg:py-0 text-center lg:text-left lg:overflow-visible overflow-hidden"
      >
        <!-- Game Title -->
        <div class="game-title shrink-0 mb-1 lg:mb-4">
          <img
            src="/images/fortnite-logo.png"
            alt="Fortnite Logo"
            class="h-6 sm:h-10 md:h-14 lg:h-20 xl:h-24 mb-1 mx-auto lg:mx-0 object-contain"
          />
          <div
            class="w-12 md:w-16 lg:w-24 h-0.5 md:h-0.5 lg:h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto lg:mx-0"
          ></div>
        </div>

        <!-- Game Description -->
        <div class="game-description shrink-0 mb-2 lg:mb-4">
          <h3
            class="text-[10px] xxs:text-xs sm:text-sm md:text-lg lg:text-xl font-semibold text-white mb-1 lg:mb-4 leading-tight"
          >
            Nós transformamos seus objetivos de marketing em experiências
            imersivas dentro do Fortnite.
          </h3>
          <button
            class="px-3 py-1 md:px-6 md:py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-[10px] md:text-base hover:scale-105 transition-transform shadow-lg hover:shadow-purple-500/50 mb-1"
            on:click={() =>
              contactModalState.update((s) => ({
                ...s,
                isOpen: true,
                title: "Fortnite",
              }))}
          >
            FAZER ORÇAMENTO
          </button>
          <p
            class="text-[9px] sm:text-xs md:text-sm lg:text-base text-gray-400 max-w-lg mx-auto lg:mx-0 hidden sm:block leading-tight"
          >
            Através de mundos e jogos personalizados, criamos uma conexão
            duradoura com milhões de jogadores, convertendo engajamento em
            resultados concretos para sua marca.
          </p>
        </div>

        <!-- Game Features -->
        <div class="shrink min-h-0 w-full">
          <div class="grid grid-cols-2 gap-2 md:gap-3">
            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-lg p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div
                class="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 mb-1"
              >
                <div
                  class="feature-icon w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"
                >
                  <i class="fas fa-globe text-white text-[10px] md:text-sm"></i>
                </div>
                <h4
                  class="text-[9px] md:text-sm lg:text-base font-semibold leading-none sm:leading-normal"
                >
                  Mundos Virtuais
                </h4>
              </div>
              <p
                class="text-gray-300 text-[8px] md:text-xs leading-tight hidden xs:block"
              >
                Crie réplicas e experiências de marca.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-lg p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div
                class="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 mb-1"
              >
                <div
                  class="feature-icon w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"
                >
                  <i class="fas fa-gamepad text-white text-[10px] md:text-sm"
                  ></i>
                </div>
                <h4
                  class="text-[9px] md:text-sm lg:text-base font-semibold leading-none sm:leading-normal"
                >
                  Gamificação
                </h4>
              </div>
              <p
                class="text-gray-300 text-[8px] md:text-xs leading-tight hidden xs:block"
              >
                Engaje e fidelize com missões e eventos.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-lg p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div
                class="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 mb-1"
              >
                <div
                  class="feature-icon w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"
                >
                  <i class="fas fa-chart-bar text-white text-[10px] md:text-sm"
                  ></i>
                </div>
                <h4
                  class="text-[9px] md:text-sm lg:text-base font-semibold leading-none sm:leading-normal"
                >
                  Retorno Real
                </h4>
              </div>
              <p
                class="text-gray-300 text-[8px] md:text-xs leading-tight hidden xs:block"
              >
                Tráfego, cupons e métricas de negócio.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-lg p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div
                class="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-2 mb-1"
              >
                <div
                  class="feature-icon w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"
                >
                  <i class="fas fa-users text-white text-[10px] md:text-sm"></i>
                </div>
                <h4
                  class="text-[9px] md:text-sm lg:text-base font-semibold leading-none sm:leading-normal"
                >
                  Comunidade
                </h4>
              </div>
              <p
                class="text-gray-300 text-[8px] md:text-xs leading-tight hidden xs:block"
              >
                Experiências validadas pela comunidade.
              </p>
            </div>
          </div>
        </div>

        <!-- Floating Images -->
        <div class="relative hidden sm:block">
          <div
            class="floating-image absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 opacity-60"
          ></div>
          <div
            class="floating-image absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 opacity-40"
          ></div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
</style>
