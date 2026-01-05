<script lang="ts">
	const topics = [
		{
			id: 'p-values',
			title: 'P-Values Visualized',
			description: 'See what p-values actually represent through animated distributions',
			status: 'available'
		},
		{
			id: 'errors',
			title: 'Type I and Type II Errors',
			description: 'Experience the tradeoff between false positives and false negatives',
			status: 'available'
		},
		{
			id: 'power',
			title: 'Statistical Power',
			description: 'Understand what determines your ability to detect real effects',
			status: 'available'
		},
		{
			id: 'effect-size',
			title: 'Effect Sizes',
			description: 'Learn why significance alone is not enough',
			status: 'available'
		}
	];
</script>

<div class="max-w-4xl">
	<header class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<span class="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">Module 2</span>
		</div>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">The Logic of Hypothesis Testing</h1>
		<p class="text-lg text-gray-600">
			Understand the reasoning framework before applying specific tests.
			Learn to think like a scientist making decisions under uncertainty.
		</p>
	</header>

	<section class="bg-emerald-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-emerald-900 mb-3">What You'll Learn</h2>
		<ul class="space-y-2 text-emerald-800">
			<li class="flex items-start gap-2">
				<span class="text-emerald-500 mt-1">•</span>
				Frame real questions as statistical hypotheses
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500 mt-1">•</span>
				Grasp the adversarial nature of null hypothesis testing
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500 mt-1">•</span>
				Visualize what p-values actually represent (and what they don't)
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500 mt-1">•</span>
				Build intuition for statistical power and effect sizes
			</li>
		</ul>
	</section>

	<section>
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
		<div class="space-y-3">
			{#each topics as topic}
				<a
					href="/modules/2-hypothesis/{topic.id}"
					class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all"
				>
					<div class="flex items-center justify-between">
						<div>
							<h3 class="font-medium text-gray-900">{topic.title}</h3>
							<p class="text-sm text-gray-600 mt-1">{topic.description}</p>
						</div>
						<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<section class="mt-8">
		<div class="bg-gray-100 rounded-xl p-6">
			<h2 class="font-semibold text-gray-900 mb-2">15+ Exercises</h2>
			<p class="text-gray-600 text-sm mb-4">
				Practice formulating hypotheses, interpreting results, and avoiding common pitfalls.
			</p>
			<div class="flex flex-wrap gap-2">
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Formulate hypotheses</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Interpret p-values</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Error consequences</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Power calculations</span>
			</div>
		</div>
	</section>
</div>
