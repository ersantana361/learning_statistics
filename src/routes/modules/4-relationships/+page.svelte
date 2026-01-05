<script lang="ts">
	const topics = [
		{ id: 'correlation', title: 'Correlation', description: 'Explore strength, direction, and the danger of causation claims' },
		{ id: 'regression', title: 'Simple Regression', description: 'Prediction and explanation with a single predictor' },
		{ id: 'residuals', title: 'Residual Diagnostics', description: 'Let residuals tell you stories about your model' },
		{ id: 'multiple', title: 'Multiple Predictors', description: 'The challenge of interpretation with multiple variables' }
	];
</script>

<div class="max-w-4xl">
	<header class="mb-8">
		<span class="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">Module 4</span>
		<h1 class="text-3xl font-bold text-gray-900 mt-2 mb-3">Relationships and Patterns</h1>
		<p class="text-lg text-gray-600">
			Move beyond "different or not" to understanding how variables relate.
		</p>
	</header>

	<section class="bg-amber-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-amber-900 mb-3">What You'll Learn</h2>
		<ul class="space-y-2 text-amber-800">
			<li>• Correlation: strength, direction, and causation pitfalls</li>
			<li>• Simple regression as prediction and explanation</li>
			<li>• Residuals as diagnostic storytelling</li>
			<li>• Multiple predictors and interpretation challenges</li>
		</ul>
	</section>

	<section>
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
		<div class="space-y-3">
			{#each topics as topic}
				<a href="/modules/4-relationships/{topic.id}" class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-sm transition-all">
					<h3 class="font-medium text-gray-900">{topic.title}</h3>
					<p class="text-sm text-gray-600 mt-1">{topic.description}</p>
				</a>
			{/each}
		</div>
	</section>
</div>
