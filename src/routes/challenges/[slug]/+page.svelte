<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const challengeNames: Record<string, string> = {
		'ab-test': 'A/B Test Challenge',
		'clinical-trial': 'Clinical Trial Analysis',
		'survey-analysis': 'Survey Data Analysis'
	};

	const slug = $derived($page.params.slug);
	const title = $derived(challengeNames[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This scenario challenge is currently being developed. Check back soon!"
	backLink="/challenges"
	backLabel="Back to Challenges"
/>
