<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const powerFormula = String.raw`\text{Power} = 1 - \beta = P(\text{Reject } H_0 \mid H_1 \text{ true})`;
	const powerCalcFormula = String.raw`\text{Power} = \Phi\left(z_{\alpha} - \frac{\delta}{\sigma/\sqrt{n}}\right)`;
	const sampleSizeFormula = String.raw`n = \left(\frac{(z_{\alpha} + z_{\beta}) \cdot \sigma}{\delta}\right)^2`;

	// Parameters
	let effectSize = $state(0.5);
	let sampleSize = $state(30);
	let alpha = $state(0.05);
	let targetPower = $state(0.80);

	// Derived values
	const standardError = $derived(1 / Math.sqrt(sampleSize));
	const criticalZ = $derived(normal.quantile(1 - alpha / 2, 0, 1));
	const zPower = $derived((effectSize - criticalZ * standardError) / standardError);
	const power = $derived(1 - normal.cdf(-zPower, 0, 1));

	// Calculate required sample size for target power
	const zBeta = $derived(normal.quantile(targetPower, 0, 1));
	const requiredN = $derived(Math.ceil(Math.pow((criticalZ + zBeta) / effectSize, 2)));

	// Power curve data (power vs sample size)
	const powerCurveData = $derived(() => {
		const points: { n: number; power: number }[] = [];
		for (let n = 5; n <= 200; n += 5) {
			const se = 1 / Math.sqrt(n);
			const zP = (effectSize - criticalZ * se) / se;
			const p = 1 - normal.cdf(-zP, 0, 1);
			points.push({ n, power: Math.min(p, 1) });
		}
		return points;
	});

	// Power by effect size data
	const powerByEffectData = $derived(() => {
		const points: { d: number; power: number }[] = [];
		const se = 1 / Math.sqrt(sampleSize);
		for (let d = 0; d <= 1.5; d += 0.05) {
			const zP = (d - criticalZ * se) / se;
			const p = 1 - normal.cdf(-zP, 0, 1);
			points.push({ d, power: Math.min(Math.max(p, 0), 1) });
		}
		return points;
	});

	// SVG dimensions
	const width = 500;
	const height = 300;
	const margin = { top: 30, right: 30, bottom: 50, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales for power curve
	const xScaleN = $derived(d3.scaleLinear().domain([0, 200]).range([0, innerWidth]));
	const yScalePower = $derived(d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]));

	// Scales for effect size curve
	const xScaleD = $derived(d3.scaleLinear().domain([0, 1.5]).range([0, innerWidth]));

	// Line generators
	const powerLine = $derived(
		d3.line<{ n: number; power: number }>()
			.x(d => xScaleN(d.n))
			.y(d => yScalePower(d.power))
			.curve(d3.curveMonotoneX)
	);

	const effectLine = $derived(
		d3.line<{ d: number; power: number }>()
			.x(d => xScaleD(d.d))
			.y(d => yScalePower(d.power))
			.curve(d3.curveMonotoneX)
	);

	// Which visualization to show
	let chartType = $state<'sample-size' | 'effect-size'>('sample-size');

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'power-1',
			type: 'multiple-choice',
			question: 'A study has 60% power. This means:',
			choices: [
				{ id: 'a', text: '60% chance of correctly rejecting H₀ when H₀ is false', isCorrect: true },
				{ id: 'b', text: '60% chance of Type I error' },
				{ id: 'c', text: '60% chance of correctly accepting H₀ when H₀ is true' },
				{ id: 'd', text: '60% of the data supports H₁' }
			],
			explanation: 'Power is the probability of correctly rejecting H₀ when H₁ is true. 60% power means a 60% chance of detecting a real effect if one exists.',
			difficulty: 'easy'
		},
		{
			id: 'power-2',
			type: 'multiple-choice',
			question: 'Which change will MOST increase statistical power?',
			choices: [
				{ id: 'a', text: 'Decrease α from 0.05 to 0.01' },
				{ id: 'b', text: 'Increase sample size from 30 to 120', isCorrect: true },
				{ id: 'c', text: 'Use a two-tailed instead of one-tailed test' },
				{ id: 'd', text: 'Decrease the effect size' }
			],
			explanation: 'Quadrupling the sample size (30→120) doubles √n, which substantially reduces standard error and increases power. Decreasing α or the effect size would reduce power.',
			difficulty: 'medium'
		},
		{
			id: 'power-3',
			type: 'numeric',
			question: 'A researcher wants 80% power to detect an effect of d = 0.5 at α = 0.05 (two-tailed). Using n = (z₀.₀₂₅ + z₀.₈₀)²/d², approximately what sample size is needed?',
			questionMath: String.raw`n = \frac{(1.96 + 0.84)^2}{0.5^2} = \frac{7.84}{0.25} \approx ?`,
			correctAnswer: 31,
			tolerance: 2,
			explanation: 'Using the formula: n = (1.96 + 0.84)²/0.5² = 7.84/0.25 ≈ 31. In practice, you\'d round up and often add more for safety.',
			difficulty: 'hard',
			hint: 'z₀.₀₂₅ = 1.96 for two-tailed α=0.05, z₀.₈₀ = 0.84 for 80% power'
		},
		{
			id: 'power-4',
			type: 'multiple-choice',
			question: 'Why is 80% power often used as a standard?',
			choices: [
				{ id: 'a', text: 'It\'s mathematically optimal' },
				{ id: 'b', text: 'It balances detecting effects against study costs', isCorrect: true },
				{ id: 'c', text: 'Higher power would always give false positives' },
				{ id: 'd', text: 'It ensures exactly 20% Type II error rate' }
			],
			explanation: '80% power is a convention that balances the ability to detect effects (80% chance) against practical constraints (cost, time). Higher power requires larger samples with diminishing returns.',
			difficulty: 'medium'
		},
		{
			id: 'power-5',
			type: 'true-false',
			question: 'If a study finds a non-significant result (p > 0.05), it proves there is no effect.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! A non-significant result could mean: (1) there\'s truly no effect, OR (2) there\'s an effect but the study lacked power to detect it. This is why reporting power/effect sizes matters.',
			difficulty: 'easy'
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
			<span>Statistical Power</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Statistical Power</h1>
		<p class="text-lg text-gray-600">
			Learn how to design studies that can actually detect the effects you're looking for.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-emerald-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-emerald-900 mb-3">The Big Idea</h2>
		<p class="text-emerald-800 mb-4">
			<strong>Statistical power</strong> is the probability of correctly rejecting H₀ when there really is an effect.
			Low power means you might miss real effects — a crucial concern for research validity.
		</p>
		<div class="bg-white rounded-lg p-4">
			<MathDisplay formula={powerFormula} displayMode={true} />
		</div>
	</section>

	<!-- Four Factors -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Four Power Factors</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
						<span class="text-blue-600 font-bold">n</span>
					</div>
					<h3 class="font-semibold text-gray-900">Sample Size</h3>
				</div>
				<p class="text-sm text-gray-600">
					Larger samples → smaller SE → easier to detect effects.
					<span class="text-blue-600 font-medium">↑ n = ↑ Power</span>
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
						<span class="text-orange-600 font-bold">δ</span>
					</div>
					<h3 class="font-semibold text-gray-900">Effect Size</h3>
				</div>
				<p class="text-sm text-gray-600">
					Bigger effects are easier to detect.
					<span class="text-orange-600 font-medium">↑ Effect = ↑ Power</span>
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
						<span class="text-red-600 font-bold">α</span>
					</div>
					<h3 class="font-semibold text-gray-900">Significance Level</h3>
				</div>
				<p class="text-sm text-gray-600">
					Higher α means wider rejection region.
					<span class="text-red-600 font-medium">↑ α = ↑ Power</span> (but more Type I errors)
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
						<span class="text-purple-600 font-bold">σ</span>
					</div>
					<h3 class="font-semibold text-gray-900">Variability</h3>
				</div>
				<p class="text-sm text-gray-600">
					Less noise makes signals clearer.
					<span class="text-purple-600 font-medium">↓ σ = ↑ Power</span>
				</p>
			</div>
		</div>
	</section>

	<!-- Interactive Power Curve -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Power Curves</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<!-- Chart Type Toggle -->
			<div class="flex gap-2 mb-6">
				<button
					class="px-4 py-2 rounded-lg font-medium transition-colors {chartType === 'sample-size' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => chartType = 'sample-size'}
				>
					Power vs Sample Size
				</button>
				<button
					class="px-4 py-2 rounded-lg font-medium transition-colors {chartType === 'effect-size' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => chartType = 'effect-size'}
				>
					Power vs Effect Size
				</button>
			</div>

			<!-- Controls -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				{#if chartType === 'sample-size'}
					<Slider
						label="Effect Size (d)"
						bind:value={effectSize}
						min={0.1}
						max={1.5}
						step={0.1}
					/>
				{:else}
					<Slider
						label="Sample Size (n)"
						bind:value={sampleSize}
						min={10}
						max={200}
						step={5}
					/>
				{/if}
				<Slider
					label="α (Significance Level)"
					bind:value={alpha}
					min={0.01}
					max={0.10}
					step={0.01}
				/>
				<Slider
					label="Target Power"
					bind:value={targetPower}
					min={0.50}
					max={0.95}
					step={0.05}
				/>
			</div>

			<!-- Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Target power line -->
					<line
						x1={0}
						x2={innerWidth}
						y1={yScalePower(targetPower)}
						y2={yScalePower(targetPower)}
						stroke="#10b981"
						stroke-width="2"
						stroke-dasharray="5,5"
					/>
					<text
						x={innerWidth + 5}
						y={yScalePower(targetPower)}
						fill="#10b981"
						font-size="10"
						dominant-baseline="middle"
					>
						{(targetPower * 100).toFixed(0)}%
					</text>

					<!-- Power curve -->
					{#if chartType === 'sample-size'}
						<path
							d={powerLine(powerCurveData())}
							fill="none"
							stroke="#3b82f6"
							stroke-width="2.5"
						/>
						<!-- Current sample size marker -->
						<circle
							cx={xScaleN(sampleSize)}
							cy={yScalePower(power)}
							r="6"
							fill="#3b82f6"
						/>
						<!-- Required sample size marker -->
						{#if requiredN <= 200}
							<line
								x1={xScaleN(requiredN)}
								x2={xScaleN(requiredN)}
								y1={innerHeight}
								y2={yScalePower(targetPower)}
								stroke="#10b981"
								stroke-width="1.5"
								stroke-dasharray="3,3"
							/>
							<circle
								cx={xScaleN(requiredN)}
								cy={yScalePower(targetPower)}
								r="5"
								fill="#10b981"
							/>
						{/if}
					{:else}
						<path
							d={effectLine(powerByEffectData())}
							fill="none"
							stroke="#f97316"
							stroke-width="2.5"
						/>
						<!-- Current effect size marker -->
						<circle
							cx={xScaleD(effectSize)}
							cy={yScalePower(power)}
							r="6"
							fill="#f97316"
						/>
					{/if}

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#if chartType === 'sample-size'}
							{#each xScaleN.ticks(8) as tick}
								<g transform="translate({xScaleN(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
								</g>
							{/each}
							<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">
								Sample Size (n)
							</text>
						{:else}
							{#each xScaleD.ticks(8) as tick}
								<g transform="translate({xScaleD(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick.toFixed(1)}</text>
								</g>
							{/each}
							<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">
								Effect Size (d)
							</text>
						{/if}
					</g>

					<!-- Y Axis -->
					<g>
						{#each yScalePower.ticks(5) as tick}
							<g transform="translate(0,{yScalePower(tick)})">
								<line x2="-6" stroke="#9ca3af" />
								<text x="-10" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="10">
									{(tick * 100).toFixed(0)}%
								</text>
							</g>
						{/each}
						<text
							transform="rotate(-90)"
							x={-innerHeight / 2}
							y="-45"
							text-anchor="middle"
							fill="#374151"
							font-size="11"
						>
							Power
						</text>
					</g>
				</g>
			</svg>

			<!-- Stats -->
			<div class="grid md:grid-cols-4 gap-4 mt-4">
				<div class="text-center p-3 bg-blue-50 rounded-lg">
					<div class="text-2xl font-bold text-blue-600">{sampleSize}</div>
					<div class="text-xs text-blue-700">Current n</div>
				</div>
				<div class="text-center p-3 bg-orange-50 rounded-lg">
					<div class="text-2xl font-bold text-orange-600">{effectSize.toFixed(2)}</div>
					<div class="text-xs text-orange-700">Effect Size (d)</div>
				</div>
				<div class="text-center p-3 bg-emerald-50 rounded-lg">
					<div class="text-2xl font-bold text-emerald-600">{(power * 100).toFixed(1)}%</div>
					<div class="text-xs text-emerald-700">Current Power</div>
				</div>
				<div class="text-center p-3 bg-purple-50 rounded-lg">
					<div class="text-2xl font-bold text-purple-600">{requiredN > 500 ? '>500' : requiredN}</div>
					<div class="text-xs text-purple-700">Required n for {(targetPower * 100).toFixed(0)}%</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Sample Size Planning -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Sample Size Determination</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				The key question in study design: <em>"How many participants do I need?"</em>
			</p>

			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<p class="text-sm text-gray-600 mb-2">Sample size formula (for detecting effect d with power 1-β):</p>
				<MathDisplay formula={sampleSizeFormula} displayMode={true} />
			</div>

			<!-- Quick Reference Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="py-2 px-3 text-left font-medium text-gray-600">Effect Size</th>
							<th class="py-2 px-3 text-center font-medium text-gray-600">n for 80% Power</th>
							<th class="py-2 px-3 text-center font-medium text-gray-600">n for 90% Power</th>
							<th class="py-2 px-3 text-left font-medium text-gray-600">Interpretation</th>
						</tr>
					</thead>
					<tbody>
						<tr class="border-b border-gray-100">
							<td class="py-2 px-3 font-medium">Small (d = 0.2)</td>
							<td class="py-2 px-3 text-center">393</td>
							<td class="py-2 px-3 text-center">526</td>
							<td class="py-2 px-3 text-gray-600">Subtle effects need large samples</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 px-3 font-medium">Medium (d = 0.5)</td>
							<td class="py-2 px-3 text-center">64</td>
							<td class="py-2 px-3 text-center">85</td>
							<td class="py-2 px-3 text-gray-600">Typical for behavioral research</td>
						</tr>
						<tr class="border-b border-gray-100">
							<td class="py-2 px-3 font-medium">Large (d = 0.8)</td>
							<td class="py-2 px-3 text-center">26</td>
							<td class="py-2 px-3 text-center">34</td>
							<td class="py-2 px-3 text-gray-600">Obvious effects, small samples OK</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="text-xs text-gray-500 mt-3">
				* Values for two-tailed one-sample z-test at α = 0.05
			</p>
		</div>
	</section>

	<!-- Common Mistakes -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Common Power Pitfalls</h2>

		<div class="space-y-4">
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ Post-hoc power analysis</h3>
				<p class="text-sm text-red-800">
					Computing power <em>after</em> getting non-significant results is misleading.
					Post-hoc power just reflects your p-value in disguise. Plan power <em>before</em> collecting data.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ Using observed effect size for power</h3>
				<p class="text-sm text-red-800">
					Your observed effect is noisy. Using it to calculate "what n would we have needed"
					is circular reasoning. Use literature values or minimum meaningful effects instead.
				</p>
			</div>

			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-medium text-green-900 mb-2">✓ Best practice</h3>
				<p class="text-sm text-green-800">
					Conduct power analysis during study design. Specify the smallest effect size that would be
					practically meaningful, then calculate the sample size needed to detect it reliably.
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

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/2-hypothesis/errors" class="text-gray-600 hover:text-gray-900">
			← Type I & II Errors
		</a>
		<a href="/modules/2-hypothesis/effect-size" class="text-emerald-600 hover:text-emerald-700 font-medium">
			Next: Effect Sizes →
		</a>
	</div>
</div>
