<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let sidebarOpen = $state(false);

	const modules = [
		{ id: 1, title: 'Foundations', href: '/modules/1-foundations' },
		{ id: 2, title: 'Hypothesis Testing', href: '/modules/2-hypothesis' },
		{ id: 3, title: 'Comparing Groups', href: '/modules/3-comparing' },
		{ id: 4, title: 'Relationships', href: '/modules/4-relationships' },
		{ id: 5, title: 'Beyond Basics', href: '/modules/5-beyond' }
	];

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<div class="flex min-h-screen">
	<!-- Mobile menu button -->
	<button
		onclick={toggleSidebar}
		class="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200 md:hidden"
		aria-label="Toggle menu"
	>
		<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{#if sidebarOpen}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			{:else}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			{/if}
		</svg>
	</button>

	<!-- Backdrop for mobile -->
	{#if sidebarOpen}
		<button
			class="fixed inset-0 bg-black/30 z-30 md:hidden"
			onclick={closeSidebar}
			aria-label="Close menu"
		></button>
	{/if}

	<!-- Sidebar Navigation -->
	<aside
		class="fixed md:static w-64 h-full bg-white border-r border-gray-200 p-4 z-40 transition-transform duration-300 ease-in-out {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0"
	>
		<a href="/" class="text-lg font-bold text-gray-900 mb-6 block hover:text-blue-600">
			StatLab
		</a>
		<nav class="space-y-1">
			{#each modules as module}
				<a
					href={module.href}
					onclick={closeSidebar}
					class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
				>
					<span class="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-sm font-medium">
						{module.id}
					</span>
					<span class="text-sm">{module.title}</span>
				</a>
			{/each}
		</nav>
		<hr class="my-4" />
		<nav class="space-y-1">
			<a href="/sandbox" onclick={closeSidebar} class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Sandbox
			</a>
			<a href="/challenges" onclick={closeSidebar} class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Challenges
			</a>
			<a href="/explainers" onclick={closeSidebar} class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Explainers
			</a>
			<a href="/misconceptions" onclick={closeSidebar} class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Misconceptions
			</a>
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 p-4 pt-16 md:p-8 md:pt-8">
		{@render children()}
	</main>
</div>
