<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const topicNames: Record<string, string> = {
		'p-values': 'P-Values Visualized',
		'errors': 'Type I and Type II Errors',
		'power': 'Statistical Power',
		'effect-size': 'Effect Sizes'
	};

	const topic = $derived($page.params.topic);
	const title = $derived(topicNames[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This interactive lesson is currently being developed. Check back soon!"
	backLink="/modules/2-hypothesis"
	backLabel="Back to Module 2"
/>
