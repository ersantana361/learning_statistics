<script lang="ts">
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// Decision tree state
	let step = $state(0);
	let answers = $state<Record<number, string>>({});

	// Decision tree questions
	const questions = [
		{
			question: "What is your research goal?",
			options: [
				{ label: "Compare groups", value: "compare" },
				{ label: "Examine relationships", value: "relationship" },
				{ label: "Predict outcomes", value: "predict" }
			]
		},
		// Compare branch
		{
			question: "How many groups are you comparing?",
			condition: () => answers[0] === "compare",
			options: [
				{ label: "2 groups", value: "two" },
				{ label: "3+ groups", value: "multiple" }
			]
		},
		{
			question: "Are your observations paired/matched?",
			condition: () => answers[0] === "compare" && answers[1] === "two",
			options: [
				{ label: "Yes, paired", value: "paired" },
				{ label: "No, independent", value: "independent" }
			]
		},
		{
			question: "Is your data normally distributed (or n > 30)?",
			condition: () => answers[0] === "compare" && answers[1] === "two",
			options: [
				{ label: "Yes, approximately normal", value: "normal" },
				{ label: "No, skewed/ordinal", value: "nonnormal" }
			]
		},
		// Relationship branch
		{
			question: "What type of variables do you have?",
			condition: () => answers[0] === "relationship",
			options: [
				{ label: "Both continuous", value: "continuous" },
				{ label: "Both categorical", value: "categorical" },
				{ label: "Mixed (continuous & categorical)", value: "mixed" }
			]
		},
		{
			question: "Is the relationship expected to be linear?",
			condition: () => answers[0] === "relationship" && answers[4] === "continuous",
			options: [
				{ label: "Yes, linear", value: "linear" },
				{ label: "No, monotonic but not linear", value: "monotonic" }
			]
		},
		// Multiple groups branch
		{
			question: "Are your observations independent or repeated measures?",
			condition: () => answers[0] === "compare" && answers[1] === "multiple",
			options: [
				{ label: "Independent groups", value: "independent" },
				{ label: "Repeated measures", value: "repeated" }
			]
		}
	];

	// Get recommended test based on answers
	const recommendation = $derived(() => {
		const a = answers;

		// Compare → 2 groups → Paired → Normal
		if (a[0] === "compare" && a[1] === "two" && a[2] === "paired" && a[3] === "normal") {
			return {
				test: "Paired t-test",
				description: "Compares means of two related groups (e.g., before/after measurements on same subjects).",
				formula: String.raw`t = \frac{\bar{d}}{s_d / \sqrt{n}}`,
				assumptions: ["Differences are normally distributed", "Observations are paired"],
				alternative: "Wilcoxon signed-rank test (non-parametric)"
			};
		}

		// Compare → 2 groups → Paired → Non-normal
		if (a[0] === "compare" && a[1] === "two" && a[2] === "paired" && a[3] === "nonnormal") {
			return {
				test: "Wilcoxon Signed-Rank Test",
				description: "Non-parametric test for paired data. Compares medians when normality is violated.",
				formula: String.raw`W = \sum_{i=1}^{n} R_i \cdot \text{sign}(d_i)`,
				assumptions: ["Paired observations", "Symmetric distribution of differences"],
				alternative: "Paired t-test (if normality holds)"
			};
		}

		// Compare → 2 groups → Independent → Normal
		if (a[0] === "compare" && a[1] === "two" && a[2] === "independent" && a[3] === "normal") {
			return {
				test: "Independent Samples t-test",
				description: "Compares means of two independent groups.",
				formula: String.raw`t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{s_p^2(\frac{1}{n_1} + \frac{1}{n_2})}}`,
				assumptions: ["Normal distributions (or large n)", "Independent observations", "Equal variances (or use Welch's)"],
				alternative: "Mann-Whitney U test (non-parametric)"
			};
		}

		// Compare → 2 groups → Independent → Non-normal
		if (a[0] === "compare" && a[1] === "two" && a[2] === "independent" && a[3] === "nonnormal") {
			return {
				test: "Mann-Whitney U Test",
				description: "Non-parametric test comparing distributions of two independent groups.",
				formula: String.raw`U = n_1 n_2 + \frac{n_1(n_1+1)}{2} - R_1`,
				assumptions: ["Independent observations", "Similar distribution shapes"],
				alternative: "Independent t-test (if normality holds)"
			};
		}

		// Compare → 3+ groups → Independent
		if (a[0] === "compare" && a[1] === "multiple" && a[6] === "independent") {
			return {
				test: "One-Way ANOVA",
				description: "Compares means across 3+ independent groups.",
				formula: String.raw`F = \frac{MS_{between}}{MS_{within}}`,
				assumptions: ["Normal distributions", "Equal variances", "Independent observations"],
				alternative: "Kruskal-Wallis test (non-parametric)"
			};
		}

		// Compare → 3+ groups → Repeated
		if (a[0] === "compare" && a[1] === "multiple" && a[6] === "repeated") {
			return {
				test: "Repeated Measures ANOVA",
				description: "Compares means when same subjects measured multiple times.",
				formula: String.raw`F = \frac{MS_{treatment}}{MS_{error}}`,
				assumptions: ["Sphericity (equal variances of differences)", "Normal distributions"],
				alternative: "Friedman test (non-parametric)"
			};
		}

		// Relationship → Continuous → Linear
		if (a[0] === "relationship" && a[4] === "continuous" && a[5] === "linear") {
			return {
				test: "Pearson Correlation",
				description: "Measures linear relationship strength between two continuous variables.",
				formula: String.raw`r = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \sum(y_i - \bar{y})^2}}`,
				assumptions: ["Linear relationship", "Bivariate normality", "No outliers"],
				alternative: "Spearman correlation (rank-based)"
			};
		}

		// Relationship → Continuous → Monotonic
		if (a[0] === "relationship" && a[4] === "continuous" && a[5] === "monotonic") {
			return {
				test: "Spearman Correlation",
				description: "Measures monotonic relationship using ranks. Robust to outliers.",
				formula: String.raw`\rho = 1 - \frac{6\sum d_i^2}{n(n^2-1)}`,
				assumptions: ["Monotonic relationship", "Ordinal or continuous data"],
				alternative: "Kendall's tau (another rank-based measure)"
			};
		}

		// Relationship → Categorical
		if (a[0] === "relationship" && a[4] === "categorical") {
			return {
				test: "Chi-Square Test of Independence",
				description: "Tests whether two categorical variables are associated.",
				formula: String.raw`\chi^2 = \sum \frac{(O - E)^2}{E}`,
				assumptions: ["Expected counts ≥ 5", "Independent observations"],
				alternative: "Fisher's exact test (small samples)"
			};
		}

		// Relationship → Mixed
		if (a[0] === "relationship" && a[4] === "mixed") {
			return {
				test: "Point-Biserial Correlation / ANOVA",
				description: "For binary categorical + continuous: point-biserial. For multiple categories: one-way ANOVA.",
				formula: String.raw`r_{pb} = \frac{M_1 - M_0}{s_y}\sqrt{\frac{n_1 n_0}{n^2}}`,
				assumptions: ["Depends on specific test chosen"],
				alternative: "Logistic regression (predict categorical from continuous)"
			};
		}

		// Predict
		if (a[0] === "predict") {
			return {
				test: "Regression Analysis",
				description: "Use linear regression for continuous outcomes, logistic for binary outcomes.",
				formula: String.raw`\hat{y} = \beta_0 + \beta_1 x_1 + ... + \beta_k x_k`,
				assumptions: ["Linearity", "Independence", "Normality of residuals", "Equal variance"],
				alternative: "Machine learning methods for complex relationships"
			};
		}

		return null;
	});

	// Get current question
	const currentQuestion = $derived(() => {
		for (let i = step; i < questions.length; i++) {
			const q = questions[i];
			if (!q.condition || q.condition()) {
				return { ...q, index: i };
			}
		}
		return null;
	});

	// Check if we have a recommendation
	const isComplete = $derived(recommendation() !== null && currentQuestion() === null);

	function selectOption(questionIndex: number, value: string) {
		answers[questionIndex] = value;
		step = questionIndex + 1;
	}

	function reset() {
		step = 0;
		answers = {};
	}

	// Test selection guide data
	const testGuide = [
		{
			category: "Comparing 2 Groups",
			tests: [
				{ name: "Independent t-test", use: "Compare means, independent samples, normal data" },
				{ name: "Paired t-test", use: "Compare means, paired/matched samples" },
				{ name: "Mann-Whitney U", use: "Compare distributions, non-normal data" },
				{ name: "Wilcoxon signed-rank", use: "Paired data, non-normal" }
			]
		},
		{
			category: "Comparing 3+ Groups",
			tests: [
				{ name: "One-way ANOVA", use: "Compare means across groups" },
				{ name: "Repeated measures ANOVA", use: "Same subjects, multiple conditions" },
				{ name: "Kruskal-Wallis", use: "Non-parametric alternative to ANOVA" },
				{ name: "Friedman test", use: "Non-parametric repeated measures" }
			]
		},
		{
			category: "Relationships",
			tests: [
				{ name: "Pearson correlation", use: "Linear relationship, continuous variables" },
				{ name: "Spearman correlation", use: "Monotonic relationship, ordinal/ranked" },
				{ name: "Chi-square test", use: "Association between categorical variables" },
				{ name: "Simple regression", use: "Predict outcome from one predictor" }
			]
		}
	];

	// Exercises
	const exercises: Exercise[] = [
		{
			question: "A researcher measures blood pressure before and after taking a medication for 30 patients. Which test is most appropriate?",
			options: [
				"Independent samples t-test",
				"Paired t-test",
				"One-way ANOVA",
				"Chi-square test"
			],
			correctAnswer: 1,
			explanation: "This is paired data - the same patients measured at two time points. Use a paired t-test to compare the means of the differences."
		},
		{
			question: "You want to know if there's a relationship between years of education and annual income. Both variables are continuous but income is heavily right-skewed. What test should you use?",
			options: [
				"Pearson correlation",
				"Spearman correlation",
				"Chi-square test",
				"Independent t-test"
			],
			correctAnswer: 1,
			explanation: "Spearman correlation is appropriate because it's robust to skewness and outliers. It measures monotonic (not necessarily linear) relationships using ranks."
		},
		{
			question: "A study compares test scores among students taught by 4 different methods, with different students in each group. Which test applies?",
			options: [
				"Paired t-test",
				"Repeated measures ANOVA",
				"One-way ANOVA",
				"Pearson correlation"
			],
			correctAnswer: 2,
			explanation: "One-way ANOVA compares means across 3+ independent groups. Since different students are in each group (independent samples) and there are 4 groups, this is the correct choice."
		},
		{
			question: "A survey asks 500 people their political party (Democrat, Republican, Independent) and whether they support a policy (Yes/No). What test examines if party affiliation and policy support are related?",
			options: [
				"Two-sample t-test",
				"Pearson correlation",
				"Chi-square test of independence",
				"One-way ANOVA"
			],
			correctAnswer: 2,
			explanation: "Both variables are categorical (party = 3 categories, support = 2 categories). Chi-square test of independence tests whether these categorical variables are associated."
		},
		{
			question: "Which is NOT an assumption of the independent samples t-test?",
			options: [
				"Normal distributions (or large sample size)",
				"Independent observations",
				"Equal sample sizes in both groups",
				"Similar variances (or use Welch's correction)"
			],
			correctAnswer: 2,
			explanation: "Equal sample sizes are NOT required for the t-test. The test works with unequal n's. The key assumptions are normality (or n>30), independence, and equal variances (though Welch's t-test relaxes this)."
		}
	];
