import { writable } from 'svelte/store';

export const contactModalState = writable({
    isOpen: false,
    title: ''
});
