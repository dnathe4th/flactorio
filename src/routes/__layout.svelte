<script lang="ts">
	import Header from '$lib/header/Header.svelte';
	import '../app.css';
</script>

<div>
	<Header />

	<main>
		<slot />
	</main>
</div>

<style>
	div {
		max-width: var(--column-width);
		margin: 0 auto;
	}

	main {
		padding: 1rem;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
		background:  white;
	}
</style>
