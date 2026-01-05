<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const modules = [
		{ id: 1, title: 'Foundations', href: '/modules/1-foundations' },
		{ id: 2, title: 'Hypothesis Testing', href: '/modules/2-hypothesis' },
		{ id: 3, title: 'Comparing Groups', href: '/modules/3-comparing' },
		{ id: 4, title: 'Relationships', href: '/modules/4-relationships' },
		{ id: 5, title: 'Beyond Basics', href: '/modules/5-beyond' }
	];
</script>

<div class="flex min-h-screen">
	<!-- Sidebar Navigation -->
	<aside class="w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
		<a href="/" class="text-lg font-bold text-gray-900 mb-6 block hover:text-blue-600">
			StatLab
		</a>
		<nav class="space-y-1">
			{#each modules as module}
				<a
					href={module.href}
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
			<a href="/sandbox" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Sandbox
			</a>
			<a href="/challenges" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Challenges
			</a>
			<a href="/explainers" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Explainers
			</a>
			<a href="/misconceptions" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
				Misconceptions
			</a>
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 p-8">
		{@render children()}
	</main>
</div>
