<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const regressionFormula = String.raw`\hat{Y} = b_0 + b_1 X`;
	const slopeFormula = String.raw`b_1 = r \cdot \frac{s_Y}{s_X}`;
	const interceptFormula = String.raw`b_0 = \bar{Y} - b_1 \bar{X}`;
	const r2Formula = String.raw`R^2 = r^2 = \frac{\text{Variance Explained}}{\text{Total Variance}}`;

	// Parameters
	let trueSlope = $state(2);
	let trueIntercept = $state(10);
	let noiseLevel = $state(5);
	let numPoints = $state(30);

	// Generate data
	let data = $state<Array<{ x: number; y: number }>>([]);

	function generateData() {
		const newData: Array<{ x: number; y: number }> = [];
		for (let i = 0; i < numPoints; i++) {
			const x = Math.random() * 20 + 5;
			const y = trueIntercept + trueSlope * x + normal.sample(0, noiseLevel);
			newData.push({ x, y });
		}
		data = newData;
	}

	function clearData() {
		data = [];
	}

	// Add a point on click
	function addPoint(event: MouseEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = xScale.invert(event.clientX - rect.left - margin.left);
		const y = yScale.invert(event.clientY - rect.top - margin.top);
		if (x >= 0 && x <= 30 && y >= 0 && y <= 80) {
			data = [...data, { x, y }];
		}
	}

	// Compute regression line
	const regression = $derived(() => {
		if (data.length < 2) return { slope: 0, intercept: 0, r: 0, r2: 0, meanX: 0, meanY: 0 };

		const n = data.length;
		const meanX = d3.mean(data, d => d.x) ?? 0;
		const meanY = d3.mean(data, d => d.y) ?? 0;
		const sdX = d3.deviation(data, d => d.x) ?? 1;
		const sdY = d3.deviation(data, d => d.y) ?? 1;

		// Calculate correlation
		let sumXY = 0;
		for (const point of data) {
			sumXY += (point.x - meanX) * (point.y - meanY);
		}
		const r = sumXY / ((n - 1) * sdX * sdY);

		// Calculate slope and intercept
		const slope = r * (sdY / sdX);
		const intercept = meanY - slope * meanX;

		return {
			slope,
			intercept,
			r,
			r2: r * r,
			meanX,
			meanY,
			sdX,
			sdY
		};
	});

	// SVG dimensions
	const width = 550;
	const height = 400;
	const margin = { top: 30, right: 30, bottom: 50, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xScale = $derived(d3.scaleLinear().domain([0, 30]).range([0, innerWidth]));
	const yScale = $derived(d3.scaleLinear().domain([0, 80]).range([innerHeight, 0]));

	// Predicted values and residuals
	const predictions = $derived(
		data.map(d => ({
			...d,
			predicted: regression().intercept + regression().slope * d.x,
			residual: d.y - (regression().intercept + regression().slope * d.x)
		}))
	);

	// Highlight residuals toggle
	let showResiduals = $state(false);
	let showMeans = $state(false);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'reg-1',
			type: 'multiple-choice',
			question: 'In the equation ŷ = 5 + 3x, what does the 3 represent?',
			choices: [
				{ id: 'a', text: 'The predicted y when x = 0' },
				{ id: 'b', text: 'The change in y for each unit increase in x', isCorrect: true },
				{ id: 'c', text: 'The correlation coefficient' },
				{ id: 'd', text: 'The R-squared value' }
			],
			explanation: 'The slope (3) represents the change in the predicted y for each one-unit increase in x. Here, for every 1-unit increase in x, y is predicted to increase by 3 units.',
			difficulty: 'easy'
		},
		{
			id: 'reg-2',
			type: 'numeric',
			question: 'If ŷ = 10 + 2x, what is the predicted value when x = 15?',
			questionMath: String.raw`\hat{y} = 10 + 2(15) = ?`,
			correctAnswer: 40,
			tolerance: 0.1,
			explanation: 'Simply plug in x = 15: ŷ = 10 + 2(15) = 10 + 30 = 40',
			difficulty: 'easy'
		},
		{
			id: 'reg-3',
			type: 'multiple-choice',
			question: 'What does R² = 0.64 tell you?',
			choices: [
				{ id: 'a', text: 'The correlation is 0.64' },
				{ id: 'b', text: '64% of variance in y is explained by x', isCorrect: true },
				{ id: 'c', text: 'The slope is 0.64' },
				{ id: 'd', text: '64% of predictions are correct' }
			],
			explanation: 'R² (coefficient of determination) represents the proportion of variance in Y that is explained by the linear relationship with X. Here, 64% of the variability in Y can be predicted from X.',
			difficulty: 'medium'
		},
		{
			id: 'reg-4',
			type: 'multiple-choice',
			question: 'The regression line always passes through which point?',
			choices: [
				{ id: 'a', text: 'The origin (0, 0)' },
				{ id: 'b', text: 'The point (x̄, ȳ)', isCorrect: true },
				{ id: 'c', text: 'The median of both variables' },
				{ id: 'd', text: 'The maximum y value' }
			],
			explanation: 'The least squares regression line always passes through the point of means (x̄, ȳ). This is a mathematical property of the OLS solution.',
			difficulty: 'medium',
			hint: 'Think about what happens when you plug x̄ into the regression equation'
		},
		{
			id: 'reg-5',
			type: 'true-false',
			question: 'A positive slope means the correlation is also positive.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! The slope and correlation always have the same sign. b₁ = r × (sᵧ/sₓ), and since standard deviations are always positive, slope and r must have the same sign.',
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
			<span>Simple Regression</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Simple Linear Regression</h1>
		<p class="text-lg text-gray-600">
			Learn to fit a line that best predicts Y from X.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-rose-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-rose-900 mb-3">The Goal</h2>
		<p class="text-rose-800 mb-4">
			Find the line that <strong>minimizes the sum of squared residuals</strong> (vertical distances from points to line).
			This "least squares" line is the best linear predictor of Y given X.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-3 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">Regression equation:</p>
				<MathDisplay formula={regressionFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Slope:</p>
				<MathDisplay formula={slopeFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Intercept:</p>
				<MathDisplay formula={interceptFormula} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Interactive Scatter Plot -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Regression</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<Slider label="True Slope" bind:value={trueSlope} min={-3} max={5} step={0.5} />
				<Slider label="True Intercept" bind:value={trueIntercept} min={-10} max={30} step={2} />
				<Slider label="Noise Level" bind:value={noiseLevel} min={1} max={15} step={1} />
				<Slider label="Number of Points" bind:value={numPoints} min={10} max={100} step={5} />
			</div>

			<div class="flex flex-wrap gap-3 mb-4">
				<button
					class="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
					onclick={generateData}
				>
					Generate Data
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearData}
				>
					Clear
				</button>
				<label class="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer">
					<input type="checkbox" bind:checked={showResiduals} class="rounded" />
					<span class="text-sm">Show Residuals</span>
				</label>
				<label class="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer">
					<input type="checkbox" bind:checked={showMeans} class="rounded" />
					<span class="text-sm">Show Means</span>
				</label>
			</div>

			<!-- SVG Plot -->
			<svg {width} {height} class="mx-auto cursor-crosshair" onclick={addPoint}>
				<g transform="translate({margin.left},{margin.top})">
					<!-- Grid -->
					{#each xScale.ticks(6) as tick}
						<line
							x1={xScale(tick)}
							x2={xScale(tick)}
							y1={0}
							y2={innerHeight}
							stroke="#f3f4f6"
							stroke-width="1"
						/>
					{/each}
					{#each yScale.ticks(6) as tick}
						<line
							x1={0}
							x2={innerWidth}
							y1={yScale(tick)}
							y2={yScale(tick)}
							stroke="#f3f4f6"
							stroke-width="1"
						/>
					{/each}

					<!-- Mean lines -->
					{#if showMeans && data.length > 0}
						<line
							x1={xScale(regression().meanX)}
							x2={xScale(regression().meanX)}
							y1={0}
							y2={innerHeight}
							stroke="#10b981"
							stroke-width="1.5"
							stroke-dasharray="5,5"
						/>
						<line
							x1={0}
							x2={innerWidth}
							y1={yScale(regression().meanY)}
							y2={yScale(regression().meanY)}
							stroke="#10b981"
							stroke-width="1.5"
							stroke-dasharray="5,5"
						/>
						<circle
							cx={xScale(regression().meanX)}
							cy={yScale(regression().meanY)}
							r="8"
							fill="#10b981"
							stroke="white"
							stroke-width="2"
						/>
						<text
							x={xScale(regression().meanX) + 10}
							y={yScale(regression().meanY) - 10}
							fill="#10b981"
							font-size="11"
							font-weight="500"
						>
							(x̄, ȳ)
						</text>
					{/if}

					<!-- Regression line -->
					{#if data.length >= 2}
						<line
							x1={xScale(0)}
							y1={yScale(regression().intercept)}
							x2={xScale(30)}
							y2={yScale(regression().intercept + regression().slope * 30)}
							stroke="#e11d48"
							stroke-width="2.5"
						/>
					{/if}

					<!-- Residuals -->
					{#if showResiduals}
						{#each predictions as point}
							<line
								x1={xScale(point.x)}
								x2={xScale(point.x)}
								y1={yScale(point.y)}
								y2={yScale(point.predicted)}
								stroke="#f97316"
								stroke-width="1.5"
								opacity="0.7"
							/>
						{/each}
					{/if}

					<!-- Data points -->
					{#each data as point}
						<circle
							cx={xScale(point.x)}
							cy={yScale(point.y)}
							r="5"
							fill="#3b82f6"
							stroke="white"
							stroke-width="1"
						/>
					{/each}

					<!-- Axes -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(6) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="40" text-anchor="middle" fill="#374151" font-size="11">X</text>
					</g>
					<g>
						{#each yScale.ticks(6) as tick}
							<g transform="translate(0,{yScale(tick)})">
								<line x2="-6" stroke="#9ca3af" />
								<text x="-10" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
						<text transform="rotate(-90)" x={-innerHeight / 2} y="-45" text-anchor="middle" fill="#374151" font-size="11">Y</text>
					</g>
				</g>
			</svg>
			<p class="text-xs text-gray-500 text-center">Click on the plot to add points</p>

			<!-- Statistics -->
			{#if data.length >= 2}
				<div class="grid md:grid-cols-5 gap-3 mt-4">
					<div class="text-center p-3 bg-rose-50 rounded-lg">
						<div class="text-lg font-bold text-rose-600">{regression().slope.toFixed(2)}</div>
						<div class="text-xs text-rose-700">Slope (b₁)</div>
					</div>
					<div class="text-center p-3 bg-purple-50 rounded-lg">
						<div class="text-lg font-bold text-purple-600">{regression().intercept.toFixed(2)}</div>
						<div class="text-xs text-purple-700">Intercept (b₀)</div>
					</div>
					<div class="text-center p-3 bg-blue-50 rounded-lg">
						<div class="text-lg font-bold text-blue-600">{regression().r.toFixed(3)}</div>
						<div class="text-xs text-blue-700">Correlation (r)</div>
					</div>
					<div class="text-center p-3 bg-green-50 rounded-lg">
						<div class="text-lg font-bold text-green-600">{(regression().r2 * 100).toFixed(1)}%</div>
						<div class="text-xs text-green-700">R² (variance explained)</div>
					</div>
					<div class="text-center p-3 bg-gray-50 rounded-lg">
						<div class="text-lg font-bold text-gray-600">{data.length}</div>
						<div class="text-xs text-gray-700">n (points)</div>
					</div>
				</div>

				<!-- Equation Display -->
				<div class="mt-4 p-4 bg-gray-50 rounded-lg text-center">
					<span class="text-gray-700">Fitted equation: </span>
					<span class="font-mono font-medium">
						ŷ = {regression().intercept.toFixed(2)} {regression().slope >= 0 ? '+' : ''} {regression().slope.toFixed(2)}x
					</span>
				</div>
			{/if}
		</div>
	</section>

	<!-- Interpretation Guide -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interpreting the Output</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Slope (b₁)</h3>
				<p class="text-sm text-gray-600 mb-2">
					The predicted change in Y for each one-unit increase in X.
				</p>
				<div class="bg-gray-50 rounded p-3 text-sm">
					<strong>Example:</strong> If b₁ = 2.5, then for each additional unit of X, Y is predicted to increase by 2.5 units.
				</div>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Intercept (b₀)</h3>
				<p class="text-sm text-gray-600 mb-2">
					The predicted value of Y when X = 0.
				</p>
				<div class="bg-gray-50 rounded p-3 text-sm">
					<strong>Caution:</strong> Often not meaningful if X = 0 is outside your data range or doesn't make sense in context.
				</div>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">R² (Coefficient of Determination)</h3>
				<p class="text-sm text-gray-600 mb-2">
					The proportion of variance in Y explained by the linear relationship with X.
				</p>
				<div class="bg-gray-50 rounded p-3">
					<MathDisplay formula={r2Formula} />
				</div>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Residuals</h3>
				<p class="text-sm text-gray-600 mb-2">
					The vertical distances between observed and predicted values: e = Y - Ŷ
				</p>
				<div class="bg-gray-50 rounded p-3 text-sm">
					<strong>Key property:</strong> Residuals sum to zero and are uncorrelated with X (for OLS regression).
				</div>
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
		<a href="/modules/4-relationships/correlation" class="text-gray-600 hover:text-gray-900">
			← Correlation
		</a>
		<a href="/modules/4-relationships/residuals" class="text-rose-600 hover:text-rose-700 font-medium">
			Next: Residual Diagnostics →
		</a>
	</div>
</div>
