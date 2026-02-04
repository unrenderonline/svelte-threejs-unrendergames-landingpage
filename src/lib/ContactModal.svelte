<script>
    import { onMount } from "svelte";
    import gsap from "gsap";

    import { contactModalState } from "./modalStore.js";

    // Remove props as we use store now
    // export let isOpen = false;
    // export let onClose = () => {};

    let name = "";
    let email = "";
    let phone = "";
    let message = "";
    let overlayEl;
    let panelEl;

    // Subscribe to store
    $: isOpen = $contactModalState.isOpen;
    $: title = $contactModalState.title || "Entre em Contato";

    // Watch for isOpen changes and trigger animations
    $: if (overlayEl && panelEl) {
        if (isOpen) {
            openModal();
        } else {
            closeModal();
        }
    }

    function openModal() {
        // Reset and show elements
        gsap.set(overlayEl, { display: "block" });
        gsap.set(panelEl, { display: "flex" });

        // Animate overlay fade in
        gsap.fromTo(
            overlayEl,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" },
        );

        // Animate panel: scale + fade + slight Y movement
        gsap.fromTo(
            panelEl,
            {
                opacity: 0,
                scale: 0.9,
                y: 20,
            },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.4,
                ease: "back.out(1.2)",
                delay: 0.1,
            },
        );
    }

    function closeModal() {
        // Animate out
        gsap.to(overlayEl, {
            opacity: 0,
            duration: 0.25,
            ease: "power2.in",
        });

        gsap.to(panelEl, {
            opacity: 0,
            scale: 0.95,
            y: 10,
            duration: 0.25,
            ease: "power2.in",
            onComplete: () => {
                gsap.set([overlayEl, panelEl], { display: "none" });
                contactModalState.update((s) => ({ ...s, isOpen: false }));
            },
        });
    }

    function formatPhoneNumber(value) {
        // Remove all non-digit characters
        const digits = value.replace(/\D/g, "");

        // Limit to 11 digits (2 DDD + 9 mobile digits)
        const limited = digits.slice(0, 11);

        // Apply formatting
        if (limited.length <= 2) {
            return limited;
        } else if (limited.length <= 6) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
        } else if (limited.length <= 10) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
        } else {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
        }
    }

    function handlePhoneInput(e) {
        phone = formatPhoneNumber(e.target.value);
    }

    function handleSubmit(e) {
        e.preventDefault();
        // TODO: Wire to your backend/email service
        console.log("Contact form submitted:", {
            name,
            email,
            phone,
            message,
            title,
        });
        // Reset form
        name = "";
        email = "";
        phone = "";
        message = "";
        closeModal();
    }

    function handleOverlayClick() {
        closeModal();
    }

    function handleKeydown(e) {
        if (e.key === "Escape") {
            closeModal();
        }
    }
    function portal(node) {
        let target = document.body;
        async function update() {
            target.appendChild(node);
            node.hidden = false;
        }
        update();
        return {
            destroy() {
                if (node.parentNode) node.parentNode.removeChild(node);
            },
        };
    }
</script>

