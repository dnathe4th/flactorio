<script lang="ts">
	import { page } from '$app/stores';

	import {
		Nav,
		NavItem,
		NavLink
	} from 'sveltestrap';

</script>

<header>
	<h1>FLACTORIO</h1>
	<Nav tabs>
		<NavItem>
			{(console.log($page.path), '')}
			<NavLink sveltekit:prefetch href="/" active={$page.path === "/"}>Home</NavLink>
		</NavItem>
		<NavItem>
			<NavLink sveltekit:prefetch href="/wtfaq" active={$page.path === "/wtfaq"}>WTFaq</NavLink>
		</NavItem>
		<NavItem>
			<NavLink sveltekit:prefetch href="/secret" active={$page.path === "/secret"}>Util</NavLink>
		</NavItem>
	</Nav>
</header>

<style>
	header {
		justify-content: space-between;
		padding: 1rem;
		padding-bottom: 0;
	}
</style>
