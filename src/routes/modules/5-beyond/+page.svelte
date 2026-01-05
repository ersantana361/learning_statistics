<script lang="ts">
	const topics = [
		{ id: 'robust', title: 'Robust Alternatives', description: 'What to do when normality fails' },
		{ id: 'multiple-testing', title: 'Multiple Testing', description: 'The replication crisis and how to avoid it' },
		{ id: 'bayesian', title: 'Bayesian Thinking', description: 'A different lens for statistical inference' },
		{ id: 'test-selection', title: 'Choosing the Right Test', description: 'A decision framework for test selection' }
	];
</script>

<div class="max-w-4xl">
	<header class="mb-8">
		<span class="bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-medium">Module 5</span>
		<h1 class="text-3xl font-bold text-gray-900 mt-2 mb-3">Beyond the Basics</h1>
		<p class="text-lg text-gray-600">
			Encounter the messy realities of applied statistics.
		</p>
	</header>

	<section class="bg-rose-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-rose-900 mb-3">What You'll Learn</h2>
		<ul class="space-y-2 text-rose-800">
			<li>• Robust alternatives when assumptions fail</li>
			<li>• Multiple testing and the replication crisis</li>
			<li>• Bayesian thinking as a different perspective</li>
			<li>• Choosing the right test for your question</li>
		</ul>
	</section>

	<section>
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
		<div class="space-y-3">
			{#each topics as topic}
				<a href="/modules/5-beyond/{topic.id}" class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-rose-300 hover:shadow-sm transition-all">
					<h3 class="font-medium text-gray-900">{topic.title}</h3>
					<p class="text-sm text-gray-600 mt-1">{topic.description}</p>
				</a>
			{/each}
		</div>
	</section>
</div>
