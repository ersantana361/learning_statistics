<script lang="ts">
	let {
		title = 'Coming Soon',
		description = 'This content is under development.',
		backLink = '/',
		backLabel = 'Go Back'
	}: {
		title?: string;
		description?: string;
		backLink?: string;
		backLabel?: string;
	} = $props();
</script>

<div class="max-w-2xl mx-auto text-center py-16">
	<div class="text-6xl mb-6">🚧</div>
	<h1 class="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
	<p class="text-lg text-gray-600 mb-8">{description}</p>
	<a
		href={backLink}
		class="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
		{backLabel}
	</a>
</div>
