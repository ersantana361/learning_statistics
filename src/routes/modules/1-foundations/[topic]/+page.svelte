<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const topicNames: Record<string, string> = {
		'sampling': 'Sampling Distributions',
		'sample-size': 'Sample Size Effects',
		'standard-error': 'Standard Error'
	};

	const topic = $derived($page.params.topic);
	const title = $derived(topicNames[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This interactive lesson is currently being developed. Check back soon!"
	backLink="/modules/1-foundations"
	backLabel="Back to Module 1"
/>
