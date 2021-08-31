<script lang="ts">
	export let gameId;

	import {SibrGameLoader} from "$lib/sibr";
	import {convertBlueprintJson} from "$lib/flactorioUtils";
	import {RenderIntoBlueprintJson} from "$lib/blueprintGen";
	import type {ParsedDataStruct} from "$lib/sibr";
	import {getSignal} from "$lib/blueprints/utils";

	let replayRuntime = 0;

	getSignal(true /* reset */);
	let genPromise = GenBlueprint();

	export function regenerate() {
		getSignal(true /* reset */);
		genPromise = GenBlueprint();
	};

	async function LoadGameContent(): Promise<ParsedDataStruct> {
		let gameEvents = [];
		const reqUrl = new URL("https://api.sibr.dev/chronicler/v1/games/updates");
		reqUrl.searchParams.set("game", gameId);

		const loader = SibrGameLoader();
		let pageToken = undefined;
		while(!loader.isDone()) {
			if (pageToken) {
				reqUrl.searchParams.set("page", pageToken);
			}

			const resp = await fetch(reqUrl.href);
			if (!resp.ok) {
				throw new Error(await resp.text())
			}

			const json = await resp.json();
			pageToken = json.nextPage;

			loader.loadEach(json.data);
		}
		console.log({loaderData: loader.getData()});
		return loader.getData();
	}
	async function GenBlueprint() {
		const {blueprintJson, runtime} = RenderIntoBlueprintJson(
			await LoadGameContent()
		);
		replayRuntime = runtime;
		analyzeBlueprint(blueprintJson);
		return convertBlueprintJson(
			blueprintJson
		);
	};

	let componentCounts = [];
	function analyzeBlueprint(blueprintJson) {
		const compCount = {};
		blueprintJson.blueprint.entities.forEach(e => {
			compCount[e.name] = (compCount[e.name] || 0) + 1;
		});
		componentCounts = Object.entries(compCount)
		    .sort(([,a],[,b]) => b-a);
	};
</script>

<div>
	gameId={gameId}
{#await genPromise}
	Loading
{:then blueprint}
	<div class="flexcol">
		<div class="row">
			<div class="column">
				<p>blueprint is</p>
				<textarea>0{blueprint}</textarea>
			</div>
			<div class="column">
				<p>
					Components needed:
				</p>
				<ul>
				{#each componentCounts as compCount}
					<li>{compCount[0]} ({compCount[1]})</li>
				{/each}
				</ul>

				<p>
					Replay Runtime: {Math.floor(replayRuntime / 60)} minutes
				</p>
			</div>
		</div>
	</div>
{:catch error}
	 {console.log({error}), ""}
	ohno {error}
{/await}
</div>

<style>
	div {
		margin-top: 2em;
		width: 100%;
	}

	textarea {
		width: 100%;
		height:  100%;
	}

	.row {
	  display: flex;
	  flex-direction: row;
	  flex-wrap: wrap;
	  width: 100%;
	}

	.column {
	  display: flex;
	  flex-direction: column;
	  flex-basis: 100%;
	  flex: 1;
	}
</style>
