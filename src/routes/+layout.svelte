<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.ico';
	import { Toaster } from 'svelte-french-toast';
	import { ArrowRight, Lock, LogOut } from '@lucide/svelte';
	import { api, IconButton } from '$lib/web';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head
	><link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Anta&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap"
		rel="stylesheet"
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster />

<div class="flex h-screen flex-col">
	<div class="flex h-12 items-center border-b-2 border-white px-5">
		<Lock />
		<div class="ml-2 font-anta text-xl italic">HALP/SECRETS</div>
		{#if page.data.authenticated}
			<IconButton
				class="ml-auto"
				iconClass="scale-90"
				icon={ArrowRight}
				onclick={() =>
					api.auth
						.logout()
						.then(() => goto('/auth', { state: { authenticated: false } }))}
			/>
		{/if}
	</div>
	<div class="relative flex-1">
		{@render children?.()}
	</div>
</div>
