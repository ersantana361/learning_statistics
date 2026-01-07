<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// LaTeX formulas
	const correlationFormula = String.raw`r = \frac{\sum_{i=1}^{n}(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^{n}(x_i - \bar{x})^2} \cdot \sqrt{\sum_{i=1}^{n}(y_i - \bar{y})^2}}`;
	const rSquaredFormula = String.raw`R^2 = r^2 = \text{proportion of variance explained}`;

	// Interactive scatter data
	let points = $state<Array<{ x: number; y: number; id: number }>>([]);
	let nextId = $state(0);

	// SVG dimensions for interactive scatter
	const width = 450;
	const height = 400;
	const margin = { top: 20, right: 20, bottom: 40, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
	const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

	// Calculate correlation
	function calculateCorrelation(pts: Array<{ x: number; y: number }>) {
		if (pts.length < 2) return 0;

		const n = pts.length;
		const meanX = d3.mean(pts, d => d.x) ?? 0;
		const meanY = d3.mean(pts, d => d.y) ?? 0;

		let sumXY = 0;
		let sumX2 = 0;
		let sumY2 = 0;

		for (const p of pts) {
			const dx = p.x - meanX;
			const dy = p.y - meanY;
			sumXY += dx * dy;
			sumX2 += dx * dx;
			sumY2 += dy * dy;
		}

		if (sumX2 === 0 || sumY2 === 0) return 0;
		return sumXY / (Math.sqrt(sumX2) * Math.sqrt(sumY2));
	}

	// Calculate regression line
	function calculateRegression(pts: Array<{ x: number; y: number }>) {
		if (pts.length < 2) return { slope: 0, intercept: 50 };

		const n = pts.length;
		const meanX = d3.mean(pts, d => d.x) ?? 0;
		const meanY = d3.mean(pts, d => d.y) ?? 0;

		let sumXY = 0;
		let sumX2 = 0;

		for (const p of pts) {
			const dx = p.x - meanX;
			const dy = p.y - meanY;
			sumXY += dx * dy;
			sumX2 += dx * dx;
		}

		const slope = sumX2 === 0 ? 0 : sumXY / sumX2;
		const intercept = meanY - slope * meanX;

		return { slope, intercept };
	}

	const correlation = $derived(calculateCorrelation(points));
	const regression = $derived(calculateRegression(points));
	const rSquared = $derived(correlation * correlation);

	// Handle click to add point
	function handleClick(event: MouseEvent) {
		const svg = event.currentTarget as SVGElement;
		const rect = svg.getBoundingClientRect();
		const x = event.clientX - rect.left - margin.left;
		const y = event.clientY - rect.top - margin.top;

		const dataX = xScale.invert(Math.max(0, Math.min(innerWidth, x)));
		const dataY = yScale.invert(Math.max(0, Math.min(innerHeight, y)));

		points = [...points, { x: dataX, y: dataY, id: nextId }];
		nextId++;
	}

	// Remove point
	function removePoint(id: number) {
		points = points.filter(p => p.id !== id);
	}

	// Clear all points
	function clearPoints() {
		points = [];
	}

	// Generate sample data with specific correlation
	function generateData(targetR: number, n: number = 30) {
		const newPoints: Array<{ x: number; y: number; id: number }> = [];

		for (let i = 0; i < n; i++) {
			const x = Math.random() * 80 + 10;
			const noise = (Math.random() - 0.5) * 2;
			const y = 50 + targetR * (x - 50) + noise * Math.sqrt(1 - targetR * targetR) * 30;
			newPoints.push({
				x,
				y: Math.max(5, Math.min(95, y)),
				id: nextId++
			});
		}

		points = newPoints;
	}

	// Example patterns
	const examplePatterns = [
		{ name: 'Strong Positive', r: 0.9 },
		{ name: 'Moderate Positive', r: 0.5 },
		{ name: 'No Correlation', r: 0 },
		{ name: 'Moderate Negative', r: -0.5 },
		{ name: 'Strong Negative', r: -0.9 }
	];

	// Guess the correlation game
	let guessMode = $state(false);
	let targetCorrelation = $state(0);
	let userGuess = $state(0);
	let showAnswer = $state(false);

	function startGuess() {
		const targets = [-0.9, -0.7, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 0.9];
		targetCorrelation = targets[Math.floor(Math.random() * targets.length)];
		generateData(targetCorrelation, 25);
		guessMode = true;
		showAnswer = false;
		userGuess = 0;
	}

	function checkGuess() {
		showAnswer = true;
	}

	// Anscombe's quartet data
	const anscombeData = {
		set1: [
			{ x: 10, y: 8.04 }, { x: 8, y: 6.95 }, { x: 13, y: 7.58 }, { x: 9, y: 8.81 },
			{ x: 11, y: 8.33 }, { x: 14, y: 9.96 }, { x: 6, y: 7.24 }, { x: 4, y: 4.26 },
			{ x: 12, y: 10.84 }, { x: 7, y: 4.82 }, { x: 5, y: 5.68 }
		],
		set2: [
			{ x: 10, y: 9.14 }, { x: 8, y: 8.14 }, { x: 13, y: 8.74 }, { x: 9, y: 8.77 },
			{ x: 11, y: 9.26 }, { x: 14, y: 8.1 }, { x: 6, y: 6.13 }, { x: 4, y: 3.1 },
			{ x: 12, y: 9.13 }, { x: 7, y: 7.26 }, { x: 5, y: 4.74 }
		],
		set3: [
			{ x: 10, y: 7.46 }, { x: 8, y: 6.77 }, { x: 13, y: 12.74 }, { x: 9, y: 7.11 },
			{ x: 11, y: 7.81 }, { x: 14, y: 8.84 }, { x: 6, y: 6.08 }, { x: 4, y: 5.39 },
			{ x: 12, y: 8.15 }, { x: 7, y: 6.42 }, { x: 5, y: 5.73 }
		],
		set4: [
			{ x: 8, y: 6.58 }, { x: 8, y: 5.76 }, { x: 8, y: 7.71 }, { x: 8, y: 8.84 },
			{ x: 8, y: 8.47 }, { x: 8, y: 7.04 }, { x: 8, y: 5.25 }, { x: 19, y: 12.5 },
			{ x: 8, y: 5.56 }, { x: 8, y: 7.91 }, { x: 8, y: 6.89 }
		]
	};

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'corr-1',
			type: 'multiple-choice',
			question: 'A correlation of r = -0.85 indicates:',
			choices: [
				{ id: 'a', text: 'A weak negative relationship' },
				{ id: 'b', text: 'A strong negative relationship', isCorrect: true },
				{ id: 'c', text: 'A strong positive relationship' },
				{ id: 'd', text: 'No relationship' }
			],
			explanation: 'The sign indicates direction (negative), and the magnitude (0.85, close to 1) indicates strength. This is a strong negative relationship: as X increases, Y tends to decrease substantially.',
			difficulty: 'easy'
		},
		{
			id: 'corr-2',
			type: 'multiple-choice',
			question: 'A researcher finds r = 0.95 between ice cream sales and drowning deaths. This proves:',
			choices: [
				{ id: 'a', text: 'Ice cream causes drowning' },
				{ id: 'b', text: 'Drowning causes ice cream sales' },
				{ id: 'c', text: 'A strong relationship exists, but causation is not established', isCorrect: true },
				{ id: 'd', text: 'The study must have an error' }
			],
			explanation: 'Correlation does not imply causation! Both variables are likely caused by a third variable (summer/warm weather). This is a classic example of a confounding variable.',
			difficulty: 'medium'
		},
		{
			id: 'corr-3',
			type: 'numeric',
			question: 'If r = 0.6 between hours studied and test score, what percentage of variance in test scores is explained by study hours?',
			questionMath: String.raw`R^2 = r^2 = (0.6)^2 = ?`,
			correctAnswer: 36,
			tolerance: 1,
			explanation: 'R² = 0.6² = 0.36 = 36%. This means 36% of the variation in test scores can be explained by variation in study hours. The remaining 64% is due to other factors.',
			difficulty: 'medium'
		},
		{
			id: 'corr-4',
			type: 'multiple-choice',
			question: 'Adding an outlier far from the regression line will typically:',
			choices: [
				{ id: 'a', text: 'Increase |r| toward 1' },
				{ id: 'b', text: 'Decrease |r| toward 0', isCorrect: true },
				{ id: 'c', text: 'Have no effect on r' },
				{ id: 'd', text: 'Change the sign of r' }
			],
			explanation: 'Outliers that don\'t follow the pattern weaken the correlation. A point far from the trend line adds unexplained variance, pulling r toward 0.',
			difficulty: 'medium',
			hint: 'Think about what an outlier does to the "tightness" of the relationship'
		},
		{
			id: 'corr-5',
			type: 'true-false',
			question: 'A correlation of r = 0 means there is no relationship between the variables.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! Correlation measures LINEAR relationships only. Variables can have perfect non-linear relationships (like quadratic or circular) and still have r = 0. Always plot your data!',
			difficulty: 'hard'
		},
		{
			id: 'corr-6',
			type: 'multiple-choice',
			question: 'Height and weight have r = 0.70 in the general population. In a sample of NBA players only, you would expect:',
			choices: [
				{ id: 'a', text: 'A higher correlation because NBA players are more athletic' },
				{ id: 'b', text: 'A lower correlation due to restriction of range', isCorrect: true },
				{ id: 'c', text: 'The same correlation (r = 0.70)' },
				{ id: 'd', text: 'A negative correlation' }
			],
			explanation: 'NBA players are pre-selected for height—all are tall. This "restriction of range" reduces variance in height, which typically weakens the correlation. With less variation to explain, r drops.',
			difficulty: 'hard'
		},
		{
			id: 'corr-7',
			type: 'numeric',
			question: 'Two variables have r = -0.7. What is r²?',
			correctAnswer: 0.49,
			tolerance: 0.01,
			explanation: 'r² = (-0.7)² = 0.49. Note that r² is always positive regardless of whether r is positive or negative. The sign only indicates direction, not the proportion of variance explained.',
			difficulty: 'easy'
		},
		{
			id: 'corr-8',
			type: 'multiple-choice',
			question: 'What\'s the best interpretation of r² = 0.64?',
			choices: [
				{ id: 'a', text: '64% of X values match Y values' },
				{ id: 'b', text: '64% of the variation in Y is accounted for by X', isCorrect: true },
				{ id: 'c', text: 'X causes 64% of Y' },
				{ id: 'd', text: '64% of the data points lie on the regression line' }
			],
			explanation: 'r² = 0.64 means 64% of the variance in Y can be "explained" (predicted) by knowing X. The remaining 36% is unexplained variance from other factors or noise.',
			difficulty: 'medium'
		},
		{
			id: 'corr-9',
			type: 'multiple-choice',
			question: 'You have data with one extreme outlier that follows the general trend but is far from other points. Removing it would:',
			choices: [
				{ id: 'a', text: 'Decrease |r| because the outlier supports the trend' },
				{ id: 'b', text: 'Increase |r| because the outlier is far from the regression line' },
				{ id: 'c', text: 'Decrease |r| because outliers that follow the trend can inflate r', isCorrect: true },
				{ id: 'd', text: 'Have no effect on r' }
			],
			explanation: 'An outlier along the trend line can artificially inflate r by extending the range. This is exactly what happens in Anscombe\'s Set 4—one extreme point creates a seemingly strong correlation.',
			difficulty: 'hard',
			hint: 'Think about Anscombe\'s Quartet Set 4'
		},
		{
			id: 'corr-10',
			type: 'true-false',
			question: 'If r = 0.8 between X and Y, then r = 0.8 between Y and X as well.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! Correlation is symmetric—r(X,Y) = r(Y,X). This is different from regression, where the slope of Y on X differs from the slope of X on Y.',
			difficulty: 'easy'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/4-relationships" class="hover:text-amber-600">Module 4</a>
			<span class="mx-2">/</span>
			<span>Correlation</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Correlation Explorer</h1>
		<p class="text-lg text-gray-600">
			Explore how correlation measures the strength and direction of linear relationships.
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-8 border border-amber-200">
		<h2 class="text-xl font-semibold text-amber-900 mb-3">Why This Matters</h2>
		<p class="text-amber-800 mb-4">
			"Are taller people heavier?" "Do happier employees perform better?" "Is there a link between
			exercise and cholesterol?" These questions all ask about <strong>relationships between variables</strong>.
			Correlation is the fundamental tool for quantifying these relationships.
		</p>
		<p class="text-amber-800 mb-4">
			But correlation is also the source of one of the most abused claims in data analysis.
			Understanding what correlation can and cannot tell you is essential for being a critical
			consumer of research and data-driven claims.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-amber-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-amber-800 space-y-1">
				<li>• Calculate and interpret the correlation coefficient (r)</li>
				<li>• Understand what r² (coefficient of determination) means</li>
				<li>• Recognize why correlation does not imply causation</li>
				<li>• Know the limitations: non-linear relationships, outliers, restriction of range</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-amber-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-amber-900 mb-3">The Correlation Coefficient (r)</h2>
		<p class="text-amber-800 mb-4">
			Correlation (r) measures the <strong>strength</strong> and <strong>direction</strong> of a linear relationship between two variables.
		</p>
		<div class="bg-white rounded-lg p-4 mb-4">
			<MathDisplay formula={correlationFormula} displayMode={true} />
		</div>
		<div class="grid md:grid-cols-3 gap-4 text-center text-sm">
			<div class="p-3 bg-red-100 rounded-lg">
				<div class="font-bold text-red-700">r = -1</div>
				<div class="text-red-600">Perfect negative</div>
			</div>
			<div class="p-3 bg-gray-100 rounded-lg">
				<div class="font-bold text-gray-700">r = 0</div>
				<div class="text-gray-600">No linear relationship</div>
			</div>
			<div class="p-3 bg-green-100 rounded-lg">
				<div class="font-bold text-green-700">r = +1</div>
				<div class="text-green-600">Perfect positive</div>
			</div>
		</div>
	</section>

	<!-- Interactive Scatter Plot -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Scatter Plot</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-600 mb-4">
				Click anywhere on the plot to add points. Right-click a point to remove it.
			</p>

			<div class="flex flex-wrap gap-2 mb-4">
				{#each examplePatterns as pattern}
					<button
						class="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
						onclick={() => generateData(pattern.r)}
					>
						{pattern.name}
					</button>
				{/each}
				<button
					class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					onclick={clearPoints}
				>
					Clear All
				</button>
			</div>

			<div class="flex flex-col md:flex-row gap-6">
				<!-- Chart -->
				<svg {width} {height} class="border border-gray-200 rounded-lg cursor-crosshair" onclick={handleClick}>
					<g transform="translate({margin.left},{margin.top})">
						<!-- Grid -->
						{#each xScale.ticks(10) as tick}
							<line
								x1={xScale(tick)}
								x2={xScale(tick)}
								y1={0}
								y2={innerHeight}
								stroke="#f3f4f6"
								stroke-width="1"
							/>
						{/each}
						{#each yScale.ticks(10) as tick}
							<line
								x1={0}
								x2={innerWidth}
								y1={yScale(tick)}
								y2={yScale(tick)}
								stroke="#f3f4f6"
								stroke-width="1"
							/>
						{/each}

						<!-- Regression line -->
						{#if points.length >= 2}
							<line
								x1={xScale(0)}
								y1={yScale(regression.intercept)}
								x2={xScale(100)}
								y2={yScale(regression.slope * 100 + regression.intercept)}
								stroke="#f59e0b"
								stroke-width="2"
								stroke-dasharray="5,5"
							/>
						{/if}

						<!-- Points -->
						{#each points as point}
							<circle
								cx={xScale(point.x)}
								cy={yScale(point.y)}
								r="6"
								fill="#3b82f6"
								stroke="white"
								stroke-width="2"
								class="cursor-pointer hover:fill-red-500 transition-colors"
								oncontextmenu={(e) => { e.preventDefault(); removePoint(point.id); }}
							/>
						{/each}

						<!-- X Axis -->
						<g transform="translate(0,{innerHeight})">
							{#each xScale.ticks(10) as tick}
								<g transform="translate({xScale(tick)},0)">
									<line y2="6" stroke="#9ca3af" />
									<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
								</g>
							{/each}
							<text x={innerWidth / 2} y="35" text-anchor="middle" fill="#374151" font-size="11">X</text>
						</g>

						<!-- Y Axis -->
						<g>
							{#each yScale.ticks(10) as tick}
								<g transform="translate(0,{yScale(tick)})">
									<line x2="-6" stroke="#9ca3af" />
									<text x="-10" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="10">{tick}</text>
								</g>
							{/each}
							<text transform="rotate(-90)" x={-innerHeight / 2} y="-35" text-anchor="middle" fill="#374151" font-size="11">Y</text>
						</g>
					</g>
				</svg>

				<!-- Stats panel -->
				<div class="flex-1 space-y-4">
					<div class="p-4 bg-gray-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">Correlation (r)</div>
						<div class="text-4xl font-bold {correlation > 0 ? 'text-green-600' : correlation < 0 ? 'text-red-600' : 'text-gray-600'}">
							{correlation.toFixed(3)}
						</div>
						<div class="text-sm text-gray-500 mt-1">
							{Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.4 ? 'Moderate' : Math.abs(correlation) > 0.2 ? 'Weak' : 'Very weak/None'}
							{correlation > 0.05 ? 'positive' : correlation < -0.05 ? 'negative' : ''}
						</div>
					</div>

					<div class="p-4 bg-gray-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">R² (variance explained)</div>
						<div class="text-2xl font-bold text-gray-700">
							{(rSquared * 100).toFixed(1)}%
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2 mt-2">
							<div
								class="bg-amber-500 h-2 rounded-full transition-all"
								style="width: {rSquared * 100}%"
							></div>
						</div>
					</div>

					<div class="p-4 bg-gray-50 rounded-lg">
						<div class="text-sm text-gray-600 mb-1">Points</div>
						<div class="text-2xl font-bold text-gray-700">{points.length}</div>
					</div>

					{#if points.length >= 2}
						<div class="p-4 bg-amber-50 rounded-lg text-sm">
							<div class="font-medium text-amber-900 mb-1">Regression Line</div>
							<div class="text-amber-700">
								ŷ = {regression.intercept.toFixed(2)} + {regression.slope.toFixed(3)}x
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Guess the Correlation Game -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Test Your Intuition</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			{#if !guessMode}
				<p class="text-gray-600 mb-4">
					Practice estimating correlations by looking at scatter plots.
				</p>
				<button
					class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
					onclick={startGuess}
				>
					Start Guessing Game
				</button>
			{:else}
				<p class="text-gray-700 mb-4">
					Look at the scatter plot above. What do you think the correlation is?
				</p>

				<div class="mb-4">
					<label class="text-sm text-gray-600">Your guess: {userGuess.toFixed(1)}</label>
					<input
						type="range"
						bind:value={userGuess}
						min="-1"
						max="1"
						step="0.1"
						class="w-full"
						disabled={showAnswer}
					/>
					<div class="flex justify-between text-xs text-gray-400">
						<span>-1.0</span>
						<span>0</span>
						<span>+1.0</span>
					</div>
				</div>

				{#if !showAnswer}
					<button
						class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
						onclick={checkGuess}
					>
						Check My Guess
					</button>
				{:else}
					<div class="p-4 rounded-lg {Math.abs(userGuess - targetCorrelation) < 0.2 ? 'bg-green-50' : 'bg-amber-50'}">
						<div class="font-medium {Math.abs(userGuess - targetCorrelation) < 0.2 ? 'text-green-900' : 'text-amber-900'}">
							{Math.abs(userGuess - targetCorrelation) < 0.1 ? 'Excellent!' :
							 Math.abs(userGuess - targetCorrelation) < 0.2 ? 'Good job!' :
							 Math.abs(userGuess - targetCorrelation) < 0.3 ? 'Close!' : 'Keep practicing!'}
						</div>
						<div class="text-sm text-gray-600 mt-1">
							Actual r = {targetCorrelation.toFixed(1)} | Your guess = {userGuess.toFixed(1)} |
							Off by {Math.abs(userGuess - targetCorrelation).toFixed(1)}
						</div>
					</div>
					<button
						class="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
						onclick={startGuess}
					>
						Try Another
					</button>
				{/if}
			{/if}
		</div>
	</section>

	<!-- Correlation ≠ Causation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Correlation ≠ Causation</h2>

		<div class="bg-red-50 rounded-xl border border-red-200 p-6">
			<h3 class="font-semibold text-red-900 mb-3">The Most Important Warning in Statistics</h3>
			<p class="text-red-800 mb-4">
				Just because two variables are correlated does NOT mean one causes the other.
			</p>

			<div class="grid md:grid-cols-3 gap-4">
				<div class="bg-white rounded-lg p-4">
					<h4 class="font-medium text-gray-900 mb-2">Confounding</h4>
					<p class="text-sm text-gray-600">
						A third variable causes both.
					</p>
					<p class="text-xs text-gray-500 mt-2 italic">
						Ice cream sales & drowning both caused by summer weather
					</p>
				</div>
				<div class="bg-white rounded-lg p-4">
					<h4 class="font-medium text-gray-900 mb-2">Reverse Causation</h4>
					<p class="text-sm text-gray-600">
						The effect might cause the presumed cause.
					</p>
					<p class="text-xs text-gray-500 mt-2 italic">
						Do firefighters cause fires, or do fires cause firefighters to appear?
					</p>
				</div>
				<div class="bg-white rounded-lg p-4">
					<h4 class="font-medium text-gray-900 mb-2">Coincidence</h4>
					<p class="text-sm text-gray-600">
						With enough variables, spurious correlations appear.
					</p>
					<p class="text-xs text-gray-500 mt-2 italic">
						Nicolas Cage films correlate with pool drownings (r = 0.67!)
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Always Visualize -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Always Visualize Your Data</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				<strong>Anscombe's Quartet:</strong> Four datasets with nearly identical statistics (mean, variance, correlation, regression line) but very different patterns.
			</p>

			<div class="grid md:grid-cols-4 gap-4">
				{#each Object.entries(anscombeData) as [name, data], i}
					{@const r = calculateCorrelation(data)}
					<div class="text-center">
						<svg width="150" height="150" class="mx-auto border border-gray-100 rounded">
							<g transform="translate(25,10)">
								{#each data as point}
									<circle
										cx={(point.x - 2) * 10}
										cy={120 - (point.y - 2) * 10}
										r="4"
										fill="#3b82f6"
									/>
								{/each}
							</g>
						</svg>
						<div class="text-sm text-gray-600 mt-1">Set {i + 1}: r = {r.toFixed(2)}</div>
					</div>
				{/each}
			</div>

			<div class="mt-4 p-4 bg-amber-50 rounded-lg text-sm text-amber-800">
				<strong>Lesson:</strong> All four datasets have r ≈ 0.82, but only Set 1 shows a genuine linear relationship.
				The others have outliers (Set 3), non-linear patterns (Set 2), or are driven by a single extreme point (Set 4).
				<strong>Always plot your data!</strong>
			</div>
		</div>
	</section>

	<!-- Interpreting R² -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding R²</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="mb-4">
				<MathDisplay formula={rSquaredFormula} displayMode={true} />
			</div>

			<p class="text-gray-700 mb-4">
				R² tells you what proportion of the variance in Y is "explained" by X.
			</p>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="py-2 px-4 text-left font-medium text-gray-700">r</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">R²</th>
							<th class="py-2 px-4 text-left font-medium text-gray-700">Interpretation</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						<tr>
							<td class="py-2 px-4">±0.9</td>
							<td class="py-2 px-4">81%</td>
							<td class="py-2 px-4">X explains most of Y's variance</td>
						</tr>
						<tr>
							<td class="py-2 px-4">±0.7</td>
							<td class="py-2 px-4">49%</td>
							<td class="py-2 px-4">X explains about half of Y's variance</td>
						</tr>
						<tr>
							<td class="py-2 px-4">±0.5</td>
							<td class="py-2 px-4">25%</td>
							<td class="py-2 px-4">X explains a quarter of Y's variance</td>
						</tr>
						<tr>
							<td class="py-2 px-4">±0.3</td>
							<td class="py-2 px-4">9%</td>
							<td class="py-2 px-4">X explains little of Y's variance</td>
						</tr>
					</tbody>
				</table>
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
	<section class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8 border border-green-200">
		<h2 class="text-xl font-semibold text-green-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
					<p class="text-green-800 text-sm"><strong>r measures linear strength and direction</strong> — ranges from -1 (perfect negative) through 0 (no linear relationship) to +1 (perfect positive).</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
					<p class="text-green-800 text-sm"><strong>r² is the variance explained</strong> — the proportion of Y's variability that can be predicted from X.</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
					<p class="text-green-800 text-sm"><strong>Correlation ≠ causation</strong> — even strong correlations can arise from confounding, reverse causation, or coincidence.</p>
				</div>
			</div>
			<div class="space-y-3">
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
					<p class="text-green-800 text-sm"><strong>Always visualize</strong> — Anscombe's Quartet shows how different patterns can produce identical correlations.</p>
				</div>
				<div class="flex items-start gap-3">
					<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</div>
					<p class="text-green-800 text-sm"><strong>Watch for artifacts</strong> — outliers, restriction of range, and non-linear relationships can all distort r.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="bg-amber-50 rounded-xl p-6 mb-8 border border-amber-200">
		<h2 class="text-xl font-semibold text-amber-900 mb-3">What's Next?</h2>
		<p class="text-amber-800 mb-3">
			Correlation tells us relationships exist, but <strong>regression</strong> takes it further—it lets us make predictions.
			Next, we'll learn how to build predictive models using simple linear regression.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-medium text-amber-900 mb-2">Preview: Simple Regression</h3>
			<ul class="text-sm text-amber-700 space-y-1">
				<li>• The regression equation: ŷ = b₀ + b₁x</li>
				<li>• Least squares estimation—minimizing prediction error</li>
				<li>• Interpreting slope and intercept in context</li>
			</ul>
		</div>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/4-relationships" class="text-gray-600 hover:text-gray-900">
			← Module Overview
		</a>
		<a href="/modules/4-relationships/regression" class="text-amber-600 hover:text-amber-700 font-medium">
			Next: Simple Regression →
		</a>
	</div>
</div>
