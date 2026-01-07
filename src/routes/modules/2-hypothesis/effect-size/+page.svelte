<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const cohensD = String.raw`d = \frac{\bar{X}_1 - \bar{X}_2}{s_{pooled}}`;
	const pooledSD = String.raw`s_{pooled} = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1 + n_2 - 2}}`;
	const rFormula = String.raw`r = \frac{d}{\sqrt{d^2 + 4}}`;
	const percentOverlap = String.raw`\text{Overlap} = 2\Phi\left(-\frac{|d|}{2}\right)`;

	// Parameters
	let effectSize = $state(0.5);
	let sampleSize = $state(30);

	// Derived statistics
	const percentile = $derived(normal.cdf(effectSize, 0, 1) * 100);
	const overlap = $derived(2 * normal.cdf(-Math.abs(effectSize) / 2, 0, 1) * 100);
	const u3 = $derived(normal.cdf(effectSize, 0, 1) * 100);
	const probSuperiority = $derived(normal.cdf(effectSize / Math.sqrt(2), 0, 1) * 100);

	// Effect size interpretation
	const interpretation = $derived(() => {
		const d = Math.abs(effectSize);
		if (d < 0.2) return { label: 'Negligible', color: 'gray' };
		if (d < 0.5) return { label: 'Small', color: 'green' };
		if (d < 0.8) return { label: 'Medium', color: 'yellow' };
		return { label: 'Large', color: 'red' };
	});

	// SVG dimensions
	const width = 550;
	const height = 250;
	const margin = { top: 30, right: 30, bottom: 40, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Generate curve points
	const xMin = -4;
	const xMax = $derived(4 + Math.max(effectSize, 0));

	const xScale = $derived(d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]));

	function getCurvePoints(mean: number) {
		const points: [number, number][] = [];
		for (let x = xMin; x <= xMax; x += 0.05) {
			const y = normal.pdf(x, mean, 1);
			points.push([x, y]);
		}
		return points;
	}

	const group1Curve = $derived(getCurvePoints(0));
	const group2Curve = $derived(getCurvePoints(effectSize));

	const yMax = $derived(normal.pdf(0, 0, 1) * 1.1);
	const yScale = $derived(d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]));

	const linePath = d3.line<[number, number]>()
		.x(d => xScale(d[0]))
		.y(d => yScale(d[1]))
		.curve(d3.curveMonotoneX);

	const group1Path = $derived(linePath(group1Curve));
	const group2Path = $derived(linePath(group2Curve));

	// Overlap area
	const overlapArea = $derived(() => {
		if (effectSize <= 0) return '';
		const intersection = effectSize / 2;
		let path = `M ${xScale(xMin)} ${yScale(0)}`;

		// Left side under group 2
		for (let x = xMin; x <= intersection; x += 0.05) {
			path += ` L ${xScale(x)} ${yScale(normal.pdf(x, effectSize, 1))}`;
		}

		// Right side under group 1
		for (let x = intersection; x <= xMax; x += 0.05) {
			path += ` L ${xScale(x)} ${yScale(normal.pdf(x, 0, 1))}`;
		}

		path += ` L ${xScale(xMax)} ${yScale(0)} Z`;
		return path;
	});

	// Example scenarios
	const scenarios = [
		{ d: 0.2, label: 'Small', example: 'Height difference between grades 11 and 12' },
		{ d: 0.5, label: 'Medium', example: 'Effect of therapy vs. placebo' },
		{ d: 0.8, label: 'Large', example: 'Gender difference in height' },
		{ d: 1.0, label: 'Very Large', example: 'Expert vs. novice performance' },
		{ d: 2.0, label: 'Huge', example: 'IQ: Average vs. gifted (130+)' }
	];

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'effect-1',
			type: 'multiple-choice',
			question: 'A study finds p < 0.001 with d = 0.15. What should you conclude?',
			choices: [
				{ id: 'a', text: 'The effect is practically important because p is so small' },
				{ id: 'b', text: 'The effect is statistically significant but practically negligible', isCorrect: true },
				{ id: 'c', text: 'The study must have had too few participants' },
				{ id: 'd', text: 'The result is likely a Type I error' }
			],
			explanation: 'With large samples, even tiny effects can be statistically significant. d = 0.15 is negligible by Cohen\'s guidelines, meaning the effect is real but too small to matter in practice.',
			difficulty: 'medium'
		},
		{
			id: 'effect-2',
			type: 'numeric',
			question: 'Group A: mean = 75, SD = 10. Group B: mean = 80, SD = 10. Calculate Cohen\'s d.',
			questionMath: String.raw`d = \frac{80 - 75}{10} = ?`,
			correctAnswer: 0.5,
			tolerance: 0.01,
			explanation: 'Cohen\'s d = (80 - 75) / 10 = 0.5, which is considered a "medium" effect size.',
			difficulty: 'easy'
		},
		{
			id: 'effect-3',
			type: 'multiple-choice',
			question: 'Why report effect sizes alongside p-values?',
			choices: [
				{ id: 'a', text: 'Effect sizes are more accurate than p-values' },
				{ id: 'b', text: 'P-values tell you IF there\'s an effect; effect sizes tell you HOW BIG', isCorrect: true },
				{ id: 'c', text: 'Effect sizes don\'t depend on sample size' },
				{ id: 'd', text: 'Only effect sizes can be replicated' }
			],
			explanation: 'P-values indicate statistical significance (is the effect non-zero?), while effect sizes indicate practical significance (is the effect large enough to matter?). Both are needed for full interpretation.',
			difficulty: 'easy'
		},
		{
			id: 'effect-4',
			type: 'multiple-choice',
			question: 'Cohen\'s d = 0.8 means the treatment group\'s average is at what percentile of the control group?',
			choices: [
				{ id: 'a', text: '58th percentile' },
				{ id: 'b', text: '69th percentile' },
				{ id: 'c', text: '79th percentile', isCorrect: true },
				{ id: 'd', text: '92nd percentile' }
			],
			explanation: 'When d = 0.8, the average person in the treatment group scores higher than about 79% of the control group (U3 statistic). This helps translate abstract numbers into meaningful comparisons.',
			explanationMath: String.raw`\Phi(0.8) = 0.788 \approx 79\%`,
			difficulty: 'hard',
			hint: 'Use the normal distribution: what percent falls below z = 0.8?'
		},
		{
			id: 'effect-5',
			type: 'true-false',
			question: 'A confidence interval for d that doesn\'t include 0 means the effect is practically significant.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! A CI not including 0 means statistical significance (the effect is non-zero). Practical significance depends on whether the effect size is large enough to matter, regardless of whether the CI includes 0.',
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
			<span>Effect Sizes</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Effect Sizes</h1>
		<p class="text-lg text-gray-600">
			Go beyond "significant or not" — learn to quantify how big an effect actually is.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-emerald-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-emerald-900 mb-3">Why Effect Sizes Matter</h2>
		<p class="text-emerald-800 mb-4">
			P-values only tell you <em>whether</em> an effect exists. Effect sizes tell you <em>how big</em> it is.
			A tiny effect can be "significant" with enough data; a huge effect can be "non-significant" with too little.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">Cohen's d (standardized difference):</p>
				<MathDisplay formula={cohensD} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Pooled standard deviation:</p>
				<MathDisplay formula={pooledSD} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Interactive Visualization -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Visualizing Effect Size</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<Slider
					label="Effect Size (d)"
					bind:value={effectSize}
					min={0}
					max={2}
					step={0.1}
				/>
				<div class="flex items-center gap-4">
					<div class="flex-1">
						<div class="text-sm text-gray-600 mb-1">Interpretation</div>
						<div class="text-lg font-semibold" class:text-gray-500={interpretation().color === 'gray'} class:text-green-600={interpretation().color === 'green'} class:text-yellow-600={interpretation().color === 'yellow'} class:text-red-600={interpretation().color === 'red'}>
							{interpretation().label}
						</div>
					</div>
					<div class="flex-1">
						<div class="text-sm text-gray-600 mb-1">Overlap</div>
						<div class="text-lg font-semibold text-purple-600">{overlap.toFixed(1)}%</div>
					</div>
				</div>
			</div>

			<!-- Distribution Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Overlap area -->
					{#if effectSize > 0}
						<path
							d={overlapArea()}
							fill="#a855f7"
							fill-opacity="0.2"
						/>
					{/if}

					<!-- Group 1 (Control) -->
					<path
						d={group1Path}
						fill="rgba(59, 130, 246, 0.3)"
						stroke="#3b82f6"
						stroke-width="2"
					/>

					<!-- Group 2 (Treatment) -->
					<path
						d={group2Path}
						fill="rgba(249, 115, 22, 0.3)"
						stroke="#f97316"
						stroke-width="2"
					/>

					<!-- Mean lines -->
					<line
						x1={xScale(0)}
						x2={xScale(0)}
						y1={0}
						y2={innerHeight}
						stroke="#3b82f6"
						stroke-width="2"
						stroke-dasharray="5,5"
					/>
					<line
						x1={xScale(effectSize)}
						x2={xScale(effectSize)}
						y1={0}
						y2={innerHeight}
						stroke="#f97316"
						stroke-width="2"
						stroke-dasharray="5,5"
					/>

					<!-- Labels -->
					<text x={xScale(0)} y={-10} text-anchor="middle" fill="#3b82f6" font-size="11" font-weight="500">
						Control (μ₁ = 0)
					</text>
					<text x={xScale(effectSize)} y={-10} text-anchor="middle" fill="#f97316" font-size="11" font-weight="500">
						Treatment (μ₂ = {effectSize.toFixed(1)})
					</text>

					<!-- Effect size bracket -->
					{#if effectSize > 0.1}
						<line
							x1={xScale(0)}
							x2={xScale(effectSize)}
							y1={innerHeight - 10}
							y2={innerHeight - 10}
							stroke="#374151"
							stroke-width="1.5"
						/>
						<line x1={xScale(0)} x2={xScale(0)} y1={innerHeight - 15} y2={innerHeight - 5} stroke="#374151" stroke-width="1.5" />
						<line x1={xScale(effectSize)} x2={xScale(effectSize)} y1={innerHeight - 15} y2={innerHeight - 5} stroke="#374151" stroke-width="1.5" />
						<text x={xScale(effectSize / 2)} y={innerHeight - 15} text-anchor="middle" fill="#374151" font-size="10">
							d = {effectSize.toFixed(1)}
						</text>
					{/if}

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(8) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="35" text-anchor="middle" fill="#374151" font-size="11">
							Standard Deviation Units
						</text>
					</g>
				</g>
			</svg>

			<!-- Effect Metrics -->
			<div class="grid md:grid-cols-4 gap-4 mt-4">
				<div class="text-center p-3 bg-blue-50 rounded-lg">
					<div class="text-2xl font-bold text-blue-600">{percentile.toFixed(0)}%</div>
					<div class="text-xs text-blue-700">Treatment avg. percentile</div>
					<div class="text-xs text-blue-500">(in control distribution)</div>
				</div>
				<div class="text-center p-3 bg-purple-50 rounded-lg">
					<div class="text-2xl font-bold text-purple-600">{overlap.toFixed(0)}%</div>
					<div class="text-xs text-purple-700">Distribution overlap</div>
				</div>
				<div class="text-center p-3 bg-green-50 rounded-lg">
					<div class="text-2xl font-bold text-green-600">{probSuperiority.toFixed(0)}%</div>
					<div class="text-xs text-green-700">P(treatment > control)</div>
					<div class="text-xs text-green-500">(random individuals)</div>
				</div>
				<div class="text-center p-3 bg-orange-50 rounded-lg">
					<div class="text-2xl font-bold text-orange-600">{(effectSize / Math.sqrt(effectSize * effectSize + 4)).toFixed(2)}</div>
					<div class="text-xs text-orange-700">Correlation (r)</div>
					<div class="text-xs text-orange-500">(converted from d)</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Cohen's Guidelines -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Cohen's Guidelines</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				Jacob Cohen proposed these benchmarks, but <strong>context matters</strong>.
				A "small" effect on survival could be life-changing; a "large" effect on a trivial outcome is still trivial.
			</p>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="py-3 px-4 text-left font-medium text-gray-600">Size</th>
							<th class="py-3 px-4 text-center font-medium text-gray-600">d</th>
							<th class="py-3 px-4 text-center font-medium text-gray-600">r</th>
							<th class="py-3 px-4 text-center font-medium text-gray-600">Percentile</th>
							<th class="py-3 px-4 text-left font-medium text-gray-600">Real-world example</th>
						</tr>
					</thead>
					<tbody>
						{#each scenarios as { d, label, example }}
							<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick={() => effectSize = d}>
								<td class="py-3 px-4 font-medium">{label}</td>
								<td class="py-3 px-4 text-center font-mono">{d.toFixed(1)}</td>
								<td class="py-3 px-4 text-center font-mono">{(d / Math.sqrt(d * d + 4)).toFixed(2)}</td>
								<td class="py-3 px-4 text-center">{(normal.cdf(d, 0, 1) * 100).toFixed(0)}%</td>
								<td class="py-3 px-4 text-gray-600">{example}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-xs text-gray-500 mt-3">
				Click a row to visualize that effect size above
			</p>
		</div>
	</section>

	<!-- Types of Effect Sizes -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Common Effect Size Measures</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Standardized Differences</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>Cohen's d:</strong> Mean difference / pooled SD</li>
					<li><strong>Hedges' g:</strong> Bias-corrected d (for small samples)</li>
					<li><strong>Glass's Δ:</strong> Uses control group SD only</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">Best for: comparing two group means</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Correlation Family</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>Pearson r:</strong> Linear relationship (-1 to 1)</li>
					<li><strong>r²:</strong> Variance explained (0 to 1)</li>
					<li><strong>η² (eta squared):</strong> For ANOVA designs</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">Best for: relationships and explained variance</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Risk/Odds Measures</h3>
				<ul class="space-y-2 text-sm text-gray-700">
					<li><strong>Risk Ratio (RR):</strong> Relative risk</li>
					<li><strong>Odds Ratio (OR):</strong> Odds comparison</li>
					<li><strong>NNT:</strong> Number needed to treat</li>
				</ul>
				<p class="text-xs text-gray-500 mt-3">Best for: categorical outcomes, medical research</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Converting Between Measures</h3>
				<div class="bg-gray-50 rounded p-3">
					<MathDisplay formula={rFormula} displayMode={true} />
				</div>
				<p class="text-xs text-gray-500 mt-3">
					d and r can be converted; choose the most interpretable for your audience
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

	<!-- Module Summary -->
	<section class="mb-8 bg-emerald-50 rounded-xl p-6">
		<h2 class="text-xl font-semibold text-emerald-900 mb-4">Module 2 Complete!</h2>
		<p class="text-emerald-800 mb-4">
			You now understand the logic of hypothesis testing:
		</p>
		<ul class="space-y-2 text-emerald-700">
			<li class="flex items-start gap-2">
				<span class="text-emerald-500">✓</span>
				<span><strong>P-values:</strong> Probability of data given H₀ is true</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500">✓</span>
				<span><strong>Type I & II Errors:</strong> The tradeoff between false positives and negatives</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500">✓</span>
				<span><strong>Statistical Power:</strong> Designing studies that can detect effects</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-emerald-500">✓</span>
				<span><strong>Effect Sizes:</strong> Quantifying how big effects actually are</span>
			</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/2-hypothesis/power" class="text-gray-600 hover:text-gray-900">
			← Statistical Power
		</a>
		<a href="/modules/3-comparing" class="text-emerald-600 hover:text-emerald-700 font-medium">
			Next: Module 3 - Comparing Groups →
		</a>
	</div>
</div>
