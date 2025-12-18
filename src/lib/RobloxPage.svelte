<script>
  import { onMount, onDestroy } from "svelte";
  import { gsap } from "gsap";

  import Carousel from "./Carousel.svelte";
  import { contactModalState } from "./modalStore.js";

  const carouselSlides = [
    {
      type: "video",
      videoId: "6oxS0OHzmig",
      alt: "BIS & Roblox",
      label: "Assista a experiência BIS no Roblox!",
    },
    {
      type: "image",
      src: "/images/roblox_banner1.jpg",
      alt: "Roblox Banner",
      label: "Eventos Especiais",
      link: "#",
    },
    {
      type: "image",
      src: "/images/roblox_banner2.jpg",
      alt: "Games",
      label: "Jogos e Experiências!",
      link: "#",
    },
    {
      type: "image",
      src: "/images/bis_roblox.jpg",
      alt: "Games",
      label: "MorumBIS: Evento no Roblox da BIS",
      link: "https://forbes.com.br/forbes-mkt/2025/08/bis-lanca-experiencia-imersiva-no-roblox-com-ambientacao-no-estadio-morumbis/",
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
  class="fixed inset-0 bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white overflow-hidden pt-20 lg:pt-24 flex flex-col"
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
            class="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur-lg opacity-30"
          ></div>
          <div
            class="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full aspect-video max-h-[20vh] lg:max-h-[30vh]"
          >
            <Carousel slides={carouselSlides} />
          </div>
        </div>
      </div>

      <!-- Roblox Character -->
      <div
        class="character-image absolute left-0 -translate-x-24 top-0 bottom-0 w-48 lg:w-auto lg:-translate-x-48 lg:top-0"
      >
        <img
          src="/images/roblox_skin1.png"
          alt="Roblox Character"
          class="h-full w-full object-contain"
        />
      </div>

      <!-- Roblox Dance GIF -->
      <div
        class="dance-gif absolute right-0 translate-x-12 top-20 bottom-0 w-48 lg:w-auto lg:translate-x-48 lg:top-0 lg:right-0"
      >
        <div class="relative">
          <div
            class="absolute -inset-4 bg-gradient-to-l from-orange-500 to-red-600 blur-xl opacity-20 animate-pulse"
          ></div>
          <div
            class="relative bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm p-4 border border-orange-500/20"
          >
            <img
              src="/images/roblox-dance.gif"
              alt="Roblox Dance Animation"
              class="h-full w-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <!-- Game Content - Second on mobile, right on desktop -->
      <div
        class="order-2 lg:order-2 flex flex-col justify-center h-full min-h-0 space-y-1 md:space-y-2 lg:space-y-4 text-center lg:text-left overflow-y-auto lg:overflow-visible pr-1"
      >
        <!-- Game Title -->
        <div class="game-title shrink-0">
          <img
            src="/images/roblox_logo.png"
            alt="Roblox Logo"
            class="h-8 sm:h-10 md:h-14 lg:h-20 xl:h-24 mb-1 md:mb-2 lg:mb-4 mx-auto lg:mx-0"
          />
          <div
            class="w-12 md:w-16 lg:w-24 h-0.5 md:h-0.5 lg:h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto lg:mx-0"
          ></div>
        </div>

        <div
          class="game-description space-y-1 md:space-y-2 lg:space-y-4 shrink-0"
        >
          <h3
            class="text-xs sm:text-sm md:text-lg lg:text-xl font-semibold text-white mb-1 md:mb-2 lg:mb-4"
          >
            Realize sua ação com quem domina o Roblox Studio: Mapas, Jogos e
            Eventos.
          </h3>
          <button
            class="px-4 py-1.5 md:px-6 md:py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full font-bold text-xs md:text-base hover:scale-105 transition-transform shadow-lg hover:shadow-orange-500/50"
            on:click={() =>
              contactModalState.update((s) => ({
                ...s,
                isOpen: true,
                title: "Roblox",
              }))}
          >
            FAZER ORÇAMENTO
          </button>
          <p
            class="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-400 max-w-lg mx-auto lg:mx-0 hidden md:block"
          >
            Somos desenvolvedores especializados em criar mapas detalhados,
            jogos envolventes e réplicas fieis de lugares reais.
          </p>
        </div>

        <!-- Game Features -->
        <div class="space-y-1 md:space-y-2 lg:space-y-4 shrink min-h-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3">
            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-xl p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex items-center space-x-1.5 md:space-x-2 mb-1">
                <div
                  class="feature-icon w-4 h-4 md:w-6 md:h-6 rounded-lg flex items-center justify-center"
                >
                  <i class="fas fa-globe text-white text-xs md:text-lg"></i>
                </div>
                <h4 class="text-[10px] md:text-sm lg:text-base font-semibold">
                  Mapas e Réplicas de Lugares
                </h4>
              </div>
              <p class="text-gray-300 text-[9px] md:text-xs leading-tight">
                Desenvolvemos mapas complexos e réplicas digitais exatas de
                espaços físicos, trazendo o mundo real para o metaverso do
                Roblox.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-xl p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex items-center space-x-1.5 md:space-x-2 mb-1">
                <div
                  class="feature-icon w-4 h-4 md:w-6 md:h-6 rounded-lg flex items-center justify-center"
                >
                  <i class="fas fa-gamepad text-white text-xs md:text-lg"></i>
                </div>
                <h4 class="text-[10px] md:text-sm lg:text-base font-semibold">
                  Jogos e Experiências (Games)
                </h4>
              </div>
              <p class="text-gray-300 text-[9px] md:text-xs leading-tight">
                Criamos mecânicas de jogo divertidas e viciantes (Obbys,
                Tycoons, RPGs) que garantem alto tempo de permanência e
                engajamento.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-xl p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex items-center space-x-1.5 md:space-x-2 mb-1">
                <div
                  class="feature-icon w-4 h-4 md:w-6 md:h-6 rounded-lg flex items-center justify-center"
                >
                  <i class="fas fa-chart-bar text-white text-xs md:text-lg"></i>
                </div>
                <h4 class="text-[10px] md:text-sm lg:text-base font-semibold">
                  Métricas e Performance
                </h4>
              </div>
              <p class="text-gray-300 text-[9px] md:text-xs leading-tight">
                Acompanhe o sucesso através de dados precisos de visitas, tempo
                de sessão e retenção de usuários na sua experiência.
              </p>
            </div>

            <div
              class="feature-item bg-white/10 backdrop-blur-sm rounded-xl p-1.5 md:p-3 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex items-center space-x-1.5 md:space-x-2 mb-1">
                <div
                  class="feature-icon w-4 h-4 md:w-6 md:h-6 rounded-lg flex items-center justify-center"
                >
                  <i class="fas fa-users text-white text-xs md:text-lg"></i>
                </div>
                <h4 class="text-[10px] md:text-sm lg:text-base font-semibold">
                  Comunidade e UGC
                </h4>
              </div>
              <p class="text-gray-300 text-[9px] md:text-xs leading-tight">
                Aproveite o poder do Conteúdo Gerado pelo Usuário e construa uma
                comunidade leal em torno da sua marca no Roblox.
              </p>
            </div>
          </div>
        </div>

        <!-- Floating Images -->
        <div class="relative">
          <div
            class="floating-image absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 opacity-60"
          ></div>
          <div
            class="floating-image absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-red-400 to-orange-600 opacity-40"
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
