<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, studentT, sample } from '$lib/stats/distributions';

	// LaTeX formulas
	const tStatFormula = String.raw`t = \frac{\bar{X}_1 - \bar{X}_2}{SE_{\bar{X}_1 - \bar{X}_2}}`;
	const pooledSEFormula = String.raw`SE = s_p\sqrt{\frac{1}{n_1} + \frac{1}{n_2}}`;
	const pooledSDFormula = String.raw`s_p = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1 + n_2 - 2}}`;
	const dfFormula = String.raw`df = n_1 + n_2 - 2`;

	// Parameters
	let mean1 = $state(50);
	let mean2 = $state(55);
	let sd1 = $state(10);
	let sd2 = $state(10);
	let n1 = $state(30);
	let n2 = $state(30);
	let alpha = $state(0.05);

	// Compute statistics
	const pooledSD = $derived(Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2)));
	const standardError = $derived(pooledSD * Math.sqrt(1 / n1 + 1 / n2));
	const tStatistic = $derived((mean1 - mean2) / standardError);
	const df = $derived(n1 + n2 - 2);
	const criticalT = $derived(studentT.quantile(1 - alpha / 2, df));
	const pValue = $derived(2 * (1 - studentT.cdf(Math.abs(tStatistic), df)));
	const significant = $derived(Math.abs(tStatistic) > criticalT);
	const cohensD = $derived((mean1 - mean2) / pooledSD);

	// Sample simulation
	let group1Data = $state<number[]>([]);
	let group2Data = $state<number[]>([]);

	function drawSamples() {
		group1Data = sample.normal(n1, mean1, sd1);
		group2Data = sample.normal(n2, mean2, sd2);
	}

	function clearSamples() {
		group1Data = [];
		group2Data = [];
	}

	// Sample statistics
	const sample1Mean = $derived(group1Data.length > 0 ? d3.mean(group1Data) ?? mean1 : null);
	const sample2Mean = $derived(group2Data.length > 0 ? d3.mean(group2Data) ?? mean2 : null);
	const sample1SD = $derived(group1Data.length > 1 ? d3.deviation(group1Data) ?? sd1 : null);
	const sample2SD = $derived(group2Data.length > 1 ? d3.deviation(group2Data) ?? sd2 : null);

	// Sample t-test
	const samplePooledSD = $derived(
		sample1SD !== null && sample2SD !== null
			? Math.sqrt(((n1 - 1) * sample1SD * sample1SD + (n2 - 1) * sample2SD * sample2SD) / (n1 + n2 - 2))
			: null
	);
	const sampleSE = $derived(samplePooledSD !== null ? samplePooledSD * Math.sqrt(1 / n1 + 1 / n2) : null);
	const sampleT = $derived(
		sample1Mean !== null && sample2Mean !== null && sampleSE !== null
			? (sample1Mean - sample2Mean) / sampleSE
			: null
	);
	const sampleP = $derived(sampleT !== null ? 2 * (1 - studentT.cdf(Math.abs(sampleT), df)) : null);

	// SVG dimensions
	const width = 550;
	const height = 280;
	const margin = { top: 30, right: 30, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Generate t-distribution curve
	const tCurvePoints = $derived(() => {
		const points: [number, number][] = [];
		for (let x = -4; x <= 4; x += 0.05) {
			const y = studentT.pdf(x, df);
			points.push([x, y]);
		}
		return points;
	});

	const xScale = $derived(d3.scaleLinear().domain([-4, 4]).range([0, innerWidth]));
	const yMax = $derived(studentT.pdf(0, df) * 1.1);
	const yScale = $derived(d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]));

	const tPath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(tCurvePoints())
	);

	// Rejection regions
	const leftRejectArea = $derived(() => {
		let path = `M ${xScale(-4)} ${yScale(0)}`;
		for (let x = -4; x <= -criticalT; x += 0.05) {
			path += ` L ${xScale(x)} ${yScale(studentT.pdf(x, df))}`;
		}
		path += ` L ${xScale(-criticalT)} ${yScale(0)} Z`;
		return path;
	});

	const rightRejectArea = $derived(() => {
		let path = `M ${xScale(criticalT)} ${yScale(0)}`;
		for (let x = criticalT; x <= 4; x += 0.05) {
			path += ` L ${xScale(x)} ${yScale(studentT.pdf(x, df))}`;
		}
		path += ` L ${xScale(4)} ${yScale(0)} Z`;
		return path;
	});

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 't-1',
			type: 'multiple-choice',
			question: 'When should you use a two-sample t-test instead of a paired t-test?',
			choices: [
				{ id: 'a', text: 'When you have before-and-after measurements on the same subjects' },
				{ id: 'b', text: 'When comparing two independent groups with no pairing', isCorrect: true },
				{ id: 'c', text: 'When the data is not normally distributed' },
				{ id: 'd', text: 'When sample sizes are different' }
			],
			explanation: 'Use a two-sample (independent) t-test when your groups are separate and unrelated. Use paired t-test when measurements are connected (same subjects before/after, matched pairs, etc.).',
			difficulty: 'easy'
		},
		{
			id: 't-2',
			type: 'numeric',
			question: 'Group A: n=20, mean=45, SD=8. Group B: n=20, mean=50, SD=8. Calculate the pooled standard error.',
			questionMath: String.raw`SE = s_p\sqrt{\frac{1}{20} + \frac{1}{20}} = 8\sqrt{0.1} \approx ?`,
			correctAnswer: 2.53,
			tolerance: 0.1,
			explanation: 'Since both SDs are equal (8), pooled SD = 8. SE = 8 × √(1/20 + 1/20) = 8 × √0.1 = 8 × 0.316 ≈ 2.53',
			difficulty: 'medium'
		},
		{
			id: 't-3',
			type: 'multiple-choice',
			question: 'What does a t-statistic of t = 2.5 with df = 40 tell you?',
			choices: [
				{ id: 'a', text: 'The effect size is 2.5 standard deviations' },
				{ id: 'b', text: 'The observed difference is 2.5 SEs away from the null hypothesis', isCorrect: true },
				{ id: 'c', text: 'There is a 2.5% chance the null is true' },
				{ id: 'd', text: 'The sample mean difference is 2.5' }
			],
			explanation: 'The t-statistic measures how many standard errors the observed difference is from the hypothesized difference (usually 0). t = 2.5 means the observed difference is 2.5 SEs from zero.',
			difficulty: 'medium',
			hint: 't = (observed - hypothesized) / SE'
		},
		{
			id: 't-4',
			type: 'multiple-choice',
			question: 'Equal variance assumption is violated. What should you do?',
			choices: [
				{ id: 'a', text: 'Use a paired t-test instead' },
				{ id: 'b', text: 'Use Welch\'s t-test (unequal variances)', isCorrect: true },
				{ id: 'c', text: 'Increase sample size' },
				{ id: 'd', text: 'Transform the data to achieve normality' }
			],
			explanation: 'Welch\'s t-test doesn\'t assume equal variances and uses adjusted degrees of freedom. It\'s often recommended as the default choice even when variances appear equal.',
			difficulty: 'medium'
		},
		{
			id: 't-5',
			type: 'true-false',
			question: 'The two-sample t-test requires both groups to have the same sample size.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Unequal sample sizes are fine. The pooled standard error formula accounts for different n values. However, very unequal sizes can reduce power and make the test more sensitive to variance inequality.',
			difficulty: 'easy'
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
			<span>Two-Sample T-Tests</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Two-Sample T-Tests</h1>
		<p class="text-lg text-gray-600">
			Compare means between two independent groups with proper uncertainty quantification.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-indigo-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-indigo-900 mb-3">The Core Question</h2>
		<p class="text-indigo-800 mb-4">
			Is the difference between two group means large enough to conclude they come from different populations,
			or could this difference have arisen by chance?
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">T-statistic:</p>
				<MathDisplay formula={tStatFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Pooled standard error:</p>
				<MathDisplay formula={pooledSEFormula} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Population Parameters -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Set Population Parameters</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
				<Slider label="Group 1 Mean (μ₁)" bind:value={mean1} min={30} max={70} step={1} />
				<Slider label="Group 2 Mean (μ₂)" bind:value={mean2} min={30} max={70} step={1} />
				<Slider label="Significance (α)" bind:value={alpha} min={0.01} max={0.10} step={0.01} />
				<Slider label="Group 1 SD (σ₁)" bind:value={sd1} min={5} max={20} step={1} />
				<Slider label="Group 2 SD (σ₂)" bind:value={sd2} min={5} max={20} step={1} />
				<Slider label="Sample Sizes (n)" bind:value={n1} min={10} max={100} step={5} />
			</div>

			<!-- Theoretical Statistics -->
			<div class="grid md:grid-cols-5 gap-3">
				<div class="text-center p-3 bg-blue-50 rounded-lg">
					<div class="text-lg font-bold text-blue-600">{(mean1 - mean2).toFixed(1)}</div>
					<div class="text-xs text-blue-700">True Difference</div>
				</div>
				<div class="text-center p-3 bg-purple-50 rounded-lg">
					<div class="text-lg font-bold text-purple-600">{pooledSD.toFixed(2)}</div>
					<div class="text-xs text-purple-700">Pooled SD</div>
				</div>
				<div class="text-center p-3 bg-orange-50 rounded-lg">
					<div class="text-lg font-bold text-orange-600">{standardError.toFixed(2)}</div>
					<div class="text-xs text-orange-700">Standard Error</div>
				</div>
				<div class="text-center p-3 bg-green-50 rounded-lg">
					<div class="text-lg font-bold text-green-600">{cohensD.toFixed(2)}</div>
					<div class="text-xs text-green-700">Cohen's d</div>
				</div>
				<div class="text-center p-3 bg-red-50 rounded-lg">
					<div class="text-lg font-bold text-red-600">±{criticalT.toFixed(2)}</div>
					<div class="text-xs text-red-700">Critical t (α={alpha})</div>
				</div>
			</div>
		</div>
	</section>

	<!-- T-Distribution Visualization -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The T-Distribution</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Rejection regions -->
					<path d={leftRejectArea()} fill="#ef4444" fill-opacity="0.3" />
					<path d={rightRejectArea()} fill="#ef4444" fill-opacity="0.3" />

					<!-- T-distribution curve -->
					<path d={tPath} fill="none" stroke="#6366f1" stroke-width="2.5" />

					<!-- Critical value lines -->
					<line
						x1={xScale(-criticalT)}
						x2={xScale(-criticalT)}
						y1={0}
						y2={innerHeight}
						stroke="#ef4444"
						stroke-width="1.5"
						stroke-dasharray="5,5"
					/>
					<line
						x1={xScale(criticalT)}
						x2={xScale(criticalT)}
						y1={0}
						y2={innerHeight}
						stroke="#ef4444"
						stroke-width="1.5"
						stroke-dasharray="5,5"
					/>

					<!-- Theoretical t-statistic -->
					{#if Math.abs(tStatistic) <= 4}
						<line
							x1={xScale(tStatistic)}
							x2={xScale(tStatistic)}
							y1={0}
							y2={innerHeight}
							stroke="#10b981"
							stroke-width="2.5"
						/>
						<circle
							cx={xScale(tStatistic)}
							cy={yScale(studentT.pdf(Math.min(Math.max(tStatistic, -3.5), 3.5), df))}
							r="6"
							fill="#10b981"
						/>
					{/if}

					<!-- Sample t-statistic -->
					{#if sampleT !== null && Math.abs(sampleT) <= 4}
						<line
							x1={xScale(sampleT)}
							x2={xScale(sampleT)}
							y1={0}
							y2={innerHeight}
							stroke="#f97316"
							stroke-width="2"
						/>
						<circle
							cx={xScale(sampleT)}
							cy={yScale(studentT.pdf(Math.min(Math.max(sampleT, -3.5), 3.5), df))}
							r="5"
							fill="#f97316"
						/>
					{/if}

					<!-- Labels -->
					<text x={xScale(-criticalT)} y={-10} text-anchor="middle" fill="#ef4444" font-size="10">
						-{criticalT.toFixed(2)}
					</text>
					<text x={xScale(criticalT)} y={-10} text-anchor="middle" fill="#ef4444" font-size="10">
						{criticalT.toFixed(2)}
					</text>

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(8) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">
							t-statistic (df = {df})
						</text>
					</g>

					<!-- Region labels -->
					<text x={xScale(-3)} y={innerHeight - 15} text-anchor="middle" fill="#ef4444" font-size="9">
						Reject H₀
					</text>
					<text x={xScale(0)} y={innerHeight - 15} text-anchor="middle" fill="#6b7280" font-size="9">
						Fail to Reject
					</text>
					<text x={xScale(3)} y={innerHeight - 15} text-anchor="middle" fill="#ef4444" font-size="9">
						Reject H₀
					</text>
				</g>
			</svg>

			<!-- Legend -->
			<div class="flex justify-center gap-6 mt-2 text-sm">
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span>Theoretical t = {tStatistic.toFixed(2)}</span>
				</div>
				{#if sampleT !== null}
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-orange-500 rounded-full"></div>
						<span>Sample t = {sampleT.toFixed(2)}</span>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Sample Simulation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Try It: Draw Samples</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-600 mb-4">
				Draw random samples from the populations defined above and see how the t-test performs.
			</p>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
					onclick={drawSamples}
				>
					Draw Samples
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearSamples}
				>
					Clear
				</button>
			</div>

			{#if group1Data.length > 0 && group2Data.length > 0}
				<div class="grid md:grid-cols-2 gap-6 mb-6">
					<div class="p-4 bg-blue-50 rounded-lg">
						<h4 class="font-medium text-blue-900 mb-2">Group 1 (n = {n1})</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div>Sample Mean: <span class="font-mono">{sample1Mean?.toFixed(2)}</span></div>
							<div>Sample SD: <span class="font-mono">{sample1SD?.toFixed(2)}</span></div>
						</div>
						<div class="text-xs text-blue-600 mt-2">
							True: μ = {mean1}, σ = {sd1}
						</div>
					</div>
					<div class="p-4 bg-orange-50 rounded-lg">
						<h4 class="font-medium text-orange-900 mb-2">Group 2 (n = {n2})</h4>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div>Sample Mean: <span class="font-mono">{sample2Mean?.toFixed(2)}</span></div>
							<div>Sample SD: <span class="font-mono">{sample2SD?.toFixed(2)}</span></div>
						</div>
						<div class="text-xs text-orange-600 mt-2">
							True: μ = {mean2}, σ = {sd2}
						</div>
					</div>
				</div>

				<!-- Test Results -->
				<div class="p-4 rounded-lg {sampleP !== null && sampleP < alpha ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}">
					<h4 class="font-medium mb-2 {sampleP !== null && sampleP < alpha ? 'text-green-900' : 'text-gray-900'}">
						T-Test Results
					</h4>
					<div class="grid md:grid-cols-4 gap-4 text-sm">
						<div>
							<span class="text-gray-600">t-statistic:</span>
							<span class="font-mono font-medium ml-2">{sampleT?.toFixed(3)}</span>
						</div>
						<div>
							<span class="text-gray-600">p-value:</span>
							<span class="font-mono font-medium ml-2">{sampleP?.toFixed(4)}</span>
						</div>
						<div>
							<span class="text-gray-600">df:</span>
							<span class="font-mono font-medium ml-2">{df}</span>
						</div>
						<div>
							<span class="text-gray-600">Decision:</span>
							<span class="font-medium ml-2 {sampleP !== null && sampleP < alpha ? 'text-green-600' : 'text-gray-600'}">
								{sampleP !== null && sampleP < alpha ? 'Reject H₀' : 'Fail to Reject H₀'}
							</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center text-gray-400 py-8">
					Draw samples to see the t-test in action
				</div>
			{/if}
		</div>
	</section>

	<!-- Assumptions -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Assumptions</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">1. Independence</h3>
				<p class="text-sm text-gray-600 mb-2">
					Observations within and between groups must be independent.
				</p>
				<p class="text-xs text-gray-500">
					<strong>Check:</strong> Random sampling, no repeated measures, no clustering
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">2. Normality</h3>
				<p class="text-sm text-gray-600 mb-2">
					Data in each group should be approximately normal (less critical with n > 30).
				</p>
				<p class="text-xs text-gray-500">
					<strong>Check:</strong> Histograms, Q-Q plots, Shapiro-Wilk test
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">3. Equal Variances</h3>
				<p class="text-sm text-gray-600 mb-2">
					Both groups should have similar variances (for Student's t-test).
				</p>
				<p class="text-xs text-gray-500">
					<strong>Check:</strong> Levene's test, or just use Welch's t-test by default
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">When Assumptions Fail</h3>
				<ul class="text-sm text-gray-600 space-y-1">
					<li>• <strong>Unequal variances:</strong> Use Welch's t-test</li>
					<li>• <strong>Non-normal data:</strong> Mann-Whitney U test</li>
					<li>• <strong>Outliers:</strong> Consider robust alternatives</li>
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
		<a href="/modules/3-comparing" class="text-gray-600 hover:text-gray-900">
			← Back to Module 3
		</a>
		<a href="/modules/3-comparing/paired" class="text-indigo-600 hover:text-indigo-700 font-medium">
			Next: Paired vs Independent →
		</a>
	</div>
</div>
