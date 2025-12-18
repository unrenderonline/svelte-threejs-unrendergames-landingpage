Assets folder (src/assets)

Place images, SVGs, and other media you import from Svelte components under `src/assets`.

Note: Files placed under the project `static/` directory are served as literal static assets at the site root (for example `/images/placeholder.svg`). Use `static/` for images referenced directly in HTML or meta tags and `src/assets/` for images imported into components (which will be processed by Vite).

Example usage:

In a Svelte component:
```svelte
<script>
  import logo from '$lib/../assets/logo.svg';
</script>

<img src={logo} alt="logo" />
```
