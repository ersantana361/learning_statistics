<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as d3 from 'd3';
	import { sample as sampleUtils } from '$lib/stats/distributions';

	type PopulationType = 'uniform' | 'exponential' | 'bimodal' | 'normal';

	let {
		populationType = 'uniform' as PopulationType,
		sampleSize = 30,
		numSamples = 100,
		speed = 'normal' as 'slow' | 'normal' | 'fast',
		width = 800,
		height = 400,
		autoPlay = false
	}: {
		populationType?: PopulationType;
		sampleSize?: number;
		numSamples?: number;
		speed?: 'slow' | 'normal' | 'fast';
		width?: number;
		height?: number;
		autoPlay?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		sampleDrawn: { mean: number; sampleNumber: number };
		complete: { means: number[] };
	}>();

	let container: HTMLDivElement;
	let isRunning = $state(false);
	let currentSample = $state(0);
	let sampleMeans = $state<number[]>([]);
	let animationId: number | null = null;

	const margin = { top: 20, right: 20, bottom: 40, left: 50 };
	const innerWidth = (width / 2) - margin.left - margin.right - 20;
	const innerHeight = height - margin.top - margin.bottom;

	const speedMs = { slow: 500, normal: 200, fast: 50 };

	// Generate population data based on type
	function generatePopulation(n: number = 1000): number[] {
		switch (populationType) {
			case 'uniform':
				return sampleUtils.uniform(n, 0, 10);
			case 'exponential':
				return sampleUtils.exponential(n, 0.5);
			case 'bimodal':
				return sampleUtils.bimodal(n, 2, 1, 8, 1, 0.5);
			case 'normal':
				return sampleUtils.normal(n, 5, 1.5);
			default:
				return sampleUtils.uniform(n, 0, 10);
		}
	}

	// Draw one sample and calculate mean
	function drawSample(): number {
		const pop = generatePopulation(sampleSize);
		return d3.mean(pop) ?? 0;
	}

	// Animation step
	function step() {
		if (currentSample >= numSamples) {
			stop();
			dispatch('complete', { means: sampleMeans });
			return;
		}

		const mean = drawSample();
		sampleMeans = [...sampleMeans, mean];
		currentSample++;
		dispatch('sampleDrawn', { mean, sampleNumber: currentSample });
	}

	// Start animation
	function start() {
		if (isRunning) return;
		isRunning = true;

		const interval = speedMs[speed];
		const runStep = () => {
			if (!isRunning) return;
			step();
			if (currentSample < numSamples) {
				animationId = window.setTimeout(runStep, interval);
			}
		};
		runStep();
	}

	// Stop animation
	function stop() {
		isRunning = false;
		if (animationId) {
			clearTimeout(animationId);
			animationId = null;
		}
	}

	// Reset
	function reset() {
		stop();
		currentSample = 0;
		sampleMeans = [];
	}

	// Draw one sample manually
	function drawOne() {
		if (currentSample < numSamples) {
			step();
		}
	}

	// SVG rendering
	let populationSvg: SVGSVGElement;
	let samplingDistSvg: SVGSVGElement;

	// Population histogram data
	const populationData = $derived(generatePopulation(1000));
	const populationBins = $derived(d3.bin().domain([0, 12]).thresholds(30)(populationData));

	// Sampling distribution bins
	const samplingBins = $derived(
		sampleMeans.length > 0
			? d3.bin().domain([0, 12]).thresholds(30)(sampleMeans)
			: []
	);

	// Scales
	const xScale = $derived(d3.scaleLinear().domain([0, 12]).range([0, innerWidth]));

	const yScalePopulation = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(populationBins, (d) => d.length) ?? 1])
			.range([innerHeight, 0])
	);

	const yScaleSampling = $derived(
		d3.scaleLinear()
			.domain([0, Math.max(d3.max(samplingBins, (d) => d.length) ?? 1, 5)])
			.range([innerHeight, 0])
	);

	onMount(() => {
		if (autoPlay) {
			start();
		}
		return () => stop();
	});

	// Calculate theoretical SE
	const populationMean = $derived(d3.mean(populationData) ?? 0);
	const populationSd = $derived(d3.deviation(populationData) ?? 0);
	const theoreticalSE = $derived(populationSd / Math.sqrt(sampleSize));
	const observedMean = $derived(sampleMeans.length > 0 ? d3.mean(sampleMeans) ?? 0 : 0);
	const observedSE = $derived(sampleMeans.length > 1 ? d3.deviation(sampleMeans) ?? 0 : 0);
