<script lang="ts">
	import Distribution from '$lib/components/visualizations/Distribution.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import { sample } from '$lib/stats/distributions';

	// State
	let sampleSize = $state(30);
	let mean = $state(0);
	let sd = $state(1);
	let distributionType = $state<'normal' | 't' | 'chi-squared'>('normal');
	let df = $state(10);

	// Generated sample data
	let sampleData = $state<number[]>([]);
	let sampleMean = $derived(
		sampleData.length > 0
			? sampleData.reduce((a, b) => a + b, 0) / sampleData.length
			: 0
	);
	let sampleSd = $derived(() => {
		if (sampleData.length < 2) return 0;
		const m = sampleMean;
		const variance = sampleData.reduce((sum, x) => sum + (x - m) ** 2, 0) / (sampleData.length - 1);
		return Math.sqrt(variance);
	});

	// Standard error of the mean
	let standardError = $derived(sd / Math.sqrt(sampleSize));

	function generateSample() {
		sampleData = sample.normal(sampleSize, mean, sd);
	}

	function reset() {
		sampleSize = 30;
		mean = 0;
		sd = 1;
		df = 10;
		sampleData = [];
	}
</script>

<div class="max-w-6xl mx-auto">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-3">The Sandbox</h1>
		<p class="text-lg text-gray-600">
			A playground for experimentation. Generate data, manipulate parameters, and see consequences immediately.
		</p>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Controls Panel -->
		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h2 class="font-semibold text-gray-900 mb-4">Distribution Type</h2>
				<div class="flex gap-2">
					<button
						class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
						class:bg-blue-500={distributionType === 'normal'}
						class:text-white={distributionType === 'normal'}
						class:bg-gray-100={distributionType !== 'normal'}
						class:text-gray-700={distributionType !== 'normal'}
						onclick={() => (distributionType = 'normal')}
					>
						Normal
					</button>
					<button
						class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
						class:bg-blue-500={distributionType === 't'}
						class:text-white={distributionType === 't'}
						class:bg-gray-100={distributionType !== 't'}
						class:text-gray-700={distributionType !== 't'}
						onclick={() => (distributionType = 't')}
					>
						t
					</button>
					<button
						class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
						class:bg-blue-500={distributionType === 'chi-squared'}
						class:text-white={distributionType === 'chi-squared'}
						class:bg-gray-100={distributionType !== 'chi-squared'}
						class:text-gray-700={distributionType !== 'chi-squared'}
						onclick={() => (distributionType = 'chi-squared')}
					>
						Chi-squared
					</button>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h2 class="font-semibold text-gray-900 mb-4">Parameters</h2>

				<div class="space-y-5">
					{#if distributionType === 'normal'}
						<Slider label="Mean (μ)" bind:value={mean} min={-5} max={5} step={0.1} />
						<Slider label="Std Dev (σ)" bind:value={sd} min={0.1} max={3} step={0.1} />
					{:else}
						<Slider label="Degrees of Freedom" bind:value={df} min={1} max={30} step={1} />
					{/if}
					<Slider label="Sample Size (n)" bind:value={sampleSize} min={5} max={200} step={1} />
				</div>

				<hr class="my-4" />

				<div class="space-y-2">
					<button
						class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
						onclick={generateSample}
					>
						Generate Sample
					</button>
					<button
						class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						onclick={reset}
					>
						Reset
					</button>
				</div>
			</div>
		</div>

		<!-- Visualization Area -->
		<div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
			<h2 class="font-semibold text-gray-900 mb-4">
				{distributionType === 'normal' ? 'Normal' : distributionType === 't' ? "Student's t" : 'Chi-Squared'} Distribution
			</h2>

			<div class="flex justify-center">
				{#if distributionType === 'normal'}
					<Distribution type="normal" {mean} {sd} width={550} height={300} />
				{:else if distributionType === 't'}
					<Distribution type="t" {df} width={550} height={300} />
				{:else}
					<Distribution type="chi-squared" {df} width={550} height={300} />
				{/if}
			</div>

			<!-- Statistics Display -->
			<div class="mt-6 grid grid-cols-4 gap-4">
				<div class="bg-gray-50 rounded-lg p-3 text-center">
					<div class="text-2xl font-bold text-gray-900">
						{distributionType === 'normal' ? mean.toFixed(2) : '0'}
					</div>
					<div class="text-xs text-gray-500">Mean</div>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 text-center">
					<div class="text-2xl font-bold text-gray-900">
						{distributionType === 'normal' ? sd.toFixed(2) : (distributionType === 't' && df > 2 ? Math.sqrt(df / (df - 2)).toFixed(2) : '—')}
					</div>
					<div class="text-xs text-gray-500">Std Dev</div>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 text-center">
					<div class="text-2xl font-bold text-gray-900">{standardError.toFixed(3)}</div>
					<div class="text-xs text-gray-500">Std Error</div>
				</div>
				<div class="bg-gray-50 rounded-lg p-3 text-center">
					<div class="text-2xl font-bold text-gray-900">{sampleSize}</div>
					<div class="text-xs text-gray-500">Sample Size</div>
				</div>
			</div>

			{#if sampleData.length > 0}
				<div class="mt-4 p-4 bg-blue-50 rounded-lg">
					<h3 class="font-medium text-blue-900 mb-2">Sample Statistics</h3>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-blue-700">Sample Mean:</span>
							<span class="font-mono font-medium">{sampleMean.toFixed(3)}</span>
						</div>
						<div>
							<span class="text-blue-700">Sample SD:</span>
							<span class="font-mono font-medium">{sampleSd().toFixed(3)}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
