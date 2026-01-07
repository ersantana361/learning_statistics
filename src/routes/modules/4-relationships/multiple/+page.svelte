<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const multipleFormula = String.raw`\hat{Y} = b_0 + b_1 X_1 + b_2 X_2 + \ldots + b_k X_k`;
	const partialFormula = String.raw`b_1 = \text{effect of } X_1 \text{ holding other predictors constant}`;
	const adjustedR2 = String.raw`R^2_{adj} = 1 - \frac{(1-R^2)(n-1)}{n-k-1}`;

	// Scenario: Predicting house price from size and age
	let sizeEffect = $state(100);
	let ageEffect = $state(-2);
	let basePrice = $state(50);
	let noise = $state(20);
	let correlation = $state(0);

	// Generate data
	let data = $state<Array<{ size: number; age: number; price: number }>>([]);

	function generateData() {
		const newData: Array<{ size: number; age: number; price: number }> = [];
		for (let i = 0; i < 50; i++) {
			const z1 = normal.sample(0, 1);
			const z2 = correlation * z1 + Math.sqrt(1 - correlation * correlation) * normal.sample(0, 1);
			const size = 10 + z1 * 3;
			const age = 25 + z2 * 15;
			const price = basePrice + sizeEffect * size / 10 + ageEffect * age + normal.sample(0, noise);
			newData.push({ size: Math.max(5, size), age: Math.max(0, age), price: Math.max(0, price) });
		}
		data = newData;
	}

	// Simple regression (size only)
	const simpleRegression = $derived(() => {
		if (data.length < 2) return { slope: 0, intercept: 0, r2: 0 };
		const meanX = d3.mean(data, d => d.size) ?? 0;
		const meanY = d3.mean(data, d => d.price) ?? 0;
		const sdX = d3.deviation(data, d => d.size) ?? 1;
		const sdY = d3.deviation(data, d => d.price) ?? 1;

		let sumXY = 0;
		for (const point of data) {
			sumXY += (point.size - meanX) * (point.price - meanY);
		}
		const r = sumXY / ((data.length - 1) * sdX * sdY);
		return {
			slope: r * (sdY / sdX),
			intercept: meanY - (r * sdY / sdX) * meanX,
			r2: r * r
		};
	});

	// Multiple regression (approximation using correlations)
	const multipleRegression = $derived(() => {
		if (data.length < 3) return { b0: 0, b1: 0, b2: 0, r2: 0 };

		const n = data.length;
		const meanSize = d3.mean(data, d => d.size) ?? 0;
		const meanAge = d3.mean(data, d => d.age) ?? 0;
		const meanPrice = d3.mean(data, d => d.price) ?? 0;

		// Simple OLS calculation
		let sumSize2 = 0, sumAge2 = 0, sumSizeAge = 0;
		let sumSizePrice = 0, sumAgePrice = 0;

		for (const point of data) {
			const dSize = point.size - meanSize;
			const dAge = point.age - meanAge;
			const dPrice = point.price - meanPrice;
			sumSize2 += dSize * dSize;
			sumAge2 += dAge * dAge;
			sumSizeAge += dSize * dAge;
			sumSizePrice += dSize * dPrice;
			sumAgePrice += dAge * dPrice;
		}

		const det = sumSize2 * sumAge2 - sumSizeAge * sumSizeAge;
		const b1 = (sumAge2 * sumSizePrice - sumSizeAge * sumAgePrice) / det;
		const b2 = (sumSize2 * sumAgePrice - sumSizeAge * sumSizePrice) / det;
		const b0 = meanPrice - b1 * meanSize - b2 * meanAge;

		// R-squared
		let ssTot = 0, ssRes = 0;
		for (const point of data) {
			const predicted = b0 + b1 * point.size + b2 * point.age;
			ssTot += (point.price - meanPrice) ** 2;
			ssRes += (point.price - predicted) ** 2;
		}
		const r2 = 1 - ssRes / ssTot;
		const adjR2 = 1 - (1 - r2) * (n - 1) / (n - 3);

		return { b0, b1, b2, r2, adjR2 };
	});

	// SVG dimensions
	const width = 350;
	const height = 280;
	const margin = { top: 20, right: 20, bottom: 40, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const sizeScale = $derived(
		d3.scaleLinear()
			.domain([d3.min(data, d => d.size) ?? 5, d3.max(data, d => d.size) ?? 20])
			.range([0, innerWidth])
	);
	const priceScale = $derived(
		d3.scaleLinear()
			.domain([d3.min(data, d => d.price) ?? 0, d3.max(data, d => d.price) ?? 200])
			.range([innerHeight, 0])
	);
	const ageScale = $derived(
		d3.scaleLinear()
			.domain([d3.min(data, d => d.age) ?? 0, d3.max(data, d => d.age) ?? 50])
			.range([0, innerWidth])
	);

	// Color scale for age
	const colorScale = $derived(
		d3.scaleSequential(d3.interpolateRdYlBu)
			.domain([d3.max(data, d => d.age) ?? 50, d3.min(data, d => d.age) ?? 0])
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'mult-1',
			type: 'multiple-choice',
			question: 'In multiple regression, what does "holding other variables constant" mean?',
			choices: [
				{ id: 'a', text: 'The other variables must be fixed in the experiment' },
				{ id: 'b', text: 'Statistically controlling for the effect of other predictors', isCorrect: true },
				{ id: 'c', text: 'Removing other variables from the dataset' },
				{ id: 'd', text: 'Only analyzing data where other variables don\'t change' }
			],
			explanation: 'Multiple regression partials out the effects of other predictors mathematically, giving you the unique contribution of each predictor. It\'s statistical control, not experimental control.',
			difficulty: 'medium'
		},
		{
			id: 'mult-2',
			type: 'multiple-choice',
			question: 'Model A has R² = 0.75 with 2 predictors. Model B has R² = 0.76 with 10 predictors. Which is likely better?',
			choices: [
				{ id: 'a', text: 'Model B because R² is higher' },
				{ id: 'b', text: 'Model A because it\'s more parsimonious', isCorrect: true },
				{ id: 'c', text: 'Cannot compare models with different predictors' },
				{ id: 'd', text: 'Whichever has lower p-values' }
			],
			explanation: 'Adding predictors always increases R², even if they\'re useless. Model A explains almost as much variance with far fewer predictors — it\'s more parsimonious and likely more generalizable.',
			difficulty: 'medium'
		},
		{
			id: 'mult-3',
			type: 'multiple-choice',
			question: 'Two predictors are highly correlated (r = 0.9). What problem might occur?',
			choices: [
				{ id: 'a', text: 'The model won\'t run' },
				{ id: 'b', text: 'R² will be artificially low' },
				{ id: 'c', text: 'Coefficient estimates become unstable (multicollinearity)', isCorrect: true },
				{ id: 'd', text: 'The intercept will be wrong' }
			],
			explanation: 'Multicollinearity makes it hard to separate the effects of correlated predictors. Coefficients become unstable with large standard errors, even though the model\'s predictions may still be good.',
			difficulty: 'hard'
		},
		{
			id: 'mult-4',
			type: 'multiple-choice',
			question: 'Why use adjusted R² instead of regular R²?',
			choices: [
				{ id: 'a', text: 'Adjusted R² is always higher' },
				{ id: 'b', text: 'It penalizes adding useless predictors', isCorrect: true },
				{ id: 'c', text: 'It measures practical significance' },
				{ id: 'd', text: 'It\'s required for multiple regression' }
			],
			explanation: 'Adjusted R² penalizes model complexity by accounting for the number of predictors. Unlike R², it can decrease when you add a predictor that doesn\'t help.',
			difficulty: 'easy'
		},
		{
			id: 'mult-5',
			type: 'true-false',
			question: 'If X₁ and X₂ are uncorrelated, the multiple regression coefficient for X₁ equals the simple regression coefficient.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! When predictors are uncorrelated, there\'s no shared variance to partial out. Each predictor\'s coefficient is the same whether or not other predictors are in the model.',
			difficulty: 'hard'
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
			<span>Multiple Predictors</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Multiple Regression</h1>
		<p class="text-lg text-gray-600">
			Extend regression to include multiple predictors and understand their unique contributions.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-rose-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-rose-900 mb-3">The Big Idea</h2>
		<p class="text-rose-800 mb-4">
			Multiple regression estimates the effect of each predictor <strong>while controlling for the others</strong>.
			This lets you ask: "What's the effect of X₁ when X₂ is held constant?"
		</p>
		<div class="bg-white rounded-lg p-4">
			<MathDisplay formula={multipleFormula} displayMode={true} />
			<p class="text-sm text-gray-600 mt-2 text-center">
				Each coefficient represents the change in Y for a one-unit change in that predictor, holding all other predictors constant.
			</p>
		</div>
	</section>

	<!-- Interactive Example -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Example: House Prices</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-600 mb-4">
				Predict house price from <strong>size</strong> (100s of sq ft) and <strong>age</strong> (years).
				How does accounting for both change our understanding?
			</p>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<Slider label="Size Effect ($K per 100 sqft)" bind:value={sizeEffect} min={50} max={200} step={10} />
				<Slider label="Age Effect ($K per year)" bind:value={ageEffect} min={-5} max={0} step={0.5} />
				<Slider label="Size-Age Correlation" bind:value={correlation} min={-0.8} max={0.8} step={0.1} />
				<Slider label="Noise Level" bind:value={noise} min={5} max={50} step={5} />
			</div>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
					onclick={generateData}
				>
					Generate Data
				</button>
			</div>

			{#if data.length > 0}
				<!-- Plots -->
				<div class="grid md:grid-cols-2 gap-6 mb-6">
					<!-- Size vs Price -->
					<div>
						<h4 class="font-medium text-gray-900 mb-2 text-center">Price vs Size (colored by Age)</h4>
						<svg {width} {height}>
							<g transform="translate({margin.left},{margin.top})">
								<!-- Simple regression line -->
								<line
									x1={sizeScale(sizeScale.domain()[0])}
									y1={priceScale(simpleRegression().intercept + simpleRegression().slope * sizeScale.domain()[0])}
									x2={sizeScale(sizeScale.domain()[1])}
									y2={priceScale(simpleRegression().intercept + simpleRegression().slope * sizeScale.domain()[1])}
									stroke="#9ca3af"
									stroke-width="2"
									stroke-dasharray="5,5"
								/>

								<!-- Points colored by age -->
								{#each data as point}
									<circle
										cx={sizeScale(point.size)}
										cy={priceScale(point.price)}
										r="5"
										fill={colorScale(point.age)}
										stroke="white"
										stroke-width="1"
									/>
								{/each}

								<!-- Axes -->
								<g transform="translate(0,{innerHeight})">
									<text x={innerWidth / 2} y="30" text-anchor="middle" fill="#6b7280" font-size="10">Size (100s sqft)</text>
								</g>
								<g>
									<text transform="rotate(-90)" x={-innerHeight / 2} y="-35" text-anchor="middle" fill="#6b7280" font-size="10">Price ($K)</text>
								</g>
							</g>
						</svg>
						<div class="text-xs text-center text-gray-500">
							Dashed line: simple regression (size only)
						</div>
					</div>

					<!-- Age vs Price -->
					<div>
						<h4 class="font-medium text-gray-900 mb-2 text-center">Price vs Age</h4>
						<svg {width} {height}>
							<g transform="translate({margin.left},{margin.top})">
								<!-- Points -->
								{#each data as point}
									<circle
										cx={ageScale(point.age)}
										cy={priceScale(point.price)}
										r="5"
										fill="#f97316"
										opacity="0.7"
									/>
								{/each}

								<!-- Axes -->
								<g transform="translate(0,{innerHeight})">
									<text x={innerWidth / 2} y="30" text-anchor="middle" fill="#6b7280" font-size="10">Age (years)</text>
								</g>
							</g>
						</svg>
					</div>
				</div>

				<!-- Color Legend -->
				<div class="flex justify-center items-center gap-2 mb-6 text-sm">
					<span class="text-gray-600">Age:</span>
					<div class="flex items-center gap-1">
						<div class="w-4 h-4 rounded" style="background-color: {colorScale(0)}"></div>
						<span>New</span>
					</div>
					<span>→</span>
					<div class="flex items-center gap-1">
						<div class="w-4 h-4 rounded" style="background-color: {colorScale(50)}"></div>
						<span>Old</span>
					</div>
				</div>

				<!-- Model Comparison -->
				<div class="grid md:grid-cols-2 gap-6">
					<div class="p-4 bg-gray-50 rounded-lg">
						<h4 class="font-medium text-gray-900 mb-3">Simple Regression (Size only)</h4>
						<div class="font-mono text-sm mb-2">
							Price = {simpleRegression().intercept.toFixed(1)} + {simpleRegression().slope.toFixed(1)} × Size
						</div>
						<div class="text-sm text-gray-600">
							R² = {(simpleRegression().r2 * 100).toFixed(1)}%
						</div>
						<p class="text-xs text-gray-500 mt-2">
							Ignores age — coefficient may be confounded
						</p>
					</div>

					<div class="p-4 bg-rose-50 rounded-lg border border-rose-200">
						<h4 class="font-medium text-rose-900 mb-3">Multiple Regression</h4>
						<div class="font-mono text-sm mb-2">
							Price = {multipleRegression().b0.toFixed(1)} + {multipleRegression().b1.toFixed(1)} × Size + {multipleRegression().b2.toFixed(1)} × Age
						</div>
						<div class="text-sm text-rose-700">
							R² = {(multipleRegression().r2 * 100).toFixed(1)}% | Adj. R² = {((multipleRegression().adjR2 ?? 0) * 100).toFixed(1)}%
						</div>
						<p class="text-xs text-rose-600 mt-2">
							Each coefficient controls for the other predictor
						</p>
					</div>
				</div>

				<!-- Interpretation -->
				{#if Math.abs(simpleRegression().slope - multipleRegression().b1) > 5}
					<div class="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
						<h4 class="font-medium text-yellow-900">⚠ Notice the difference!</h4>
						<p class="text-sm text-yellow-800">
							The size coefficient changed from {simpleRegression().slope.toFixed(1)} to {multipleRegression().b1.toFixed(1)} when age was added.
							{#if correlation > 0}
								Newer houses tend to be larger, so size alone was capturing some of the age effect.
							{:else if correlation < 0}
								Older houses tend to be larger, which was masking the true size effect.
							{/if}
						</p>
					</div>
				{/if}
			{:else}
				<div class="text-center text-gray-400 py-12">
					Click "Generate Data" to see the example
				</div>
			{/if}
		</div>
	</section>

	<!-- Key Concepts -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Concepts</h2>

		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Partial Coefficients</h3>
				<p class="text-sm text-gray-600 mb-3">
					Each coefficient represents the effect of that predictor while statistically holding others constant.
				</p>
				<div class="bg-gray-50 rounded p-3">
					<MathDisplay formula={partialFormula} />
				</div>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-gray-900 mb-3">Adjusted R²</h3>
				<p class="text-sm text-gray-600 mb-3">
					Penalizes adding useless predictors. Use this to compare models with different numbers of predictors.
				</p>
				<div class="bg-gray-50 rounded p-3">
					<MathDisplay formula={adjustedR2} />
				</div>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-rose-700 mb-3">Multicollinearity</h3>
				<p class="text-sm text-gray-600">
					When predictors are highly correlated, it's hard to separate their effects.
					Coefficients become unstable with large standard errors.
					Check VIF (Variance Inflation Factor) — values > 5-10 indicate problems.
				</p>
			</div>

			<div class="bg-white rounded-lg p-5 border border-gray-200">
				<h3 class="font-semibold text-green-700 mb-3">Model Selection</h3>
				<p class="text-sm text-gray-600">
					More predictors isn't always better. Balance predictive power with parsimony.
					Use adjusted R², AIC, or BIC to compare models. Consider domain knowledge.
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
	<section class="mb-8 bg-rose-50 rounded-xl p-6">
		<h2 class="text-xl font-semibold text-rose-900 mb-4">Module 4 Complete!</h2>
		<p class="text-rose-800 mb-4">
			You now understand relationships between variables:
		</p>
		<ul class="space-y-2 text-rose-700">
			<li class="flex items-start gap-2">
				<span class="text-rose-500">✓</span>
				<span><strong>Correlation:</strong> Measuring linear association strength</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-rose-500">✓</span>
				<span><strong>Simple Regression:</strong> Predicting Y from one X</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-rose-500">✓</span>
				<span><strong>Residual Diagnostics:</strong> Checking model assumptions</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-rose-500">✓</span>
				<span><strong>Multiple Regression:</strong> Controlling for multiple predictors</span>
			</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/4-relationships/residuals" class="text-gray-600 hover:text-gray-900">
			← Residual Diagnostics
		</a>
		<a href="/modules/5-beyond" class="text-rose-600 hover:text-rose-700 font-medium">
			Next: Module 5 - Beyond the Basics →
		</a>
	</div>
</div>
