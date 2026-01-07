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
	const unbiasedFormula = String.raw`E[\bar{X}] = \mu`;

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

	// Expanded exercises (8 total)
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
			explanation: 'A sampling distribution shows how a statistic (such as the sample mean) varies across many different samples taken from the same population.',
			difficulty: 'easy'
		},
		{
			id: 'sampling-2',
			type: 'true-false',
			question: 'The mean of the sampling distribution equals the population mean.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! This is why we say the sample mean is an "unbiased estimator" of the population mean. E[X̄] = μ',
			difficulty: 'easy'
		},
		{
			id: 'sampling-3',
			type: 'numeric',
			question: 'A population has mean μ = 100 and standard deviation σ = 16. If you take samples of size n = 64, what is the standard error of the mean?',
			correctAnswer: 2,
			tolerance: 0.01,
			explanation: 'SE = σ/√n = 16/√64 = 16/8 = 2. Sample means typically vary by about 2 units from the true population mean.',
			difficulty: 'easy'
		},
		{
			id: 'sampling-4',
			type: 'multiple-choice',
			question: 'Why is the sampling distribution of the mean narrower than the population distribution?',
			choices: [
				{ id: 'a', text: 'Because we remove outliers when calculating means' },
				{ id: 'b', text: 'Because extreme values tend to cancel out when averaged', isCorrect: true },
				{ id: 'c', text: 'Because we use smaller numbers' },
				{ id: 'd', text: 'Because sample size is smaller than population size' }
			],
			explanation: 'When computing a mean, extreme high values tend to be balanced by extreme low values. This averaging effect reduces variability.',
			difficulty: 'medium'
		},
		{
			id: 'sampling-5',
			type: 'multiple-choice',
			question: 'If you increase the sample size from 25 to 100, what happens to the standard error?',
			choices: [
				{ id: 'a', text: 'It doubles' },
				{ id: 'b', text: 'It is cut in half', isCorrect: true },
				{ id: 'c', text: 'It stays the same' },
				{ id: 'd', text: 'It is cut to one-fourth' }
			],
			explanation: 'SE = σ/√n. When n goes from 25 to 100, √n goes from 5 to 10. Since SE is inversely proportional to √n, it halves.',
			difficulty: 'medium'
		},
		{
			id: 'sampling-6',
			type: 'numeric',
			question: 'If σ = 20 and you want SE = 2, what sample size do you need?',
			correctAnswer: 100,
			tolerance: 1,
			explanation: 'SE = σ/√n → 2 = 20/√n → √n = 10 → n = 100. To get a specific precision, work backwards from the SE formula.',
			difficulty: 'medium'
		},
		{
			id: 'sampling-7',
			type: 'multiple-choice',
			question: 'A researcher collects 1000 samples of size 50 each. She calculates the mean for each sample. These 1000 means form a:',
			choices: [
				{ id: 'a', text: 'Population distribution' },
				{ id: 'b', text: 'Sample distribution' },
				{ id: 'c', text: 'Sampling distribution of the mean', isCorrect: true },
				{ id: 'd', text: 'Confidence distribution' }
			],
			explanation: 'The distribution of sample means (or any statistic) across repeated samples is called the sampling distribution of that statistic.',
			difficulty: 'medium'
		},
		{
			id: 'sampling-8',
			type: 'true-false',
			question: 'The standard error measures the typical difference between a sample mean and the population mean.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! The standard error quantifies the typical "error" or deviation of sample means from the true population mean. Smaller SE = more precise estimates.',
			difficulty: 'hard'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl mx-auto px-4">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/1-foundations" class="hover:text-blue-600">Module 1: Foundations</a>
			<span class="mx-2">/</span>
			<span>Sampling Distributions</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Sampling Distributions</h1>
		<p class="text-lg text-gray-600">
			The crucial bridge between samples and populations
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-8 border border-amber-200">
		<h2 class="text-xl font-semibold text-amber-900 mb-3">Why This Matters</h2>
		<p class="text-amber-800 mb-4">
			Every time you see a poll result like "45% of voters prefer Candidate A (±3%)", you're seeing
			the sampling distribution at work. That "±3%" comes from understanding how sample statistics
			vary across different possible samples.
		</p>
		<p class="text-amber-800 mb-4">
			The sampling distribution answers a fundamental question: <em>If I took a different sample,
			how different would my results be?</em> This concept is the foundation for confidence intervals,
			hypothesis tests, and everything else in inferential statistics.
		</p>
		<div class="bg-white/60 rounded-lg p-4 mt-4">
			<h3 class="font-medium text-amber-900 mb-2">Learning Objectives</h3>
			<ul class="text-amber-800 space-y-1">
				<li>• Distinguish between a sample distribution and a sampling distribution</li>
				<li>• Understand why the sampling distribution is narrower than the population</li>
				<li>• Calculate and interpret the standard error</li>
				<li>• Explain why larger samples give more precise estimates</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-blue-900 mb-3">The Big Idea</h2>
		<p class="text-blue-800 mb-4">
			A <strong>sampling distribution</strong> is not the distribution of your data—it's the distribution of a
			<em>statistic</em> (like the mean) computed from many different samples.
		</p>
		<div class="bg-white rounded-lg p-4 space-y-2 mb-4">
			<MathDisplay formula={samplingDistFormula} displayMode={true} />
			<MathDisplay formula={meanFormula} displayMode={true} />
		</div>
		<div class="bg-blue-100 rounded-lg p-4">
			<p class="text-blue-900 font-medium">In Plain English:</p>
			<p class="text-blue-800 mt-1">
				Imagine taking thousands of samples from the same population and calculating the mean of each.
				The distribution of all those means is the sampling distribution. It tells you how much your
				sample mean might vary from the true population mean.
			</p>
		</div>
	</section>

	<!-- Understanding Step by Step -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding Sampling Distributions</h2>

		<div class="space-y-6">
			<!-- Concept 1 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">1</span>
					One Sample is Just One Possibility
				</h3>
				<p class="text-gray-700 mb-3">
					When you collect a sample and calculate its mean, you're getting just one possible outcome.
					A different random sample would give a different mean. The sampling distribution captures
					<em>all</em> the possible means you might have gotten.
				</p>
				<div class="bg-gray-50 rounded-lg p-4">
					<p class="text-sm text-gray-600">
						<strong>Analogy:</strong> Think of rolling a die. One roll gives you one number, but the
						probability distribution describes all possible outcomes. Similarly, one sample gives one mean,
						but the sampling distribution describes all possible means.
					</p>
				</div>
			</div>

			<!-- Concept 2 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
					Sample Means Are Unbiased
				</h3>
				<p class="text-gray-700 mb-3">
					The center of the sampling distribution equals the population mean. This is called being
					<strong>unbiased</strong>—on average, sample means hit the target.
				</p>
				<div class="bg-green-50 rounded-lg p-4">
					<MathDisplay formula={unbiasedFormula} displayMode={true} />
					<p class="text-green-800 text-sm mt-2">
						Some sample means will be too high, some too low, but they average out to the true μ.
					</p>
				</div>
			</div>

			<!-- Concept 3 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">3</span>
					Averaging Reduces Variability
				</h3>
				<p class="text-gray-700 mb-3">
					Here's the magic: sample means are less variable than individual observations. When you
					average, extreme values tend to cancel out, pulling the mean toward the center.
				</p>
				<div class="grid md:grid-cols-2 gap-4">
					<div class="bg-red-50 rounded-lg p-4">
						<h4 class="font-medium text-red-900">Individual values</h4>
						<p class="text-sm text-red-800">Spread = σ (population SD)</p>
					</div>
					<div class="bg-green-50 rounded-lg p-4">
						<h4 class="font-medium text-green-900">Sample means</h4>
						<p class="text-sm text-green-800">Spread = σ/√n (always smaller!)</p>
					</div>
				</div>
			</div>

			<!-- Concept 4 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">4</span>
					Larger Samples = Less Variation
				</h3>
				<p class="text-gray-700 mb-3">
					The more observations you average together, the more the extreme values cancel.
					That's why larger samples give more precise estimates—the sampling distribution
					becomes tighter around the true mean.
				</p>
				<div class="bg-amber-50 rounded-lg p-4">
					<p class="text-amber-800">
						<strong>The catch:</strong> Precision improves with √n, not n. To cut the standard error
						in half, you must quadruple your sample size. Diminishing returns!
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Interactive Demo -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Exploration</h2>
		<p class="text-gray-600 mb-4">
			Build a sampling distribution yourself! Each time you click "Draw Sample," a new random sample
			is taken, and its mean is added to the histogram on the right. Watch how the sampling distribution
			emerges as you collect more samples.
		</p>

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
						<span class="text-red-600 font-medium">Sample mean: {currentSampleMean.toFixed(2)}</span> |
						Sample SD: {currentSampleSd.toFixed(2)}
					{:else}
						<span class="text-gray-400">Draw a sample to see distribution</span>
					{/if}
				</div>
			</div>

			<!-- Sampling Distribution -->
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<h3 class="font-medium text-gray-900 mb-3">
					Sampling Distribution ({allSampleMeans.length} samples)
				</h3>
				<svg {width} {height}>
					<g transform="translate({margin.left},{margin.top})">
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
						<line
							x1={samplingXScale(populationMean)}
							x2={samplingXScale(populationMean)}
							y1={0}
							y2={innerHeight}
							stroke="#10b981"
							stroke-width="2"
						/>
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
						<span class="text-blue-600 font-medium">Observed SE: {observedSE.toFixed(2)}</span> |
						<span class="text-green-600 font-medium">Theory SE: {theoreticalSE.toFixed(2)}</span>
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
					Try changing the sample size to see how this affects the spread!
				</p>
			</div>
		{/if}
	</section>

	<!-- Worked Examples -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Worked Examples</h2>

		<!-- Example 1 -->
		<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
			<h3 class="font-semibold text-gray-900 mb-3">Example 1: Calculating Standard Error</h3>
			<div class="bg-gray-50 rounded-lg p-4 mb-4">
				<p class="text-gray-700">
					IQ scores have a mean of 100 and standard deviation of 15. If you measure the IQ of
					36 randomly selected people, what is the standard error of the sample mean?
				</p>
			</div>

			<div class="space-y-3">
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 1</span>
					<p class="text-gray-700">Identify the values: σ = 15, n = 36</p>
				</div>
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 2</span>
					<p class="text-gray-700">Apply the formula: SE = σ/√n = 15/√36 = 15/6 = <strong>2.5</strong></p>
				</div>
			</div>

			<div class="bg-green-50 rounded-lg p-4 mt-4">
				<p class="text-green-800">
					<strong>Interpretation:</strong> Sample means will typically deviate from 100 by about 2.5 points.
					About 68% of sample means will fall between 97.5 and 102.5.
				</p>
			</div>
		</div>

		<!-- Example 2 -->
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<h3 class="font-semibold text-gray-900 mb-3">Example 2: Finding Required Sample Size</h3>
			<div class="bg-gray-50 rounded-lg p-4 mb-4">
				<p class="text-gray-700">
					You're estimating average customer wait times. Past data shows σ = 5 minutes.
					How large a sample do you need if you want the standard error to be no more than 0.5 minutes?
				</p>
			</div>

			<div class="space-y-3">
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 1</span>
					<p class="text-gray-700">Set up: SE = σ/√n → 0.5 = 5/√n</p>
				</div>
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 2</span>
					<p class="text-gray-700">Solve for √n: √n = 5/0.5 = 10</p>
				</div>
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 3</span>
					<p class="text-gray-700">Square both sides: n = 10² = <strong>100</strong></p>
				</div>
			</div>

			<div class="bg-amber-50 rounded-lg p-4 mt-4">
				<p class="text-amber-800">
					<strong>Key insight:</strong> To cut SE in half (from 1.0 to 0.5), you'd need to quadruple n,
					not double it. This is the "square root rule" in action!
				</p>
			</div>
		</div>
	</section>

	<!-- Key Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Three Distributions to Remember</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="bg-purple-50 rounded-lg p-5 border border-purple-200">
				<h3 class="font-semibold text-purple-900 mb-3">Population Distribution</h3>
				<ul class="space-y-2 text-purple-800 text-sm">
					<li>• Distribution of <strong>all individuals</strong></li>
					<li>• Mean = μ, SD = σ</li>
					<li>• Usually unknown</li>
					<li>• Shape can be anything</li>
				</ul>
			</div>
			<div class="bg-gray-50 rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Sample Distribution</h3>
				<ul class="space-y-2 text-gray-700 text-sm">
					<li>• Distribution of <strong>n observations</strong></li>
					<li>• Mean ≈ μ, SD ≈ σ</li>
					<li>• What you actually observe</li>
					<li>• Different each sample</li>
				</ul>
			</div>
			<div class="bg-blue-50 rounded-lg p-5 border border-blue-200">
				<h3 class="font-semibold text-blue-900 mb-3">Sampling Distribution</h3>
				<ul class="space-y-2 text-blue-800 text-sm">
					<li>• Distribution of <strong>sample means</strong></li>
					<li>• Mean = μ, SD = σ/√n</li>
					<li>• Theoretical construct</li>
					<li>• Approximately normal (CLT)</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Standard Error Section -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Standard Error</h2>
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				The <strong>standard error (SE)</strong> is the standard deviation of the sampling distribution.
				It measures the typical "error" when using a sample mean to estimate the population mean.
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

	<!-- Key Takeaways -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="bg-blue-50 rounded-xl p-5">
			<ul class="space-y-3 text-blue-900">
				<li class="flex gap-3">
					<span class="text-xl">📊</span>
					<span><strong>Sampling distributions</strong> describe how statistics vary across repeated samples</span>
				</li>
				<li class="flex gap-3">
					<span class="text-xl">🎯</span>
					<span><strong>Sample means are unbiased</strong>—they center on the true population mean</span>
				</li>
				<li class="flex gap-3">
					<span class="text-xl">📏</span>
					<span><strong>Standard error = σ/√n</strong>—tells you how precise your sample mean is</span>
				</li>
				<li class="flex gap-3">
					<span class="text-xl">📐</span>
					<span><strong>Quadruple n to halve SE</strong>—the square root relationship</span>
				</li>
			</ul>
		</div>
	</section>

	<!-- Exercises -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-2">Practice Exercises</h2>
		<p class="text-gray-600 mb-4">Test your understanding with these {exercises.length} exercises.</p>

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

			<div class="flex items-center justify-between pt-4 border-t border-gray-200">
				<button
					class="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
					disabled={currentExerciseIndex === 0}
					onclick={() => currentExerciseIndex--}
				>
					← Previous
				</button>
				<div class="flex items-center gap-2">
					{#each exercises as _, i}
						<button
							class="w-3 h-3 rounded-full transition-colors {i === currentExerciseIndex ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'}"
							onclick={() => currentExerciseIndex = i}
							aria-label="Go to exercise {i + 1}"
						></button>
					{/each}
				</div>
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

	<!-- What's Next -->
	<section class="bg-gray-50 rounded-xl p-6 mb-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-3">What's Next?</h2>
		<p class="text-gray-700 mb-4">
			Now that you understand sampling distributions, you're ready to explore:
		</p>
		<ul class="text-gray-700 space-y-2">
			<li>• <strong>Sample Size Effects:</strong> How sample size affects precision and power</li>
			<li>• <strong>Standard Error:</strong> Deep dive into SE calculation and interpretation</li>
			<li>• <strong>Confidence Intervals:</strong> Using the sampling distribution to quantify uncertainty</li>
		</ul>
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
