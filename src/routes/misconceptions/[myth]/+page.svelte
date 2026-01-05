<script lang="ts">
	import ComingSoon from '$lib/components/layout/ComingSoon.svelte';
	import { page } from '$app/stores';

	const mythNames: Record<string, string> = {
		'p-value-truth': '"p < 0.05 means the result is true"',
		'larger-samples': '"Larger samples are always better"',
		'correlation-causation': '"Correlation proves causation"',
		'normal-required': '"Data must be normal for t-tests"',
		'accept-null': '"Failing to reject H₀ proves it\'s true"'
	};

	const myth = $derived($page.params.myth);
	const title = $derived(mythNames[myth] || myth.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
</script>

<ComingSoon
	title={title}
	description="This misconception exhibit is currently being developed. Check back soon!"
	backLink="/misconceptions"
	backLabel="Back to Misconception Museum"
/>
