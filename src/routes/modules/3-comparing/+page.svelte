<script lang="ts">
	const topics = [
		{ id: 't-tests', title: 'Two-Sample T-Tests', description: 'Compare means between two groups with visual effect exploration' },
		{ id: 'paired', title: 'Paired vs Independent', description: 'Learn when pairing matters and why' },
		{ id: 'assumptions', title: 'The Assumption Game', description: 'See what happens when assumptions break' },
		{ id: 'practical', title: 'Practical Significance', description: 'Move from significance to practical importance' }
	];
</script>

<div class="max-w-4xl">
	<header class="mb-8">
		<span class="bg-violet-500 text-white px-3 py-1 rounded-full text-sm font-medium">Module 3</span>
		<h1 class="text-3xl font-bold text-gray-900 mt-2 mb-3">Comparing Groups</h1>
		<p class="text-lg text-gray-600">
			Apply hypothesis testing to the most common real-world question: "Are these different?"
		</p>
	</header>

	<section class="bg-violet-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-violet-900 mb-3">What You'll Learn</h2>
		<ul class="space-y-2 text-violet-800">
			<li>• Two-sample comparisons with visual effect size exploration</li>
			<li>• Paired vs. independent designs and when each matters</li>
			<li>• What happens when assumptions break</li>
			<li>• From significance to practical importance</li>
		</ul>
	</section>

	<section>
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Topics</h2>
		<div class="space-y-3">
			{#each topics as topic}
				<a href="/modules/3-comparing/{topic.id}" class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-violet-300 hover:shadow-sm transition-all">
					<h3 class="font-medium text-gray-900">{topic.title}</h3>
					<p class="text-sm text-gray-600 mt-1">{topic.description}</p>
				</a>
			{/each}
		</div>
	</section>
</div>
