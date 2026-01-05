<script lang="ts">
	const topics = [
		{
			id: 'clt',
			title: 'Central Limit Theorem',
			description: 'Watch how sample means converge to a normal distribution regardless of population shape',
			status: 'available'
		},
		{
			id: 'sampling',
			title: 'Sampling Distributions',
			description: 'Understand the difference between a sample and its sampling distribution',
			status: 'available'
		},
		{
			id: 'sample-size',
			title: 'Sample Size Effects',
			description: 'See how sample size affects precision and reliability',
			status: 'available'
		},
		{
			id: 'standard-error',
			title: 'Standard Error',
			description: 'Learn why the standard error decreases with larger samples',
			status: 'available'
		}
	];
</script>

<div class="max-w-4xl">
	<header class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<span class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">Module 1</span>
		</div>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Foundations of Uncertainty</h1>
		<p class="text-lg text-gray-600">
			Build intuition for randomness and probability before diving into formal methods.
			Learn to see patterns in variability and understand what makes samples reliable.
		</p>
	</header>

	<!-- Learning Objectives -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-blue-900 mb-3">What You'll Learn</h2>
		<ul class="space-y-2 text-blue-800">
			<li class="flex items-start gap-2">
				<span class="text-blue-500 mt-1">•</span>
				Visualize how sample means behave differently from individual observations
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-500 mt-1">•</span>
				Watch the Central Limit Theorem emerge through simulation
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-500 mt-1">•</span>
				Develop gut feelings for what "statistically unusual" actually looks like
			</li>
			<li class="flex items-start gap-2">
				<span class="text-blue-500 mt-1">•</span>
				Explore the relationship between sample size and reliability
			</li>
		</ul>
	</section>

	<!-- Topics -->
	<section>
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
		<div class="space-y-3">
			{#each topics as topic}
				<a
					href="/modules/1-foundations/{topic.id}"
					class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
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

	<!-- Exercises Preview -->
	<section class="mt-8">
		<div class="bg-gray-100 rounded-xl p-6">
			<h2 class="font-semibold text-gray-900 mb-2">15+ Exercises</h2>
			<p class="text-gray-600 text-sm mb-4">
				Practice with interactive exercises covering prediction, estimation, and application.
			</p>
			<div class="flex flex-wrap gap-2">
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Predict distributions</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Estimate standard errors</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">Sample size calculations</span>
				<span class="px-3 py-1 bg-white rounded-full text-xs text-gray-600">CLT applicability</span>
			</div>
		</div>
	</section>
</div>
