<script lang="ts">
	const challenges = [
		{
			id: 'ab-test',
			title: 'A/B Test Challenge',
			description: 'A product team needs to decide whether to launch a new feature. Analyze their test data.',
			difficulty: 'Intermediate',
			topics: ['Hypothesis Testing', 'Effect Size', 'Sample Size']
		},
		{
			id: 'clinical-trial',
			title: 'Clinical Trial Analysis',
			description: 'Evaluate treatment effectiveness from a randomized controlled trial.',
			difficulty: 'Advanced',
			topics: ['Multiple Endpoints', 'Effect Size', 'Confidence Intervals']
		},
		{
			id: 'survey-analysis',
			title: 'Survey Data Analysis',
			description: 'Interpret survey results with missing data and multiple comparisons.',
			difficulty: 'Advanced',
			topics: ['Missing Data', 'Multiple Testing', 'Correlation']
		}
	];
</script>

<div class="max-w-4xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Scenario Challenges</h1>
		<p class="text-lg text-gray-600">
			Work through realistic situations. Make decisions and get feedback on your statistical reasoning.
		</p>
	</header>

	<div class="space-y-4">
		{#each challenges as challenge}
			<a
				href="/challenges/{challenge.id}"
				class="block bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
			>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h2 class="text-xl font-semibold text-gray-900">{challenge.title}</h2>
						<p class="text-gray-600 mt-2">{challenge.description}</p>
						<div class="flex flex-wrap gap-2 mt-3">
							{#each challenge.topics as topic}
								<span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{topic}</span>
							{/each}
						</div>
					</div>
					<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
						{challenge.difficulty}
					</span>
				</div>
			</a>
		{/each}
	</div>
</div>
