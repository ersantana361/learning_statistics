<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const explainerNames: Record<string, string> = {
		'clt-explained': 'Why the Central Limit Theorem Works',
		'ci-construction': 'How Confidence Intervals Are Built',
		'sampling-distribution': 'What Is a Sampling Distribution?',
		'test-statistic': 'What Test Statistics Measure',
		'regression-minimization': 'How Regression Finds the Best Line'
	};

	const concept = $derived($page.params.concept);
	const title = $derived(explainerNames[concept] || concept.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This visual explainer is currently being developed. Check back soon!"
	backLink="/explainers"
	backLabel="Back to Explainers"
/>
