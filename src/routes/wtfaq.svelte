<script context="module" lang="ts">
	export const prerender = true;
</script>

<svelte:head>
	<title>WTFaq</title>
</svelte:head>

<div class="content">
	<h3>What is this?</h3>

	<p>
		This a <a href="https://factorio.com/">factorio</a> generator in javascript to fetch a <a href="https://blaseball.com">blaseball</a> game from <a href="https://sibr.dev">sibr</a> and render it in-game.
	</p>

	<hr />

	<h3>What</h3>

	<p>
		The Society for Internet Blaseball Research decided to ruin everyone's August by having a <a href="https://cursed.sibr.dev/">hackathon to create the most cursed way to view a blaseball game</a>. This is my submission.
	</p>

	<hr />

	<h3>Where is the code</h3>

	<p><a href="https://github.com/dnathe4th/flactorio">https://github.com/dnathe4th/flactorio</a></p>

	<hr />

	<h3>How does it work</h3>

	<p>After fetching the set of game events from SIBR, several dictionaries of data are constructed for use in the replay (list of home team player names, list of away team names, list of scores, etc. etc.). Displays are generated (static or scrolling depending on the use) based on the size required by the data, and Decider Combinator / Arithmatic Combinator / Constant Combinators set with the necessary values are wired up to the displays. A clock ticks the heartbeat of the replay to sync across the various displays and stores.</p>

	<hr />

	<h3>What</h3>

	<img width="100%" src="/layout.png" alt="blaseball base layout">
	<p>Here's a visual layout of a game, very zoomed out. It has the following components:</p>
	<ol>
		<li>Storage for all text updates of the game, left section for individual letter rendering, middle section for word rendering, right section to sentence rendering.</li>
		<li>Scrolling display for game events.</li>
		<li>Static displays for current game state, including blaseball diamond.</li>
		<li>Storage for each game event.</li>
	</ol>

	<hr />

	<h3>Sure but like, does it work?</h3>

	<img width="100%" src="/flactorio-working-2.gif" alt="animated gif of blaseball replay">
	<p>You be the judge.</p>

	<hr />

	<h3><a href="https://www.blaseball.wiki/w/Season_9/Crowvertime">Crowvertime</a>?</h3>

	<img width="100%" src="/crowvertime.png" alt="crowvertime in flactorio">
	<p>Sure why not.</p>

	<hr />

	<h3>Doesn't seem very cursed</h3>

	<p>The blueprint takes A LOT of components, sometimes in the 10's of thousands. A sub-average player like myself would likely need to spend upwards of 15 hours in factorio to get to a point where there are enough machines and robots and such to construct the blueprint.</p>

	<hr />

	<h3>What if I am willing to cheat?</h3>

	<p>Factorio has some cheat commands that allow you to give yourselves items and such, that might be a short cut if you REALLY want to watch a game in factorio but can't be bothered to actually play factorio.</p>

	<hr />

	<h3>OK I built the blueprint, how do I get it to run?</h3>

	<p>The replay does not start on its own, because there is no way to know whether the construction is "done" before hte game loop starts. You need to connect a single red wire at the components between the Game Events block and the Home Team display. Take a look, you want to turn this:</p>

	<img width="100%" src="/disconnected.png" alt="how to start the replay">

	<p>into this:</p>

	<img width="100%" src="/connected.png" alt="how to start the replay">

	<hr />

	<h3>What's next?</h3>

	<p>Probably bug fixing, or sleep. It took a lot longer than I thought.
	Also maybe some css so this site isn't ugly as sin.</p>

	<hr />

	<h3>Final thoughts?</h3>

	<p>Thanks to the SIBR team for a great event, and a great dataset to work off of. Also thanks to the factorio team work making blueprints really easy to use. Thanks svelte team for a cool little javascript framework I learned for this project. Thanks to my wife for feigning interest in my weird hobbies. Thanks cloudflare workers for ezpz static hosting. Thanks Chorby Short for being a lil frogo.</p>
</div>

<style>
	.content {
		width: 100%;
	}
</style>
