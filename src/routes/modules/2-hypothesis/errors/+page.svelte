<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const type1Formula = String.raw`\alpha = P(\text{Reject } H_0 \mid H_0 \text{ true}) = P(\text{Type I Error})`;
	const type2Formula = String.raw`\beta = P(\text{Fail to reject } H_0 \mid H_0 \text{ false}) = P(\text{Type II Error})`;
	const powerFormula = String.raw`\text{Power} = 1 - \beta = P(\text{Reject } H_0 \mid H_0 \text{ false})`;

	// Parameters
	let alpha = $state(0.05);
	let effectSize = $state(0.5);
	let sampleSize = $state(30);
	let sigma = $state(1);

	// Derived values
	const standardError = $derived(sigma / Math.sqrt(sampleSize));
	const criticalZ = $derived(normal.inv(1 - alpha / 2, 0, 1));
	const criticalValue = $derived(criticalZ * standardError);
	const trueEffect = $derived(effectSize * sigma);
	const zPowerRight = $derived((criticalValue - trueEffect) / standardError);
	const beta = $derived(normal.cdf(zPowerRight, 0, 1) - normal.cdf(-criticalZ - effectSize * Math.sqrt(sampleSize), 0, 1));
	const power = $derived(1 - beta);

	// SVG dimensions
	const width = 600;
	const height = 300;
	const margin = { top: 40, right: 40, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xMin = $derived(Math.min(-4 * standardError, trueEffect - 4 * standardError));
	const xMax = $derived(Math.max(4 * standardError, trueEffect + 4 * standardError));
	const xScale = $derived(d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]));

	// Generate curve points
	function getNullCurve() {
		const points: [number, number][] = [];
		for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
			const y = normal.pdf(x, 0, standardError);
			points.push([x, y]);
		}
		return points;
	}

	function getAltCurve() {
		const points: [number, number][] = [];
		for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
			const y = normal.pdf(x, trueEffect, standardError);
			points.push([x, y]);
		}
		return points;
	}

	const nullCurve = $derived(getNullCurve());
	const altCurve = $derived(getAltCurve());

	const yMax = $derived(Math.max(
		normal.pdf(0, 0, standardError),
		normal.pdf(trueEffect, trueEffect, standardError)
	) * 1.1);

	const yScale = $derived(d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]));

	const nullPath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(nullCurve)
	);

	const altPath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(altCurve)
	);

	// Shaded areas
	function getType1Area() {
		let path = `M ${xScale(criticalValue)} ${yScale(0)}`;
		for (let x = criticalValue; x <= xMax; x += (xMax - xMin) / 200) {
			path += ` L ${xScale(x)} ${yScale(normal.pdf(x, 0, standardError))}`;
		}
		path += ` L ${xScale(xMax)} ${yScale(0)} Z`;

		// Left tail
		let leftPath = `M ${xScale(xMin)} ${yScale(0)}`;
		for (let x = xMin; x <= -criticalValue; x += (xMax - xMin) / 200) {
			leftPath += ` L ${xScale(x)} ${yScale(normal.pdf(x, 0, standardError))}`;
		}
		leftPath += ` L ${xScale(-criticalValue)} ${yScale(0)} Z`;

		return path + ' ' + leftPath;
	}

	function getType2Area() {
		let path = `M ${xScale(-criticalValue)} ${yScale(0)}`;
		for (let x = -criticalValue; x <= criticalValue; x += (xMax - xMin) / 200) {
			path += ` L ${xScale(x)} ${yScale(normal.pdf(x, trueEffect, standardError))}`;
		}
		path += ` L ${xScale(criticalValue)} ${yScale(0)} Z`;
		return path;
	}

	function getPowerArea() {
		let path = `M ${xScale(criticalValue)} ${yScale(0)}`;
		for (let x = criticalValue; x <= xMax; x += (xMax - xMin) / 200) {
			path += ` L ${xScale(x)} ${yScale(normal.pdf(x, trueEffect, standardError))}`;
		}
		path += ` L ${xScale(xMax)} ${yScale(0)} Z`;
		return path;
	}

	const type1Area = $derived(getType1Area());
	const type2Area = $derived(getType2Area());
	const powerArea = $derived(getPowerArea());

	// Simulation
	let simResults = $state<Array<{ trueState: 'null' | 'alt'; decision: 'reject' | 'fail'; error: 'type1' | 'type2' | 'correct' }>>([]);

	function runSimulation(count: number, nullIsTrue: boolean) {
		const newResults = Array.from({ length: count }, () => {
			const trueMean = nullIsTrue ? 0 : trueEffect;
			const sampleMean = normal.sample(trueMean, standardError);
			const reject = Math.abs(sampleMean) > criticalValue;

			let error: 'type1' | 'type2' | 'correct';
			if (nullIsTrue && reject) error = 'type1';
			else if (!nullIsTrue && !reject) error = 'type2';
			else error = 'correct';

			return {
				trueState: nullIsTrue ? 'null' as const : 'alt' as const,
				decision: reject ? 'reject' as const : 'fail' as const,
				error
			};
		});
		simResults = [...simResults, ...newResults].slice(-200);
	}

	function clearSimulation() {
		simResults = [];
	}

	const simStats = $derived(() => {
		const nullTrials = simResults.filter(r => r.trueState === 'null');
		const altTrials = simResults.filter(r => r.trueState === 'alt');
		const type1Count = simResults.filter(r => r.error === 'type1').length;
		const type2Count = simResults.filter(r => r.error === 'type2').length;

		return {
			nullTrials: nullTrials.length,
			altTrials: altTrials.length,
			type1Count,
			type2Count,
			type1Rate: nullTrials.length > 0 ? type1Count / nullTrials.length : 0,
			type2Rate: altTrials.length > 0 ? type2Count / altTrials.length : 0,
			powerRate: altTrials.length > 0 ? (altTrials.length - type2Count) / altTrials.length : 0
		};
	});

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'err-1',
			type: 'multiple-choice',
			question: 'A medical test has a 5% false positive rate. This is the same as:',
			choices: [
				{ id: 'a', text: 'Type II error rate = 5%' },
				{ id: 'b', text: 'Type I error rate = 5%', isCorrect: true },
				{ id: 'c', text: 'Power = 5%' },
				{ id: 'd', text: 'Sensitivity = 5%' }
			],
			explanation: 'A false positive means concluding the condition exists when it doesn\'t — that\'s rejecting H₀ (no disease) when H₀ is true. This is the definition of Type I error (α).',
			difficulty: 'easy'
		},
		{
			id: 'err-2',
			type: 'multiple-choice',
			question: 'A drug company wants to minimize false negatives (missing a real effect). They should focus on:',
			choices: [
				{ id: 'a', text: 'Reducing α' },
				{ id: 'b', text: 'Reducing β (increasing power)', isCorrect: true },
				{ id: 'c', text: 'Using a smaller sample size' },
				{ id: 'd', text: 'Using a one-tailed test' }
			],
			explanation: 'Missing a real effect is a Type II error (β). To reduce β, we need to increase power through larger samples, larger effect sizes, or (carefully) adjusting α.',
			difficulty: 'medium'
		},
		{
			id: 'err-3',
			type: 'multiple-choice',
			question: 'If you lower α from 0.05 to 0.01 (keeping everything else constant), what happens to β?',
			choices: [
				{ id: 'a', text: 'β decreases (power increases)' },
				{ id: 'b', text: 'β increases (power decreases)', isCorrect: true },
				{ id: 'c', text: 'β stays the same' },
				{ id: 'd', text: 'It depends on the effect size' }
			],
			explanation: 'There\'s a tradeoff: lowering α means requiring stronger evidence to reject H₀, which makes it harder to detect real effects (higher β, lower power).',
			difficulty: 'medium',
			hint: 'Think about what happens to the critical region when you lower α'
		},
		{
			id: 'err-4',
			type: 'multiple-choice',
			question: 'In a criminal trial, "innocent until proven guilty" means we set:',
			choices: [
				{ id: 'a', text: 'H₀: guilty, and prioritize low α', },
				{ id: 'b', text: 'H₀: innocent, and prioritize low α', isCorrect: true },
				{ id: 'c', text: 'H₀: innocent, and prioritize low β' },
				{ id: 'd', text: 'H₀: guilty, and prioritize high power' }
			],
			explanation: 'The null hypothesis is innocence. We prioritize low α (beyond reasonable doubt) because convicting an innocent person (Type I error) is considered worse than letting a guilty person go free (Type II error).',
			difficulty: 'hard'
		},
		{
			id: 'err-5',
			type: 'true-false',
			question: 'You can reduce both Type I and Type II error rates simultaneously by increasing sample size.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! More data means narrower sampling distributions, allowing you to keep α fixed while reducing β. This is why adequate sample size is crucial for research.',
			difficulty: 'medium'
		},
		{
			id: 'err-6',
			type: 'multiple-choice',
			question: 'A pregnancy test has very high sensitivity (99% true positive rate). This means:',
			choices: [
				{ id: 'a', text: 'Low Type I error rate' },
				{ id: 'b', text: 'Low Type II error rate', isCorrect: true },
				{ id: 'c', text: 'Low false positive rate' },
				{ id: 'd', text: 'High specificity' }
			],
			explanation: 'Sensitivity = 1 - β (true positive rate). High sensitivity means low β (Type II error). The test rarely misses a real pregnancy, but may have false positives.',
			difficulty: 'medium',
			hint: 'Sensitivity is about detecting true positives (H₁ true cases).'
		},
		{
			id: 'err-7',
			type: 'multiple-choice',
			question: 'An airport security scanner is set very sensitive (low threshold). What\'s likely?',
			choices: [
				{ id: 'a', text: 'Low α, low β' },
				{ id: 'b', text: 'Low α, high β' },
				{ id: 'c', text: 'High α, low β', isCorrect: true },
				{ id: 'd', text: 'High α, high β' }
			],
			explanation: 'A sensitive (low threshold) scanner triggers easily. It rarely misses threats (low β) but often false alarms on harmless items (high α). The tradeoff prioritizes catching threats.',
			difficulty: 'hard'
		},
		{
			id: 'err-8',
			type: 'true-false',
			question: 'If power = 0.80, then the Type II error rate (β) is 0.80.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Power = 1 - β. If power is 0.80, then β = 0.20 (20% chance of Type II error). Power and β are complements, not the same thing.',
			difficulty: 'easy'
		},
		{
			id: 'err-9',
			type: 'multiple-choice',
			question: 'A researcher claims their study has α = 0.05 and power = 0.95. They must have:',
			choices: [
				{ id: 'a', text: 'A very small sample size' },
				{ id: 'b', text: 'A large effect size or large sample size', isCorrect: true },
				{ id: 'c', text: 'Used a two-tailed test' },
				{ id: 'd', text: 'Made a mistake—these values are impossible together' }
			],
			explanation: 'Low α AND high power requires either detecting a large effect or having a large sample size. Both are achievable with proper study design.',
			difficulty: 'medium'
		},
		{
			id: 'err-10',
			type: 'multiple-choice',
			question: 'Which scenario prioritizes Type II error over Type I error?',
			choices: [
				{ id: 'a', text: 'Criminal justice ("beyond reasonable doubt")' },
				{ id: 'b', text: 'Cancer screening (don\'t miss cancer)', isCorrect: true },
				{ id: 'c', text: 'Particle physics (5-sigma discoveries)' },
				{ id: 'd', text: 'FDA drug approval' }
			],
			explanation: 'Cancer screening prioritizes catching all true cases (low β) even at the cost of more false positives (higher α). Missing cancer is worse than a false alarm that leads to follow-up testing.',
			difficulty: 'hard'
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
			<span>Type I & II Errors</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Type I and Type II Errors</h1>
		<p class="text-lg text-gray-600">
			Understand the tradeoff between false positives and false negatives.
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-8 border border-emerald-200">
		<h2 class="text-xl font-semibold text-emerald-900 mb-3">Why This Matters</h2>
		<p class="text-emerald-800 mb-4">
			Every statistical decision carries risk. When a cancer screening test comes back positive, it might be a
			false alarm (Type I error). When it comes back negative, it might have missed the disease (Type II error).
			Neither outcome is guaranteed to be correct, and the consequences of each error type can be vastly different.
		</p>
		<p class="text-emerald-800 mb-4">
			Understanding these error types is crucial because <strong>you can't minimize both simultaneously</strong>.
			Setting stricter criteria to reduce false positives inevitably increases false negatives, and vice versa.
			The art of experimental design lies in finding the right balance for your specific context—and that requires
			understanding what each error means and what it costs.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-emerald-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-emerald-800 space-y-1">
				<li>• Define Type I (false positive) and Type II (false negative) errors</li>
				<li>• Understand α (significance level) and β (false negative rate)</li>
				<li>• Recognize the tradeoff between error types</li>
				<li>• Evaluate which error matters more in different contexts</li>
			</ul>
		</div>
	</section>

	<!-- Decision Matrix -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Decision Matrix</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr>
						<th class="py-3 px-4"></th>
						<th class="py-3 px-4 text-center bg-blue-50" colspan="2">Reality</th>
					</tr>
					<tr>
						<th class="py-3 px-4"></th>
						<th class="py-3 px-4 text-center bg-blue-50 font-medium">H₀ True</th>
						<th class="py-3 px-4 text-center bg-orange-50 font-medium">H₀ False (H₁ True)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th class="py-3 px-4 text-left bg-gray-50 font-medium">Reject H₀</th>
						<td class="py-3 px-4 text-center bg-red-100 border border-red-200">
							<div class="font-bold text-red-700">Type I Error</div>
							<div class="text-xs text-red-600">False Positive (α)</div>
						</td>
						<td class="py-3 px-4 text-center bg-green-100 border border-green-200">
							<div class="font-bold text-green-700">Correct!</div>
							<div class="text-xs text-green-600">True Positive (Power)</div>
						</td>
					</tr>
					<tr>
						<th class="py-3 px-4 text-left bg-gray-50 font-medium">Fail to Reject H₀</th>
						<td class="py-3 px-4 text-center bg-green-100 border border-green-200">
							<div class="font-bold text-green-700">Correct!</div>
							<div class="text-xs text-green-600">True Negative (1-α)</div>
						</td>
						<td class="py-3 px-4 text-center bg-amber-100 border border-amber-200">
							<div class="font-bold text-amber-700">Type II Error</div>
							<div class="text-xs text-amber-600">False Negative (β)</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Formulas -->
		<div class="grid md:grid-cols-3 gap-4 mt-4">
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<div class="text-sm text-red-800 mb-2">Type I Error (α)</div>
				<MathDisplay formula={type1Formula} />
			</div>
			<div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
				<div class="text-sm text-amber-800 mb-2">Type II Error (β)</div>
				<MathDisplay formula={type2Formula} />
			</div>
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<div class="text-sm text-green-800 mb-2">Power</div>
				<MathDisplay formula={powerFormula} />
			</div>
		</div>
	</section>

	<!-- Understanding Step by Step -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding the Errors Step by Step</h2>

		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-red-100 text-red-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">I</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Type I Error (False Positive, α)</h3>
						<p class="text-gray-700 mb-3">
							You reject the null hypothesis when it's actually true. You "find" an effect that doesn't exist.
						</p>
						<div class="bg-red-50 rounded-lg p-4">
							<p class="text-sm text-red-800">
								<strong>Analogy:</strong> A fire alarm going off when there's no fire. The alarm "rejects" the
								hypothesis of safety, but it's wrong—there's no danger. Annoying, but usually not catastrophic.
							</p>
						</div>
						<div class="mt-3 text-sm text-gray-600">
							<strong>Controlled by:</strong> The significance level α. If α = 0.05, you accept a 5% chance of Type I error.
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">II</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Type II Error (False Negative, β)</h3>
						<p class="text-gray-700 mb-3">
							You fail to reject the null hypothesis when it's actually false. You miss a real effect.
						</p>
						<div class="bg-amber-50 rounded-lg p-4">
							<p class="text-sm text-amber-800">
								<strong>Analogy:</strong> A fire alarm staying silent when there IS a fire. The alarm "fails to reject"
								the hypothesis of safety, but it's wrong—there's real danger. This can be catastrophic.
							</p>
						</div>
						<div class="mt-3 text-sm text-gray-600">
							<strong>Controlled by:</strong> Sample size, effect size, and α. Larger samples and effects reduce β.
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">⚖</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">The Tradeoff</h3>
						<p class="text-gray-700 mb-3">
							There's an inherent tension: reducing α (being more conservative about rejecting H₀) increases β.
							You can't minimize both without increasing sample size or effect size.
						</p>
						<div class="grid md:grid-cols-2 gap-4 mt-3">
							<div class="bg-gray-50 rounded-lg p-3 text-center">
								<div class="text-gray-800 font-medium">Lower α</div>
								<div class="text-sm text-gray-600">Fewer false positives</div>
								<div class="text-sm text-red-600">More false negatives</div>
							</div>
							<div class="bg-gray-50 rounded-lg p-3 text-center">
								<div class="text-gray-800 font-medium">Higher α</div>
								<div class="text-sm text-gray-600">Fewer false negatives</div>
								<div class="text-sm text-red-600">More false positives</div>
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
				<h3 class="font-semibold text-gray-900 mb-3">Example 1: Drug Trial Design</h3>
				<div class="bg-blue-50 rounded-lg p-4 mb-4">
					<p class="text-blue-900">
						<strong>Scenario:</strong> A pharmaceutical company is testing a new heart medication. The FDA requires α = 0.05.
						They want 80% power to detect a 10% reduction in heart attacks.
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700"><strong>Type I Error:</strong> Approving an ineffective drug</p>
							<p class="text-sm text-gray-600">
								Consequence: Patients take a drug that doesn't work, potential side effects without benefit.
								Rate controlled at α = 5%.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700"><strong>Type II Error:</strong> Rejecting an effective drug</p>
							<p class="text-sm text-gray-600">
								Consequence: Patients miss out on a treatment that could save lives.
								Target rate is β = 20% (power = 80%).
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Design Decision:</p>
							<p class="text-sm text-gray-600">
								With these constraints, they calculate they need n = 5,000 patients per group.
								Increasing to n = 8,000 would achieve 90% power (β = 10%).
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 2 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 2: Manufacturing Quality Control</h3>
				<div class="bg-purple-50 rounded-lg p-4 mb-4">
					<p class="text-purple-900">
						<strong>Scenario:</strong> A chip manufacturer tests batches for defects.
						H₀: batch is good (≤2% defective). H₁: batch is bad (&gt;2% defective).
					</p>
				</div>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="bg-red-50 rounded-lg p-4">
						<h4 class="font-medium text-red-900 mb-2">Type I Error: Reject good batch</h4>
						<ul class="text-sm text-red-800 space-y-1">
							<li>• Waste good product</li>
							<li>• Production delays</li>
							<li>• Financial loss from scrapping</li>
						</ul>
						<p class="text-xs text-red-700 mt-2">Cost estimate: $50,000 per batch</p>
					</div>
					<div class="bg-amber-50 rounded-lg p-4">
						<h4 class="font-medium text-amber-900 mb-2">Type II Error: Accept bad batch</h4>
						<ul class="text-sm text-amber-800 space-y-1">
							<li>• Defective products reach customers</li>
							<li>• Warranty claims, recalls</li>
							<li>• Reputation damage</li>
						</ul>
						<p class="text-xs text-amber-700 mt-2">Cost estimate: $500,000+ per incident</p>
					</div>
				</div>

				<div class="mt-4 p-3 bg-green-50 rounded-lg">
					<p class="text-sm text-green-800">
						<strong>Conclusion:</strong> Since Type II errors cost 10× more, the company sets α = 0.10
						(accepting more false positives) to achieve lower β and catch more bad batches.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Interactive Visualization -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Visualizing the Tradeoff</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<!-- Controls -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<Slider
					label="α (Significance Level)"
					bind:value={alpha}
					min={0.01}
					max={0.20}
					step={0.01}
				/>
				<Slider
					label="Effect Size (d)"
					bind:value={effectSize}
					min={0}
					max={1.5}
					step={0.1}
				/>
				<Slider
					label="Sample Size (n)"
					bind:value={sampleSize}
					min={10}
					max={200}
					step={5}
				/>
				<div class="flex flex-col justify-end">
					<div class="text-sm text-gray-600 mb-1">Standard Error</div>
					<div class="text-lg font-mono">{standardError.toFixed(3)}</div>
				</div>
			</div>

			<!-- Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Type I error area (under null, in rejection region) -->
					<path
						d={type1Area}
						fill="#ef4444"
						fill-opacity="0.3"
					/>

					<!-- Type II error area (under alternative, in acceptance region) -->
					{#if effectSize > 0}
						<path
							d={type2Area}
							fill="#f59e0b"
							fill-opacity="0.3"
						/>

						<!-- Power area -->
						<path
							d={powerArea}
							fill="#10b981"
							fill-opacity="0.3"
						/>
					{/if}

					<!-- Null distribution -->
					<path
						d={nullPath}
						fill="none"
						stroke="#3b82f6"
						stroke-width="2.5"
					/>

					<!-- Alternative distribution -->
					{#if effectSize > 0}
						<path
							d={altPath}
							fill="none"
							stroke="#f97316"
							stroke-width="2.5"
						/>
					{/if}

					<!-- Critical values -->
					<line
						x1={xScale(criticalValue)}
						x2={xScale(criticalValue)}
						y1={0}
						y2={innerHeight}
						stroke="#374151"
						stroke-width="1.5"
						stroke-dasharray="5,5"
					/>
					<line
						x1={xScale(-criticalValue)}
						x2={xScale(-criticalValue)}
						y1={0}
						y2={innerHeight}
						stroke="#374151"
						stroke-width="1.5"
						stroke-dasharray="5,5"
					/>

					<!-- Labels -->
					<text x={xScale(0)} y={-15} text-anchor="middle" fill="#3b82f6" font-size="11" font-weight="500">
						H₀: μ = 0
					</text>
					{#if effectSize > 0}
						<text x={xScale(trueEffect)} y={-15} text-anchor="middle" fill="#f97316" font-size="11" font-weight="500">
							H₁: μ = {trueEffect.toFixed(2)}
						</text>
					{/if}

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(9) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick.toFixed(2)}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">
							Sample Mean
						</text>
					</g>

					<!-- Region labels -->
					<text x={xScale(-3 * standardError)} y={innerHeight - 10} text-anchor="middle" fill="#ef4444" font-size="10">
						Reject H₀
					</text>
					<text x={xScale(0)} y={innerHeight - 10} text-anchor="middle" fill="#6b7280" font-size="10">
						Fail to Reject
					</text>
					<text x={xScale(3 * standardError)} y={innerHeight - 10} text-anchor="middle" fill="#ef4444" font-size="10">
						Reject H₀
					</text>
				</g>
			</svg>

			<!-- Legend and stats -->
			<div class="grid md:grid-cols-4 gap-4 mt-4">
				<div class="text-center p-3 bg-red-50 rounded-lg">
					<div class="text-2xl font-bold text-red-600">{(alpha * 100).toFixed(1)}%</div>
					<div class="text-xs text-red-700">Type I Error (α)</div>
				</div>
				<div class="text-center p-3 bg-amber-50 rounded-lg">
					<div class="text-2xl font-bold text-amber-600">{(beta * 100).toFixed(1)}%</div>
					<div class="text-xs text-amber-700">Type II Error (β)</div>
				</div>
				<div class="text-center p-3 bg-green-50 rounded-lg">
					<div class="text-2xl font-bold text-green-600">{(power * 100).toFixed(1)}%</div>
					<div class="text-xs text-green-700">Power (1-β)</div>
				</div>
				<div class="text-center p-3 bg-gray-50 rounded-lg">
					<div class="text-2xl font-bold text-gray-600">±{criticalValue.toFixed(3)}</div>
					<div class="text-xs text-gray-700">Critical Value</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Simulation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Experience Errors Through Simulation</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-600 mb-4">
				Run trials where you know the truth. See how often each type of error occurs.
			</p>

			<div class="flex flex-wrap gap-3 mb-6">
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => runSimulation(10, true)}
				>
					10 Trials (H₀ True)
				</button>
				<button
					class="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
					onclick={() => runSimulation(10, false)}
				>
					10 Trials (H₁ True)
				</button>
				<button
					class="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
					onclick={() => { runSimulation(50, true); runSimulation(50, false); }}
				>
					100 Mixed Trials
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearSimulation}
				>
					Clear
				</button>
			</div>

			{#if simResults.length > 0}
				<div class="grid md:grid-cols-2 gap-6">
					<!-- When H₀ is True -->
					<div class="p-4 bg-blue-50 rounded-lg">
						<h4 class="font-medium text-blue-900 mb-2">When H₀ is True ({simStats().nullTrials} trials)</h4>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-blue-800">Correctly failed to reject:</span>
								<span class="font-mono">{simStats().nullTrials - simStats().type1Count} ({((1 - simStats().type1Rate) * 100).toFixed(0)}%)</span>
							</div>
							<div class="flex justify-between text-red-700">
								<span>Type I errors (false positives):</span>
								<span class="font-mono">{simStats().type1Count} ({(simStats().type1Rate * 100).toFixed(0)}%)</span>
							</div>
							<div class="text-xs text-blue-600 mt-2">
								Expected Type I rate: {(alpha * 100).toFixed(0)}%
							</div>
						</div>
					</div>

					<!-- When H₁ is True -->
					<div class="p-4 bg-orange-50 rounded-lg">
						<h4 class="font-medium text-orange-900 mb-2">When H₁ is True ({simStats().altTrials} trials)</h4>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between text-green-700">
								<span>Correctly rejected (power):</span>
								<span class="font-mono">{simStats().altTrials - simStats().type2Count} ({(simStats().powerRate * 100).toFixed(0)}%)</span>
							</div>
							<div class="flex justify-between text-amber-700">
								<span>Type II errors (false negatives):</span>
								<span class="font-mono">{simStats().type2Count} ({(simStats().type2Rate * 100).toFixed(0)}%)</span>
							</div>
							<div class="text-xs text-orange-600 mt-2">
								Expected power: {(power * 100).toFixed(0)}%
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center text-gray-400 py-8">
					Run some trials to see error rates in action
				</div>
			{/if}
		</div>
	</section>

	<!-- Real-world examples -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Real-World Examples</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Medical Screening</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>H₀:</strong> Patient is healthy</li>
					<li><strong>Type I (α):</strong> Diagnose disease when healthy → unnecessary treatment, anxiety</li>
					<li><strong>Type II (β):</strong> Miss disease when sick → delayed treatment, worse outcomes</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">
					For serious diseases, we often prioritize low β (high sensitivity) even at cost of more false positives.
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Quality Control</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>H₀:</strong> Product batch is good</li>
					<li><strong>Type I (α):</strong> Reject good batch → wasted product, lost revenue</li>
					<li><strong>Type II (β):</strong> Accept bad batch → defective products reach customers</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">
					The relative costs determine whether to prioritize α or β.
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Spam Filter</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>H₀:</strong> Email is legitimate</li>
					<li><strong>Type I (α):</strong> Mark real email as spam → miss important messages</li>
					<li><strong>Type II (β):</strong> Let spam through → annoying but less harmful</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">
					Most spam filters prioritize low α (don't lose real emails) over catching all spam.
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Criminal Justice</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>H₀:</strong> Defendant is innocent</li>
					<li><strong>Type I (α):</strong> Convict innocent person → severe injustice</li>
					<li><strong>Type II (β):</strong> Acquit guilty person → criminal goes free</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">
					"Beyond reasonable doubt" sets very low α, accepting higher β.
				</p>
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
				<h3 class="font-semibold text-green-900 mb-2">✓ Remember</h3>
				<ul class="text-sm text-green-800 space-y-1">
					<li>• Type I (α): False positive - rejecting true H₀</li>
					<li>• Type II (β): False negative - failing to reject false H₀</li>
					<li>• Power = 1 - β (ability to detect true effects)</li>
					<li>• Increasing sample size reduces β without changing α</li>
				</ul>
			</div>
			<div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
				<h3 class="font-semibold text-amber-900 mb-2">⚠ The Tradeoff</h3>
				<ul class="text-sm text-amber-800 space-y-1">
					<li>• You can't minimize both errors simultaneously</li>
					<li>• Lower α → Higher β (and vice versa)</li>
					<li>• Context determines which error is worse</li>
					<li>• More data is the only way to improve both</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="mb-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
		<h2 class="text-xl font-semibold text-blue-900 mb-3">What's Next?</h2>
		<p class="text-blue-800 mb-4">
			Now that you understand Type I and II errors, you're ready to dive deeper into <strong>Statistical Power</strong>.
			Power analysis helps you design studies that can actually detect the effects you're looking for.
		</p>
		<ul class="text-blue-700 space-y-2">
			<li>• Calculate the power of a statistical test</li>
			<li>• Understand factors that increase power (sample size, effect size, α)</li>
			<li>• Perform power analysis for study planning</li>
			<li>• Avoid underpowered studies that waste resources</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/2-hypothesis/p-values" class="text-gray-600 hover:text-gray-900">
			← P-Values
		</a>
		<a href="/modules/2-hypothesis/power" class="text-emerald-600 hover:text-emerald-700 font-medium">
			Next: Statistical Power →
		</a>
	</div>
</div>
