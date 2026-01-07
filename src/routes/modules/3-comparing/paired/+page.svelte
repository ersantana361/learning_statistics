<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, studentT, sample } from '$lib/stats/distributions';

	// LaTeX formulas
	const pairedTFormula = String.raw`t = \frac{\bar{D}}{s_D / \sqrt{n}}`;
	const differenceFormula = String.raw`D_i = X_{i,\text{after}} - X_{i,\text{before}}`;
	const independentTFormula = String.raw`t = \frac{\bar{X}_1 - \bar{X}_2}{s_p\sqrt{\frac{1}{n_1} + \frac{1}{n_2}}}`;

	// Parameters
	let beforeMean = $state(50);
	let afterMean = $state(55);
	let withinSD = $state(8);
	let betweenSD = $state(15);
	let n = $state(20);
	let correlation = $state(0.7);

	// Derived statistics
	const trueDiff = $derived(afterMean - beforeMean);
	const sdDiff = $derived(Math.sqrt(2 * withinSD * withinSD * (1 - correlation)));
	const sePaired = $derived(sdDiff / Math.sqrt(n));
	const seIndependent = $derived(Math.sqrt(2 * betweenSD * betweenSD / n));
	const tPaired = $derived(trueDiff / sePaired);
	const tIndependent = $derived(trueDiff / seIndependent);
	const dfPaired = $derived(n - 1);
	const dfIndependent = $derived(2 * n - 2);
	const pPaired = $derived(2 * (1 - studentT.cdf(Math.abs(tPaired), dfPaired)));
	const pIndependent = $derived(2 * (1 - studentT.cdf(Math.abs(tIndependent), dfIndependent)));

	// Generate paired data for demonstration
	let pairedData = $state<Array<{ before: number; after: number; diff: number }>>([]);

	function generateData() {
		const data: Array<{ before: number; after: number; diff: number }> = [];
		for (let i = 0; i < n; i++) {
			// Generate correlated pairs
			const z1 = normal.random(0, 1);
			const z2 = correlation * z1 + Math.sqrt(1 - correlation * correlation) * normal.random(0, 1);
			const before = beforeMean + betweenSD * z1;
			const after = afterMean + betweenSD * z2;
			data.push({ before, after, diff: after - before });
		}
		pairedData = data;
	}

	function clearData() {
		pairedData = [];
	}

	// Sample statistics
	const sampleDiffs = $derived(pairedData.map(d => d.diff));
	const sampleMeanDiff = $derived(sampleDiffs.length > 0 ? d3.mean(sampleDiffs) ?? 0 : 0);
	const sampleSDDiff = $derived(sampleDiffs.length > 1 ? d3.deviation(sampleDiffs) ?? 0 : 0);
	const sampleSEPaired = $derived(sampleDiffs.length > 0 ? sampleSDDiff / Math.sqrt(n) : 0);
	const sampleTPaired = $derived(sampleSEPaired > 0 ? sampleMeanDiff / sampleSEPaired : 0);
	const samplePPaired = $derived(sampleDiffs.length > 0 ? 2 * (1 - studentT.cdf(Math.abs(sampleTPaired), n - 1)) : 1);

	// SVG dimensions
	const width = 500;
	const height = 300;
	const margin = { top: 30, right: 30, bottom: 50, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales for paired data plot
	const xScale = $derived(
		d3.scaleLinear()
			.domain([beforeMean - 3 * betweenSD, afterMean + 3 * betweenSD])
			.range([0, innerWidth])
	);
	const yScale = $derived(
		d3.scaleLinear()
			.domain([beforeMean - 3 * betweenSD, afterMean + 3 * betweenSD])
			.range([innerHeight, 0])
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'paired-1',
			type: 'multiple-choice',
			question: 'Which design is paired?',
			choices: [
				{ id: 'a', text: 'Comparing test scores of boys vs. girls' },
				{ id: 'b', text: 'Comparing blood pressure before and after medication', isCorrect: true },
				{ id: 'c', text: 'Comparing sales between two different stores' },
				{ id: 'd', text: 'Comparing income across different cities' }
			],
			explanation: 'Before-and-after measurements on the same subjects create natural pairs. Each person serves as their own control, which removes between-subject variability.',
			difficulty: 'easy'
		},
		{
			id: 'paired-2',
			type: 'multiple-choice',
			question: 'Why are paired designs often more powerful than independent designs?',
			choices: [
				{ id: 'a', text: 'They use more subjects' },
				{ id: 'b', text: 'They eliminate between-subject variability', isCorrect: true },
				{ id: 'c', text: 'They have more degrees of freedom' },
				{ id: 'd', text: 'They don\'t require normality' }
			],
			explanation: 'When subjects serve as their own control, individual differences (height, baseline ability, etc.) cancel out. We only measure within-subject change, which is typically less variable.',
			difficulty: 'medium'
		},
		{
			id: 'paired-3',
			type: 'multiple-choice',
			question: 'In a paired t-test, what are we testing?',
			choices: [
				{ id: 'a', text: 'Whether the two sample means are equal' },
				{ id: 'b', text: 'Whether the mean of the differences equals zero', isCorrect: true },
				{ id: 'c', text: 'Whether the correlation between pairs is significant' },
				{ id: 'd', text: 'Whether both measurements have equal variance' }
			],
			explanation: 'The paired t-test computes the difference for each pair, then tests whether the mean of these differences is zero. It\'s essentially a one-sample t-test on the differences.',
			difficulty: 'easy'
		},
		{
			id: 'paired-4',
			type: 'multiple-choice',
			question: 'You have 30 subjects measured before and after. How many degrees of freedom for the paired t-test?',
			choices: [
				{ id: 'a', text: '28' },
				{ id: 'b', text: '29', isCorrect: true },
				{ id: 'c', text: '58' },
				{ id: 'd', text: '59' }
			],
			explanation: 'df = n - 1 = 30 - 1 = 29. We have n pairs, not 2n independent observations. The paired t-test treats each difference as one data point.',
			difficulty: 'easy'
		},
		{
			id: 'paired-5',
			type: 'true-false',
			question: 'If you use an independent t-test on paired data, you will typically get a larger p-value (less power).',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! Ignoring the pairing treats each measurement as independent, inflating the standard error by including between-subject variability that should be controlled. This makes it harder to detect real effects.',
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
			<span>Paired vs Independent</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Paired vs Independent Samples</h1>
		<p class="text-lg text-gray-600">
			Learn when to use paired designs and why they're often more powerful.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-indigo-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-indigo-900 mb-3">The Key Insight</h2>
		<p class="text-indigo-800 mb-4">
			When observations are <strong>paired</strong> (same subject before/after, twins, matched cases),
			we can control for individual differences and get more precise estimates of the treatment effect.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">Paired t-test (analyze differences):</p>
				<MathDisplay formula={pairedTFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Where:</p>
				<MathDisplay formula={differenceFormula} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Comparison Table -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">When to Use Which</h2>

		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">Design</th>
						<th class="py-3 px-4 text-left font-semibold text-indigo-700">Paired</th>
						<th class="py-3 px-4 text-left font-semibold text-orange-700">Independent</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					<tr>
						<td class="py-3 px-4 font-medium">When to use</td>
						<td class="py-3 px-4">Same subjects measured twice, matched pairs, natural pairings</td>
						<td class="py-3 px-4">Different subjects in each group, no natural pairing</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">What varies</td>
						<td class="py-3 px-4">Only within-subject changes</td>
						<td class="py-3 px-4">Between-subject + within-subject variation</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Degrees of freedom</td>
						<td class="py-3 px-4">n - 1 (number of pairs)</td>
						<td class="py-3 px-4">n₁ + n₂ - 2</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Advantages</td>
						<td class="py-3 px-4">Controls individual differences, often more powerful</td>
						<td class="py-3 px-4">Simpler logistics, no carryover effects</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Examples</td>
						<td class="py-3 px-4">Pre/post, left/right eye, twins, crossover trials</td>
						<td class="py-3 px-4">Drug vs placebo groups, comparing regions</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Interactive Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">See the Difference in Power</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<Slider label="Before Mean" bind:value={beforeMean} min={30} max={70} step={1} />
				<Slider label="After Mean" bind:value={afterMean} min={30} max={70} step={1} />
				<Slider label="Within-Subject SD" bind:value={withinSD} min={3} max={15} step={1} />
				<Slider label="Between-Subject SD" bind:value={betweenSD} min={5} max={25} step={1} />
			</div>
			<div class="grid grid-cols-2 gap-4 mb-6">
				<Slider label="Sample Size (n pairs)" bind:value={n} min={10} max={50} step={5} />
				<Slider label="Pre-Post Correlation" bind:value={correlation} min={0} max={0.95} step={0.05} />
			</div>

			<!-- Comparison -->
			<div class="grid md:grid-cols-2 gap-6">
				<div class="p-4 bg-indigo-50 rounded-lg">
					<h4 class="font-semibold text-indigo-900 mb-3">Paired T-Test</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-indigo-700">SD of differences:</span>
							<span class="font-mono">{sdDiff.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-indigo-700">Standard Error:</span>
							<span class="font-mono">{sePaired.toFixed(3)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-indigo-700">t-statistic:</span>
							<span class="font-mono font-bold">{tPaired.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-indigo-700">p-value:</span>
							<span class="font-mono font-bold {pPaired < 0.05 ? 'text-green-600' : ''}">{pPaired < 0.0001 ? '<0.0001' : pPaired.toFixed(4)}</span>
						</div>
					</div>
				</div>

				<div class="p-4 bg-orange-50 rounded-lg">
					<h4 class="font-semibold text-orange-900 mb-3">Independent T-Test (Wrong!)</h4>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-orange-700">Pooled SD:</span>
							<span class="font-mono">{betweenSD.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-orange-700">Standard Error:</span>
							<span class="font-mono">{seIndependent.toFixed(3)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-orange-700">t-statistic:</span>
							<span class="font-mono font-bold">{tIndependent.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-orange-700">p-value:</span>
							<span class="font-mono font-bold {pIndependent < 0.05 ? 'text-green-600' : ''}">{pIndependent < 0.0001 ? '<0.0001' : pIndependent.toFixed(4)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Power comparison -->
			<div class="mt-4 p-4 bg-gray-50 rounded-lg">
				<div class="text-center">
					<span class="text-gray-600">The paired test is </span>
					<span class="font-bold text-indigo-600">{(seIndependent / sePaired).toFixed(1)}×</span>
					<span class="text-gray-600"> more powerful (SE ratio)</span>
				</div>
				{#if pPaired < 0.05 && pIndependent >= 0.05}
					<div class="text-center text-green-600 font-medium mt-2">
						Paired test detects the effect; independent test misses it!
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Data Simulation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Visualize Paired Data</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
					onclick={generateData}
				>
					Generate Paired Data
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearData}
				>
					Clear
				</button>
			</div>

			{#if pairedData.length > 0}
				<svg {width} {height} class="mx-auto">
					<g transform="translate({margin.left},{margin.top})">
						<!-- Diagonal reference line (no change) -->
						<line
							x1={0}
							y1={innerHeight}
							x2={innerWidth}
							y2={0}
							stroke="#9ca3af"
							stroke-width="1"
							stroke-dasharray="5,5"
						/>

						<!-- Data points with connecting lines -->
						{#each pairedData as point}
							<!-- Line from before to after -->
							<line
								x1={xScale(point.before)}
								y1={yScale(point.before)}
								x2={xScale(point.after)}
								y2={yScale(point.after)}
								stroke={point.diff > 0 ? '#10b981' : '#ef4444'}
								stroke-width="1"
								opacity="0.5"
							/>
							<!-- Before point -->
							<circle
								cx={xScale(point.before)}
								cy={yScale(point.before)}
								r="4"
								fill="#3b82f6"
							/>
							<!-- After point -->
							<circle
								cx={xScale(point.after)}
								cy={yScale(point.after)}
								r="4"
								fill="#f97316"
							/>
						{/each}

						<!-- Axes -->
						<g transform="translate(0,{innerHeight})">
							{#each xScale.ticks(6) as tick}
								<g transform="translate({xScale(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick.toFixed(0)}</text>
								</g>
							{/each}
							<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">
								Before Score
							</text>
						</g>
						<g>
							{#each yScale.ticks(6) as tick}
								<g transform="translate(0,{yScale(tick)})">
									<line x2="-6" stroke="#9ca3af" />
									<text x="-10" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="10">{tick.toFixed(0)}</text>
								</g>
							{/each}
							<text transform="rotate(-90)" x={-innerHeight / 2} y="-45" text-anchor="middle" fill="#374151" font-size="11">
								After Score
							</text>
						</g>
					</g>
				</svg>

				<!-- Legend -->
				<div class="flex justify-center gap-6 text-sm mb-4">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-blue-500 rounded-full"></div>
						<span>Before</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-orange-500 rounded-full"></div>
						<span>After</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-0.5 bg-green-500"></div>
						<span>Improvement</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-0.5 bg-red-500"></div>
						<span>Decline</span>
					</div>
				</div>

				<!-- Sample results -->
				<div class="p-4 bg-indigo-50 rounded-lg">
					<h4 class="font-medium text-indigo-900 mb-2">Sample Results</h4>
					<div class="grid md:grid-cols-4 gap-4 text-sm">
						<div>
							<span class="text-indigo-700">Mean Difference:</span>
							<span class="font-mono ml-2">{sampleMeanDiff.toFixed(2)}</span>
						</div>
						<div>
							<span class="text-indigo-700">SD of Differences:</span>
							<span class="font-mono ml-2">{sampleSDDiff.toFixed(2)}</span>
						</div>
						<div>
							<span class="text-indigo-700">t-statistic:</span>
							<span class="font-mono ml-2">{sampleTPaired.toFixed(2)}</span>
						</div>
						<div>
							<span class="text-indigo-700">p-value:</span>
							<span class="font-mono ml-2 {samplePPaired < 0.05 ? 'text-green-600 font-bold' : ''}">{samplePPaired.toFixed(4)}</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center text-gray-400 py-12">
					Generate data to see paired observations
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
		<a href="/modules/3-comparing/t-tests" class="text-gray-600 hover:text-gray-900">
			← Two-Sample T-Tests
		</a>
		<a href="/modules/3-comparing/assumptions" class="text-indigo-600 hover:text-indigo-700 font-medium">
			Next: The Assumption Game →
		</a>
	</div>
</div>
