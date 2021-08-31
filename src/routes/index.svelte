<script context="module" lang="ts">
	export const prerender = true;

	export async function load({fetch}) {
		const resp = await fetch("https://api.sibr.dev/corsmechanics/www.blaseball.com/database/simulationData");
		if (!resp.ok) {
			throw new Error(await resp.text())
		}

		const json = await resp.json();
		return {
			props: {
				currentSeasonNumber:json.season
			}
		};
	}
</script>

<script lang="ts">
	export let currentSeasonNumber;

	import FlactorioGen from '$lib/flactorioGen.svelte';

	let seasonSelected = currentSeasonNumber;
	let daySelected;
	let gameSelected;
	let genGameId;
	let generator = undefined;
	let dayCountPromise = getDayCountForSeason();
	let gameSelectedPromise = new Promise(() => {});
	let generationPromise = new Promise(() => {});

	async function getDayCountForSeason() {
		daySelected = undefined;
		gameSelected = undefined;
		genGameId = undefined;

		const reqUrl = new URL("https://api.sibr.dev/corsmechanics/www.blaseball.com/database/seasondaycount");
		reqUrl.searchParams.set("season", seasonSelected);
		const resp = await fetch(reqUrl.href);
		if (!resp.ok) {
			throw new Error(await resp.text())
		}

		const json = await resp.json();
		daySelected = json.dayCount;
		gameSelectedPromise = getGamesForSeasonAndDay()
		return json.dayCount;
	}

	async function getGamesForSeasonAndDay() {
		gameSelected = undefined;
		genGameId = undefined;

		const reqUrl = new URL("https://api.sibr.dev/chronicler/v1/games");
		reqUrl.searchParams.set("season", seasonSelected);
		reqUrl.searchParams.set("day", daySelected);
		const resp = await fetch(reqUrl.href);
		if (!resp.ok) {
			throw new Error(await resp.text())
		}

		const json = await resp.json();
		const games = json.data.map(g => ({
			gameId: g.gameId,
			awayTeamNickname: g.data.awayTeamNickname,
			homeTeamNickname: g.data.homeTeamNickname
		}));
		gameSelected = games[0];
		return games;
	}

	function imfeelinglucky() {
		seasonSelected = Math.round(Math.random() * 24);
		daySelected = Math.round(Math.random() * 99);

		gameSelectedPromise = getGamesForSeasonAndDay();
	}

	function selectGame() {
		console.log({gameSelected});
		if(generator && generator.regenerate) {
			generator.regenerate();
			return;
		}
		genGameId = gameSelected.gameId;
	}
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<section>
	For when you want to re-watch your favorite game while working on your factory.
</section>

<section>
	<button on:click={imfeelinglucky}>I'm feeling lucky</button>
</section>

<section>
	<form>
		<div>
			Season:
			<select bind:value={seasonSelected} on:change={() => {dayCountPromise = getDayCountForSeason()}}>
				{#await currentSeasonNumber}
					<option disabled>Loading...</option>
				{:then number}
					{#each Array(number + 1) as _, i}
						<option value={number-i}>{number-i + 1}</option>
					{/each}
				{/await}
			</select>
			{#if seasonSelected}
				Day:
				<select bind:value={daySelected} on:change={() => {gameSelectedPromise = getGamesForSeasonAndDay()}}>
					{#await dayCountPromise}
						<option disabled>Loading...</option>
					{:then dayCount}
						{#each Array(dayCount + 1) as _, i}
							<option value={dayCount-i}>{dayCount-i + 1}</option>
						{/each}
					{/await}
				</select>
			{/if}
			{#if daySelected !== undefined}
				Game:
				<select bind:value={gameSelected} on:change={() => {genGameId = undefined}}>
					{#await gameSelectedPromise}
						<option disabled>Loading...</option>
					{:then games}
						{#each games as game}
							<option value={game}>{game.awayTeamNickname} @ {game.homeTeamNickname}</option>
						{/each}
					{/await}
				</select>
			{/if}
		</div>
		<div>
			{#if gameSelected !== undefined}
				<button on:click|preventDefault={selectGame}>Generate</button>
			{/if}
		</div>

	</form>

</section>

<section>
{#if genGameId !== undefined}
	<FlactorioGen bind:this={generator} gameId={genGameId} />
{/if}
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
