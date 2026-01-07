<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { sample, normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const samplingDistFormula = String.raw`\text{If } X_1, X_2, \ldots, X_n \sim \text{Population}(\mu, \sigma)`;
	const meanFormula = String.raw`\text{Then } \bar{X} \sim N\left(\mu_{\bar{X}} = \mu, \sigma_{\bar{X}} = \frac{\sigma}{\sqrt{n}}\right)`;
	const seFormula = String.raw`SE = \frac{\sigma}{\sqrt{n}}`;

	// Parameters
	let populationMean = $state(50);
	let populationSd = $state(10);
	let sampleSize = $state(25);

	// Sample data
	let currentSample = $state<number[]>([]);
	let allSampleMeans = $state<number[]>([]);

	// Computed values
	const theoreticalSE = $derived(populationSd / Math.sqrt(sampleSize));
	const currentSampleMean = $derived(
		currentSample.length > 0 ? d3.mean(currentSample) ?? 0 : 0
	);
	const currentSampleSd = $derived(
		currentSample.length > 1 ? d3.deviation(currentSample) ?? 0 : 0
	);
	const observedMeanOfMeans = $derived(
		allSampleMeans.length > 0 ? d3.mean(allSampleMeans) ?? 0 : 0
	);
	const observedSE = $derived(
		allSampleMeans.length > 1 ? d3.deviation(allSampleMeans) ?? 0 : 0
	);

	function drawOneSample() {
		currentSample = sample.normal(sampleSize, populationMean, populationSd);
		const mean = d3.mean(currentSample) ?? 0;
		allSampleMeans = [...allSampleMeans, mean];
	}

	function drawManySamples(count: number) {
		for (let i = 0; i < count; i++) {
			const s = sample.normal(sampleSize, populationMean, populationSd);
			const mean = d3.mean(s) ?? 0;
			allSampleMeans = [...allSampleMeans, mean];
		}
		// Show the last sample
		currentSample = sample.normal(sampleSize, populationMean, populationSd);
	}

	function reset() {
		currentSample = [];
		allSampleMeans = [];
	}

	// SVG dimensions
	const width = 400;
	const height = 200;
	const margin = { top: 20, right: 20, bottom: 30, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales for sample histogram
	const sampleXScale = $derived(
		d3.scaleLinear()
			.domain([populationMean - 4 * populationSd, populationMean + 4 * populationSd])
			.range([0, innerWidth])
	);

	const sampleBins = $derived(
		currentSample.length > 0
			? d3.bin()
				.domain(sampleXScale.domain() as [number, number])
				.thresholds(20)(currentSample)
			: []
	);

	const sampleYScale = $derived(
		d3.scaleLinear()
			.domain([0, Math.max(d3.max(sampleBins, d => d.length) ?? 1, 5)])
			.range([innerHeight, 0])
	);

	// Scales for sampling distribution histogram
	const samplingBins = $derived(
		allSampleMeans.length > 0
			? d3.bin()
				.domain([populationMean - 3 * theoreticalSE * 3, populationMean + 3 * theoreticalSE * 3])
				.thresholds(25)(allSampleMeans)
			: []
	);

	const samplingXScale = $derived(
		d3.scaleLinear()
			.domain([populationMean - 4 * theoreticalSE, populationMean + 4 * theoreticalSE])
			.range([0, innerWidth])
	);

	const samplingYScale = $derived(
		d3.scaleLinear()
			.domain([0, Math.max(d3.max(samplingBins, d => d.length) ?? 1, 5)])
			.range([innerHeight, 0])
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'sampling-1',
			type: 'multiple-choice',
			question: 'What does a sampling distribution represent?',
			choices: [
				{ id: 'a', text: 'The distribution of values in a single sample' },
				{ id: 'b', text: 'The distribution of a statistic (like the mean) across many samples', isCorrect: true },
				{ id: 'c', text: 'The distribution of the population' },
				{ id: 'd', text: 'The distribution of measurement errors' }
			],
			explanation: 'A sampling distribution shows how a statistic (such as the sample mean) varies across many different samples taken from the same population. It\'s not about individual data points, but about the behavior of statistics computed from samples.',
			difficulty: 'easy'
		},
		{
			id: 'sampling-2',
			type: 'multiple-choice',
			question: 'Why is the sampling distribution of the mean narrower than the population distribution?',
			choices: [
				{ id: 'a', text: 'Because we remove outliers when calculating means' },
				{ id: 'b', text: 'Because extreme values in samples tend to cancel out when averaged', isCorrect: true },
				{ id: 'c', text: 'Because we use smaller numbers' },
				{ id: 'd', text: 'Because the sample size is always smaller than the population' }
			],
			explanation: 'When we take a sample and compute the mean, extreme high values tend to be balanced by extreme low values. This averaging effect reduces variability, making the distribution of sample means narrower than the original population distribution.',
			difficulty: 'medium'
		},
		{
			id: 'sampling-3',
			type: 'numeric',
			question: 'A population has mean μ = 100 and standard deviation σ = 16. If you take samples of size n = 64, what is the standard error of the mean?',
			questionMath: String.raw`SE = \frac{\sigma}{\sqrt{n}} = \frac{16}{\sqrt{64}} = ?`,
			correctAnswer: 2,
			tolerance: 0.01,
			explanation: 'The standard error is σ/√n = 16/√64 = 16/8 = 2. This tells us that sample means will typically vary by about 2 units from the true population mean.',
			explanationMath: String.raw`SE = \frac{16}{\sqrt{64}} = \frac{16}{8} = 2`,
			difficulty: 'easy'
		},
		{
			id: 'sampling-4',
			type: 'multiple-choice',
			question: 'If you increase the sample size from 25 to 100, what happens to the standard error?',
			choices: [
				{ id: 'a', text: 'It doubles' },
				{ id: 'b', text: 'It is cut in half', isCorrect: true },
				{ id: 'c', text: 'It stays the same' },
				{ id: 'd', text: 'It is cut to one-fourth' }
			],
			explanation: 'The standard error is σ/√n. When n goes from 25 to 100, √n goes from 5 to 10 (doubles). Since SE is inversely proportional to √n, the SE is cut in half.',
			explanationMath: String.raw`\frac{\sigma}{\sqrt{25}} = \frac{\sigma}{5} \rightarrow \frac{\sigma}{\sqrt{100}} = \frac{\sigma}{10}`,
			difficulty: 'medium'
		},
		{
			id: 'sampling-5',
			type: 'true-false',
			question: 'The mean of the sampling distribution equals the population mean.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! This is a fundamental property: the expected value of the sample mean equals the population mean. We say the sample mean is an "unbiased estimator" of the population mean.',
			explanationMath: String.raw`E[\bar{X}] = \mu`,
			difficulty: 'easy'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/1-foundations" class="hover:text-blue-600">Module 1</a>
			<span class="mx-2">/</span>
			<span>Sampling Distributions</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Sampling Distributions</h1>
		<p class="text-lg text-gray-600">
			Understand the crucial difference between a sample and the distribution of sample statistics.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-blue-900 mb-3">The Big Idea</h2>
		<p class="text-blue-800 mb-4">
			A <strong>sampling distribution</strong> is not the distribution of your data — it's the distribution of a
			<em>statistic</em> (like the mean) computed from many different samples.
		</p>
		<div class="bg-white rounded-lg p-4 space-y-2">
			<MathDisplay formula={samplingDistFormula} displayMode={true} />
			<MathDisplay formula={meanFormula} displayMode={true} />
		</div>
	</section>

	<!-- Interactive Demo -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Exploration</h2>

		<!-- Controls -->
		<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<Slider
					label="Population Mean (μ)"
					bind:value={populationMean}
					min={20}
					max={80}
					step={1}
				/>
				<Slider
					label="Population SD (σ)"
					bind:value={populationSd}
					min={5}
					max={20}
					step={1}
				/>
				<Slider
					label="Sample Size (n)"
					bind:value={sampleSize}
					min={5}
					max={100}
					step={5}
				/>
			</div>

			<div class="flex flex-wrap gap-3">
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={drawOneSample}
				>
					Draw One Sample
				</button>
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => drawManySamples(10)}
				>
					Draw 10 Samples
				</button>
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => drawManySamples(100)}
				>
					Draw 100 Samples
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={reset}
				>
					Reset
				</button>
			</div>
		</div>

		<!-- Visualizations Side by Side -->
		<div class="grid md:grid-cols-2 gap-6">
			<!-- Current Sample -->
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<h3 class="font-medium text-gray-900 mb-3">Current Sample (n = {sampleSize})</h3>
				<svg {width} {height}>
					<g transform="translate({margin.left},{margin.top})">
						<!-- Bars -->
						{#each sampleBins as bin}
							<rect
								x={sampleXScale(bin.x0 ?? 0) + 1}
								y={sampleYScale(bin.length)}
								width={Math.max(0, sampleXScale(bin.x1 ?? 0) - sampleXScale(bin.x0 ?? 0) - 2)}
								height={innerHeight - sampleYScale(bin.length)}
								fill="#94a3b8"
								rx="1"
							/>
						{/each}
						<!-- Mean line -->
						{#if currentSample.length > 0}
							<line
								x1={sampleXScale(currentSampleMean)}
								x2={sampleXScale(currentSampleMean)}
								y1={0}
								y2={innerHeight}
								stroke="#ef4444"
								stroke-width="2"
								stroke-dasharray="5,5"
							/>
						{/if}
						<!-- X Axis -->
						<g transform="translate(0,{innerHeight})">
							{#each sampleXScale.ticks(5) as tick}
								<g transform="translate({sampleXScale(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
								</g>
							{/each}
						</g>
					</g>
				</svg>
				<div class="text-sm text-gray-600 mt-2">
					{#if currentSample.length > 0}
						<span class="text-red-600">Sample mean: {currentSampleMean.toFixed(2)}</span> |
						Sample SD: {currentSampleSd.toFixed(2)}
					{:else}
						<span class="text-gray-400">Draw a sample to see distribution</span>
					{/if}
				</div>
			</div>

			<!-- Sampling Distribution -->
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<h3 class="font-medium text-gray-900 mb-3">
					Sampling Distribution of Means ({allSampleMeans.length} samples)
				</h3>
				<svg {width} {height}>
					<g transform="translate({margin.left},{margin.top})">
						<!-- Bars -->
						{#each samplingBins as bin}
							<rect
								x={samplingXScale(bin.x0 ?? 0) + 1}
								y={samplingYScale(bin.length)}
								width={Math.max(0, samplingXScale(bin.x1 ?? 0) - samplingXScale(bin.x0 ?? 0) - 2)}
								height={innerHeight - samplingYScale(bin.length)}
								fill="#3b82f6"
								rx="1"
							/>
						{/each}
						<!-- Population mean line -->
						<line
							x1={samplingXScale(populationMean)}
							x2={samplingXScale(populationMean)}
							y1={0}
							y2={innerHeight}
							stroke="#10b981"
							stroke-width="2"
						/>
						<!-- X Axis -->
						<g transform="translate(0,{innerHeight})">
							{#each samplingXScale.ticks(5) as tick}
								<g transform="translate({samplingXScale(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick.toFixed(1)}</text>
								</g>
							{/each}
						</g>
					</g>
				</svg>
				<div class="text-sm text-gray-600 mt-2">
					{#if allSampleMeans.length > 0}
						Mean of means: {observedMeanOfMeans.toFixed(2)} |
						<span class="text-blue-600">Observed SE: {observedSE.toFixed(2)}</span> |
						<span class="text-green-600">Theoretical SE: {theoreticalSE.toFixed(2)}</span>
					{:else}
						<span class="text-gray-400">Draw samples to build the distribution</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Insight Box -->
		{#if allSampleMeans.length >= 30}
			<div class="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
				<h4 class="font-medium text-green-900 mb-1">Notice the Pattern!</h4>
				<p class="text-sm text-green-800">
					The sampling distribution (right) is much narrower than individual samples (left).
					The theoretical SE ({theoreticalSE.toFixed(2)}) closely matches the observed SE ({observedSE.toFixed(2)}).
					This predictability is the foundation of statistical inference!
				</p>
			</div>
		{/if}
	</section>

	<!-- Key Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Sample vs Sampling Distribution</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div class="bg-gray-50 rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">A Sample</h3>
				<ul class="space-y-2 text-gray-700 text-sm">
					<li>• Contains <strong>individual observations</strong></li>
					<li>• Has the same spread as the population (roughly σ)</li>
					<li>• Different each time you collect data</li>
					<li>• Example: Heights of 30 randomly selected people</li>
				</ul>
			</div>
			<div class="bg-blue-50 rounded-lg p-5 border border-blue-200">
				<h3 class="font-semibold text-blue-900 mb-3">Sampling Distribution</h3>
				<ul class="space-y-2 text-blue-800 text-sm">
					<li>• Contains <strong>statistics from many samples</strong></li>
					<li>• Narrower than population (spread = σ/√n)</li>
					<li>• A theoretical construct we can predict mathematically</li>
					<li>• Example: The means of 1000 different samples of 30 people</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Standard Error -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Standard Error</h2>
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				The <strong>standard error</strong> is the standard deviation of the sampling distribution.
				It tells us how much sample means typically vary from the true population mean.
			</p>
			<div class="bg-gray-50 rounded-lg p-4 mb-4">
				<MathDisplay formula={seFormula} displayMode={true} />
			</div>
			<div class="grid md:grid-cols-3 gap-4 text-center">
				<div class="p-4 bg-blue-50 rounded-lg">
					<div class="text-3xl font-bold text-blue-600">{populationSd}</div>
					<div class="text-sm text-blue-800">Population SD (σ)</div>
				</div>
				<div class="p-4 bg-green-50 rounded-lg">
					<div class="text-3xl font-bold text-green-600">{sampleSize}</div>
					<div class="text-sm text-green-800">Sample Size (n)</div>
				</div>
				<div class="p-4 bg-purple-50 rounded-lg">
					<div class="text-3xl font-bold text-purple-600">{theoreticalSE.toFixed(2)}</div>
					<div class="text-sm text-purple-800">Standard Error</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Exercises -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Practice Exercises</h2>
		<div class="space-y-6">
			{#each exercises as exercise, i}
				{#if i === currentExerciseIndex}
					<ExerciseCard
						{exercise}
						on:completed={() => {
							if (currentExerciseIndex < exercises.length - 1) {
								setTimeout(() => currentExerciseIndex++, 1500);
							}
						}}
					/>
				{/if}
			{/each}

			<div class="flex items-center justify-between pt-4">
				<button
					class="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
					disabled={currentExerciseIndex === 0}
					onclick={() => currentExerciseIndex--}
				>
					← Previous
				</button>
				<span class="text-sm text-gray-500">
					Exercise {currentExerciseIndex + 1} of {exercises.length}
				</span>
				<button
					class="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
					disabled={currentExerciseIndex === exercises.length - 1}
					onclick={() => currentExerciseIndex++}
				>
					Next →
				</button>
			</div>
		</div>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/1-foundations/clt" class="text-gray-600 hover:text-gray-900">
			← Central Limit Theorem
		</a>
		<a href="/modules/1-foundations/sample-size" class="text-blue-600 hover:text-blue-700 font-medium">
			Next: Sample Size Effects →
		</a>
	</div>
</div>
