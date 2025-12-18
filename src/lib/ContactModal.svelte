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
        gsap.set([overlayEl, panelEl], { display: "block" });

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
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
            class="relative z-[110] w-full max-w-2xl bg-gradient-to-br from-unrender-purple to-[#0a0a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            style="display: none;"
        >
            <!-- Header -->
            <div class="relative px-8 pt-8 pb-6 border-b border-white/10">
                <div class="flex items-start justify-between">
                    <div>
                        <h2
                            id="contact-modal-title"
                            class="text-3xl font-bold text-white font-['Montserrat']"
                        >
                            {title}
                        </h2>
                        <p class="mt-2 text-sm text-white/70">
                            Preencha o formulário abaixo. Entraremos em contato
                            imediatamente!
                        </p>
                    </div>
                    <button
                        type="button"
                        class="ml-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        on:click={closeModal}
                        aria-label="Fechar modal"
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
            </div>

            <!-- Form Body -->
            <form on:submit={handleSubmit} class="px-8 py-6">
                <div class="space-y-5">
                    <!-- Name Input -->
                    <div>
                        <label
                            for="contact-name"
                            class="block text-sm font-medium text-white/90 mb-2"
                        >
                            Nome
                        </label>
                        <input
                            id="contact-name"
                            type="text"
                            bind:value={name}
                            required
                            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-unrender-accent focus:border-transparent transition-all"
                            placeholder="Seu nome completo"
                        />
                    </div>

                    <!-- Email Input -->
                    <div>
                        <label
                            for="contact-email"
                            class="block text-sm font-medium text-white/90 mb-2"
                        >
                            Email
                        </label>
                        <input
                            id="contact-email"
                            type="email"
                            bind:value={email}
                            required
                            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-unrender-accent focus:border-transparent transition-all"
                            placeholder="seu.email@exemplo.com"
                        />
                    </div>

                    <!-- Phone Input -->
                    <div>
                        <label
                            for="contact-phone"
                            class="block text-sm font-medium text-white/90 mb-2"
                        >
                            Telefone
                        </label>
                        <input
                            id="contact-phone"
                            type="tel"
                            bind:value={phone}
                            on:input={handlePhoneInput}
                            required
                            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-unrender-accent focus:border-transparent transition-all"
                            placeholder="(11) 98765-4321"
                        />
                    </div>

                    <!-- Message Textarea -->
                    <div>
                        <label
                            for="contact-message"
                            class="block text-sm font-medium text-white/90 mb-2"
                        >
                            Mensagem
                        </label>
                        <textarea
                            id="contact-message"
                            bind:value={message}
                            required
                            rows="5"
                            class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-unrender-accent focus:border-transparent transition-all resize-none"
                            placeholder="Conte-nos sobre seu projeto ou dúvida..."
                        ></textarea>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div
                    class="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-white/10"
                >
                    <button
                        type="button"
                        class="px-6 py-2.5 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all"
                        on:click={closeModal}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        class="px-6 py-2.5 rounded-lg font-medium bg-unrender-accent text-white hover:bg-unrender-accent/90 hover:shadow-lg hover:shadow-unrender-accent/30 transition-all transform hover:scale-105"
                    >
                        Enviar Mensagem
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    /* Ensure font family matches navbar */
    :global(.font-\[\'Montserrat\'\]) {
        font-family: "Montserrat", "Roboto", "Inter", sans-serif;
    }
</style>
