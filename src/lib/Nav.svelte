<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import ContactModal from "./ContactModal.svelte";
    import { contactModalState } from "./modalStore.js";

    let isScrolled = false;
    let isMobileMenuOpen = false;
    let windowWidth = 1400; // Default to desktop size

    $: isContactOpen = $contactModalState.isOpen;
    $: isMobile = windowWidth < 1300;

    // Force white background on Home (/) and Jogos (/jogos) pages
    // Checks for exact match on / or if it starts with /jogos
    $: isAlwaysSolid =
        $page.url.pathname === "/" || $page.url.pathname.startsWith("/jogos");

    // Determine if we should show the solid navbar style
    $: showSolidNav = isScrolled || isAlwaysSolid;

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    function closeMobileMenu() {
        isMobileMenuOpen = false;
    }

    function openContact() {
        const path = window.location.pathname.toLowerCase();
        let title = ""; // Default empty for Inicio page

        if (path.includes("fortnite")) title = "Fortnite";
        else if (path.includes("roblox")) title = "Roblox";
        else if (path.includes("jogos")) title = "Jogos";
        else if (path.includes("web-interativa")) title = "Web Interativa";
        else if (path.includes("modelagem-3d")) title = "Modelagem 3D";
        else if (path.includes("audiovisual")) title = "AudioVisual";

        contactModalState.set({ isOpen: true, title });
    }

    function closeContact() {
        contactModalState.update((s) => ({ ...s, isOpen: false }));
    }

    // Navigation helper to handle both scrolling and closing menu
    function handleNavigation() {
        closeMobileMenu();
    }

    onMount(() => {
        windowWidth = window.innerWidth;

        const handleScroll = () => {
            isScrolled = window.scrollY > 0;
        };

        const handleResize = () => {
            windowWidth = window.innerWidth;
            if (windowWidth >= 1300) {
                isMobileMenuOpen = false;
            }
        };

        const handleKey = (e) => {
            if (e.key === "Escape") {
                if (isContactOpen) closeContact();
                else closeMobileMenu();
            }
        };

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleResize);
        window.addEventListener("keydown", handleKey);

        // Initial check
        handleScroll();

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("keydown", handleKey);
        };
    });
</script>

<nav
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 navbar"
    class:bg-white={showSolidNav}
    class:shadow-lg={showSolidNav}
    class:scrolled={showSolidNav}
    class:backdrop-blur-sm={!showSolidNav}
