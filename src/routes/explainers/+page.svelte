<script lang="ts">
	const explainers = [
		{
			id: 'clt-explained',
			title: 'Why the Central Limit Theorem Works',
			description: 'Watch means converge to normal, step by step',
			duration: '5 min'
		},
		{
			id: 'ci-construction',
			title: 'How Confidence Intervals Are Built',
			description: 'See the mechanics behind interval estimation',
			duration: '4 min'
		},
		{
			id: 'sampling-distribution',
			title: 'What Is a Sampling Distribution?',
			description: 'The foundation of statistical inference',
			duration: '6 min'
		},
		{
			id: 'test-statistic',
			title: 'What Test Statistics Measure',
			description: 'From data to decisions',
			duration: '5 min'
		},
		{
			id: 'regression-minimization',
			title: 'How Regression Finds the Best Line',
			description: 'Minimizing squared errors visually',
			duration: '4 min'
		}
	];
</script>

<div class="max-w-4xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Visual Explainers</h1>
		<p class="text-lg text-gray-600">
			Step-by-step animated explanations of key concepts. Watch statistics come alive.
		</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		{#each explainers as explainer}
			<a
				href="/explainers/{explainer.id}"
				class="block bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
			>
				<h2 class="font-semibold text-gray-900">{explainer.title}</h2>
				<p class="text-gray-600 text-sm mt-2">{explainer.description}</p>
				<div class="mt-3 text-xs text-gray-500">{explainer.duration}</div>
			</a>
		{/each}
	</div>
</div>
