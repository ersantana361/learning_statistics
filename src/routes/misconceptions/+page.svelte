<script lang="ts">
	const misconceptions = [
		{
			id: 'p-value-truth',
			myth: '"p < 0.05 means the result is true"',
			reality: 'P-values measure evidence against null, not truth of alternatives',
			icon: '🎯'
		},
		{
			id: 'larger-samples',
			myth: '"Larger samples are always better"',
			reality: 'Large samples detect trivial effects that may not matter',
			icon: '📊'
		},
		{
			id: 'correlation-causation',
			myth: '"Correlation proves causation"',
			reality: 'Many correlated variables share no causal relationship',
			icon: '🔗'
		},
		{
			id: 'normal-required',
			myth: '"Data must be normal for t-tests"',
			reality: 'The Central Limit Theorem often saves us',
			icon: '📈'
		},
		{
			id: 'accept-null',
			myth: '"Failing to reject H₀ proves it\'s true"',
			reality: 'Absence of evidence is not evidence of absence',
			icon: '❌'
		}
	];
</script>

<div class="max-w-4xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-3">The Misconception Museum</h1>
		<p class="text-lg text-gray-600">
			A dedicated space addressing the most common statistical misunderstandings.
			Interactive demonstrations show why these beliefs lead you astray.
		</p>
	</header>

	<div class="space-y-4">
		{#each misconceptions as item}
			<a
				href="/misconceptions/{item.id}"
				class="block bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all"
			>
				<div class="flex items-start gap-4">
					<div class="text-4xl">{item.icon}</div>
					<div class="flex-1">
						<div class="text-red-600 font-medium mb-1">Myth</div>
						<h2 class="text-xl font-semibold text-gray-900">{item.myth}</h2>
						<div class="text-green-600 font-medium mt-3 mb-1">Reality</div>
						<p class="text-gray-600">{item.reality}</p>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
