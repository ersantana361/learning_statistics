<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// Problem types
	type ProblemType = 'good' | 'nonlinear' | 'heteroscedastic' | 'outliers';
	let problemType = $state<ProblemType>('good');
	let numPoints = $state(50);

	// Generate data based on problem type
	function generateData(type: ProblemType): Array<{ x: number; y: number }> {
		const data: Array<{ x: number; y: number }> = [];
		for (let i = 0; i < numPoints; i++) {
			const x = (i / numPoints) * 20 + 2 + Math.random() * 2;
			let y: number;

			switch (type) {
				case 'good':
					y = 10 + 2 * x + normal.sample(0, 3);
					break;
				case 'nonlinear':
					y = 5 + 0.5 * x + 0.15 * x * x + normal.sample(0, 2);
					break;
				case 'heteroscedastic':
					y = 10 + 2 * x + normal.sample(0, 0.5 * x);
					break;
				case 'outliers':
					if (Math.random() < 0.1) {
						y = 10 + 2 * x + normal.sample(0, 20);
					} else {
						y = 10 + 2 * x + normal.sample(0, 2);
					}
					break;
			}
			data.push({ x, y });
		}
		return data;
	}

	let data = $state<Array<{ x: number; y: number }>>([]);

	function refreshData() {
		data = generateData(problemType);
	}

	// Compute regression
	const regression = $derived(() => {
		if (data.length < 2) return { slope: 0, intercept: 0, r2: 0 };

		const n = data.length;
		const meanX = d3.mean(data, d => d.x) ?? 0;
		const meanY = d3.mean(data, d => d.y) ?? 0;
		const sdX = d3.deviation(data, d => d.x) ?? 1;
		const sdY = d3.deviation(data, d => d.y) ?? 1;

		let sumXY = 0;
		for (const point of data) {
			sumXY += (point.x - meanX) * (point.y - meanY);
		}
		const r = sumXY / ((n - 1) * sdX * sdY);
		const slope = r * (sdY / sdX);
		const intercept = meanY - slope * meanX;

		return { slope, intercept, r2: r * r };
	});

	// Compute residuals and predicted values
	const residuals = $derived(
		data.map(d => {
			const predicted = regression().intercept + regression().slope * d.x;
			return {
				x: d.x,
				y: d.y,
				predicted,
				residual: d.y - predicted
			};
		})
	);

	// SVG dimensions
	const width = 400;
	const height = 250;
	const margin = { top: 20, right: 20, bottom: 40, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales for scatter plot
	const xScaleScatter = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(data, d => d.x) ?? 25])
			.range([0, innerWidth])
	);
	const yScaleScatter = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(data, d => d.y) ?? 80])
			.range([innerHeight, 0])
	);

	// Scales for residual plot
	const yScaleResid = $derived(
		d3.scaleLinear()
			.domain([
				Math.min(-15, d3.min(residuals, d => d.residual) ?? -10),
				Math.max(15, d3.max(residuals, d => d.residual) ?? 10)
			])
			.range([innerHeight, 0])
	);

	// Q-Q plot data
	const qqData = $derived(() => {
		const sortedResiduals = [...residuals].sort((a, b) => a.residual - b.residual);
		return sortedResiduals.map((d, i) => ({
			theoretical: normal.inv((i + 0.5) / sortedResiduals.length, 0, 1),
			observed: d.residual / (d3.deviation(residuals, r => r.residual) ?? 1)
		}));
	});

	const qqXScale = $derived(d3.scaleLinear().domain([-3, 3]).range([0, innerWidth]));
	const qqYScale = $derived(d3.scaleLinear().domain([-3, 3]).range([innerHeight, 0]));

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'resid-1',
			type: 'multiple-choice',
			question: 'Residuals show a clear U-shape pattern. What does this indicate?',
			choices: [
				{ id: 'a', text: 'The relationship is not linear', isCorrect: true },
				{ id: 'b', text: 'There are outliers' },
				{ id: 'c', text: 'Variance is not constant' },
				{ id: 'd', text: 'The model fits well' }
			],
			explanation: 'A curved pattern in residuals suggests the true relationship is nonlinear. A linear model is missing systematic curvature in the data. Consider adding polynomial terms or using a different model.',
			difficulty: 'medium'
		},
		{
			id: 'resid-2',
			type: 'multiple-choice',
			question: 'Residuals fan out as X increases (wider spread on the right). What assumption is violated?',
			choices: [
				{ id: 'a', text: 'Linearity' },
				{ id: 'b', text: 'Independence' },
				{ id: 'c', text: 'Homoscedasticity (constant variance)', isCorrect: true },
				{ id: 'd', text: 'Normality' }
			],
			explanation: 'A funnel shape indicates heteroscedasticity — the variance of errors changes with X. This affects standard errors and confidence intervals. Consider transforming Y or using weighted least squares.',
			difficulty: 'medium'
		},
		{
			id: 'resid-3',
			type: 'multiple-choice',
			question: 'Points on a Q-Q plot fall along a straight diagonal line. This suggests:',
			choices: [
				{ id: 'a', text: 'The relationship between X and Y is linear' },
				{ id: 'b', text: 'Residuals are approximately normally distributed', isCorrect: true },
				{ id: 'c', text: 'There is no relationship between variables' },
				{ id: 'd', text: 'The model has high R²' }
			],
			explanation: 'Q-Q plots compare residual distribution to normal distribution. Points along the diagonal indicate normality. Deviations (S-curves, heavy tails) indicate non-normality.',
			difficulty: 'easy'
		},
		{
			id: 'resid-4',
			type: 'multiple-choice',
			question: 'A single point has a very large residual. What should you do?',
			choices: [
				{ id: 'a', text: 'Always remove it — it\'s an error' },
				{ id: 'b', text: 'Investigate it, but don\'t automatically remove it', isCorrect: true },
				{ id: 'c', text: 'Ignore it — one point doesn\'t matter' },
				{ id: 'd', text: 'Rerun until it\'s not an outlier' }
			],
			explanation: 'Outliers deserve investigation: Is it a data entry error? A special case? If it\'s a real observation, removing it without justification is inappropriate. Report analyses with and without the outlier.',
			difficulty: 'medium'
		},
		{
			id: 'resid-5',
			type: 'true-false',
			question: 'If residuals are normally distributed, the regression assumptions are fully satisfied.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Normal residuals is just one assumption. You also need linearity, independence, and constant variance. All four assumptions (LINE) must be checked.',
			difficulty: 'easy'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/4-relationships" class="hover:text-rose-600">Module 4</a>
			<span class="mx-2">/</span>
			<span>Residual Diagnostics</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Residual Diagnostics</h1>
		<p class="text-lg text-gray-600">
			Learn to diagnose problems with your regression model using residual plots.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-rose-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-rose-900 mb-3">The LINE Assumptions</h2>
		<p class="text-rose-800 mb-4">
			Regression assumes: <strong>L</strong>inearity, <strong>I</strong>ndependence, <strong>N</strong>ormality (of residuals), <strong>E</strong>qual variance.
			Residual plots help detect violations.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-4 gap-3 text-sm">
			<div class="text-center">
				<div class="font-bold text-rose-700">L</div>
				<div class="text-gray-600">Linear relationship</div>
			</div>
			<div class="text-center">
				<div class="font-bold text-rose-700">I</div>
				<div class="text-gray-600">Independent errors</div>
			</div>
			<div class="text-center">
				<div class="font-bold text-rose-700">N</div>
				<div class="text-gray-600">Normal residuals</div>
			</div>
			<div class="text-center">
				<div class="font-bold text-rose-700">E</div>
				<div class="text-gray-600">Equal variance</div>
			</div>
		</div>
	</section>

	<!-- Problem Type Selector -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Explore Different Problems</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
				<button
					class="p-3 rounded-lg text-sm font-medium transition-all {problemType === 'good' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => { problemType = 'good'; refreshData(); }}
				>
					✓ Good Model
				</button>
				<button
					class="p-3 rounded-lg text-sm font-medium transition-all {problemType === 'nonlinear' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => { problemType = 'nonlinear'; refreshData(); }}
				>
					⚠ Nonlinear
				</button>
				<button
					class="p-3 rounded-lg text-sm font-medium transition-all {problemType === 'heteroscedastic' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => { problemType = 'heteroscedastic'; refreshData(); }}
				>
					⚠ Heteroscedastic
				</button>
				<button
					class="p-3 rounded-lg text-sm font-medium transition-all {problemType === 'outliers' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => { problemType = 'outliers'; refreshData(); }}
				>
					⚠ Outliers
				</button>
			</div>

			<div class="flex gap-3 mb-6">
				<Slider label="Number of Points" bind:value={numPoints} min={20} max={100} step={10} />
				<button
					class="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors h-fit self-end"
					onclick={refreshData}
				>
					Regenerate
				</button>
			</div>

			<!-- Three plots side by side -->
			<div class="grid md:grid-cols-3 gap-4">
				<!-- Original Scatter -->
				<div>
					<h4 class="font-medium text-gray-900 mb-2 text-center">Data + Regression Line</h4>
					<svg {width} {height}>
						<g transform="translate({margin.left},{margin.top})">
							<!-- Grid -->
							{#each xScaleScatter.ticks(4) as tick}
								<line x1={xScaleScatter(tick)} x2={xScaleScatter(tick)} y1={0} y2={innerHeight} stroke="#f3f4f6" />
							{/each}

							<!-- Regression line -->
							{#if data.length >= 2}
								<line
									x1={xScaleScatter(0)}
									y1={yScaleScatter(regression().intercept)}
									x2={xScaleScatter(25)}
									y2={yScaleScatter(regression().intercept + regression().slope * 25)}
									stroke="#e11d48"
									stroke-width="2"
								/>
							{/if}

							<!-- Points -->
							{#each data as point}
								<circle
									cx={xScaleScatter(point.x)}
									cy={yScaleScatter(point.y)}
									r="4"
									fill="#3b82f6"
									opacity="0.7"
								/>
							{/each}

							<!-- Axes -->
							<g transform="translate(0,{innerHeight})">
								<text x={innerWidth / 2} y="30" text-anchor="middle" fill="#6b7280" font-size="10">X</text>
							</g>
						</g>
					</svg>
				</div>

				<!-- Residual vs Fitted -->
				<div>
					<h4 class="font-medium text-gray-900 mb-2 text-center">Residuals vs Fitted</h4>
					<svg {width} {height}>
						<g transform="translate({margin.left},{margin.top})">
							<!-- Zero line -->
							<line
								x1={0}
								x2={innerWidth}
								y1={yScaleResid(0)}
								y2={yScaleResid(0)}
								stroke="#9ca3af"
								stroke-dasharray="5,5"
							/>

							<!-- Points -->
							{#each residuals as point}
								<circle
									cx={xScaleScatter(point.predicted)}
									cy={yScaleResid(point.residual)}
									r="4"
									fill={Math.abs(point.residual) > 10 ? '#ef4444' : '#f97316'}
									opacity="0.7"
								/>
							{/each}

							<!-- Axes -->
							<g transform="translate(0,{innerHeight})">
								<text x={innerWidth / 2} y="30" text-anchor="middle" fill="#6b7280" font-size="10">Fitted</text>
							</g>
							<g>
								<text transform="rotate(-90)" x={-innerHeight / 2} y="-35" text-anchor="middle" fill="#6b7280" font-size="10">Residual</text>
							</g>
						</g>
					</svg>
				</div>

				<!-- Q-Q Plot -->
				<div>
					<h4 class="font-medium text-gray-900 mb-2 text-center">Q-Q Plot (Normality)</h4>
					<svg {width} {height}>
						<g transform="translate({margin.left},{margin.top})">
							<!-- Reference line -->
							<line
								x1={qqXScale(-3)}
								y1={qqYScale(-3)}
								x2={qqXScale(3)}
								y2={qqYScale(3)}
								stroke="#9ca3af"
								stroke-dasharray="5,5"
							/>

							<!-- Points -->
							{#each qqData() as point}
								<circle
									cx={qqXScale(point.theoretical)}
									cy={qqYScale(point.observed)}
									r="3"
									fill="#10b981"
									opacity="0.7"
								/>
							{/each}

							<!-- Axes -->
							<g transform="translate(0,{innerHeight})">
								<text x={innerWidth / 2} y="30" text-anchor="middle" fill="#6b7280" font-size="10">Theoretical</text>
							</g>
							<g>
								<text transform="rotate(-90)" x={-innerHeight / 2} y="-35" text-anchor="middle" fill="#6b7280" font-size="10">Observed</text>
							</g>
						</g>
					</svg>
				</div>
			</div>

			<!-- Diagnosis -->
			<div class="mt-4 p-4 rounded-lg {
				problemType === 'good' ? 'bg-green-50 border border-green-200' :
				'bg-orange-50 border border-orange-200'
			}">
				<h4 class="font-medium {problemType === 'good' ? 'text-green-900' : 'text-orange-900'} mb-2">
					{#if problemType === 'good'}
						✓ Model looks good!
					{:else if problemType === 'nonlinear'}
						⚠ Nonlinearity detected
					{:else if problemType === 'heteroscedastic'}
						⚠ Non-constant variance
					{:else}
						⚠ Potential outliers
					{/if}
				</h4>
				<p class="text-sm {problemType === 'good' ? 'text-green-700' : 'text-orange-700'}">
					{#if problemType === 'good'}
						Residuals are randomly scattered around zero with no pattern. Q-Q plot shows approximate normality.
					{:else if problemType === 'nonlinear'}
						Notice the curved pattern in residuals vs fitted. The linear model misses the curvature. Consider polynomial terms or a different model.
					{:else if problemType === 'heteroscedastic'}
						Residuals fan out as fitted values increase. Standard errors and CIs may be incorrect. Consider log transformation or weighted regression.
					{:else}
						Some points have unusually large residuals. Investigate these cases — they could be errors or important special cases.
					{/if}
				</p>
			</div>
		</div>
	</section>

	<!-- What to Look For -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Pattern Recognition Guide</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-green-700 mb-3">✓ Good Residual Plot</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li>• Random scatter around zero</li>
					<li>• No clear pattern or trend</li>
					<li>• Roughly constant spread</li>
					<li>• Few extreme values</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-orange-700 mb-3">⚠ Curvature</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li>• U-shape or inverted U-shape</li>
					<li>• Systematic over/under prediction</li>
					<li>• <strong>Fix:</strong> Add polynomial terms, transform X</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-red-700 mb-3">⚠ Funnel Shape</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li>• Spread increases/decreases with X</li>
					<li>• Heteroscedasticity</li>
					<li>• <strong>Fix:</strong> Log transform Y, weighted regression</li>
				</ul>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-purple-700 mb-3">⚠ Outliers</h3>
				<ul class="space-y-2 text-sm text-gray-600">
					<li>• Points far from zero line</li>
					<li>• Can distort regression line</li>
					<li>• <strong>Action:</strong> Investigate, consider robust methods</li>
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
		<a href="/modules/4-relationships/regression" class="text-gray-600 hover:text-gray-900">
			← Simple Regression
		</a>
		<a href="/modules/4-relationships/multiple" class="text-rose-600 hover:text-rose-700 font-medium">
			Next: Multiple Predictors →
		</a>
	</div>
</div>
