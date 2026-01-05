<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const topicNames: Record<string, string> = {
		't-tests': 'Two-Sample T-Tests',
		'paired': 'Paired vs Independent',
		'assumptions': 'The Assumption Game',
		'practical': 'Practical Significance'
	};

	const topic = $derived($page.params.topic);
	const title = $derived(topicNames[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This interactive lesson is currently being developed. Check back soon!"
	backLink="/modules/3-comparing"
	backLabel="Back to Module 3"
/>
