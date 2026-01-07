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
			question: "In Bayesian analysis, what does the prior represent?",
			options: [
				"The probability of the data",
				"Our beliefs before seeing the data",
				"The result of the experiment",
				"The sample size"
			],
			correctAnswer: 1,
			explanation: "The prior represents our beliefs or knowledge about a parameter before observing any data. It encodes what we know (or assume) before the experiment."
		},
		{
			question: "If you have a strong prior and observe a small amount of data, what will dominate the posterior?",
			options: [
				"The data (likelihood)",
				"The prior",
				"Neither - they contribute equally",
				"The sample mean"
			],
			correctAnswer: 1,
			explanation: "With a strong prior and little data, the prior dominates. As more data is collected, the likelihood increasingly influences the posterior, eventually overwhelming even strong priors."
		},
		{
			question: "A Beta(1,1) prior is often called 'uninformative' because it represents:",
			options: [
				"Complete certainty that θ = 0.5",
				"A uniform distribution - all values equally likely",
				"Strong belief in extreme values",
				"Zero prior knowledge about anything"
			],
			correctAnswer: 1,
			explanation: "Beta(1,1) is the uniform distribution on [0,1], treating all probability values as equally likely a priori. It's called 'uninformative' because it doesn't favor any particular value."
		},
		{
			question: "What is a key advantage of Bayesian inference over frequentist methods?",
			options: [
				"It always gives smaller p-values",
				"It never requires assumptions",
				"It provides probability statements about parameters",
				"It needs less computational power"
			],
			correctAnswer: 2,
			explanation: "Bayesian inference gives direct probability statements about parameters (e.g., 'There's a 95% probability θ is between 0.3 and 0.5'), while frequentist methods only describe long-run properties of procedures."
		},
		{
			question: "You observe 8 successes in 10 trials. With a Beta(1,1) prior, the posterior is Beta(9,3). What is the posterior mean?",
			type: "numeric",
			correctAnswer: 0.75,
			tolerance: 0.01,
			explanation: "For a Beta(α,β) distribution, the mean is α/(α+β) = 9/(9+3) = 9/12 = 0.75. This is slightly pulled toward 0.5 from the MLE of 0.8."
		}
	];
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
		{#each exercises as exercise, i}
			<ExerciseCard {exercise} index={i} />
		{/each}
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