>
    <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16 lg:h-20">
            <a
                class="flex items-center space-x-2 text-xl font-bold navbar-brand"
                href="/"
                class:text-gray-900={showSolidNav}
                class:text-white={!showSolidNav}
            >
                <img
                    class="w-10 h-10 object-contain"
                    src="images/unrender-logo-small.png"
                    alt="Unrender Logo"
                />
                <span>UNRENDER</span>
            </a>

            <button
                class="p-2 rounded-md transition-colors navbar-toggler"
                class:hover:bg-gray-100={showSolidNav}
                class:hover:bg-white={!showSolidNav}
                class:bg-opacity-10={!showSolidNav}
                class:hidden={!isMobile}
                style={!showSolidNav
                    ? "background-color: rgba(255, 255, 255, 0.1);"
                    : ""}
                type="button"
                on:click={toggleMobileMenu}
                aria-label="Toggle navigation"
            >
                <svg
                    class="w-6 h-6 navbar-toggler-icon"
                    class:text-gray-900={showSolidNav}
                    class:text-white={!showSolidNav}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            </button>

            <!-- Desktop Menu -->
            <div
                class="items-center space-x-8"
                class:hidden={isMobile}
                class:flex={!isMobile}
            >
                <ul class="flex space-x-8">
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/">Início</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/jogos">Jogos</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/web-interativa">Web Interativa</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/modelagem-3d">Modelagem 3D</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/fortnite">Fortnite</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/roblox">Roblox</a
                        >
                    </li>
                    <li>
                        <a
                            class="transition-colors hover:text-unrender-accent nav-link"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            href="/audiovisual">AudioVisual</a
                        >
                    </li>
                    <li>
                        <button
                            type="button"
                            class="transition-colors hover:text-unrender-accent nav-link bg-transparent border-0 p-0"
                            class:text-gray-900={showSolidNav}
                            class:text-white={!showSolidNav}
                            on:click={openContact}>Contato</button
                        >
                    </li>
                </ul>
            </div>
        </div>

        <!-- Mobile menu overlay backdrop -->
        {#if isMobileMenuOpen}
            <div
                class="fixed inset-0 bg-black/50 z-[55] transition-opacity duration-300"
                on:click={closeMobileMenu}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === "Enter" && closeMobileMenu()}
                aria-label="Close menu"
            ></div>
        {/if}

        <!-- Mobile menu container (Drawer) -->
        <div
            class="fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out"
            class:translate-x-0={isMobileMenuOpen}
            class:translate-x-full={!isMobileMenuOpen}
            class:hidden={!isMobile && !isMobileMenuOpen}
        >
            <div class="flex flex-col h-full">
                <div class="flex justify-end p-4">
                    <button
                        on:click={closeMobileMenu}
                        class="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                        aria-label="Close menu"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <ul class="py-2 space-y-1 overflow-y-auto">
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/"
                            on:click={handleNavigation}>INICIO</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/jogos"
                            on:click={handleNavigation}>Jogos</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/web-interativa"
                            on:click={handleNavigation}>Web Interativa</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/modelagem-3d"
                            on:click={handleNavigation}>Modelagem 3D</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/fortnite"
                            on:click={handleNavigation}>Fortnite</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/roblox"
                            on:click={handleNavigation}>Roblox</a
                        >
                    </li>
                    <li>
                        <a
                            class="block px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent"
                            href="/audiovisual"
                            on:click={handleNavigation}>AudioVisual</a
                        >
                    </li>
                    <li>
                        <button
                            type="button"
                            class="block w-full text-left px-6 py-3 text-gray-800 font-medium hover:bg-gray-50 hover:text-unrender-accent transition-colors border-l-4 border-transparent hover:border-unrender-accent bg-transparent border-0"
                            on:click={() => {
                                closeMobileMenu();
                                openContact();
                            }}>Contato</button
                        >
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>

<ContactModal />

<style>
    :global(:root) {
        --unrender-accent: #ffa500;
    }

    .navbar {
        font-family: "Montserrat", "Roboto", "Inter", sans-serif !important;
        transition:
            background-color 0.4s ease-out,
            backdrop-filter 0.4s ease-out;
        transition: padding 0.4s ease-out;
    }

    .navbar .navbar-brand,
    .navbar .nav-link {
        display: flex;
        justify-content: center;
        align-items: center;
        color: #f0f0f0; /* Cor off-white para o texto transparente */
        transition:
            color 0.4s ease-out,
            transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

        position: relative;
    }

    /* Remove underline effect */
    /* Brand hover effect: Scale up */
    .navbar .navbar-brand:hover,
    .navbar .navbar-brand:focus,
    .navbar .navbar-brand.active {
        transform: scale(1.1);
    }

    /* Nav items hover effect: Orange, no scale */
    .navbar .nav-link:hover,
    .navbar .nav-link:focus,
    .navbar .nav-link.active {
        color: var(
            --unrender-accent
        ) !important; /* Force override of utility classes */
        transform: none; /* Ensure no scale for links */
    }

    .navbar .container {
        transition: all 0.4s ease-out;
    }

    /* Estilos aplicados quando a página é rolada */
    .navbar.scrolled {
        background-color: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
    }

    .navbar.scrolled .navbar-brand,
    .navbar.scrolled .nav-link {
        color: #0a192f; /* Cor azul escuro para o texto quando com fundo branco */
    }

    /* Keep accent color on hover even when scrolled */
    .navbar.scrolled .nav-link:hover,
    .navbar.scrolled .nav-link:focus,
    .navbar.scrolled .nav-link.active {
        color: var(--unrender-accent) !important;
    }

    .navbar.scrolled .navbar-toggler-icon {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(10, 25, 47, 0.8)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
    }

    .navbar .navbar-toggler-icon {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(240, 240, 240, 0.8)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
    }
</style>