</script>

<div bind:this={container} class="sampling-animation">
	<!-- Controls -->
	<div class="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
		<div class="flex items-center gap-3">
			{#if !isRunning}
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={start}
					disabled={currentSample >= numSamples}
				>
					{currentSample === 0 ? 'Start' : 'Resume'}
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={drawOne}
					disabled={currentSample >= numSamples}
				>
					Draw One
				</button>
			{:else}
				<button
					class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
					onclick={stop}
				>
					Pause
				</button>
			{/if}
			<button
				class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
				onclick={reset}
			>
				Reset
			</button>
		</div>

		<div class="text-sm text-gray-600">
			Samples: <span class="font-mono font-medium">{currentSample}</span> / {numSamples}
		</div>
	</div>

	<!-- Visualizations -->
	<div class="grid grid-cols-2 gap-6">
		<!-- Population Distribution -->
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<h3 class="text-sm font-medium text-gray-700 mb-3">
				Population Distribution ({populationType})
			</h3>
			<svg bind:this={populationSvg} width={innerWidth + margin.left + margin.right} height={height}>
				<g transform="translate({margin.left},{margin.top})">
					<!-- Bars -->
					{#each populationBins as bin}
						<rect
							x={xScale(bin.x0 ?? 0) + 1}
							y={yScalePopulation(bin.length)}
							width={Math.max(0, xScale(bin.x1 ?? 0) - xScale(bin.x0 ?? 0) - 2)}
							height={innerHeight - yScalePopulation(bin.length)}
							fill="#94a3b8"
							rx="1"
						/>
					{/each}
					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(6) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="11">{tick}</text>
							</g>
						{/each}
					</g>
				</g>
			</svg>
			<div class="text-xs text-gray-500 mt-2">
				μ = {populationMean.toFixed(2)}, σ = {populationSd.toFixed(2)}
			</div>
		</div>

		<!-- Sampling Distribution -->
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<h3 class="text-sm font-medium text-gray-700 mb-3">
				Sampling Distribution of the Mean (n = {sampleSize})
			</h3>
			<svg bind:this={samplingDistSvg} width={innerWidth + margin.left + margin.right} height={height}>
				<g transform="translate({margin.left},{margin.top})">
					<!-- Bars -->
					{#each samplingBins as bin}
						<rect
							x={xScale(bin.x0 ?? 0) + 1}
							y={yScaleSampling(bin.length)}
							width={Math.max(0, xScale(bin.x1 ?? 0) - xScale(bin.x0 ?? 0) - 2)}
							height={innerHeight - yScaleSampling(bin.length)}
							fill="#3b82f6"
							rx="1"
							class="transition-all duration-150"
						/>
					{/each}
					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(6) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="11">{tick}</text>
							</g>
						{/each}
					</g>
					<!-- Mean line -->
					{#if sampleMeans.length > 0}
						<line
							x1={xScale(observedMean)}
							x2={xScale(observedMean)}
							y1={0}
							y2={innerHeight}
							stroke="#ef4444"
							stroke-width="2"
							stroke-dasharray="5,5"
						/>
					{/if}
				</g>
			</svg>
			<div class="text-xs text-gray-500 mt-2">
				{#if sampleMeans.length > 0}
					Mean of means: {observedMean.toFixed(3)},
					SE (observed): {observedSE.toFixed(3)},
					SE (theoretical): {theoreticalSE.toFixed(3)}
				{:else}
					Draw samples to see the sampling distribution form
				{/if}
			</div>
		</div>
	</div>

	<!-- Key Insight -->
	{#if sampleMeans.length >= 30}
		<div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
			<h4 class="font-medium text-blue-900 mb-1">Key Insight: Central Limit Theorem</h4>
			<p class="text-sm text-blue-800">
				Notice how the sampling distribution becomes approximately normal, even though the population
				distribution is {populationType === 'normal' ? 'also normal' : 'not normal'}!
				The standard error ({observedSE.toFixed(3)}) is close to σ/√n = {theoreticalSE.toFixed(3)}.
			</p>
		</div>
	{/if}
</div>

<style>
	.sampling-animation rect {
		transition: height 0.15s ease, y 0.15s ease;
	}
</style>
