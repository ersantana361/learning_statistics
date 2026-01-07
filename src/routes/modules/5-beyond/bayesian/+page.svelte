<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// LaTeX formulas
	const bayesFormula = String.raw`P(\theta|D) = \frac{P(D|\theta) \cdot P(\theta)}{P(D)}`;
	const posteriorFormula = String.raw`\text{Posterior} \propto \text{Likelihood} \times \text{Prior}`;

	// Beta distribution PDF
	function betaPDF(x: number, alpha: number, beta: number): number {
		if (x <= 0 || x >= 1) return 0;
		const B = (gammaLn(alpha) + gammaLn(beta) - gammaLn(alpha + beta));
		return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - B);
	}

	// Log gamma function (Stirling approximation for larger values)
	function gammaLn(z: number): number {
		if (z < 0.5) {
			return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
		}
		z -= 1;
		const g = 7;
		const c = [
			0.99999999999980993,
			676.5203681218851,
			-1259.1392167224028,
			771.32342877765313,
			-176.61502916214059,
			12.507343278686905,
			-0.13857109526572012,
			9.9843695780195716e-6,
			1.5056327351493116e-7
		];
		let x = c[0];
		for (let i = 1; i < g + 2; i++) {
			x += c[i] / (z + i);
		}
		const t = z + g + 0.5;
		return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
	}

	// State
	let priorAlpha = $state(2);
	let priorBeta = $state(2);
	let successes = $state(7);
	let trials = $state(10);

	// Derived values
	const failures = $derived(trials - successes);
	const posteriorAlpha = $derived(priorAlpha + successes);
	const posteriorBeta = $derived(priorBeta + failures);
	const priorMean = $derived(priorAlpha / (priorAlpha + priorBeta));
	const posteriorMean = $derived(posteriorAlpha / (posteriorAlpha + posteriorBeta));
	const mle = $derived(successes / trials);

	// Generate distribution curves
	const priorCurve = $derived(() => {
		const points: { x: number; y: number }[] = [];
		for (let i = 1; i < 100; i++) {
			const x = i / 100;
			points.push({ x, y: betaPDF(x, priorAlpha, priorBeta) });
		}
		return points;
	});

	const posteriorCurve = $derived(() => {
		const points: { x: number; y: number }[] = [];
		for (let i = 1; i < 100; i++) {
			const x = i / 100;
			points.push({ x, y: betaPDF(x, posteriorAlpha, posteriorBeta) });
		}
		return points;
	});

	const likelihoodCurve = $derived(() => {
		const points: { x: number; y: number }[] = [];
		for (let i = 1; i < 100; i++) {
			const x = i / 100;
			// Binomial likelihood (unnormalized)
			const likelihood = Math.pow(x, successes) * Math.pow(1 - x, failures);
			points.push({ x, y: likelihood });
		}
		// Normalize for display
		const maxY = Math.max(...points.map(p => p.y));
		return points.map(p => ({ x: p.x, y: maxY > 0 ? (p.y / maxY) * 3 : 0 }));
	});

	// SVG dimensions
	const width = 500;
	const height = 300;
	const margin = { top: 20, right: 30, bottom: 40, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scales
	const xScale = $derived(d3.scaleLinear().domain([0, 1]).range([0, innerWidth]));
	const yScale = $derived(() => {
		const allY = [...priorCurve(), ...posteriorCurve()].map(p => p.y);
		const maxY = Math.max(...allY, 0.1);
		return d3.scaleLinear().domain([0, maxY * 1.1]).range([innerHeight, 0]);
	});

	// Path generators
	const priorPath = $derived(() => {
		const scale = yScale();
		const line = d3.line<{ x: number; y: number }>()
			.x(d => xScale(d.x))
			.y(d => scale(d.y))
			.curve(d3.curveMonotoneX);
		return line(priorCurve()) || '';
	});

	const posteriorPath = $derived(() => {
		const scale = yScale();
		const line = d3.line<{ x: number; y: number }>()
			.x(d => xScale(d.x))
			.y(d => scale(d.y))
			.curve(d3.curveMonotoneX);
		return line(posteriorCurve()) || '';
	});

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'bayes-1',
			type: 'multiple-choice',
			question: 'In Bayesian analysis, what does the prior represent?',
			choices: [
				{ id: 'a', text: 'The probability of the data' },
				{ id: 'b', text: 'Our beliefs before seeing the data', isCorrect: true },
				{ id: 'c', text: 'The result of the experiment' },
				{ id: 'd', text: 'The sample size' }
			],
			explanation: 'The prior represents our beliefs or knowledge about a parameter before observing any data. It encodes what we know (or assume) before the experiment.',
			difficulty: 'easy'
		},
		{
			id: 'bayes-2',
			type: 'multiple-choice',
			question: 'If you have a strong prior and observe a small amount of data, what will dominate the posterior?',
			choices: [
				{ id: 'a', text: 'The data (likelihood)' },
				{ id: 'b', text: 'The prior', isCorrect: true },
				{ id: 'c', text: 'Neither — they contribute equally' },
				{ id: 'd', text: 'The sample mean' }
			],
			explanation: 'With a strong prior and little data, the prior dominates. As more data is collected, the likelihood increasingly influences the posterior.',
			difficulty: 'medium'
		},
		{
			id: 'bayes-3',
			type: 'multiple-choice',
			question: 'A Beta(1,1) prior is often called "uninformative" because it represents:',
			choices: [
				{ id: 'a', text: 'Complete certainty that θ = 0.5' },
				{ id: 'b', text: 'A uniform distribution — all values equally likely', isCorrect: true },
				{ id: 'c', text: 'Strong belief in extreme values' },
				{ id: 'd', text: 'Zero prior knowledge about anything' }
			],
			explanation: 'Beta(1,1) is the uniform distribution on [0,1], treating all probability values as equally likely a priori.',
			difficulty: 'medium'
		},
		{
			id: 'bayes-4',
			type: 'multiple-choice',
			question: 'What is a key advantage of Bayesian inference over frequentist methods?',
			choices: [
				{ id: 'a', text: 'It always gives smaller p-values' },
				{ id: 'b', text: 'It never requires assumptions' },
				{ id: 'c', text: 'It provides probability statements about parameters', isCorrect: true },
				{ id: 'd', text: 'It needs less computational power' }
			],
			explanation: 'Bayesian inference gives direct probability statements about parameters (e.g., "There\'s a 95% probability θ is between 0.3 and 0.5").',
			difficulty: 'medium'
		},
		{
			id: 'bayes-5',
			type: 'numeric',
			question: 'You observe 8 successes in 10 trials. With a Beta(1,1) prior, the posterior is Beta(9,3). What is the posterior mean?',
			questionMath: String.raw`\text{Mean} = \frac{\alpha}{\alpha + \beta} = \frac{9}{9+3} = ?`,
			correctAnswer: 0.75,
			tolerance: 0.01,
			explanation: 'For Beta(α,β), mean = α/(α+β) = 9/12 = 0.75. This is pulled slightly toward 0.5 from the MLE of 0.8.',
			difficulty: 'medium'
		},
		{
			id: 'bayes-6',
			type: 'multiple-choice',
			question: 'What is a 95% credible interval?',
			choices: [
				{ id: 'a', text: 'An interval that contains the parameter with 95% probability', isCorrect: true },
				{ id: 'b', text: 'An interval where 95% of repeated intervals contain the true value' },
				{ id: 'c', text: 'An interval containing 95% of the data' },
				{ id: 'd', text: 'The same as a 95% confidence interval' }
			],
			explanation: 'A credible interval directly states: "There\'s a 95% probability the parameter lies in this range." This is the interpretation people often incorrectly give to confidence intervals.',
			difficulty: 'medium'
		},
		{
			id: 'bayes-7',
			type: 'true-false',
			question: 'With enough data, the posterior will eventually be dominated by the likelihood regardless of the prior.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! As n → ∞, the likelihood overwhelms any proper prior. The posterior concentrates around the true parameter value. This is why Bayesian and frequentist methods often agree with large samples.',
			difficulty: 'medium'
		},
		{
			id: 'bayes-8',
			type: 'multiple-choice',
			question: 'A Bayes factor of 15 in favor of H₁ over H₀ means:',
			choices: [
				{ id: 'a', text: 'H₁ is 15% more likely than H₀' },
				{ id: 'b', text: 'The data are 15 times more likely under H₁ than H₀', isCorrect: true },
				{ id: 'c', text: 'p-value = 1/15' },
				{ id: 'd', text: 'The effect size is 15' }
			],
			explanation: 'A Bayes factor is the ratio of likelihoods under two hypotheses. BF = 15 means the observed data are 15 times more probable if H₁ is true than if H₀ is true.',
			difficulty: 'hard'
		},
		{
			id: 'bayes-9',
			type: 'multiple-choice',
			question: 'What makes the Beta distribution "conjugate" to the Binomial likelihood?',
			choices: [
				{ id: 'a', text: 'They have the same shape' },
				{ id: 'b', text: 'The posterior is also a Beta distribution', isCorrect: true },
				{ id: 'c', text: 'They are both discrete' },
				{ id: 'd', text: 'They require the same sample size' }
			],
			explanation: 'Conjugacy means the posterior belongs to the same family as the prior. Beta prior + Binomial likelihood = Beta posterior. This makes computation simple.',
			difficulty: 'hard'
		},
		{
			id: 'bayes-10',
			type: 'true-false',
			question: 'A Bayesian analysis with an uninformative prior will always give the same answer as a frequentist analysis.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! While they often agree, differences can arise in small samples, with nuisance parameters, or depending on exactly which "uninformative" prior is chosen (there are many).',
			difficulty: 'hard'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<svelte:head>
	<title>Bayesian Thinking - Statistics Lab</title>
</svelte:head>

<div class="lesson-container">
	<nav class="breadcrumb">
		<a href="/">Home</a> &rsaquo;
		<a href="/modules/5-beyond">Beyond Basics</a> &rsaquo;
		<span>Bayesian Thinking</span>
	</nav>

	<header class="lesson-header">
		<h1>Bayesian Thinking</h1>
		<p class="subtitle">Updating beliefs with evidence using probability</p>
	</header>

	<section class="concept-highlight purple">
		<h2>Bayes' Theorem</h2>
		<MathDisplay math={bayesFormula} displayMode={true} />
		<p>
			<strong>Posterior</strong> (what we believe after data) equals the <strong>Likelihood</strong>
			(how probable the data is given our hypothesis) times the <strong>Prior</strong> (what we
			believed before), normalized by <strong>P(D)</strong> (total probability of the data).
		</p>
		<MathDisplay math={posteriorFormula} displayMode={true} />
	</section>

	<section class="interactive-section">
		<h2>Updating Beliefs: Coin Flip Example</h2>
		<p>
			Imagine estimating a coin's probability of landing heads (θ). Your <span class="prior-text">prior</span>
			represents your belief before flipping. After observing data, your belief updates to the
			<span class="posterior-text">posterior</span>.
		</p>

		<div class="demo-container">
			<div class="controls-panel">
				<h3>Prior Belief (Beta Distribution)</h3>
				<Slider
					label="Prior α (pseudo-successes)"
					bind:value={priorAlpha}
					min={0.5}
					max={10}
					step={0.5}
				/>
				<Slider
					label="Prior β (pseudo-failures)"
					bind:value={priorBeta}
					min={0.5}
					max={10}
					step={0.5}
				/>
				<p class="prior-interpretation">
					Prior mean: <strong>{priorMean.toFixed(3)}</strong>
					{#if priorAlpha === 1 && priorBeta === 1}
						<br><em>(Uninformative - all values equally likely)</em>
					{:else if priorAlpha === priorBeta}
						<br><em>(Symmetric around 0.5)</em>
					{:else if priorAlpha > priorBeta}
						<br><em>(Belief leans toward heads)</em>
					{:else}
						<br><em>(Belief leans toward tails)</em>
					{/if}
				</p>

				<h3>Observed Data</h3>
				<Slider
					label="Number of Trials"
					bind:value={trials}
					min={1}
					max={50}
					step={1}
				/>
				<Slider
					label="Number of Successes (Heads)"
					bind:value={successes}
					min={0}
					max={trials}
					step={1}
				/>
				<p class="data-summary">
					Observed: <strong>{successes}/{trials}</strong> heads
					<br>MLE (frequentist): <strong>{mle.toFixed(3)}</strong>
				</p>
			</div>

			<div class="visualization">
				<svg {width} {height}>
					<g transform="translate({margin.left},{margin.top})">
						<!-- X axis -->
						<g transform="translate(0,{innerHeight})">
							<line x1="0" y1="0" x2={innerWidth} y2="0" stroke="#333" />
							{#each [0, 0.25, 0.5, 0.75, 1] as tick}
								<g transform="translate({xScale(tick)},0)">
									<line y1="0" y2="5" stroke="#333" />
									<text y="20" text-anchor="middle" font-size="12">{tick}</text>
								</g>
							{/each}
							<text x={innerWidth / 2} y="35" text-anchor="middle" font-size="13">
								θ (Probability of Heads)
							</text>
						</g>

						<!-- Y axis -->
						<line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#333" />
						<text
							transform="rotate(-90)"
							x={-innerHeight / 2}
							y="-35"
							text-anchor="middle"
							font-size="13"
						>
							Density
						</text>

						<!-- Prior curve -->
						<path
							d={priorPath()}
							fill="none"
							stroke="#3b82f6"
							stroke-width="2.5"
							stroke-dasharray="8,4"
							opacity="0.8"
						/>

						<!-- Posterior curve -->
						<path
							d={posteriorPath()}
							fill="rgba(139, 92, 246, 0.2)"
							stroke="#8b5cf6"
							stroke-width="3"
						/>

						<!-- Prior mean line -->
						<line
							x1={xScale(priorMean)}
							y1={0}
							x2={xScale(priorMean)}
							y2={innerHeight}
							stroke="#3b82f6"
							stroke-width="1.5"
							stroke-dasharray="4,4"
							opacity="0.6"
						/>

						<!-- Posterior mean line -->
						<line
							x1={xScale(posteriorMean)}
							y1={0}
							x2={xScale(posteriorMean)}
							y2={innerHeight}
							stroke="#8b5cf6"
							stroke-width="2"
						/>

						<!-- MLE line -->
						<line
							x1={xScale(mle)}
							y1={0}
							x2={xScale(mle)}
							y2={innerHeight}
							stroke="#10b981"
							stroke-width="1.5"
							stroke-dasharray="2,2"
						/>

						<!-- Legend -->
						<g transform="translate({innerWidth - 140}, 10)">
							<line x1="0" y1="0" x2="25" y2="0" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="8,4" />
							<text x="30" y="4" font-size="11" fill="#3b82f6">Prior</text>

							<line x1="0" y1="18" x2="25" y2="18" stroke="#8b5cf6" stroke-width="3" />
							<text x="30" y="22" font-size="11" fill="#8b5cf6">Posterior</text>

							<line x1="0" y1="36" x2="25" y2="36" stroke="#10b981" stroke-width="1.5" stroke-dasharray="2,2" />
							<text x="30" y="40" font-size="11" fill="#10b981">MLE</text>
						</g>
					</g>
				</svg>

				<div class="results-summary">
					<div class="result-card prior-card">
						<h4>Prior</h4>
						<p>Beta({priorAlpha}, {priorBeta})</p>
						<p>Mean: {priorMean.toFixed(3)}</p>
					</div>
					<div class="result-card arrow">→</div>
					<div class="result-card data-card">
						<h4>+ Data</h4>
						<p>{successes} successes</p>
						<p>{failures} failures</p>
					</div>
					<div class="result-card arrow">→</div>
					<div class="result-card posterior-card">
						<h4>Posterior</h4>
						<p>Beta({posteriorAlpha}, {posteriorBeta})</p>
						<p>Mean: {posteriorMean.toFixed(3)}</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="content-section">
		<h2>Frequentist vs Bayesian</h2>

		<div class="comparison-table">
			<table>
				<thead>
					<tr>
						<th>Aspect</th>
						<th>Frequentist</th>
						<th>Bayesian</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><strong>Parameters</strong></td>
						<td>Fixed but unknown constants</td>
						<td>Random variables with distributions</td>
					</tr>
					<tr>
						<td><strong>Probability</strong></td>
						<td>Long-run frequency of events</td>
						<td>Degree of belief</td>
					</tr>
					<tr>
						<td><strong>Prior info</strong></td>
						<td>Not formally incorporated</td>
						<td>Explicitly included via prior</td>
					</tr>
					<tr>
						<td><strong>Result</strong></td>
						<td>P-values, confidence intervals</td>
						<td>Posterior distributions, credible intervals</td>
					</tr>
					<tr>
						<td><strong>Interpretation</strong></td>
						<td>"If we repeated this ∞ times..."</td>
						<td>"Given the data, there's 95% probability..."</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="content-section">
		<h2>Key Insights</h2>

		<div class="insight-grid">
			<div class="insight-card">
				<h3>Prior Strength Matters</h3>
				<p>
					A Beta(20,20) prior is much "stronger" than Beta(2,2) - it takes more data
					to shift away from the prior belief. Try it above!
				</p>
			</div>
			<div class="insight-card">
				<h3>Data Eventually Dominates</h3>
				<p>
					With enough data, even extreme priors are overwhelmed. The posterior
					concentrates around the true parameter value as n → ∞.
				</p>
			</div>
			<div class="insight-card">
				<h3>Credible ≠ Confidence</h3>
				<p>
					A 95% credible interval means "95% probability the parameter is in this range."
					A 95% confidence interval means "95% of such intervals contain the true value."
				</p>
			</div>
			<div class="insight-card">
				<h3>Conjugate Priors</h3>
				<p>
					Beta is conjugate to Binomial: combining them gives another Beta. This
					makes computation simple: just add α's and β's!
				</p>
			</div>
		</div>
	</section>

	<section class="content-section">
		<h2>When to Use Bayesian Methods</h2>

		<div class="use-cases">
			<div class="use-case good">
				<h4>Bayesian Shines When:</h4>
				<ul>
					<li>You have meaningful prior information</li>
					<li>Sample sizes are small</li>
					<li>You need probability statements about parameters</li>
					<li>Sequential updating is needed (data arrives over time)</li>
					<li>Decision-making requires posterior probabilities</li>
				</ul>
			</div>
			<div class="use-case caution">
				<h4>Consider Carefully:</h4>
				<ul>
					<li>Prior choice can influence results (be transparent)</li>
					<li>Computational demands can be high</li>
					<li>Communicating results to frequentist-trained audiences</li>
					<li>Regulatory/publication requirements may expect frequentist methods</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="exercises-section">
		<h2>Practice Exercises</h2>
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
	<section class="content-section" style="margin-top: 2rem;">
		<h2>Key Takeaways</h2>
		<div class="insight-grid">
			<div class="insight-card">
				<h3>1. Prior + Data = Posterior</h3>
				<p>Bayes' theorem mathematically combines your prior beliefs with observed data to produce updated beliefs.</p>
			</div>
			<div class="insight-card">
				<h3>2. Data Eventually Wins</h3>
				<p>With enough data, even extreme priors are overwhelmed. Large samples make Bayesian and frequentist results similar.</p>
			</div>
			<div class="insight-card">
				<h3>3. Direct Probability Statements</h3>
				<p>Credible intervals give "95% probability parameter is here"—the intuitive interpretation people want.</p>
			</div>
			<div class="insight-card">
				<h3>4. Prior Choice Matters</h3>
				<p>Be transparent about priors. Sensitivity analysis shows how results change with different priors.</p>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="use-cases" style="margin-top: 2rem; display: block;">
		<div class="use-case good" style="background: #f3e8ff; border-color: #8b5cf6;">
			<h4 style="color: #6b21a8;">What's Next?</h4>
			<p style="margin-bottom: 0.75rem; color: #555;">
				Our final lesson brings everything together: <strong>Choosing the Right Test</strong>.
				You'll learn a decision framework for selecting appropriate statistical methods.
			</p>
			<ul>
				<li>Decision trees for test selection</li>
				<li>Matching tests to data types and questions</li>
				<li>Common mistakes and how to avoid them</li>
			</ul>
		</div>
	</section>

	<nav class="lesson-nav">
		<a href="/modules/5-beyond/multiple-testing" class="prev">
			← Multiple Testing
		</a>
		<a href="/modules/5-beyond/test-selection" class="next">
			Choosing the Right Test →
		</a>
	</nav>
</div>

<style>
	.lesson-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.breadcrumb {
		font-size: 0.9rem;
		color: #666;
		margin-bottom: 1.5rem;
	}

	.breadcrumb a {
		color: #3b82f6;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		text-decoration: underline;
	}

	.lesson-header {
		margin-bottom: 2rem;
	}

	.lesson-header h1 {
		font-size: 2.2rem;
		margin-bottom: 0.5rem;
		color: #1a1a2e;
	}

	.subtitle {
		font-size: 1.2rem;
		color: #666;
	}

	.concept-highlight {
		padding: 1.5rem;
		border-radius: 12px;
		margin-bottom: 2rem;
	}

	.concept-highlight.purple {
		background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
		border-left: 4px solid #8b5cf6;
	}

	.concept-highlight h2 {
		margin-top: 0;
		color: #6b21a8;
	}

	.interactive-section {
		margin-bottom: 2.5rem;
	}

	.interactive-section h2 {
		color: #1a1a2e;
		margin-bottom: 1rem;
	}

	.prior-text {
		color: #3b82f6;
		font-weight: 600;
	}

	.posterior-text {
		color: #8b5cf6;
		font-weight: 600;
	}

	.demo-container {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 2rem;
		margin-top: 1.5rem;
	}

	.controls-panel {
		background: #f8fafc;
		padding: 1.5rem;
		border-radius: 12px;
	}

	.controls-panel h3 {
		font-size: 1rem;
		margin: 0 0 1rem 0;
		color: #374151;
	}

	.controls-panel h3:not(:first-child) {
		margin-top: 1.5rem;
	}

	.prior-interpretation,
	.data-summary {
		font-size: 0.9rem;
		color: #666;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: white;
		border-radius: 6px;
	}

	.visualization {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.visualization svg {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.results-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.result-card {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		text-align: center;
	}

	.result-card h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.85rem;
	}

	.result-card p {
		margin: 0.2rem 0;
		font-size: 0.8rem;
	}

	.prior-card {
		background: #dbeafe;
		border: 2px solid #3b82f6;
	}

	.prior-card h4 {
		color: #1d4ed8;
	}

	.data-card {
		background: #d1fae5;
		border: 2px solid #10b981;
	}

	.data-card h4 {
		color: #047857;
	}

	.posterior-card {
		background: #ede9fe;
		border: 2px solid #8b5cf6;
	}

	.posterior-card h4 {
		color: #6b21a8;
	}

	.arrow {
		font-size: 1.5rem;
		color: #666;
		background: none;
	}

	.content-section {
		margin-bottom: 2.5rem;
	}

	.content-section h2 {
		color: #1a1a2e;
		margin-bottom: 1rem;
	}

	.comparison-table {
		overflow-x: auto;
	}

	.comparison-table table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	.comparison-table th,
	.comparison-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.comparison-table th {
		background: #f3f4f6;
		font-weight: 600;
		color: #374151;
	}

	.comparison-table th:first-child {
		border-top-left-radius: 8px;
	}

	.comparison-table th:last-child {
		border-top-right-radius: 8px;
	}

	.comparison-table tr:hover {
		background: #f9fafb;
	}

	.insight-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.insight-card {
		background: #f8fafc;
		padding: 1.25rem;
		border-radius: 10px;
		border-left: 3px solid #8b5cf6;
	}

	.insight-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: #6b21a8;
	}

	.insight-card p {
		margin: 0;
		font-size: 0.9rem;
		color: #555;
		line-height: 1.5;
	}

	.use-cases {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.use-case {
		padding: 1.25rem;
		border-radius: 10px;
	}

	.use-case.good {
		background: #ecfdf5;
		border: 1px solid #10b981;
	}

	.use-case.good h4 {
		color: #047857;
	}

	.use-case.caution {
		background: #fefce8;
		border: 1px solid #eab308;
	}

	.use-case.caution h4 {
		color: #a16207;
	}

	.use-case h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
	}

	.use-case ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.use-case li {
		margin-bottom: 0.4rem;
		font-size: 0.9rem;
		color: #555;
	}

	.exercises-section {
		margin-top: 3rem;
	}

	.exercises-section h2 {
		margin-bottom: 1.5rem;
		color: #1a1a2e;
	}

	.lesson-nav {
		display: flex;
		justify-content: space-between;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.lesson-nav a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: #f3f4f6;
		color: #374151;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 500;
		transition: all 0.2s;
	}

	.lesson-nav a:hover {
		background: #e5e7eb;
	}

	.lesson-nav a.next {
		background: #8b5cf6;
		color: white;
	}

	.lesson-nav a.next:hover {
		background: #7c3aed;
	}

	@media (max-width: 768px) {
		.lesson-container {
			padding: 1rem;
		}

		.demo-container {
			grid-template-columns: 1fr;
		}

		.visualization svg {
			width: 100%;
			max-width: 500px;
		}

		.results-summary {
			gap: 0.25rem;
		}

		.result-card {
			padding: 0.5rem;
		}

		.arrow {
			font-size: 1rem;
		}
	}
</style>
