<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, sample } from '$lib/stats/distributions';

	// Parameters
	let sampleSize = $state(30);
	let skewness = $state(0);
	let varianceRatio = $state(1);

	// Generate sample data with different distributions
	function generateSkewedData(n: number, skew: number): number[] {
		if (skew === 0) {
			return sample.normal(n, 50, 10);
		} else if (skew > 0) {
			// Right-skewed (exponential-ish)
			return Array.from({ length: n }, () => {
				const u = Math.random();
				return 30 + 20 * Math.pow(-Math.log(1 - u), 1 / (1 + skew));
			});
		} else {
			// Left-skewed
			return Array.from({ length: n }, () => {
				const u = Math.random();
				return 70 - 20 * Math.pow(-Math.log(1 - u), 1 / (1 - skew));
			});
		}
	}

	let group1Data = $state<number[]>([]);
	let group2Data = $state<number[]>([]);

	function generateData() {
		group1Data = generateSkewedData(sampleSize, skewness);
		const baseSD = d3.deviation(group1Data) ?? 10;
		group2Data = sample.normal(sampleSize, 55, baseSD * Math.sqrt(varianceRatio));
	}

	function clearData() {
		group1Data = [];
		group2Data = [];
	}

	// Statistics
	const stats1 = $derived(() => {
		if (group1Data.length === 0) return null;
		const mean = d3.mean(group1Data) ?? 0;
		const sd = d3.deviation(group1Data) ?? 0;
		const sorted = [...group1Data].sort((a, b) => a - b);
		const q1 = d3.quantile(sorted, 0.25) ?? 0;
		const median = d3.quantile(sorted, 0.5) ?? 0;
		const q3 = d3.quantile(sorted, 0.75) ?? 0;
		return { mean, sd, q1, median, q3, min: sorted[0], max: sorted[sorted.length - 1] };
	});

	const stats2 = $derived(() => {
		if (group2Data.length === 0) return null;
		const mean = d3.mean(group2Data) ?? 0;
		const sd = d3.deviation(group2Data) ?? 0;
		const sorted = [...group2Data].sort((a, b) => a - b);
		const q1 = d3.quantile(sorted, 0.25) ?? 0;
		const median = d3.quantile(sorted, 0.5) ?? 0;
		const q3 = d3.quantile(sorted, 0.75) ?? 0;
		return { mean, sd, q1, median, q3, min: sorted[0], max: sorted[sorted.length - 1] };
	});

	// SVG dimensions for histograms
	const width = 300;
	const height = 180;
	const margin = { top: 20, right: 20, bottom: 30, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Histogram bins
	const bins1 = $derived(() => {
		if (group1Data.length === 0) return [];
		return d3.bin().domain([20, 80]).thresholds(15)(group1Data);
	});

	const bins2 = $derived(() => {
		if (group2Data.length === 0) return [];
		return d3.bin().domain([20, 80]).thresholds(15)(group2Data);
	});

	const xScale = $derived(d3.scaleLinear().domain([20, 80]).range([0, innerWidth]));
	const yMax = $derived(Math.max(
		d3.max(bins1(), d => d.length) ?? 1,
		d3.max(bins2(), d => d.length) ?? 1
	) * 1.1);
	const yScale = $derived(d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]));

	// Which assumption to highlight
	let activeAssumption = $state<'normality' | 'variance' | 'independence'>('normality');

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'assume-1',
			type: 'multiple-choice',
			question: 'Which assumption is MOST important and can\'t be fixed by large samples?',
			choices: [
				{ id: 'a', text: 'Normality' },
				{ id: 'b', text: 'Equal variances' },
				{ id: 'c', text: 'Independence', isCorrect: true },
				{ id: 'd', text: 'Continuous data' }
			],
			explanation: 'Independence violations (clustered data, repeated measures treated as independent) lead to incorrect standard errors and can\'t be fixed by sample size. Non-normality and unequal variances are less problematic with large n.',
			difficulty: 'hard'
		},
		{
			id: 'assume-2',
			type: 'multiple-choice',
			question: 'The t-test is "robust" to non-normality. What does this mean?',
			choices: [
				{ id: 'a', text: 'The test automatically corrects for non-normality' },
				{ id: 'b', text: 'Moderate violations don\'t greatly affect Type I error rate', isCorrect: true },
				{ id: 'c', text: 'Non-normality increases power' },
				{ id: 'd', text: 'The test works perfectly with any distribution' }
			],
			explanation: 'Robustness means the test maintains its claimed error rates even when assumptions are moderately violated. The t-test is robust to non-normality, especially with larger samples, but severe skewness can still cause problems.',
			difficulty: 'medium'
		},
		{
			id: 'assume-3',
			type: 'multiple-choice',
			question: 'You suspect unequal variances between groups. What\'s the best approach?',
			choices: [
				{ id: 'a', text: 'Always use Student\'s t-test anyway' },
				{ id: 'b', text: 'Transform the data first' },
				{ id: 'c', text: 'Use Welch\'s t-test', isCorrect: true },
				{ id: 'd', text: 'Remove outliers until variances are equal' }
			],
			explanation: 'Welch\'s t-test doesn\'t assume equal variances and performs well even when variances are equal. Many statisticians recommend using it by default.',
			difficulty: 'easy'
		},
		{
			id: 'assume-4',
			type: 'multiple-choice',
			question: 'What does Levene\'s test check?',
			choices: [
				{ id: 'a', text: 'Whether data is normally distributed' },
				{ id: 'b', text: 'Whether group variances are equal', isCorrect: true },
				{ id: 'c', text: 'Whether observations are independent' },
				{ id: 'd', text: 'Whether the effect size is meaningful' }
			],
			explanation: 'Levene\'s test compares variance between groups. However, it\'s often better to just use Welch\'s t-test by default rather than relying on a preliminary variance test.',
			difficulty: 'easy'
		},
		{
			id: 'assume-5',
			type: 'true-false',
			question: 'With n = 100 per group, you don\'t need to worry about any assumptions.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Large samples help with normality (CLT) and power with unequal variances, but independence violations persist regardless of sample size. Always check for clustering or dependencies in your data.',
			difficulty: 'medium'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/3-comparing" class="hover:text-indigo-600">Module 3</a>
			<span class="mx-2">/</span>
			<span>The Assumption Game</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">The Assumption Game</h1>
		<p class="text-lg text-gray-600">
			Understand when assumptions matter, when they don't, and what to do when they're violated.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-indigo-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-indigo-900 mb-3">The Three Key Assumptions</h2>
		<p class="text-indigo-800 mb-4">
			T-tests assume independence, normality, and (for Student's t) equal variances.
			But they're not equally important — <strong>independence is critical</strong>, while
			normality matters less with larger samples.
		</p>
	</section>

	<!-- Assumption Cards -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Click to Explore Each Assumption</h2>

		<div class="grid md:grid-cols-3 gap-4 mb-6">
			<button
				class="p-4 rounded-lg text-left transition-all {activeAssumption === 'independence' ? 'bg-red-100 border-2 border-red-400' : 'bg-white border border-gray-200 hover:border-red-300'}"
				onclick={() => activeAssumption = 'independence'}
			>
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">🔗</span>
					<h3 class="font-semibold text-gray-900">Independence</h3>
				</div>
				<p class="text-sm text-gray-600">Most critical — violations invalidate the test</p>
				<div class="mt-2 text-xs font-medium text-red-600">CRITICAL</div>
			</button>

			<button
				class="p-4 rounded-lg text-left transition-all {activeAssumption === 'normality' ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white border border-gray-200 hover:border-yellow-300'}"
				onclick={() => activeAssumption = 'normality'}
			>
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">📊</span>
					<h3 class="font-semibold text-gray-900">Normality</h3>
				</div>
				<p class="text-sm text-gray-600">Matters less with larger samples (CLT)</p>
				<div class="mt-2 text-xs font-medium text-yellow-600">MODERATE</div>
			</button>

			<button
				class="p-4 rounded-lg text-left transition-all {activeAssumption === 'variance' ? 'bg-green-100 border-2 border-green-400' : 'bg-white border border-gray-200 hover:border-green-300'}"
				onclick={() => activeAssumption = 'variance'}
			>
				<div class="flex items-center gap-2 mb-2">
					<span class="text-2xl">⚖️</span>
					<h3 class="font-semibold text-gray-900">Equal Variance</h3>
				</div>
				<p class="text-sm text-gray-600">Easy fix: use Welch's t-test</p>
				<div class="mt-2 text-xs font-medium text-green-600">FIXABLE</div>
			</button>
		</div>

		<!-- Detail Panel -->
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			{#if activeAssumption === 'independence'}
				<h3 class="font-semibold text-red-900 mb-3">Independence: The Non-Negotiable</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div>
						<h4 class="font-medium text-gray-900 mb-2">What It Means</h4>
						<p class="text-sm text-gray-600 mb-4">
							Each observation provides unique information. Knowing one value doesn't help predict another.
						</p>
						<h4 class="font-medium text-gray-900 mb-2">Violations</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Students from same classroom</li>
							<li>• Multiple measurements per person</li>
							<li>• Time series data</li>
							<li>• Siblings, twins, family members</li>
						</ul>
					</div>
					<div>
						<h4 class="font-medium text-gray-900 mb-2">Why It's Critical</h4>
						<p class="text-sm text-gray-600 mb-4">
							Violating independence inflates or deflates the effective sample size, making standard errors wrong.
							No amount of additional data fixes this.
						</p>
						<h4 class="font-medium text-gray-900 mb-2">What to Do</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Use mixed models for clustered data</li>
							<li>• Use paired t-test for repeated measures</li>
							<li>• Account for correlation structure</li>
						</ul>
					</div>
				</div>
			{:else if activeAssumption === 'normality'}
				<h3 class="font-semibold text-yellow-900 mb-3">Normality: Often Overworried</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div>
						<h4 class="font-medium text-gray-900 mb-2">What It Means</h4>
						<p class="text-sm text-gray-600 mb-4">
							The sampling distribution of the mean should be approximately normal.
							Thanks to CLT, this is usually fine with n ≥ 30.
						</p>
						<h4 class="font-medium text-gray-900 mb-2">When It Matters</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Small samples (n < 20)</li>
							<li>• Severely skewed data</li>
							<li>• Heavy tails / extreme outliers</li>
							<li>• When constructing prediction intervals</li>
						</ul>
					</div>
					<div>
						<h4 class="font-medium text-gray-900 mb-2">How to Check</h4>
						<ul class="text-sm text-gray-600 mb-4 space-y-1">
							<li>• Histogram — look for obvious skewness</li>
							<li>• Q-Q plot — points should follow diagonal</li>
							<li>• Shapiro-Wilk test (but often too sensitive)</li>
						</ul>
						<h4 class="font-medium text-gray-900 mb-2">What to Do</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Increase sample size (CLT helps)</li>
							<li>• Transform data (log, sqrt)</li>
							<li>• Use non-parametric tests (Mann-Whitney)</li>
							<li>• Bootstrap confidence intervals</li>
						</ul>
					</div>
				</div>
			{:else}
				<h3 class="font-semibold text-green-900 mb-3">Equal Variance: The Easiest to Handle</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div>
						<h4 class="font-medium text-gray-900 mb-2">What It Means</h4>
						<p class="text-sm text-gray-600 mb-4">
							Student's t-test assumes both groups have the same population variance.
							This affects the pooled standard error calculation.
						</p>
						<h4 class="font-medium text-gray-900 mb-2">When It Matters</h4>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Very unequal sample sizes</li>
							<li>• Variance ratio > 2 or < 0.5</li>
							<li>• Larger variance in smaller group (worst case)</li>
						</ul>
					</div>
					<div>
						<h4 class="font-medium text-gray-900 mb-2">How to Check</h4>
						<ul class="text-sm text-gray-600 mb-4 space-y-1">
							<li>• Compare sample SDs (rule of thumb: ratio < 2)</li>
							<li>• Levene's test</li>
							<li>• Look at boxplot spreads</li>
						</ul>
						<h4 class="font-medium text-green-900 mb-2">The Easy Solution</h4>
						<p class="text-sm text-gray-600">
							<strong>Just use Welch's t-test!</strong> It doesn't assume equal variances and works well even when they are equal. Many recommend it as the default.
						</p>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Interactive Exploration -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Explore Assumption Violations</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<Slider label="Sample Size (n per group)" bind:value={sampleSize} min={10} max={100} step={5} />
				<Slider label="Group 1 Skewness" bind:value={skewness} min={-2} max={2} step={0.5} />
				<Slider label="Variance Ratio (σ₂²/σ₁²)" bind:value={varianceRatio} min={0.25} max={4} step={0.25} />
			</div>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
					onclick={generateData}
				>
					Generate Data
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearData}
				>
					Clear
				</button>
			</div>

			{#if group1Data.length > 0 && group2Data.length > 0}
				<!-- Histograms -->
				<div class="grid md:grid-cols-2 gap-6 mb-6">
					<div>
						<h4 class="font-medium text-gray-900 mb-2 text-center">Group 1 {skewness !== 0 ? `(Skewness: ${skewness > 0 ? 'Right' : 'Left'})` : '(Normal)'}</h4>
						<svg {width} {height} class="mx-auto">
							<g transform="translate({margin.left},{margin.top})">
								{#each bins1() as bin}
									<rect
										x={xScale(bin.x0 ?? 0)}
										y={yScale(bin.length)}
										width={Math.max(0, xScale(bin.x1 ?? 0) - xScale(bin.x0 ?? 0) - 1)}
										height={innerHeight - yScale(bin.length)}
										fill="#6366f1"
										rx="1"
									/>
								{/each}
								<!-- X Axis -->
								<g transform="translate(0,{innerHeight})">
									{#each xScale.ticks(5) as tick}
										<text x={xScale(tick)} y="15" text-anchor="middle" fill="#6b7280" font-size="9">{tick}</text>
									{/each}
								</g>
							</g>
						</svg>
						{#if stats1()}
							<div class="text-xs text-gray-600 text-center">
								Mean: {stats1()?.mean.toFixed(1)} | SD: {stats1()?.sd.toFixed(1)} | Median: {stats1()?.median.toFixed(1)}
							</div>
						{/if}
					</div>

					<div>
						<h4 class="font-medium text-gray-900 mb-2 text-center">Group 2 {varianceRatio !== 1 ? `(Variance ×${varianceRatio})` : '(Normal)'}</h4>
						<svg {width} {height} class="mx-auto">
							<g transform="translate({margin.left},{margin.top})">
								{#each bins2() as bin}
									<rect
										x={xScale(bin.x0 ?? 0)}
										y={yScale(bin.length)}
										width={Math.max(0, xScale(bin.x1 ?? 0) - xScale(bin.x0 ?? 0) - 1)}
										height={innerHeight - yScale(bin.length)}
										fill="#f97316"
										rx="1"
									/>
								{/each}
								<!-- X Axis -->
								<g transform="translate(0,{innerHeight})">
									{#each xScale.ticks(5) as tick}
										<text x={xScale(tick)} y="15" text-anchor="middle" fill="#6b7280" font-size="9">{tick}</text>
									{/each}
								</g>
							</g>
						</svg>
						{#if stats2()}
							<div class="text-xs text-gray-600 text-center">
								Mean: {stats2()?.mean.toFixed(1)} | SD: {stats2()?.sd.toFixed(1)} | Median: {stats2()?.median.toFixed(1)}
							</div>
						{/if}
					</div>
				</div>

				<!-- Assumption Check Summary -->
				<div class="grid md:grid-cols-3 gap-4">
					<div class="p-3 rounded-lg {Math.abs(skewness) > 1 && sampleSize < 30 ? 'bg-red-50' : 'bg-green-50'}">
						<div class="font-medium {Math.abs(skewness) > 1 && sampleSize < 30 ? 'text-red-900' : 'text-green-900'}">
							Normality
						</div>
						<div class="text-sm {Math.abs(skewness) > 1 && sampleSize < 30 ? 'text-red-700' : 'text-green-700'}">
							{Math.abs(skewness) > 1 && sampleSize < 30 ? '⚠️ Concern with small n' : '✓ OK (CLT applies)'}
						</div>
					</div>
					<div class="p-3 rounded-lg {varianceRatio > 2 || varianceRatio < 0.5 ? 'bg-yellow-50' : 'bg-green-50'}">
						<div class="font-medium {varianceRatio > 2 || varianceRatio < 0.5 ? 'text-yellow-900' : 'text-green-900'}">
							Equal Variance
						</div>
						<div class="text-sm {varianceRatio > 2 || varianceRatio < 0.5 ? 'text-yellow-700' : 'text-green-700'}">
							{varianceRatio > 2 || varianceRatio < 0.5 ? '⚠️ Use Welch\'s t-test' : '✓ Roughly equal'}
						</div>
					</div>
					<div class="p-3 rounded-lg bg-green-50">
						<div class="font-medium text-green-900">Independence</div>
						<div class="text-sm text-green-700">✓ Assumed (simulated data)</div>
					</div>
				</div>
			{:else}
				<div class="text-center text-gray-400 py-12">
					Generate data to explore assumption violations
				</div>
			{/if}
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
		<a href="/modules/3-comparing/paired" class="text-gray-600 hover:text-gray-900">
			← Paired vs Independent
		</a>
		<a href="/modules/3-comparing/practical" class="text-indigo-600 hover:text-indigo-700 font-medium">
			Next: Practical Significance →
		</a>
	</div>
</div>
