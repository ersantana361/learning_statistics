<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const topicNames: Record<string, string> = {
		'robust': 'Robust Alternatives',
		'multiple-testing': 'Multiple Testing',
		'bayesian': 'Bayesian Thinking',
		'test-selection': 'Choosing the Right Test'
	};

	const topic = $derived($page.params.topic);
	const title = $derived(topicNames[topic] || topic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This interactive lesson is currently being developed. Check back soon!"
	backLink="/modules/5-beyond"
	backLabel="Back to Module 5"
/>
