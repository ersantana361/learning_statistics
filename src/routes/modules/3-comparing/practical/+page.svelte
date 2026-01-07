<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal, studentT } from '$lib/stats/distributions';

	// Parameters
	let effectSize = $state(0.3);
	let sampleSize = $state(50);
	let alpha = $state(0.05);
	let minMeaningful = $state(0.5);

	// Derived
	const standardError = $derived(1 / Math.sqrt(sampleSize));
	const tStat = $derived(effectSize / standardError);
	const df = $derived(sampleSize - 1);
	const pValue = $derived(2 * (1 - studentT.cdf(Math.abs(tStat), df)));
	const significant = $derived(pValue < alpha);
	const meaningful = $derived(Math.abs(effectSize) >= minMeaningful);

	// CI calculation
	const critT = $derived(studentT.quantile(1 - alpha / 2, df));
	const ciLower = $derived(effectSize - critT * standardError);
	const ciUpper = $derived(effectSize + critT * standardError);
	const ciIncludesMinMeaningful = $derived(ciUpper >= minMeaningful || ciLower <= -minMeaningful);

	// Scenarios for the grid
	const scenarios = [
		{
			name: 'Large & Significant',
			effect: 0.8,
			n: 50,
			desc: 'Clear win — effect is both detectable and meaningful',
			color: 'green'
		},
		{
			name: 'Large & Non-significant',
			effect: 0.8,
			n: 10,
			desc: 'Underpowered — effect might be real but study too small',
			color: 'yellow'
		},
		{
			name: 'Small & Significant',
			effect: 0.15,
			n: 500,
			desc: 'Overpowered — statistically real but practically trivial',
			color: 'orange'
		},
		{
			name: 'Small & Non-significant',
			effect: 0.1,
			n: 30,
			desc: 'No evidence — might be no effect or too small to matter',
			color: 'gray'
		}
	];

	// SVG dimensions
	const width = 500;
	const height = 200;
	const margin = { top: 20, right: 40, bottom: 40, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scale for effect size visualization
	const xScale = $derived(d3.scaleLinear().domain([-1.5, 1.5]).range([0, innerWidth]));

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'prac-1',
			type: 'multiple-choice',
			question: 'A drug reduces blood pressure by 2 mmHg (p < 0.001). Is this clinically important?',
			choices: [
				{ id: 'a', text: 'Yes, because p < 0.001 is highly significant' },
				{ id: 'b', text: 'No, because 2 mmHg is too small to matter clinically', isCorrect: true },
				{ id: 'c', text: 'Yes, because it\'s statistically significant' },
				{ id: 'd', text: 'Cannot determine without knowing sample size' }
			],
			explanation: 'Clinical significance depends on whether the effect size matters in practice. A 2 mmHg reduction is generally too small to impact health outcomes, regardless of how low the p-value is. Meaningful reductions typically need to be 5-10+ mmHg.',
			difficulty: 'medium'
		},
		{
			id: 'prac-2',
			type: 'multiple-choice',
			question: 'What does a "minimally important difference" (MID) represent?',
			choices: [
				{ id: 'a', text: 'The smallest difference detectable at α = 0.05' },
				{ id: 'b', text: 'The smallest difference that matters to patients/stakeholders', isCorrect: true },
				{ id: 'c', text: 'The smallest effect size (d = 0.2)' },
				{ id: 'd', text: 'The difference needed for 80% power' }
			],
			explanation: 'MID is determined by clinical judgment, patient input, or anchor-based methods — not statistical criteria. It answers: "What\'s the smallest change that would actually matter to someone?"',
			difficulty: 'medium'
		},
		{
			id: 'prac-3',
			type: 'multiple-choice',
			question: 'Study A: d = 0.8, p = 0.08. Study B: d = 0.2, p = 0.001. Which provides better evidence for a meaningful effect?',
			choices: [
				{ id: 'a', text: 'Study B, because p < 0.001' },
				{ id: 'b', text: 'Study A, because d = 0.8 is a large effect', isCorrect: true },
				{ id: 'c', text: 'Neither — we need confidence intervals' },
				{ id: 'd', text: 'Both are equally informative' }
			],
			explanation: 'Study A shows a large effect that might reach significance with more data. Study B shows a trivial effect detected only because of excessive power. For practical decisions, we care more about effect size than p-value.',
			difficulty: 'hard'
		},
		{
			id: 'prac-4',
			type: 'multiple-choice',
			question: 'The 95% CI for Cohen\'s d is [0.05, 0.35]. MID = 0.5. What can you conclude?',
			choices: [
				{ id: 'a', text: 'The effect is statistically significant but not practically meaningful', isCorrect: true },
				{ id: 'b', text: 'The effect is both significant and meaningful' },
				{ id: 'c', text: 'The effect is not statistically significant' },
				{ id: 'd', text: 'More data is needed' }
			],
			explanation: 'The CI excludes 0 (significant) but the entire CI falls below the MID of 0.5, meaning even the upper bound isn\'t practically important. This is "statistically significant but clinically irrelevant."',
			difficulty: 'hard',
			hint: 'Compare the CI to both 0 (statistical significance) and MID (practical significance)'
		},
		{
			id: 'prac-5',
			type: 'true-false',
			question: 'A non-significant result proves there is no practically meaningful effect.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! A non-significant result could mean: (1) truly no effect, (2) the study was underpowered to detect a real effect. Check the confidence interval — if it includes meaningful effect sizes, you can\'t rule them out.',
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
			<span>Practical Significance</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Practical Significance</h1>
		<p class="text-lg text-gray-600">
			Learn to distinguish between "real" effects and "important" effects.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-indigo-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-indigo-900 mb-3">The Critical Distinction</h2>
		<p class="text-indigo-800 mb-4">
			<strong>Statistical significance</strong> asks: "Is the effect non-zero?"
			<strong>Practical significance</strong> asks: "Is the effect large enough to matter?"
		</p>
		<p class="text-indigo-700">
			With large samples, even tiny effects become "significant." With small samples, even large effects might not be.
			<strong>Always report effect sizes and confidence intervals</strong>, not just p-values.
		</p>
	</section>

	<!-- The 2x2 Matrix -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Four Scenarios</h2>

		<div class="grid md:grid-cols-2 gap-4">
			{#each scenarios as scenario}
				<button
					class="p-5 rounded-lg text-left border-2 transition-all hover:shadow-md
						{scenario.color === 'green' ? 'bg-green-50 border-green-300' : ''}
						{scenario.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' : ''}
						{scenario.color === 'orange' ? 'bg-orange-50 border-orange-300' : ''}
						{scenario.color === 'gray' ? 'bg-gray-50 border-gray-300' : ''}"
					onclick={() => { effectSize = scenario.effect; sampleSize = scenario.n; }}
				>
					<h3 class="font-semibold mb-2
						{scenario.color === 'green' ? 'text-green-900' : ''}
						{scenario.color === 'yellow' ? 'text-yellow-900' : ''}
						{scenario.color === 'orange' ? 'text-orange-900' : ''}
						{scenario.color === 'gray' ? 'text-gray-900' : ''}">
						{scenario.name}
					</h3>
					<div class="text-sm mb-2
						{scenario.color === 'green' ? 'text-green-700' : ''}
						{scenario.color === 'yellow' ? 'text-yellow-700' : ''}
						{scenario.color === 'orange' ? 'text-orange-700' : ''}
						{scenario.color === 'gray' ? 'text-gray-700' : ''}">
						d = {scenario.effect} | n = {scenario.n}
					</div>
					<p class="text-sm
						{scenario.color === 'green' ? 'text-green-600' : ''}
						{scenario.color === 'yellow' ? 'text-yellow-600' : ''}
						{scenario.color === 'orange' ? 'text-orange-600' : ''}
						{scenario.color === 'gray' ? 'text-gray-600' : ''}">
						{scenario.desc}
					</p>
				</button>
			{/each}
		</div>
		<p class="text-xs text-gray-500 mt-3 text-center">Click a scenario to load its parameters</p>
	</section>

	<!-- Interactive Visualization -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Effect Size vs Significance</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<Slider label="Effect Size (d)" bind:value={effectSize} min={0} max={1.2} step={0.05} />
				<Slider label="Sample Size (n)" bind:value={sampleSize} min={10} max={500} step={10} />
				<Slider label="Min. Meaningful (MID)" bind:value={minMeaningful} min={0.2} max={0.8} step={0.1} />
				<Slider label="Alpha (α)" bind:value={alpha} min={0.01} max={0.10} step={0.01} />
			</div>

			<!-- Visualization -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Zero line -->
					<line
						x1={xScale(0)}
						x2={xScale(0)}
						y1={0}
						y2={innerHeight}
						stroke="#9ca3af"
						stroke-width="1"
						stroke-dasharray="5,5"
					/>

					<!-- MID zone (practical significance threshold) -->
					<rect
						x={xScale(-minMeaningful)}
						y={0}
						width={xScale(minMeaningful) - xScale(-minMeaningful)}
						height={innerHeight}
						fill="#fef3c7"
						opacity="0.5"
					/>
					<text x={xScale(0)} y={20} text-anchor="middle" fill="#92400e" font-size="10">
						Below MID (not practically meaningful)
					</text>

					<!-- Confidence Interval -->
					<rect
						x={xScale(ciLower)}
						y={innerHeight / 2 - 15}
						width={Math.max(0, xScale(ciUpper) - xScale(ciLower))}
						height={30}
						fill={significant ? (meaningful ? '#10b981' : '#f97316') : '#6b7280'}
						opacity="0.3"
						rx="4"
					/>
					<line
						x1={xScale(ciLower)}
						x2={xScale(ciLower)}
						y1={innerHeight / 2 - 15}
						y2={innerHeight / 2 + 15}
						stroke={significant ? (meaningful ? '#10b981' : '#f97316') : '#6b7280'}
						stroke-width="2"
					/>
					<line
						x1={xScale(ciUpper)}
						x2={xScale(ciUpper)}
						y1={innerHeight / 2 - 15}
						y2={innerHeight / 2 + 15}
						stroke={significant ? (meaningful ? '#10b981' : '#f97316') : '#6b7280'}
						stroke-width="2"
					/>

					<!-- Point estimate -->
					<circle
						cx={xScale(effectSize)}
						cy={innerHeight / 2}
						r="8"
						fill={significant ? (meaningful ? '#10b981' : '#f97316') : '#6b7280'}
					/>

					<!-- MID boundary lines -->
					<line
						x1={xScale(-minMeaningful)}
						x2={xScale(-minMeaningful)}
						y1={0}
						y2={innerHeight}
						stroke="#f59e0b"
						stroke-width="2"
					/>
					<line
						x1={xScale(minMeaningful)}
						x2={xScale(minMeaningful)}
						y1={0}
						y2={innerHeight}
						stroke="#f59e0b"
						stroke-width="2"
					/>

					<!-- Labels -->
					<text x={xScale(-minMeaningful)} y={innerHeight + 15} text-anchor="middle" fill="#f59e0b" font-size="10">
						-MID
					</text>
					<text x={xScale(minMeaningful)} y={innerHeight + 15} text-anchor="middle" fill="#f59e0b" font-size="10">
						+MID
					</text>

					<!-- X axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(7) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="25" text-anchor="middle" fill="#6b7280" font-size="9">{tick.toFixed(1)}</text>
							</g>
						{/each}
					</g>
				</g>
			</svg>

			<!-- Results -->
			<div class="grid md:grid-cols-2 gap-4 mt-4">
				<div class="p-4 rounded-lg {significant ? 'bg-blue-50' : 'bg-gray-50'}">
					<h4 class="font-medium {significant ? 'text-blue-900' : 'text-gray-900'} mb-2">Statistical Significance</h4>
					<div class="text-sm {significant ? 'text-blue-700' : 'text-gray-600'}">
						<div>p = {pValue < 0.0001 ? '<0.0001' : pValue.toFixed(4)}</div>
						<div class="font-medium mt-1">
							{significant ? '✓ Significant at α = ' + alpha : '✗ Not significant at α = ' + alpha}
						</div>
						<div class="text-xs mt-1">95% CI: [{ciLower.toFixed(2)}, {ciUpper.toFixed(2)}]</div>
					</div>
				</div>

				<div class="p-4 rounded-lg {meaningful ? 'bg-green-50' : 'bg-orange-50'}">
					<h4 class="font-medium {meaningful ? 'text-green-900' : 'text-orange-900'} mb-2">Practical Significance</h4>
					<div class="text-sm {meaningful ? 'text-green-700' : 'text-orange-600'}">
						<div>Effect size d = {effectSize.toFixed(2)}</div>
						<div class="font-medium mt-1">
							{meaningful ? '✓ Exceeds MID of ' + minMeaningful : '✗ Below MID of ' + minMeaningful}
						</div>
						<div class="text-xs mt-1">
							{ciIncludesMinMeaningful ? 'CI includes meaningful effects' : 'CI excludes meaningful effects'}
						</div>
					</div>
				</div>
			</div>

			<!-- Interpretation -->
			<div class="mt-4 p-4 rounded-lg {
				significant && meaningful ? 'bg-green-100 border border-green-300' :
				significant && !meaningful ? 'bg-orange-100 border border-orange-300' :
				!significant && meaningful ? 'bg-yellow-100 border border-yellow-300' :
				'bg-gray-100 border border-gray-300'
			}">
				<div class="font-medium {
					significant && meaningful ? 'text-green-900' :
					significant && !meaningful ? 'text-orange-900' :
					!significant && meaningful ? 'text-yellow-900' :
					'text-gray-900'
				}">
					{#if significant && meaningful}
						✅ Effect is both statistically significant and practically meaningful
					{:else if significant && !meaningful}
						⚠️ Statistically significant but too small to matter in practice
					{:else if !significant && meaningful}
						🔍 Large effect but not enough evidence (consider larger sample)
					{:else}
						❓ No evidence of a meaningful effect
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Best Practices -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Best Practices</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-green-50 rounded-lg p-5 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-3">✓ Do</h3>
				<ul class="space-y-2 text-sm text-green-800">
					<li>• Report effect sizes (d, r, etc.) with CIs</li>
					<li>• Define MID before collecting data</li>
					<li>• Consider practical context when interpreting</li>
					<li>• Use equivalence tests for "no effect" claims</li>
					<li>• Power analysis based on meaningful effects</li>
				</ul>
			</div>

			<div class="bg-red-50 rounded-lg p-5 border border-red-200">
				<h3 class="font-semibold text-red-900 mb-3">✗ Don't</h3>
				<ul class="space-y-2 text-sm text-red-800">
					<li>• Confuse "significant" with "important"</li>
					<li>• Ignore effect size if p &lt; 0.05</li>
					<li>• Claim "no effect" from non-significant p</li>
					<li>• Use rigid Cohen benchmarks for all contexts</li>
					<li>• Chase significance with huge samples</li>
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

	<!-- Module Summary -->
	<section class="mb-8 bg-indigo-50 rounded-xl p-6">
		<h2 class="text-xl font-semibold text-indigo-900 mb-4">Module 3 Complete!</h2>
		<p class="text-indigo-800 mb-4">
			You now know how to compare groups properly:
		</p>
		<ul class="space-y-2 text-indigo-700">
			<li class="flex items-start gap-2">
				<span class="text-indigo-500">✓</span>
				<span><strong>Two-Sample T-Tests:</strong> Compare independent group means</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-indigo-500">✓</span>
				<span><strong>Paired vs Independent:</strong> Use pairing to increase power</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-indigo-500">✓</span>
				<span><strong>Assumptions:</strong> Independence is critical; others are fixable</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-indigo-500">✓</span>
				<span><strong>Practical Significance:</strong> Effect size matters, not just p-values</span>
			</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/3-comparing/assumptions" class="text-gray-600 hover:text-gray-900">
			← The Assumption Game
		</a>
		<a href="/modules/4-relationships" class="text-indigo-600 hover:text-indigo-700 font-medium">
			Next: Module 4 - Relationships →
		</a>
	</div>
</div>
