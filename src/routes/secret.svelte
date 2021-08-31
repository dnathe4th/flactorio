<script context="module" lang="ts">
	export const prerender = true;
</script>

<script lang="ts">
	import {devertBlueprintJson} from "$lib/flactorioUtils";

	let incomingBlueprint: string;
	let outgoingJson: string;

	function evaluateBlueprint(): void {
		outgoingJson = devertBlueprintJson(incomingBlueprint);
	}
</script>

<svelte:head>
	<title>Secret</title>
</svelte:head>

<p>This utility deserializes a factorio blueprint to its json representation. Left here in case it is as useful to anyone else as it was to me during debugging.</p>

<section>
	<textarea bind:value={incomingBlueprint} on:change={evaluateBlueprint}></textarea>
</section>

<section>
	<textarea bind:value={outgoingJson}></textarea>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 1;
	}
</style>
