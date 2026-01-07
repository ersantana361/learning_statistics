<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, studentT } from '$lib/stats/distributions';

	// Parameters
	let sampleSize = $state(25);
	let outlierPercent = $state(10);
	let outlierMagnitude = $state(5);

	// Generate data with outliers
	let data = $state<number[]>([]);

	function generateData() {
		const newData: number[] = [];
		const numOutliers = Math.round(sampleSize * outlierPercent / 100);
		const numNormal = sampleSize - numOutliers;

		// Normal data
		for (let i = 0; i < numNormal; i++) {
			newData.push(normal.random(50, 10));
		}
		// Outliers
		for (let i = 0; i < numOutliers; i++) {
			newData.push(50 + outlierMagnitude * 10 * (Math.random() > 0.5 ? 1 : -1) + normal.random(0, 2));
		}

		data = newData.sort((a, b) => a - b);
	}

	function clearData() {
		data = [];
	}

	// Statistics
	const stats = $derived(() => {
		if (data.length === 0) return null;

		const sorted = [...data].sort((a, b) => a - b);
		const n = sorted.length;

		// Mean and SD
		const mean = d3.mean(sorted) ?? 0;
		const sd = d3.deviation(sorted) ?? 0;

		// Median
		const median = d3.median(sorted) ?? 0;

		// MAD (Median Absolute Deviation)
		const deviations = sorted.map(x => Math.abs(x - median));
		const mad = d3.median(deviations) ?? 0;

		// Trimmed mean (10% trim)
		const trimAmount = Math.floor(n * 0.1);
		const trimmed = sorted.slice(trimAmount, n - trimAmount);
		const trimmedMean = d3.mean(trimmed) ?? 0;

		// Winsorized mean (10% winsorize)
		const winsorized = sorted.map((x, i) => {
			if (i < trimAmount) return sorted[trimAmount];
			if (i >= n - trimAmount) return sorted[n - trimAmount - 1];
			return x;
		});
		const winsorizedMean = d3.mean(winsorized) ?? 0;

		// IQR
		const q1 = d3.quantile(sorted, 0.25) ?? 0;
		const q3 = d3.quantile(sorted, 0.75) ?? 0;
		const iqr = q3 - q1;

		return {
			mean, sd, median, mad, trimmedMean, winsorizedMean,
			q1, q3, iqr, n: sorted.length
		};
	});

	// Identify outliers using IQR method
	const outlierBounds = $derived(() => {
		if (!stats()) return { lower: 0, upper: 0 };
		const s = stats()!;
		return {
			lower: s.q1 - 1.5 * s.iqr,
			upper: s.q3 + 1.5 * s.iqr
		};
	});

	const outliers = $derived(
		data.filter(x => x < outlierBounds().lower || x > outlierBounds().upper)
	);

	// SVG dimensions
	const width = 550;
	const height = 200;
	const margin = { top: 20, right: 20, bottom: 40, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scale for strip plot
	const xScale = $derived(
		d3.scaleLinear()
			.domain([Math.min(0, d3.min(data) ?? 0) - 10, Math.max(100, d3.max(data) ?? 100) + 10])
			.range([0, innerWidth])
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'robust-1',
			type: 'multiple-choice',
			question: 'Which measure of center is most resistant to outliers?',
			choices: [
				{ id: 'a', text: 'Mean' },
				{ id: 'b', text: 'Median', isCorrect: true },
				{ id: 'c', text: 'Mode' },
				{ id: 'd', text: 'Range' }
			],
			explanation: 'The median only depends on the middle value(s) and ignores extreme values. The mean uses all values, making it sensitive to outliers.',
			difficulty: 'easy'
		},
		{
			id: 'robust-2',
			type: 'multiple-choice',
			question: 'When should you consider robust methods?',
			choices: [
				{ id: 'a', text: 'Always — they\'re always better' },
				{ id: 'b', text: 'When data has outliers or is non-normal', isCorrect: true },
				{ id: 'c', text: 'Only with small samples' },
				{ id: 'd', text: 'Never — they\'re less powerful' }
			],
			explanation: 'Robust methods are valuable when data contains outliers, heavy tails, or non-normality. They trade some efficiency under ideal conditions for protection against model violations.',
			difficulty: 'medium'
		},
		{
			id: 'robust-3',
			type: 'multiple-choice',
			question: 'The Mann-Whitney U test is the non-parametric alternative to:',
			choices: [
				{ id: 'a', text: 'One-sample t-test' },
				{ id: 'b', text: 'Independent samples t-test', isCorrect: true },
				{ id: 'c', text: 'Paired t-test' },
				{ id: 'd', text: 'ANOVA' }
			],
			explanation: 'Mann-Whitney (also called Wilcoxon rank-sum) compares two independent groups using ranks instead of raw values. It\'s robust to non-normality and outliers.',
			difficulty: 'medium'
		},
		{
			id: 'robust-4',
			type: 'multiple-choice',
			question: 'What is a trimmed mean?',
			choices: [
				{ id: 'a', text: 'The mean after removing the highest and lowest values' },
				{ id: 'b', text: 'The mean after removing a percentage of extreme values on both ends', isCorrect: true },
				{ id: 'c', text: 'The mean of values within one SD of the median' },
				{ id: 'd', text: 'The mean divided by the sample size' }
			],
			explanation: 'A trimmed mean removes a fixed percentage (e.g., 10%) from each end before averaging. It\'s a compromise between the mean (uses all data) and median (uses only middle value).',
			difficulty: 'easy'
		},
		{
			id: 'robust-5',
			type: 'true-false',
			question: 'Bootstrapping assumes the data comes from a normal distribution.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Bootstrapping is distribution-free. It resamples from the observed data to estimate sampling variability, making no assumptions about the underlying distribution.',
			difficulty: 'medium'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/5-beyond" class="hover:text-violet-600">Module 5</a>
			<span class="mx-2">/</span>
			<span>Robust Alternatives</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Robust Statistical Methods</h1>
		<p class="text-lg text-gray-600">
			Learn methods that work well even when standard assumptions are violated.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-violet-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-violet-900 mb-3">Why Robust Methods?</h2>
		<p class="text-violet-800 mb-4">
			Standard methods (t-tests, means) can be heavily influenced by outliers or non-normal data.
			<strong>Robust methods</strong> give reliable results even when these assumptions don't hold.
		</p>
	</section>

	<!-- Interactive Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">See the Effect of Outliers</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<Slider label="Sample Size" bind:value={sampleSize} min={15} max={50} step={5} />
				<Slider label="Outlier Percent" bind:value={outlierPercent} min={0} max={30} step={5} />
				<Slider label="Outlier Magnitude" bind:value={outlierMagnitude} min={2} max={8} step={1} />
			</div>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors"
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

			{#if data.length > 0 && stats()}
				<!-- Strip Plot -->
				<svg {width} {height} class="mx-auto mb-4">
					<g transform="translate({margin.left},{margin.top})">
						<!-- Outlier bounds -->
						<rect
							x={xScale(outlierBounds().lower)}
							y={0}
							width={xScale(outlierBounds().upper) - xScale(outlierBounds().lower)}
							height={innerHeight}
							fill="#f3f4f6"
						/>

						<!-- Data points -->
						{#each data as value, i}
							{@const isOutlier = value < outlierBounds().lower || value > outlierBounds().upper}
							<circle
								cx={xScale(value)}
								cy={innerHeight / 2 + (Math.random() - 0.5) * 40}
								r="5"
								fill={isOutlier ? '#ef4444' : '#3b82f6'}
								opacity="0.7"
							/>
						{/each}

						<!-- Mean line -->
						<line
							x1={xScale(stats()?.mean ?? 0)}
							x2={xScale(stats()?.mean ?? 0)}
							y1={10}
							y2={innerHeight - 10}
							stroke="#ef4444"
							stroke-width="3"
						/>
						<text x={xScale(stats()?.mean ?? 0)} y={5} text-anchor="middle" fill="#ef4444" font-size="10" font-weight="bold">
							Mean
						</text>

						<!-- Median line -->
						<line
							x1={xScale(stats()?.median ?? 0)}
							x2={xScale(stats()?.median ?? 0)}
							y1={10}
							y2={innerHeight - 10}
							stroke="#10b981"
							stroke-width="3"
						/>
						<text x={xScale(stats()?.median ?? 0)} y={innerHeight + 15} text-anchor="middle" fill="#10b981" font-size="10" font-weight="bold">
							Median
						</text>

						<!-- X axis -->
						<g transform="translate(0,{innerHeight})">
							{#each xScale.ticks(8) as tick}
								<g transform="translate({xScale(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="25" text-anchor="middle" fill="#6b7280" font-size="9">{tick.toFixed(0)}</text>
								</g>
							{/each}
						</g>
					</g>
				</svg>

				<!-- Statistics Comparison -->
				<div class="grid md:grid-cols-2 gap-6">
					<div class="p-4 bg-red-50 rounded-lg">
						<h4 class="font-medium text-red-900 mb-3">Non-Robust (Sensitive to Outliers)</h4>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-red-700">Mean:</span>
								<span class="font-mono font-medium">{stats()?.mean.toFixed(2)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-red-700">Standard Deviation:</span>
								<span class="font-mono">{stats()?.sd.toFixed(2)}</span>
							</div>
						</div>
					</div>

					<div class="p-4 bg-green-50 rounded-lg">
						<h4 class="font-medium text-green-900 mb-3">Robust (Resistant to Outliers)</h4>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-green-700">Median:</span>
								<span class="font-mono font-medium">{stats()?.median.toFixed(2)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-green-700">Trimmed Mean (10%):</span>
								<span class="font-mono">{stats()?.trimmedMean.toFixed(2)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-green-700">MAD:</span>
								<span class="font-mono">{stats()?.mad.toFixed(2)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-green-700">IQR:</span>
								<span class="font-mono">{stats()?.iqr.toFixed(2)}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
					{outliers.length} outliers detected (outside 1.5×IQR from Q1/Q3)
					{#if Math.abs((stats()?.mean ?? 0) - (stats()?.median ?? 0)) > 2}
						| Mean-Median difference: {Math.abs((stats()?.mean ?? 0) - (stats()?.median ?? 0)).toFixed(2)}
					{/if}
				</div>
			{:else}
				<div class="text-center text-gray-400 py-12">
					Generate data to compare robust vs. non-robust measures
				</div>
			{/if}
		</div>
	</section>

	<!-- Methods Overview -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Robust Methods Toolkit</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-violet-700 mb-3">Robust Measures of Center</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li><strong>Median:</strong> Middle value, ignores extremes entirely</li>
					<li><strong>Trimmed Mean:</strong> Remove X% from each end, then average</li>
					<li><strong>Winsorized Mean:</strong> Replace extremes with boundary values</li>
					<li><strong>M-estimators:</strong> Downweight (don't remove) extreme values</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-violet-700 mb-3">Robust Measures of Spread</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li><strong>IQR:</strong> Q3 - Q1, ignores tails</li>
					<li><strong>MAD:</strong> Median Absolute Deviation from median</li>
					<li><strong>Qn, Sn:</strong> Other highly robust scale estimates</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-violet-700 mb-3">Non-Parametric Tests</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li><strong>Wilcoxon Signed-Rank:</strong> Paired t-test alternative</li>
					<li><strong>Mann-Whitney U:</strong> Independent t-test alternative</li>
					<li><strong>Kruskal-Wallis:</strong> ANOVA alternative</li>
					<li><strong>Spearman's ρ:</strong> Correlation based on ranks</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-violet-700 mb-3">Resampling Methods</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li><strong>Bootstrap:</strong> Resample to estimate SE and CIs</li>
					<li><strong>Permutation Tests:</strong> Shuffle labels to test hypotheses</li>
					<li><strong>Jackknife:</strong> Leave-one-out estimates</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- When to Use -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">When to Use Robust Methods</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-green-50 rounded-lg p-5 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-3">✓ Good Candidates</h3>
				<ul class="space-y-2 text-sm text-green-800">
					<li>• Data with outliers you can't remove</li>
					<li>• Skewed distributions</li>
					<li>• Small samples where normality is uncertain</li>
					<li>• Ordinal data or ratings</li>
					<li>• Exploratory analysis</li>
				</ul>
			</div>

			<div class="bg-orange-50 rounded-lg p-5 border border-orange-200">
				<h3 class="font-semibold text-orange-900 mb-3">⚠ Considerations</h3>
				<ul class="space-y-2 text-sm text-orange-800">
					<li>• Slightly less power under ideal conditions</li>
					<li>• May be harder to interpret</li>
					<li>• Some methods need larger samples</li>
					<li>• Report both if results differ substantially</li>
				</ul>
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
		<a href="/modules/5-beyond" class="text-gray-600 hover:text-gray-900">
			← Back to Module 5
		</a>
		<a href="/modules/5-beyond/multiple-testing" class="text-violet-600 hover:text-violet-700 font-medium">
			Next: Multiple Testing →
		</a>
	</div>
</div>