</script>

<svelte:head>
	<title>Choosing the Right Test - Statistics Lab</title>
</svelte:head>

<div class="lesson-container">
	<nav class="breadcrumb">
		<a href="/">Home</a> &rsaquo;
		<a href="/modules/5-beyond">Beyond Basics</a> &rsaquo;
		<span>Choosing the Right Test</span>
	</nav>

	<header class="lesson-header">
		<h1>Choosing the Right Test</h1>
		<p class="subtitle">A decision guide for selecting appropriate statistical tests</p>
	</header>

	<section class="concept-highlight teal">
		<h2>The Key Questions</h2>
		<p>
			Selecting the right statistical test depends on answering a few key questions about your data:
		</p>
		<ul class="key-questions">
			<li><strong>Goal:</strong> Compare groups? Examine relationships? Make predictions?</li>
			<li><strong>Data type:</strong> Continuous? Categorical? Ordinal?</li>
			<li><strong>Number of groups:</strong> Two groups? Three or more?</li>
			<li><strong>Paired or independent:</strong> Same subjects measured twice? Different subjects?</li>
			<li><strong>Assumptions met:</strong> Normal distribution? Equal variances?</li>
		</ul>
	</section>

	<section class="interactive-section">
		<h2>Interactive Test Selector</h2>
		<p>Answer the questions below to find the appropriate statistical test for your analysis.</p>

		<div class="decision-tree">
			{#if !isComplete}
				{#if currentQuestion()}
					<div class="question-card">
						<h3>{currentQuestion()?.question}</h3>
						<div class="options">
							{#each currentQuestion()?.options || [] as option}
								<button
									class="option-btn"
									onclick={() => selectOption(currentQuestion()?.index ?? 0, option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if step > 0}
					<div class="path-summary">
						<h4>Your selections:</h4>
						<div class="path-items">
							{#each Object.entries(answers) as [qIndex, answer]}
								{@const q = questions[parseInt(qIndex)]}
								{@const selectedOption = q.options.find(o => o.value === answer)}
								{#if selectedOption}
									<span class="path-item">{selectedOption.label}</span>
									<span class="path-arrow">→</span>
								{/if}
							{/each}
						</div>
						<button class="reset-btn" onclick={reset}>Start Over</button>
					</div>
				{/if}
			{:else}
				<div class="recommendation-card">
					<div class="recommendation-header">
						<h3>Recommended Test</h3>
						<button class="reset-btn" onclick={reset}>Start Over</button>
					</div>

					<div class="test-name">{recommendation()?.test}</div>
					<p class="test-description">{recommendation()?.description}</p>

					{#if recommendation()?.formula}
						<div class="formula-box">
							<MathDisplay math={recommendation()?.formula || ''} displayMode={true} />
						</div>
					{/if}

					<div class="assumptions-box">
						<h4>Key Assumptions</h4>
						<ul>
							{#each recommendation()?.assumptions || [] as assumption}
								<li>{assumption}</li>
							{/each}
						</ul>
					</div>

					<div class="alternative-box">
						<strong>Alternative:</strong> {recommendation()?.alternative}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="content-section">
		<h2>Quick Reference Guide</h2>

		<div class="guide-grid">
			{#each testGuide as category}
				<div class="guide-card">
					<h3>{category.category}</h3>
					<table>
						<thead>
							<tr>
								<th>Test</th>
								<th>When to Use</th>
							</tr>
						</thead>
						<tbody>
							{#each category.tests as test}
								<tr>
									<td><strong>{test.name}</strong></td>
									<td>{test.use}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</div>
	</section>

	<section class="content-section">
		<h2>Decision Flowchart</h2>

		<div class="flowchart">
			<div class="flow-row">
				<div class="flow-box start">What's your goal?</div>
			</div>

			<div class="flow-row branches">
				<div class="branch">
					<div class="flow-arrow">↓</div>
					<div class="flow-box">Compare Groups</div>
					<div class="flow-arrow">↓</div>
					<div class="sub-branch">
						<div class="flow-box small">2 groups</div>
						<div class="flow-arrow">↓</div>
						<div class="flow-box endpoint">
							Paired? → Paired t / Wilcoxon<br>
							Independent? → t-test / Mann-Whitney
						</div>
					</div>
					<div class="sub-branch">
						<div class="flow-box small">3+ groups</div>
						<div class="flow-arrow">↓</div>
						<div class="flow-box endpoint">
							Independent? → ANOVA / Kruskal-Wallis<br>
							Repeated? → RM-ANOVA / Friedman
						</div>
					</div>
				</div>

				<div class="branch">
					<div class="flow-arrow">↓</div>
					<div class="flow-box">Relationships</div>
					<div class="flow-arrow">↓</div>
					<div class="flow-box endpoint">
						Continuous → Pearson / Spearman<br>
						Categorical → Chi-square / Fisher's<br>
						Mixed → Point-biserial / ANOVA
					</div>
				</div>

				<div class="branch">
					<div class="flow-arrow">↓</div>
					<div class="flow-box">Prediction</div>
					<div class="flow-arrow">↓</div>
					<div class="flow-box endpoint">
						Continuous outcome → Linear regression<br>
						Binary outcome → Logistic regression<br>
						Multiple predictors → Multiple regression
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="content-section">
		<h2>Common Mistakes to Avoid</h2>

		<div class="mistakes-grid">
			<div class="mistake-card">
				<div class="mistake-icon">⚠️</div>
				<h4>Using t-test for 3+ groups</h4>
				<p>Multiple t-tests inflate Type I error. Use ANOVA instead, then post-hoc tests if needed.</p>
			</div>
			<div class="mistake-card">
				<div class="mistake-icon">⚠️</div>
				<h4>Ignoring paired structure</h4>
				<p>Using independent tests on paired data loses power and can give wrong conclusions.</p>
			</div>
			<div class="mistake-card">
				<div class="mistake-icon">⚠️</div>
				<h4>Parametric tests on ordinal data</h4>
				<p>Likert scales (1-5 ratings) are ordinal. Consider non-parametric alternatives.</p>
			</div>
			<div class="mistake-card">
				<div class="mistake-icon">⚠️</div>
				<h4>Correlation ≠ Causation</h4>
				<p>Correlation measures association, not cause-effect. Need experiments for causation.</p>
			</div>
		</div>
	</section>

	<section class="content-section">
		<h2>Parametric vs Non-Parametric</h2>

		<div class="comparison-box">
			<div class="compare-col parametric">
				<h3>Parametric Tests</h3>
				<ul>
					<li>Assume specific distribution (usually normal)</li>
					<li>More powerful when assumptions met</li>
					<li>Use means and variances</li>
					<li>Examples: t-test, ANOVA, Pearson r</li>
				</ul>
			</div>
			<div class="compare-col nonparametric">
				<h3>Non-Parametric Tests</h3>
				<ul>
					<li>Make fewer assumptions about distribution</li>
					<li>Use ranks instead of raw values</li>
					<li>Robust to outliers and skewness</li>
					<li>Examples: Mann-Whitney, Kruskal-Wallis, Spearman</li>
				</ul>
			</div>
		</div>

		<p class="tip">
			<strong>Rule of thumb:</strong> If n ≥ 30 per group and no extreme outliers, parametric
			tests are usually fine due to the Central Limit Theorem. For smaller samples or ordinal
			data, consider non-parametric alternatives.
		</p>
	</section>

	<section class="exercises-section">
		<h2>Practice Exercises</h2>
		{#each exercises as exercise, i}
			<ExerciseCard {exercise} index={i} />
		{/each}
	</section>

	<nav class="lesson-nav">
		<a href="/modules/5-beyond/bayesian" class="prev">
			← Bayesian Thinking
		</a>
		<a href="/" class="next">
			Back to Home →
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

	.concept-highlight.teal {
		background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
		border-left: 4px solid #14b8a6;
	}

	.concept-highlight h2 {
		margin-top: 0;
		color: #0f766e;
	}

	.key-questions {
		margin: 1rem 0 0 0;
		padding-left: 1.5rem;
	}

	.key-questions li {
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.interactive-section {
		margin-bottom: 2.5rem;
	}

	.interactive-section h2 {
		color: #1a1a2e;
		margin-bottom: 1rem;
	}

	.decision-tree {
		background: #f8fafc;
		padding: 2rem;
		border-radius: 12px;
		margin-top: 1rem;
	}

	.question-card {
		text-align: center;
	}

	.question-card h3 {
		margin: 0 0 1.5rem 0;
		color: #1a1a2e;
		font-size: 1.3rem;
	}

	.options {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.option-btn {
		padding: 1rem 2rem;
		font-size: 1rem;
		background: white;
		border: 2px solid #14b8a6;
		border-radius: 8px;
		color: #0f766e;
		cursor: pointer;
		transition: all 0.2s;
	}

	.option-btn:hover {
		background: #14b8a6;
		color: white;
	}

	.path-summary {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
	}

	.path-summary h4 {
		margin: 0 0 0.75rem 0;
		color: #666;
		font-size: 0.9rem;
	}

	.path-items {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.path-item {
		background: #14b8a6;
		color: white;
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		font-size: 0.9rem;
	}

	.path-arrow {
		color: #999;
	}

	.reset-btn {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		color: #374151;
		cursor: pointer;
	}

	.reset-btn:hover {
		background: #e5e7eb;
	}

	.recommendation-card {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		border: 2px solid #14b8a6;
	}

	.recommendation-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.recommendation-header h3 {
		margin: 0;
		color: #0f766e;
	}

	.test-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1a1a2e;
		margin-bottom: 0.5rem;
	}

	.test-description {
		color: #555;
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.formula-box {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.assumptions-box {
		background: #fef3c7;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.assumptions-box h4 {
		margin: 0 0 0.5rem 0;
		color: #92400e;
		font-size: 0.95rem;
	}

	.assumptions-box ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.assumptions-box li {
		font-size: 0.9rem;
		color: #78350f;
		margin-bottom: 0.25rem;
	}

	.alternative-box {
		background: #dbeafe;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		color: #1e40af;
	}

	.content-section {
		margin-bottom: 2.5rem;
	}

	.content-section h2 {
		color: #1a1a2e;
		margin-bottom: 1rem;
	}

	.guide-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.guide-card {
		background: #f8fafc;
		padding: 1.25rem;
		border-radius: 10px;
	}

	.guide-card h3 {
		margin: 0 0 1rem 0;
		color: #0f766e;
		font-size: 1.1rem;
	}

	.guide-card table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.guide-card th,
	.guide-card td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.guide-card th {
		font-weight: 600;
		color: #374151;
	}

	.flowchart {
		background: #f8fafc;
		padding: 2rem;
		border-radius: 12px;
		overflow-x: auto;
	}

	.flow-row {
		display: flex;
		justify-content: center;
	}

	.flow-row.branches {
		gap: 2rem;
		margin-top: 1rem;
	}

	.branch {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		max-width: 250px;
	}

	.sub-branch {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.5rem;
	}

	.flow-box {
		background: white;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		border: 2px solid #14b8a6;
		text-align: center;
		font-weight: 500;
	}

	.flow-box.start {
		background: #14b8a6;
		color: white;
		border-color: #14b8a6;
	}

	.flow-box.small {
		font-size: 0.85rem;
		padding: 0.5rem 1rem;
	}

	.flow-box.endpoint {
		background: #ecfdf5;
		font-size: 0.8rem;
		font-weight: normal;
		line-height: 1.5;
	}

	.flow-arrow {
		color: #14b8a6;
		font-size: 1.2rem;
		margin: 0.25rem 0;
	}

	.mistakes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.mistake-card {
		background: #fef2f2;
		padding: 1.25rem;
		border-radius: 10px;
		border-left: 3px solid #ef4444;
	}

	.mistake-icon {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.mistake-card h4 {
		margin: 0 0 0.5rem 0;
		color: #b91c1c;
		font-size: 0.95rem;
	}

	.mistake-card p {
		margin: 0;
		font-size: 0.85rem;
		color: #7f1d1d;
		line-height: 1.4;
	}

	.comparison-box {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 1rem;
	}

	.compare-col {
		padding: 1.25rem;
		border-radius: 10px;
	}

	.compare-col.parametric {
		background: #dbeafe;
		border: 1px solid #3b82f6;
	}

	.compare-col.parametric h3 {
		color: #1d4ed8;
	}

	.compare-col.nonparametric {
		background: #fce7f3;
		border: 1px solid #ec4899;
	}

	.compare-col.nonparametric h3 {
		color: #be185d;
	}

	.compare-col h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
	}

	.compare-col ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.compare-col li {
		margin-bottom: 0.4rem;
		font-size: 0.9rem;
		color: #374151;
	}

	.tip {
		background: #f0fdf4;
		padding: 1rem;
		border-radius: 8px;
		border-left: 3px solid #22c55e;
		font-size: 0.95rem;
		color: #166534;
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
		background: #14b8a6;
		color: white;
	}

	.lesson-nav a.next:hover {
		background: #0d9488;
	}

	@media (max-width: 768px) {
		.lesson-container {
			padding: 1rem;
		}

		.flow-row.branches {
			flex-direction: column;
			align-items: center;
		}

		.branch {
			max-width: 100%;
		}

		.options {
			flex-direction: column;
		}

		.option-btn {
			width: 100%;
		}
	}
</style>
