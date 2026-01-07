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
			difficulty: 'easy'
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
		},
		{
			id: 'pval-6',
			type: 'numeric',
			question: 'For a one-tailed (right) z-test, z = 1.645. What is the p-value?',
			correctAnswer: 0.05,
			tolerance: 0.005,
			explanation: 'For a right-tailed test with z = 1.645, p = 1 - Φ(1.645) = 1 - 0.95 = 0.05. This is why z = 1.645 is the critical value for α = 0.05 one-tailed.',
			difficulty: 'medium',
			hint: 'For a right-tailed test, p = P(Z > z) = 1 - Φ(z)'
		},
		{
			id: 'pval-7',
			type: 'multiple-choice',
			question: 'Two studies test the same hypothesis. Study A (n=100): p = 0.04. Study B (n=1000): p = 0.001. Which has the larger effect?',
			choices: [
				{ id: 'a', text: 'Study B has the larger effect' },
				{ id: 'b', text: 'Study A has the larger effect' },
				{ id: 'c', text: 'Cannot tell from p-values alone', isCorrect: true },
				{ id: 'd', text: 'They have the same effect size' }
			],
			explanation: 'P-values don\'t tell you effect size! Study B\'s smaller p could be due to larger n, not larger effect. You need effect size measures (d, r, etc.) to compare magnitudes.',
			difficulty: 'hard'
		},
		{
			id: 'pval-8',
			type: 'true-false',
			question: 'If p = 0.049, the result is "more significant" than if p = 0.051.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'While 0.049 crosses the arbitrary 0.05 threshold and 0.051 doesn\'t, the two p-values are practically identical. The difference is not meaningful—there\'s no magic discontinuity at 0.05.',
			difficulty: 'medium'
		},
		{
			id: 'pval-9',
			type: 'multiple-choice',
			question: 'What z-score corresponds to p = 0.01 (two-tailed)?',
			choices: [
				{ id: 'a', text: 'z ≈ 1.96' },
				{ id: 'b', text: 'z ≈ 2.33' },
				{ id: 'c', text: 'z ≈ 2.58', isCorrect: true },
				{ id: 'd', text: 'z ≈ 3.29' }
			],
			explanation: 'For two-tailed p = 0.01, each tail has 0.005. Looking up Φ⁻¹(0.995) ≈ 2.576 ≈ 2.58.',
			difficulty: 'hard',
			hint: 'Split the α between two tails, then find the z-score for the remaining area.'
		},
		{
			id: 'pval-10',
			type: 'multiple-choice',
			question: 'A researcher reports "p < 0.001" instead of an exact p-value. This likely means:',
			choices: [
				{ id: 'a', text: 'The result is not significant' },
				{ id: 'b', text: 'The test statistic was very extreme', isCorrect: true },
				{ id: 'c', text: 'The effect size is very large' },
				{ id: 'd', text: 'The sample size was small' }
			],
			explanation: 'p < 0.001 means the test statistic was so extreme that the calculated p-value was less than 0.001. It says nothing about effect size—could be a tiny effect with huge n.',
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

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-8 border border-emerald-200">
		<h2 class="text-xl font-semibold text-emerald-900 mb-3">Why This Matters</h2>
		<p class="text-emerald-800 mb-4">
			The p-value might be the most misunderstood concept in all of statistics. Papers have been retracted,
			careers damaged, and scientific conclusions overturned because researchers misinterpreted what their
			p-values actually meant. Even many trained scientists get it wrong.
		</p>
		<p class="text-emerald-800 mb-4">
			A p-value is <strong>not</strong> the probability that your hypothesis is true. It's not the probability
			that your results are due to chance. Understanding what it <em>actually</em> means—and what it doesn't—is
			essential for reading research critically and conducting your own analyses properly.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-emerald-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-emerald-800 space-y-1">
				<li>• Correctly interpret what a p-value represents</li>
				<li>• Identify common misconceptions about p-values</li>
				<li>• Calculate p-values from test statistics</li>
				<li>• Understand the relationship between p-values and effect sizes</li>
			</ul>
		</div>
	</section>

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

	<!-- Understanding Step by Step -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding P-Values Step by Step</h2>

		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Start with the Null Hypothesis</h3>
						<p class="text-gray-700 mb-3">
							The p-value is calculated <em>assuming the null hypothesis is true</em>. We ask: "If there's
							really no effect, what's the probability of getting data at least this extreme?"
						</p>
						<div class="bg-emerald-50 rounded-lg p-4">
							<p class="text-sm text-emerald-800">
								<strong>Key insight:</strong> The p-value is a probability about the DATA, not about the hypothesis.
								It's P(data | H₀), not P(H₀ | data).
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Calculate the Test Statistic</h3>
						<p class="text-gray-700 mb-3">
							Convert your sample result into a standardized score (z or t) that measures how far your
							result is from what's expected under the null hypothesis, in standard error units.
						</p>
						<div class="bg-gray-50 rounded-lg p-4">
							<MathDisplay formula={zScoreFormula} displayMode={true} />
							<p class="text-sm text-gray-600 mt-2">
								A larger absolute z-score means your data is farther from what H₀ predicts.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Find the Tail Area</h3>
						<p class="text-gray-700 mb-3">
							The p-value is the area under the distribution curve in the "extreme" region—values
							at least as far from the null as your observed statistic.
						</p>
						<div class="grid md:grid-cols-3 gap-3 mt-3">
							<div class="bg-gray-50 rounded-lg p-3 text-center text-sm">
								<div class="font-medium text-gray-700">Two-tailed</div>
								<div class="text-gray-600">Both extremes</div>
							</div>
							<div class="bg-gray-50 rounded-lg p-3 text-center text-sm">
								<div class="font-medium text-gray-700">Right-tailed</div>
								<div class="text-gray-600">Upper extreme</div>
							</div>
							<div class="bg-gray-50 rounded-lg p-3 text-center text-sm">
								<div class="font-medium text-gray-700">Left-tailed</div>
								<div class="text-gray-600">Lower extreme</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-emerald-100 text-emerald-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Compare to α</h3>
						<p class="text-gray-700 mb-3">
							If p ≤ α, reject H₀. If p &gt; α, fail to reject H₀. The threshold α (often 0.05)
							is set <em>before</em> seeing the data.
						</p>
						<div class="grid md:grid-cols-2 gap-4 mt-3">
							<div class="bg-red-50 rounded-lg p-3">
								<div class="font-medium text-red-700">p ≤ α: Reject H₀</div>
								<div class="text-sm text-red-600">"Statistically significant"</div>
							</div>
							<div class="bg-gray-50 rounded-lg p-3">
								<div class="font-medium text-gray-700">p &gt; α: Fail to reject H₀</div>
								<div class="text-sm text-gray-600">"Not statistically significant"</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Worked Examples -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Worked Examples</h2>

		<div class="space-y-6">
			<!-- Example 1 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 1: Calculating a P-Value</h3>
				<div class="bg-blue-50 rounded-lg p-4 mb-4">
					<p class="text-blue-900">
						<strong>Problem:</strong> A sample of n = 64 has mean x̄ = 52. We're testing H₀: μ = 50
						with known σ = 8. Find the two-tailed p-value.
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Calculate SE:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`SE = \frac{\sigma}{\sqrt{n}} = \frac{8}{\sqrt{64}} = \frac{8}{8} = 1`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700">Calculate z-score:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`z = \frac{\bar{x} - \mu_0}{SE} = \frac{52 - 50}{1} = 2.0`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
						<div>
							<p class="text-gray-700">Find two-tailed p-value:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`p = 2 \times P(Z > 2.0) = 2 \times 0.0228 = 0.0456`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">p = 0.0456, which is less than α = 0.05</p>
							<p class="text-sm text-gray-600">We reject H₀. The result is statistically significant.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 2 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 2: Interpreting a P-Value Correctly</h3>
				<div class="bg-purple-50 rounded-lg p-4 mb-4">
					<p class="text-purple-900">
						<strong>Scenario:</strong> A study finds p = 0.03 when testing whether a new teaching method
						improves test scores. Which interpretations are correct?
					</p>
				</div>

				<div class="space-y-3">
					<div class="p-3 bg-red-50 rounded-lg">
						<p class="text-sm text-red-800">❌ "There's a 3% chance the teaching method doesn't work"</p>
						<p class="text-xs text-red-700 mt-1">Wrong! P-value is not P(H₀ is true).</p>
					</div>
					<div class="p-3 bg-red-50 rounded-lg">
						<p class="text-sm text-red-800">❌ "There's a 97% chance the teaching method works"</p>
						<p class="text-xs text-red-700 mt-1">Wrong! P-value doesn't give probability of H₁.</p>
					</div>
					<div class="p-3 bg-red-50 rounded-lg">
						<p class="text-sm text-red-800">❌ "The effect is large and important"</p>
						<p class="text-xs text-red-700 mt-1">Wrong! P-value says nothing about effect size.</p>
					</div>
					<div class="p-3 bg-green-50 rounded-lg">
						<p class="text-sm text-green-800">✓ "If the teaching method had no effect, we'd see results this extreme only 3% of the time"</p>
						<p class="text-xs text-green-700 mt-1">Correct! This is what p-value actually means.</p>
					</div>
				</div>
			</div>
		</div>
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

	<!-- Key Takeaways -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-2">✓ P-Value IS</h3>
				<ul class="text-sm text-green-800 space-y-1">
					<li>• P(data this extreme | H₀ true)</li>
					<li>• A measure of evidence against H₀</li>
					<li>• Compared to α to make decisions</li>
					<li>• Affected by both effect size AND sample size</li>
				</ul>
			</div>
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-semibold text-red-900 mb-2">✗ P-Value is NOT</h3>
				<ul class="text-sm text-red-800 space-y-1">
					<li>• Probability that H₀ is true</li>
					<li>• Probability of Type I error</li>
					<li>• Effect size or practical importance</li>
					<li>• Proof that an effect exists or doesn't</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="mb-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
		<h2 class="text-xl font-semibold text-blue-900 mb-3">What's Next?</h2>
		<p class="text-blue-800 mb-4">
			Now that you understand p-values, you're ready to learn about <strong>Type I and Type II Errors</strong>.
			These are the two ways hypothesis tests can go wrong, and understanding them is crucial for interpreting
			statistical results.
		</p>
		<ul class="text-blue-700 space-y-2">
			<li>• Type I Error (α): False positives - rejecting H₀ when it's true</li>
			<li>• Type II Error (β): False negatives - failing to reject H₀ when it's false</li>
			<li>• The inherent tradeoff between these two error types</li>
			<li>• How to choose appropriate error rates for different contexts</li>
		</ul>
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
