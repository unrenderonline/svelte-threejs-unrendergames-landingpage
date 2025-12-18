import { mount } from 'svelte';
import App from './App.svelte';
import './styles/global.css';

// Svelte 5 native instantiation using `mount`
const app = mount(App, { target: document.getElementById('app') });

export default app;
