<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const topicNames: Record<string, string> = {
		'correlation': 'Correlation Explorer',
		'regression': 'Simple Regression',
		'residuals': 'Residual Diagnostics',
		'multiple': 'Multiple Predictors'
	};

	const topic = $derived($page.params.topic);
	const title = $derived(topicNames[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This interactive lesson is currently being developed. Check back soon!"
	backLink="/modules/4-relationships"
	backLabel="Back to Module 4"
/>
