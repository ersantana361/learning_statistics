<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, studentT } from '$lib/stats/distributions';

	// LaTeX formulas
	const pValueDef = String.raw`p = P(\text{data this extreme or more} \mid H_0 \text{ true})`;
	const zScoreFormula = String.raw`z = \frac{\bar{x} - \mu_0}{SE} = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}`;
	const tScoreFormula = String.raw`t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}`;

	// Test parameters
	let testType = $state<'two-tailed' | 'left' | 'right'>('two-tailed');
	let testStatistic = $state(1.96);
	let useT = $state(false);
	let df = $state(30);

	// Computed p-value
	const pValue = $derived(() => {
		if (useT) {
			if (testType === 'two-tailed') {
				return 2 * (1 - studentT.cdf(Math.abs(testStatistic), df));
			} else if (testType === 'right') {
				return 1 - studentT.cdf(testStatistic, df);
			} else {
				return studentT.cdf(testStatistic, df);
			}
		} else {
			if (testType === 'two-tailed') {
				return 2 * (1 - normal.cdf(Math.abs(testStatistic), 0, 1));
			} else if (testType === 'right') {
				return 1 - normal.cdf(testStatistic, 0, 1);
			} else {
				return normal.cdf(testStatistic, 0, 1);
			}
		}
	});

	// Significance levels for reference
	const significanceLevels = [
		{ alpha: 0.10, critical: 1.645, label: 'α = 0.10' },
		{ alpha: 0.05, critical: 1.96, label: 'α = 0.05' },
		{ alpha: 0.01, critical: 2.576, label: 'α = 0.01' }
	];

	// SVG dimensions
	const width = 550;
	const height = 280;
	const margin = { top: 30, right: 40, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xScale = d3.scaleLinear().domain([-4, 4]).range([0, innerWidth]);
	const yMax = 0.45;
	const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

	// Generate curve points
	function getCurvePoints() {
		const points: [number, number][] = [];
		for (let x = -4; x <= 4; x += 0.05) {
			const y = useT ? studentT.pdf(x, df) : normal.pdf(x, 0, 1);
			points.push([x, y]);
		}
		return points;
	}

	const curvePoints = $derived(getCurvePoints());

	const curvePath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(curvePoints)
	);

	// Shaded area for p-value
	function getShadedArea() {
		const pdf = useT ? (x: number) => studentT.pdf(x, df) : (x: number) => normal.pdf(x, 0, 1);
		let areaPath = '';

		if (testType === 'two-tailed') {
			// Left tail
			let leftPoints = `M ${xScale(-4)} ${yScale(0)}`;
			for (let x = -4; x <= -Math.abs(testStatistic); x += 0.05) {
				leftPoints += ` L ${xScale(x)} ${yScale(pdf(x))}`;
			}
			leftPoints += ` L ${xScale(-Math.abs(testStatistic))} ${yScale(0)} Z`;

			// Right tail
			let rightPoints = `M ${xScale(Math.abs(testStatistic))} ${yScale(0)}`;
			for (let x = Math.abs(testStatistic); x <= 4; x += 0.05) {
				rightPoints += ` L ${xScale(x)} ${yScale(pdf(x))}`;
			}
			rightPoints += ` L ${xScale(4)} ${yScale(0)} Z`;

			areaPath = leftPoints + ' ' + rightPoints;
		} else if (testType === 'right') {
			areaPath = `M ${xScale(testStatistic)} ${yScale(0)}`;
			for (let x = testStatistic; x <= 4; x += 0.05) {
				areaPath += ` L ${xScale(x)} ${yScale(pdf(x))}`;
			}
			areaPath += ` L ${xScale(4)} ${yScale(0)} Z`;
		} else {
			areaPath = `M ${xScale(-4)} ${yScale(0)}`;
			for (let x = -4; x <= testStatistic; x += 0.05) {
				areaPath += ` L ${xScale(x)} ${yScale(pdf(x))}`;
			}
			areaPath += ` L ${xScale(testStatistic)} ${yScale(0)} Z`;
		}

		return areaPath;
	}

	const shadedArea = $derived(getShadedArea());

	// Interactive scenario
	let scenarioSampleMean = $state(105);
	let scenarioNullMean = $state(100);
	let scenarioSE = $state(5);

	const scenarioZ = $derived((scenarioSampleMean - scenarioNullMean) / scenarioSE);
	const scenarioP = $derived(2 * (1 - normal.cdf(Math.abs(scenarioZ), 0, 1)));

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'pval-1',
			type: 'multiple-choice',
			question: 'A p-value of 0.03 means:',
			choices: [
				{ id: 'a', text: 'There\'s a 3% chance the null hypothesis is true' },
				{ id: 'b', text: 'There\'s a 3% chance of seeing data this extreme if H₀ is true', isCorrect: true },
				{ id: 'c', text: 'The effect size is 3%' },
				{ id: 'd', text: 'There\'s a 97% chance the alternative is true' }
			],
			explanation: 'The p-value is the probability of observing data as extreme (or more extreme) as what we got, assuming the null hypothesis is true. It is NOT the probability that H₀ is true.',
			difficulty: 'medium'
		},
		{
			id: 'pval-2',
			type: 'multiple-choice',
			question: 'You get p = 0.08. At α = 0.05, you should:',
			choices: [
				{ id: 'a', text: 'Reject H₀ since the result is "almost significant"' },
				{ id: 'b', text: 'Fail to reject H₀, but note the result is suggestive', isCorrect: true },
				{ id: 'c', text: 'Conclude H₀ is true' },
				{ id: 'd', text: 'Collect more data until p < 0.05' }
			],
			explanation: 'At α = 0.05, p = 0.08 means we fail to reject H₀. We don\'t "accept" H₀ — we simply don\'t have sufficient evidence against it. The result may warrant further investigation but doesn\'t meet our pre-specified threshold.',
			difficulty: 'medium',
			hint: 'Think about what "fail to reject" means vs. "accept"'
		},
		{
			id: 'pval-3',
			type: 'multiple-choice',
			question: 'Which is a correct interpretation of "statistically significant at p < 0.05"?',
			choices: [
				{ id: 'a', text: 'The effect is large and important' },
				{ id: 'b', text: 'If we repeated the study, we\'d get the same result 95% of the time' },
				{ id: 'c', text: 'The observed result would be unlikely if there were truly no effect', isCorrect: true },
				{ id: 'd', text: 'We are 95% confident the alternative hypothesis is true' }
			],
			explanation: 'Statistical significance only tells us that the result would be rare under the null hypothesis. It says nothing about effect size, practical importance, or the probability that H₁ is true.',
			difficulty: 'hard'
		},
		{
			id: 'pval-4',
			type: 'numeric',
			question: 'For a two-tailed z-test, z = 2.0. Using z-tables: Φ(2.0) ≈ 0.9772. What is the p-value?',
			questionMath: String.raw`p = 2 \times (1 - \Phi(2.0)) = 2 \times (1 - 0.9772) = ?`,
			correctAnswer: 0.0456,
			tolerance: 0.005,
			explanation: 'For a two-tailed test, p = 2 × (1 - Φ(|z|)) = 2 × (1 - 0.9772) = 2 × 0.0228 = 0.0456',
			difficulty: 'medium'
		},
		{
			id: 'pval-5',
			type: 'true-false',
			question: 'A smaller p-value always indicates a larger effect size.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! P-values are influenced by sample size. With a huge sample, you can get a tiny p-value for a trivial effect. Effect size and statistical significance are separate concepts.',
			difficulty: 'medium'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/2-hypothesis" class="hover:text-emerald-600">Module 2</a>
			<span class="mx-2">/</span>
			<span>P-Values</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">P-Values Visualized</h1>
		<p class="text-lg text-gray-600">
			See what p-values actually represent — and what they don't.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-emerald-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-emerald-900 mb-3">What Is a P-Value?</h2>
		<p class="text-emerald-800 mb-4">
			The p-value answers: <strong>"If the null hypothesis were true, how surprising is my data?"</strong>
		</p>
		<div class="bg-white rounded-lg p-4">
			<MathDisplay formula={pValueDef} displayMode={true} />
		</div>
		<p class="text-sm text-emerald-700 mt-3">
			It is NOT the probability that H₀ is true. It's the probability of seeing data this extreme
			<em>given that</em> H₀ is true.
		</p>
	</section>

	<!-- Interactive P-Value Visualization -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive P-Value Visualization</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<!-- Controls -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<Slider
					label="Test Statistic (z or t)"
					bind:value={testStatistic}
					min={-4}
					max={4}
					step={0.1}
				/>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">Test Type</span>
					<div class="flex gap-2" role="group" aria-label="Test Type">
						<button
							class="px-3 py-1.5 text-sm rounded-lg {testType === 'two-tailed' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}"
							onclick={() => testType = 'two-tailed'}
						>
							Two-tailed
						</button>
						<button
							class="px-3 py-1.5 text-sm rounded-lg {testType === 'left' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}"
							onclick={() => testType = 'left'}
						>
							Left-tailed
						</button>
						<button
							class="px-3 py-1.5 text-sm rounded-lg {testType === 'right' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}"
							onclick={() => testType = 'right'}
						>
							Right-tailed
						</button>
					</div>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">Distribution</span>
					<div class="flex items-center gap-4" role="radiogroup" aria-label="Distribution">
						<label class="flex items-center gap-2">
							<input type="radio" bind:group={useT} value={false} class="text-emerald-500" />
							<span class="text-sm">Z (normal)</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="radio" bind:group={useT} value={true} class="text-emerald-500" />
							<span class="text-sm">t (df = {df})</span>
						</label>
					</div>
					{#if useT}
						<input type="range" bind:value={df} min="5" max="120" class="w-full mt-2" />
					{/if}
				</div>
			</div>

			<!-- Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Shaded p-value area -->
					<path
						d={shadedArea}
						fill="#ef4444"
						fill-opacity="0.3"
					/>

					<!-- Distribution curve -->
					<path
						d={curvePath}
						fill="none"
						stroke="#374151"
						stroke-width="2"
					/>

					<!-- Test statistic line(s) -->
					{#if testType === 'two-tailed'}
						<line
							x1={xScale(-Math.abs(testStatistic))}
							x2={xScale(-Math.abs(testStatistic))}
							y1={0}
							y2={innerHeight}
							stroke="#ef4444"
							stroke-width="2"
							stroke-dasharray="5,5"
						/>
						<line
							x1={xScale(Math.abs(testStatistic))}
							x2={xScale(Math.abs(testStatistic))}
							y1={0}
							y2={innerHeight}
							stroke="#ef4444"
							stroke-width="2"
							stroke-dasharray="5,5"
						/>
					{:else}
						<line
							x1={xScale(testStatistic)}
							x2={xScale(testStatistic)}
							y1={0}
							y2={innerHeight}
							stroke="#ef4444"
							stroke-width="2"
							stroke-dasharray="5,5"
						/>
					{/if}

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each [-4, -3, -2, -1, 0, 1, 2, 3, 4] as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="11">{tick}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="12">
							{useT ? 't-statistic' : 'z-score'}
						</text>
					</g>

					<!-- Label -->
					<text x={innerWidth / 2} y={-10} text-anchor="middle" fill="#374151" font-size="12" font-weight="500">
						{useT ? `t-distribution (df = ${df})` : 'Standard Normal Distribution'}
					</text>
				</g>
			</svg>

			<!-- P-value display -->
			<div class="mt-4 text-center">
				<div class="inline-block px-6 py-4 bg-gray-50 rounded-xl">
					<div class="text-sm text-gray-600 mb-1">P-value ({testType})</div>
					<div class="text-4xl font-bold {pValue() < 0.05 ? 'text-red-600' : 'text-gray-700'}">
						{pValue().toFixed(4)}
					</div>
					<div class="text-sm mt-2 {pValue() < 0.05 ? 'text-red-600' : 'text-gray-500'}">
						{pValue() < 0.001 ? 'Highly significant (p < 0.001)' :
						 pValue() < 0.01 ? 'Very significant (p < 0.01)' :
						 pValue() < 0.05 ? 'Significant (p < 0.05)' :
						 pValue() < 0.10 ? 'Marginally significant (p < 0.10)' :
						 'Not significant (p ≥ 0.10)'}
					</div>
				</div>
			</div>

			<!-- Reference lines -->
			<div class="mt-4 flex justify-center gap-6 text-sm">
				{#each significanceLevels as level}
					{@const criticalZ = testType === 'two-tailed' ? level.critical : (testType === 'right' ? normal.inv(1 - level.alpha, 0, 1) : normal.inv(level.alpha, 0, 1))}
					<div class="text-center">
						<div class="text-gray-600">{level.label}</div>
						<div class="text-gray-500">
							z = ±{criticalZ.toFixed(2)}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Calculating P-Values -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">How P-Values Are Calculated</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid md:grid-cols-2 gap-6 mb-6">
				<div>
					<h3 class="font-medium text-gray-900 mb-2">Step 1: Calculate Test Statistic</h3>
					<div class="bg-gray-50 rounded-lg p-3">
						<MathDisplay formula={zScoreFormula} displayMode={true} />
					</div>
					<p class="text-sm text-gray-600 mt-2">
						This measures how many standard errors your sample mean is from the null hypothesis value.
					</p>
				</div>
				<div>
					<h3 class="font-medium text-gray-900 mb-2">Step 2: Find Tail Probability</h3>
					<p class="text-sm text-gray-600">
						Use the test statistic to find the area in the tail(s) of the distribution.
						This area is your p-value.
					</p>
					<ul class="mt-2 text-sm text-gray-600 space-y-1">
						<li>• <strong>Two-tailed:</strong> Area in both tails beyond ±|z|</li>
						<li>• <strong>Right-tailed:</strong> Area to the right of z</li>
						<li>• <strong>Left-tailed:</strong> Area to the left of z</li>
					</ul>
				</div>
			</div>

			<!-- Interactive example -->
			<div class="bg-emerald-50 rounded-lg p-4">
				<h3 class="font-medium text-emerald-900 mb-3">Try It: Build a Test Statistic</h3>
				<div class="grid md:grid-cols-4 gap-4 mb-4">
					<div>
						<label class="text-sm text-emerald-800" for="scenario-sample-mean">Sample Mean (x̄)</label>
						<input
							id="scenario-sample-mean"
							type="number"
							bind:value={scenarioSampleMean}
							class="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg"
						/>
					</div>
					<div>
						<label class="text-sm text-emerald-800" for="scenario-null-mean">Null Hypothesis (μ₀)</label>
						<input
							id="scenario-null-mean"
							type="number"
							bind:value={scenarioNullMean}
							class="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg"
						/>
					</div>
					<div>
						<label class="text-sm text-emerald-800" for="scenario-se">Standard Error</label>
						<input
							id="scenario-se"
							type="number"
							bind:value={scenarioSE}
							min="0.1"
							step="0.5"
							class="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg"
						/>
					</div>
					<div>
						<span class="text-sm text-emerald-800">Result</span>
						<div class="mt-1 px-3 py-2 bg-white rounded-lg text-center">
							<div class="text-lg font-bold text-emerald-700">z = {scenarioZ.toFixed(2)}</div>
							<div class="text-xs text-emerald-600">p = {scenarioP.toFixed(4)}</div>
						</div>
					</div>
				</div>
				<p class="text-sm text-emerald-700">
					z = ({scenarioSampleMean} - {scenarioNullMean}) / {scenarioSE} = {scenarioZ.toFixed(2)}
				</p>
			</div>
		</div>
	</section>

	<!-- Critical Misconceptions -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Critical Misconceptions</h2>

		<div class="space-y-4">
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">
					❌ "P-value = probability H₀ is true"
				</h3>
				<p class="text-sm text-red-800">
					The p-value is P(data | H₀), not P(H₀ | data). It tells you how surprising your data would be
					<em>if</em> H₀ were true, not the probability that H₀ is true.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">
					❌ "p &lt; 0.05 means the effect is real/important"
				</h3>
				<p class="text-sm text-red-800">
					Statistical significance ≠ practical significance. With large enough n, you can get p &lt; 0.05
					for tiny, meaningless effects. Always report effect sizes alongside p-values.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">
					❌ "p = 0.049 and p = 0.051 are meaningfully different"
				</h3>
				<p class="text-sm text-red-800">
					The 0.05 threshold is arbitrary. There's no magic discontinuity at α = 0.05.
					Report exact p-values and consider the full picture, including effect sizes and confidence intervals.
				</p>
			</div>

			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-medium text-green-900 mb-2">
					✓ Correct interpretation
				</h3>
				<p class="text-sm text-green-800">
					"If the null hypothesis were true, we'd see data as extreme as ours only p% of the time.
					Since p is small, either the null is false or we observed a rare event."
				</p>
			</div>
		</div>
	</section>

	<!-- P-value vs Effect Size -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">P-Value vs Effect Size</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				P-values tell you whether an effect <em>exists</em>. Effect sizes tell you whether it <em>matters</em>.
			</p>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="py-2 px-4 text-left font-medium text-gray-700">Scenario</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">Sample Size</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">Effect</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">P-value</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">Conclusion</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						<tr>
							<td class="py-2 px-4">Large n, tiny effect</td>
							<td class="py-2 px-4">n = 10,000</td>
							<td class="py-2 px-4">d = 0.05</td>
							<td class="py-2 px-4 text-red-600">p = 0.01</td>
							<td class="py-2 px-4">Significant but trivial</td>
						</tr>
						<tr>
							<td class="py-2 px-4">Small n, large effect</td>
							<td class="py-2 px-4">n = 20</td>
							<td class="py-2 px-4">d = 0.8</td>
							<td class="py-2 px-4 text-gray-600">p = 0.08</td>
							<td class="py-2 px-4">Non-significant but meaningful</td>
						</tr>
						<tr class="bg-green-50">
							<td class="py-2 px-4">Adequate n, real effect</td>
							<td class="py-2 px-4">n = 100</td>
							<td class="py-2 px-4">d = 0.5</td>
							<td class="py-2 px-4 text-green-600">p = 0.002</td>
							<td class="py-2 px-4">Significant AND meaningful</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
				<strong>Key insight:</strong> Always report both statistical significance (p-value) and practical significance (effect size).
				A complete picture requires both.
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
		<a href="/modules/2-hypothesis" class="text-gray-600 hover:text-gray-900">
			← Module Overview
		</a>
		<a href="/modules/2-hypothesis/errors" class="text-emerald-600 hover:text-emerald-700 font-medium">
			Next: Type I & II Errors →
		</a>
	</div>
</div>