{#if isOpen}
    <div
        use:portal
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        on:keydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        tabindex="-1"
    >
        <!-- Overlay -->
        <div
            bind:this={overlayEl}
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            on:click={handleOverlayClick}
            aria-hidden="true"
            style="display: none;"
        ></div>

        <!-- Modal Panel -->
        <div
            bind:this={panelEl}
            class="relative z-[10000] w-full max-w-4xl bg-gradient-to-br from-unrender-purple to-[#0a0a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row"
            style="display: none;"
        >
            <!-- Left Side: Header & Socials -->
            <div class="md:w-5/12 p-8 bg-black/20 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10">
                <div>
                    <h2 class="text-3xl font-bold text-white font-['Montserrat'] mb-2">
                        {title}
                    </h2>
                    <p class="text-sm text-white/70 mb-8">
                        Estamos prontos para criar algo incrível. Como você prefere falar com a gente?
                    </p>

                    <div class="grid grid-cols-2 gap-3">
                        <!-- WhatsApp Button -->
                        <div class="group">
                             <a href="https://wa.me/5565999207154" target="_blank" class="w-full flex flex-col items-center justify-center text-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 group-hover:bg-unrender-accent group-hover:border-unrender-accent group-hover:shadow-lg group-hover:shadow-unrender-accent/20 cursor-pointer h-full">
                                <div class="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <i class="fa-brands fa-whatsapp text-xl text-[#25D366] group-hover:text-white"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5 group-hover:text-white/80">WhatsApp</p>
                                    <p class="text-xs font-bold text-white leading-tight">Conversa Direta</p>
                                </div>
                             </a>
                        </div>

                        <!-- Instagram Button -->
                         <div class="group">
                             <a href="https://instagram.com/unrender.games" target="_blank" class="w-full flex flex-col items-center justify-center text-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 group-hover:bg-unrender-accent group-hover:border-unrender-accent group-hover:shadow-lg group-hover:shadow-unrender-accent/20 cursor-pointer h-full">
                                <div class="w-10 h-10 rounded-full bg-[#E1306C]/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <i class="fa-brands fa-instagram text-xl text-[#E1306C] group-hover:text-white"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5 group-hover:text-white/80">Instagram</p>
                                    <p class="text-xs font-bold text-white leading-tight">Siga & DM</p>
                                </div>
                             </a>
                        </div>
                    </div>
                </div>

                <div class="hidden md:block mt-8">
                    <p class="text-xs text-white/40">
                        Responderemos o mais breve possível em horário comercial.
                    </p>
                </div>
            </div>

            <!-- Right Side: Form -->
            <div class="md:w-7/12 relative">
                <!-- Close Button (Mobile/Desktop absolute positioning) -->
                <button
                    type="button"
                    class="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
                    on:click={closeModal}
                    aria-label="Fechar modal"
                >
                     <i class="fas fa-times text-xl"></i>
                </button>

                <form on:submit={handleSubmit} class="p-6 md:p-8 h-full flex flex-col justify-center">
                    <p class="text-sm text-white/50 mb-6 uppercase tracking-wider font-semibold">Ou mande um e-mail</p>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Name -->
                            <div class="relative group">
                                <i class="fas fa-user absolute left-3 top-3.5 text-white/30 text-sm group-focus-within:text-unrender-accent transition-colors"></i>
                                <input
                                    type="text"
                                    bind:value={name}
                                    required
                                    class="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:border-unrender-accent focus:ring-1 focus:ring-unrender-accent transition-all"
                                    placeholder="Nome"
                                />
                            </div>
                            <!-- Phone -->
                            <div class="relative group">
                                <i class="fas fa-phone absolute left-3 top-3.5 text-white/40 text-sm group-focus-within:text-unrender-accent transition-colors"></i>
                                <input
                                    type="tel"
                                    bind:value={phone}
                                    on:input={handlePhoneInput}
                                    required
                                    class="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:border-unrender-accent focus:ring-1 focus:ring-unrender-accent transition-all"
                                    placeholder="Telefone / WhatsApp"
                                />
                            </div>
                        </div>

                        <!-- Email -->
                        <div class="relative group">
                            <i class="fas fa-envelope absolute left-3 top-3.5 text-white/40 text-sm group-focus-within:text-unrender-accent transition-colors"></i>
                            <input
                                type="email"
                                bind:value={email}
                                required
                                class="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:border-unrender-accent focus:ring-1 focus:ring-unrender-accent transition-all"
                                placeholder="E-mail"
                            />
                        </div>

                        <!-- Message -->
                        <div class="relative group">
                            <i class="fas fa-comment absolute left-3 top-3.5 text-white/40 text-sm group-focus-within:text-unrender-accent transition-colors"></i>
                            <textarea
                                bind:value={message}
                                required
                                rows="3"
                                class="w-full pl-9 pr-4 py-3 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:border-unrender-accent focus:ring-1 focus:ring-unrender-accent transition-all resize-none"
                                placeholder="Como podemos ajudar?"
                            ></textarea>
                        </div>
                    </div>

                    <div class="mt-6 flex items-center justify-end gap-3">
                         <button
                            type="button"
                            class="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
                            on:click={closeModal}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            class="px-6 py-2 rounded-lg text-sm font-bold bg-white text-unrender-purple hover:bg-unrender-accent hover:text-white transition-all shadow-lg hover:shadow-unrender-accent/20 transform hover:-translate-y-0.5"
                        >
                            ENVIAR MENSAGEM
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Ensure font family matches navbar */
    :global(.font-\[\'Montserrat\'\]) {
        font-family: "Montserrat", "Roboto", "Inter", sans-serif;
    }
</style>
