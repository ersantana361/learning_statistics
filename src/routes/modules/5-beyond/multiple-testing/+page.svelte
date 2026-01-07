<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// LaTeX formulas
	const fwerFormula = String.raw`P(\text{at least one false positive}) = 1 - (1 - \alpha)^m`;
	const bonferroniFormula = String.raw`\alpha_{adjusted} = \frac{\alpha}{m}`;
	const fdrFormula = String.raw`FDR = E\left[\frac{\text{False Positives}}{\text{All Positives}}\right]`;

	// Parameters
	let numTests = $state(20);
	let alpha = $state(0.05);
	let trueNulls = $state(18);

	// Calculate FWER
	const fwer = $derived(1 - Math.pow(1 - alpha, numTests));
	const bonferroniAlpha = $derived(alpha / numTests);

	// Simulation
	let simResults = $state<Array<{ testNum: number; pValue: number; trueNull: boolean; significant: boolean; significantBonf: boolean }>>([]);

	function runSimulation() {
		const results: Array<{ testNum: number; pValue: number; trueNull: boolean; significant: boolean; significantBonf: boolean }> = [];
		const numFalse = numTests - trueNulls;

		for (let i = 0; i < numTests; i++) {
			const trueNull = i >= numFalse;
			let pValue: number;

			if (trueNull) {
				// Null is true: p-values are uniform
				pValue = Math.random();
			} else {
				// Alternative is true: p-values tend to be smaller
				pValue = Math.pow(Math.random(), 3); // Skewed toward 0
			}

			results.push({
				testNum: i + 1,
				pValue,
				trueNull,
				significant: pValue < alpha,
				significantBonf: pValue < bonferroniAlpha
			});
		}

		simResults = results.sort((a, b) => a.pValue - b.pValue);
	}

	function clearSimulation() {
		simResults = [];
	}

	// Summary statistics
	const summary = $derived(() => {
		if (simResults.length === 0) return null;

		const truePositives = simResults.filter(r => !r.trueNull && r.significant).length;
		const falsePositives = simResults.filter(r => r.trueNull && r.significant).length;
		const trueNegatives = simResults.filter(r => r.trueNull && !r.significant).length;
		const falseNegatives = simResults.filter(r => !r.trueNull && !r.significant).length;

		const truePositivesBonf = simResults.filter(r => !r.trueNull && r.significantBonf).length;
		const falsePositivesBonf = simResults.filter(r => r.trueNull && r.significantBonf).length;

		return {
			truePositives,
			falsePositives,
			trueNegatives,
			falseNegatives,
			truePositivesBonf,
			falsePositivesBonf,
			totalSignificant: truePositives + falsePositives,
			totalSignificantBonf: truePositivesBonf + falsePositivesBonf
		};
	});

	// BH procedure
	const bhResults = $derived(() => {
		if (simResults.length === 0) return [];
		const sorted = [...simResults].sort((a, b) => a.pValue - b.pValue);
		const m = sorted.length;

		// Find largest k where p(k) <= k/m * alpha
		let threshold = 0;
		for (let k = 1; k <= m; k++) {
			const criticalValue = (k / m) * alpha;
			if (sorted[k - 1].pValue <= criticalValue) {
				threshold = k;
			}
		}

		return sorted.map((r, i) => ({
			...r,
			rank: i + 1,
			bhCritical: ((i + 1) / m) * alpha,
			significantBH: i < threshold
		}));
	});

	// SVG dimensions
	const width = 550;
	const height = 250;
	const margin = { top: 30, right: 30, bottom: 50, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xScale = $derived(d3.scaleLinear().domain([0, numTests + 1]).range([0, innerWidth]));
	const yScale = $derived(d3.scaleLinear().domain([0, Math.max(0.3, alpha * 1.5)]).range([innerHeight, 0]));

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'mult-1',
			type: 'multiple-choice',
			question: 'You run 20 independent tests at α = 0.05. What\'s the probability of at least one false positive if all nulls are true?',
			choices: [
				{ id: 'a', text: '5%' },
				{ id: 'b', text: '20%' },
				{ id: 'c', text: '64%', isCorrect: true },
				{ id: 'd', text: '100%' }
			],
			explanation: 'P(at least one false positive) = 1 - (1-0.05)²⁰ = 1 - 0.95²⁰ ≈ 0.64 or 64%. Multiple testing dramatically inflates the overall error rate.',
			explanationMath: String.raw`1 - (0.95)^{20} \approx 0.64`,
			difficulty: 'medium'
		},
		{
			id: 'mult-2',
			type: 'multiple-choice',
			question: 'What is the Bonferroni correction?',
			choices: [
				{ id: 'a', text: 'Multiply each p-value by the number of tests' },
				{ id: 'b', text: 'Divide the significance level by the number of tests', isCorrect: true },
				{ id: 'c', text: 'Use a different test for each comparison' },
				{ id: 'd', text: 'Only report the smallest p-value' }
			],
			explanation: 'Bonferroni divides α by m (number of tests), so for 20 tests at α=0.05, you use 0.05/20 = 0.0025 as the threshold for each test.',
			difficulty: 'easy'
		},
		{
			id: 'mult-3',
			type: 'multiple-choice',
			question: 'What does FDR (False Discovery Rate) control?',
			choices: [
				{ id: 'a', text: 'The probability of any false positive' },
				{ id: 'b', text: 'The expected proportion of false positives among significant results', isCorrect: true },
				{ id: 'c', text: 'The total number of errors' },
				{ id: 'd', text: 'The probability of Type II error' }
			],
			explanation: 'FDR controls the expected proportion of false discoveries among all discoveries. It\'s more lenient than FWER when you expect many true effects.',
			difficulty: 'medium'
		},
		{
			id: 'mult-4',
			type: 'multiple-choice',
			question: 'Which correction is more powerful (detects more true effects)?',
			choices: [
				{ id: 'a', text: 'Bonferroni' },
				{ id: 'b', text: 'Benjamini-Hochberg (FDR)', isCorrect: true },
				{ id: 'c', text: 'They have equal power' },
				{ id: 'd', text: 'It depends on the number of tests' }
			],
			explanation: 'BH/FDR is more powerful because it allows a controlled proportion of false positives rather than trying to eliminate them entirely. It\'s a better tradeoff when many tests are expected to be significant.',
			difficulty: 'medium'
		},
		{
			id: 'mult-5',
			type: 'true-false',
			question: 'If you only planned to do one test but ended up doing three, you should correct for multiple testing.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! What matters is how many tests you actually did, not how many you planned. Post-hoc additions to analysis inflate error rates and should be corrected.',
			difficulty: 'easy'
		},
		{
			id: 'mult-6',
			type: 'numeric',
			question: 'You run 10 tests at α = 0.05 with Bonferroni correction. What is the adjusted alpha per test?',
			correctAnswer: 0.005,
			tolerance: 0.0001,
			explanation: 'Bonferroni: α_adj = α/m = 0.05/10 = 0.005. Each individual test must have p < 0.005 to be significant.',
			difficulty: 'easy'
		},
		{
			id: 'mult-7',
			type: 'multiple-choice',
			question: 'Why is Holm\'s method preferred over Bonferroni?',
			choices: [
				{ id: 'a', text: 'It\'s easier to calculate' },
				{ id: 'b', text: 'It controls FDR instead of FWER' },
				{ id: 'c', text: 'It\'s uniformly more powerful while still controlling FWER', isCorrect: true },
				{ id: 'd', text: 'It doesn\'t require sorting p-values' }
			],
			explanation: 'Holm is a step-down procedure that is uniformly more powerful than Bonferroni—it will never reject fewer hypotheses—while still controlling FWER at α.',
			difficulty: 'hard'
		},
		{
			id: 'mult-8',
			type: 'multiple-choice',
			question: 'In a genomics study testing 10,000 genes, which correction would you typically use?',
			choices: [
				{ id: 'a', text: 'No correction — too many tests' },
				{ id: 'b', text: 'Bonferroni — must avoid any false positives' },
				{ id: 'c', text: 'Benjamini-Hochberg (FDR) — some false positives are acceptable', isCorrect: true },
				{ id: 'd', text: 'Only test genes you expect to be significant' }
			],
			explanation: 'With 10,000 tests, Bonferroni (α = 0.000005) is too conservative. FDR allows a controlled proportion of false discoveries among significant results, which is more practical for discovery research.',
			difficulty: 'medium'
		},
		{
			id: 'mult-9',
			type: 'true-false',
			question: 'If tests are not independent (e.g., correlated outcomes), Bonferroni becomes too conservative.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! Bonferroni assumes independent tests. With positive correlation, the effective number of tests is lower than the actual number, making Bonferroni overly strict.',
			difficulty: 'hard'
		},
		{
			id: 'mult-10',
			type: 'multiple-choice',
			question: 'When is it acceptable NOT to correct for multiple testing?',
			choices: [
				{ id: 'a', text: 'When all tests are pre-registered and confirmatory' },
				{ id: 'b', text: 'When testing a single pre-specified primary hypothesis with secondary outcomes', isCorrect: true },
				{ id: 'c', text: 'When you expect most nulls to be false' },
				{ id: 'd', text: 'When the sample size is very large' }
			],
			explanation: 'Pre-registered primary analyses may not need correction if the study was designed around that single test. However, exploratory analyses should still be corrected or labeled as hypothesis-generating.',
			difficulty: 'hard'
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
			<span>Multiple Testing</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">The Multiple Testing Problem</h1>
		<p class="text-lg text-gray-600">
			Understand why testing many hypotheses inflates false positive rates and how to correct for it.
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 mb-8 border border-violet-200">
		<h2 class="text-xl font-semibold text-violet-900 mb-3">Why This Matters</h2>
		<p class="text-violet-800 mb-4">
			Imagine testing 20 different gene expressions for association with a disease. Even if
			<em>none</em> of them are truly related, you'd expect about one "significant" finding just by chance.
			<strong>This is how false discoveries get published as real findings.</strong>
		</p>
		<p class="text-violet-800 mb-4">
			The multiple testing problem is at the heart of the replication crisis in science. Understanding
			how to correct for it (and when) is essential for producing—and evaluating—trustworthy research.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-violet-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-violet-800 space-y-1">
				<li>• Understand why testing many hypotheses inflates false positive rates</li>
				<li>• Calculate family-wise error rate (FWER)</li>
				<li>• Apply Bonferroni, Holm, and Benjamini-Hochberg corrections</li>
				<li>• Know when to correct and which method to choose</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-violet-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-violet-900 mb-3">The Problem</h2>
		<p class="text-violet-800 mb-4">
			Each test at α = 0.05 has a 5% false positive rate. But with many tests, the chance
			of <strong>at least one</strong> false positive grows rapidly.
		</p>
		<div class="bg-white rounded-lg p-4">
			<MathDisplay formula={fwerFormula} displayMode={true} />
			<p class="text-sm text-gray-600 mt-2 text-center">
				With m = {numTests} tests: FWER = {(fwer * 100).toFixed(1)}%
			</p>
		</div>
	</section>

	<!-- FWER Calculator -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Family-Wise Error Rate</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<Slider label="Number of Tests (m)" bind:value={numTests} min={1} max={100} step={1} />
				<Slider label="Alpha per Test (α)" bind:value={alpha} min={0.01} max={0.10} step={0.01} />
			</div>

			<div class="grid md:grid-cols-3 gap-4">
				<div class="text-center p-4 bg-red-50 rounded-lg">
					<div class="text-3xl font-bold text-red-600">{(fwer * 100).toFixed(1)}%</div>
					<div class="text-sm text-red-700">P(≥1 false positive)</div>
					<div class="text-xs text-red-500">Without correction</div>
				</div>
				<div class="text-center p-4 bg-green-50 rounded-lg">
					<div class="text-3xl font-bold text-green-600">{(bonferroniAlpha * 100).toFixed(3)}%</div>
					<div class="text-sm text-green-700">Bonferroni α</div>
					<div class="text-xs text-green-500">{alpha}/{numTests}</div>
				</div>
				<div class="text-center p-4 bg-blue-50 rounded-lg">
					<div class="text-3xl font-bold text-blue-600">{(alpha * 100).toFixed(1)}%</div>
					<div class="text-sm text-blue-700">Target FWER</div>
					<div class="text-xs text-blue-500">After correction</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Simulation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Simulation: Watch False Positives Accumulate</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<Slider label="True Null Hypotheses" bind:value={trueNulls} min={0} max={numTests} step={1} />
				<div class="text-sm text-gray-600 self-end pb-2">
					{numTests - trueNulls} true effects, {trueNulls} null effects
				</div>
			</div>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors"
					onclick={runSimulation}
				>
					Run {numTests} Tests
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearSimulation}
				>
					Clear
				</button>
			</div>

			{#if bhResults().length > 0 && summary()}
				<!-- P-value Plot with BH line -->
				<svg {width} {height} class="mx-auto mb-4">
					<g transform="translate({margin.left},{margin.top})">
						<!-- Uncorrected threshold -->
						<line
							x1={0}
							x2={innerWidth}
							y1={yScale(alpha)}
							y2={yScale(alpha)}
							stroke="#ef4444"
							stroke-width="1.5"
							stroke-dasharray="5,5"
						/>
						<text x={innerWidth + 5} y={yScale(alpha)} fill="#ef4444" font-size="9" dominant-baseline="middle">
							α = {alpha}
						</text>

						<!-- Bonferroni threshold -->
						<line
							x1={0}
							x2={innerWidth}
							y1={yScale(bonferroniAlpha)}
							y2={yScale(bonferroniAlpha)}
							stroke="#10b981"
							stroke-width="1.5"
							stroke-dasharray="5,5"
						/>
						<text x={innerWidth + 5} y={yScale(bonferroniAlpha)} fill="#10b981" font-size="9" dominant-baseline="middle">
							Bonf
						</text>

						<!-- BH line -->
						<line
							x1={xScale(0)}
							y1={yScale(0)}
							x2={xScale(numTests)}
							y2={yScale(alpha)}
							stroke="#3b82f6"
							stroke-width="1.5"
						/>

						<!-- P-values -->
						{#each bhResults() as result}
							<circle
								cx={xScale(result.rank)}
								cy={yScale(result.pValue)}
								r="5"
								fill={result.trueNull ? (result.significant ? '#ef4444' : '#9ca3af') : (result.significant ? '#10b981' : '#f59e0b')}
								stroke="white"
								stroke-width="1"
							/>
						{/each}

						<!-- Axes -->
						<g transform="translate(0,{innerHeight})">
							<text x={innerWidth / 2} y="35" text-anchor="middle" fill="#6b7280" font-size="10">Rank (sorted by p-value)</text>
						</g>
						<g>
							<text transform="rotate(-90)" x={-innerHeight / 2} y="-45" text-anchor="middle" fill="#6b7280" font-size="10">P-value</text>
						</g>
					</g>
				</svg>

				<!-- Legend -->
				<div class="flex justify-center gap-4 text-sm mb-4">
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-green-500"></div>
						<span>True Positive</span>
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-red-500"></div>
						<span>False Positive</span>
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-amber-500"></div>
						<span>False Negative</span>
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-gray-400"></div>
						<span>True Negative</span>
					</div>
				</div>

				<!-- Results Comparison -->
				<div class="grid md:grid-cols-3 gap-4">
					<div class="p-4 bg-red-50 rounded-lg">
						<h4 class="font-medium text-red-900 mb-2">No Correction</h4>
						<div class="text-sm space-y-1">
							<div>Significant: {summary()?.totalSignificant}</div>
							<div class="text-red-600">False Positives: {summary()?.falsePositives}</div>
							<div class="text-green-600">True Positives: {summary()?.truePositives}</div>
						</div>
					</div>
					<div class="p-4 bg-green-50 rounded-lg">
						<h4 class="font-medium text-green-900 mb-2">Bonferroni</h4>
						<div class="text-sm space-y-1">
							<div>Significant: {summary()?.totalSignificantBonf}</div>
							<div class="text-red-600">False Positives: {summary()?.falsePositivesBonf}</div>
							<div class="text-green-600">True Positives: {summary()?.truePositivesBonf}</div>
						</div>
					</div>
					<div class="p-4 bg-blue-50 rounded-lg">
						<h4 class="font-medium text-blue-900 mb-2">BH (FDR)</h4>
						<div class="text-sm space-y-1">
							<div>Significant: {bhResults().filter(r => r.significantBH).length}</div>
							<div class="text-red-600">False Positives: {bhResults().filter(r => r.trueNull && r.significantBH).length}</div>
							<div class="text-green-600">True Positives: {bhResults().filter(r => !r.trueNull && r.significantBH).length}</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center text-gray-400 py-12">
					Run the simulation to see multiple testing in action
				</div>
			{/if}
		</div>
	</section>

	<!-- Methods Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Correction Methods</h2>

		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">Method</th>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">Controls</th>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">Strictness</th>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">When to Use</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					<tr>
						<td class="py-3 px-4 font-medium">Bonferroni</td>
						<td class="py-3 px-4">FWER</td>
						<td class="py-3 px-4">Very strict</td>
						<td class="py-3 px-4">Few tests, any false positive is bad</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Holm</td>
						<td class="py-3 px-4">FWER</td>
						<td class="py-3 px-4">Strict (but better than Bonferroni)</td>
						<td class="py-3 px-4">Same as Bonferroni, more powerful</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Benjamini-Hochberg</td>
						<td class="py-3 px-4">FDR</td>
						<td class="py-3 px-4">Moderate</td>
						<td class="py-3 px-4">Many tests, some false positives OK</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">No correction</td>
						<td class="py-3 px-4">Per-test α</td>
						<td class="py-3 px-4">None</td>
						<td class="py-3 px-4">Pre-registered confirmatory analysis</td>
					</tr>
				</tbody>
			</table>
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
	<section class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8 border border-green-200">
		<h2 class="text-xl font-semibold text-green-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
					<p class="text-green-800 text-sm"><strong>Multiple tests inflate false positives</strong> — 20 tests at α=0.05 gives 64% chance of at least one false positive.</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
					<p class="text-green-800 text-sm"><strong>Bonferroni divides α by m</strong> — simple but conservative. Use Holm for more power.</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
					<p class="text-green-800 text-sm"><strong>FDR controls proportion of false discoveries</strong> — more lenient, better for exploratory research.</p>
				</div>
			</div>
			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
					<p class="text-green-800 text-sm"><strong>Pre-registration helps</strong> — planned primary analyses may not need correction; exploratory analyses always should.</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</div>
					<p class="text-green-800 text-sm"><strong>Report all tests</strong> — selective reporting of significant results is a form of p-hacking.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Decision Guide -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
		<h2 class="text-xl font-semibold text-blue-900 mb-4">Which Correction Should I Use?</h2>
		<div class="space-y-4 text-sm">
			<div class="bg-white rounded-lg p-4">
				<h3 class="font-semibold text-blue-900 mb-2">Use Bonferroni/Holm when...</h3>
				<ul class="text-blue-800 space-y-1">
					<li>• You have few tests (≤10)</li>
					<li>• Any false positive is costly (clinical decisions, regulatory submissions)</li>
					<li>• You want to strongly claim "no false positives"</li>
				</ul>
			</div>
			<div class="bg-white rounded-lg p-4">
				<h3 class="font-semibold text-blue-900 mb-2">Use FDR (Benjamini-Hochberg) when...</h3>
				<ul class="text-blue-800 space-y-1">
					<li>• You have many tests (genomics, brain imaging)</li>
					<li>• Some false positives are acceptable for discovery</li>
					<li>• You'll validate findings in follow-up studies</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="bg-violet-50 rounded-xl p-6 mb-8 border border-violet-200">
		<h2 class="text-xl font-semibold text-violet-900 mb-3">What's Next?</h2>
		<p class="text-violet-800 mb-3">
			All we've learned so far is "frequentist" statistics. Next, we'll introduce <strong>Bayesian thinking</strong>—
			a different framework that directly answers "What is the probability my hypothesis is true?"
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-medium text-violet-900 mb-2">Preview: Bayesian Statistics</h3>
			<ul class="text-sm text-violet-700 space-y-1">
				<li>• Prior beliefs + data = posterior beliefs</li>
				<li>• Bayes factors vs. p-values</li>
				<li>• When Bayesian methods make sense</li>
			</ul>
		</div>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/5-beyond/robust" class="text-gray-600 hover:text-gray-900">
			← Robust Alternatives
		</a>
		<a href="/modules/5-beyond/bayesian" class="text-violet-600 hover:text-violet-700 font-medium">
			Next: Bayesian Thinking →
		</a>
	</div>
</div>
