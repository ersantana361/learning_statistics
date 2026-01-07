<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { sample, normal, confidenceInterval } from '$lib/stats/distributions';

	// LaTeX formulas
	const seFormula = String.raw`SE = \frac{\sigma}{\sqrt{n}}`;
	const ciFormula = String.raw`\bar{X} \pm z_{\alpha/2} \times \frac{\sigma}{\sqrt{n}}`;
	const marginFormula = String.raw`\text{Margin of Error} = z_{\alpha/2} \times SE`;
	const nFormulaForWidth = String.raw`n = \left(\frac{z_{\alpha/2} \times \sigma}{E}\right)^2`;

	// Parameters
	let populationMean = $state(100);
	let populationSd = $state(15);
	let sampleSize = $state(25);
	let confidenceLevel = $state(95);

	// Derived values
	const zScore = $derived(normal.inv((1 + confidenceLevel / 100) / 2, 0, 1));
	const standardError = $derived(populationSd / Math.sqrt(sampleSize));
	const marginOfError = $derived(zScore * standardError);
	const ciWidth = $derived(2 * marginOfError);

	// Sample size comparisons for visualization
	const sampleSizes = [10, 25, 50, 100, 200, 400];

	const comparisons = $derived(
		sampleSizes.map(n => {
			const se = populationSd / Math.sqrt(n);
			const moe = zScore * se;
			return {
				n,
				se,
				moe,
				ciWidth: 2 * moe,
				lower: populationMean - moe,
				upper: populationMean + moe
			};
		})
	);

	// For the interactive sample demonstration
	let drawnSamples = $state<Array<{ n: number; mean: number; ci: [number, number] }>>([]);

	function drawSample() {
		const data = sample.normal(sampleSize, populationMean, populationSd);
		const mean = d3.mean(data) ?? populationMean;
		const se = populationSd / Math.sqrt(sampleSize);
		const moe = zScore * se;
		drawnSamples = [...drawnSamples.slice(-9), {
			n: sampleSize,
			mean,
			ci: [mean - moe, mean + moe] as [number, number]
		}];
	}

	function clearSamples() {
		drawnSamples = [];
	}

	// SVG dimensions
	const width = 500;
	const height = 280;
	const margin = { top: 30, right: 40, bottom: 40, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Scale for CI comparison chart
	const xScale = $derived(
		d3.scaleLinear()
			.domain([populationMean - 3 * populationSd / Math.sqrt(10), populationMean + 3 * populationSd / Math.sqrt(10)])
			.range([0, innerWidth])
	);

	const yScale = $derived(
		d3.scaleBand<number>()
			.domain(sampleSizes)
			.range([0, innerHeight])
			.padding(0.3)
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'size-1',
			type: 'multiple-choice',
			question: 'To cut the margin of error in half, you must:',
			choices: [
				{ id: 'a', text: 'Double the sample size' },
				{ id: 'b', text: 'Quadruple the sample size', isCorrect: true },
				{ id: 'c', text: 'Halve the sample size' },
				{ id: 'd', text: 'Increase confidence level' }
			],
			explanation: 'Because the margin of error is proportional to 1/√n, to cut it in half you need to multiply n by 4 (since √4 = 2).',
			explanationMath: String.raw`\text{If } ME = \frac{z\sigma}{\sqrt{n}}, \text{ then } \frac{ME}{2} = \frac{z\sigma}{\sqrt{4n}}`,
			difficulty: 'easy',
			hint: 'Remember that standard error uses the square root of n in the denominator.'
		},
		{
			id: 'size-2',
			type: 'numeric',
			question: 'A population has σ = 20. You want a 95% CI with margin of error = 4. What sample size do you need?',
			questionMath: String.raw`n = \left(\frac{1.96 \times 20}{4}\right)^2 = ?`,
			correctAnswer: 96.04,
			tolerance: 1,
			explanation: 'Using n = (zσ/E)² = (1.96 × 20 / 4)² = (9.8)² = 96.04. Round up to 97 in practice.',
			difficulty: 'medium',
			hint: 'Use z = 1.96 for 95% confidence'
		},
		{
			id: 'size-3',
			type: 'multiple-choice',
			question: 'Why does increasing sample size from 100 to 200 give less improvement than going from 25 to 50?',
			choices: [
				{ id: 'a', text: 'Larger samples have more measurement error' },
				{ id: 'b', text: 'The √n relationship causes diminishing returns', isCorrect: true },
				{ id: 'c', text: 'Statistical power decreases with large samples' },
				{ id: 'd', text: 'It doesn\'t — the improvement is the same' }
			],
			explanation: 'Going from 25 to 50 reduces SE by factor √2 ≈ 0.71. Going from 100 to 200 also reduces SE by √2, but since SE was already smaller, the absolute reduction is less.',
			difficulty: 'hard'
		},
		{
			id: 'size-4',
			type: 'multiple-choice',
			question: 'All else being equal, which increases the required sample size?',
			choices: [
				{ id: 'a', text: 'Higher population variability', isCorrect: true },
				{ id: 'b', text: 'Lower confidence level' },
				{ id: 'c', text: 'Accepting a larger margin of error' },
				{ id: 'd', text: 'Using a one-tailed test' }
			],
			explanation: 'Higher σ means more variability, requiring more data to achieve the same precision. Lower confidence and larger margins actually reduce required n.',
			explanationMath: String.raw`n = \left(\frac{z \times \sigma}{E}\right)^2 \text{ — larger } \sigma \text{ means larger } n`,
			difficulty: 'medium'
		},
		{
			id: 'size-5',
			type: 'true-false',
			question: 'Increasing sample size always makes the confidence interval narrower.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! More data always reduces the standard error (SE = σ/√n), which directly narrows the confidence interval. There\'s no upper limit where more data stops helping.',
			difficulty: 'easy'
		},
		{
			id: 'size-6',
			type: 'numeric',
			question: 'A researcher has n = 64 and gets a margin of error of 10. If they increase to n = 256, what will their new margin of error be?',
			correctAnswer: 5,
			tolerance: 0.1,
			explanation: 'n increased by factor 4 (64 → 256), so √n increased by factor 2. Since MOE ∝ 1/√n, MOE decreases by factor 2: 10/2 = 5.',
			difficulty: 'medium',
			hint: 'How does √n change when n quadruples?'
		},
		{
			id: 'size-7',
			type: 'multiple-choice',
			question: 'A clinical trial needs σ = 30, E = 5, and 99% confidence (z = 2.576). What sample size is required?',
			choices: [
				{ id: 'a', text: 'n ≈ 100' },
				{ id: 'b', text: 'n ≈ 150' },
				{ id: 'c', text: 'n ≈ 200' },
				{ id: 'd', text: 'n ≈ 239', isCorrect: true }
			],
			explanation: 'n = (2.576 × 30 / 5)² = (15.456)² ≈ 238.9. Round up to 239.',
			explanationMath: String.raw`n = \left(\frac{2.576 \times 30}{5}\right)^2 = 238.9 \approx 239`,
			difficulty: 'hard',
			hint: 'Apply the sample size formula with z = 2.576 for 99% confidence.'
		},
		{
			id: 'size-8',
			type: 'true-false',
			question: 'If a 95% CI gives MOE = 6, switching to 90% confidence (z = 1.645) would give MOE ≈ 5.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'MOE scales with z. If 95% gives MOE = 6 using z = 1.96, then 90% gives MOE = 6 × (1.645/1.96) ≈ 5.04.',
			explanationMath: String.raw`\text{New MOE} = 6 \times \frac{1.645}{1.96} \approx 5.04`,
			difficulty: 'hard'
		},
		{
			id: 'size-9',
			type: 'multiple-choice',
			question: 'A pilot study with n = 20 finds SD = 12. To estimate the required sample size for MOE = 2 at 95% confidence, you would calculate:',
			choices: [
				{ id: 'a', text: 'n = (1.96 × 12 / 2)² ≈ 139', isCorrect: true },
				{ id: 'b', text: 'n = (1.96 × 12 / 20)² ≈ 1.4' },
				{ id: 'c', text: 'n = (12 / 2)² = 36' },
				{ id: 'd', text: 'n = 20 × (12/2) = 120' }
			],
			explanation: 'Use the pilot SD as your estimate of σ in the formula n = (zσ/E)². The pilot n = 20 is not used in the calculation.',
			difficulty: 'medium',
			hint: 'The pilot study provides an estimate of σ, not a sample size to multiply.'
		},
		{
			id: 'size-10',
			type: 'multiple-choice',
			question: 'A survey company can afford n = 400. If σ = 20 and they use 95% confidence, their margin of error will be:',
			choices: [
				{ id: 'a', text: '±0.98' },
				{ id: 'b', text: '±1.96', isCorrect: true },
				{ id: 'c', text: '±3.92' },
				{ id: 'd', text: '±20' }
			],
			explanation: 'MOE = 1.96 × σ/√n = 1.96 × 20/√400 = 1.96 × 20/20 = 1.96',
			explanationMath: String.raw`\text{MOE} = 1.96 \times \frac{20}{\sqrt{400}} = 1.96 \times 1 = 1.96`,
			difficulty: 'medium'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/1-foundations" class="hover:text-blue-600">Module 1</a>
			<span class="mx-2">/</span>
			<span>Sample Size Effects</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Sample Size Effects</h1>
		<p class="text-lg text-gray-600">
			Discover how sample size affects precision and learn to determine the right sample size for your needs.
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-8 border border-amber-200">
		<h2 class="text-xl font-semibold text-amber-900 mb-3">Why This Matters</h2>
		<p class="text-amber-800 mb-4">
			"How many participants do I need?" is one of the most common questions in research. Too few subjects and
			your study lacks precision—your confidence intervals will be so wide they're meaningless. Too many and
			you've wasted resources that could have gone to other research. A pharmaceutical company running a drug
			trial might spend $10,000+ per participant; recruiting 500 people when 200 would suffice costs millions
			in unnecessary spending.
		</p>
		<p class="text-amber-800 mb-4">
			But here's the twist: doubling your sample size doesn't double your precision. The relationship follows
			a <strong>square root rule</strong>, creating diminishing returns. Understanding this relationship helps
			you make smart decisions about study design—balancing statistical precision against practical constraints
			like time, money, and participant availability.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-amber-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-amber-800 space-y-1">
				<li>• Understand the √n relationship between sample size and precision</li>
				<li>• Calculate required sample size for a desired margin of error</li>
				<li>• Recognize why diminishing returns make very large samples less cost-effective</li>
				<li>• Make informed decisions about sample size for research designs</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-amber-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-amber-900 mb-3">The Core Relationship</h2>
		<p class="text-amber-800 mb-4">
			Sample size affects precision through the <strong>square root</strong> relationship.
			This creates diminishing returns: doubling n doesn't double precision.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">Standard Error:</p>
				<MathDisplay formula={seFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Confidence Interval:</p>
				<MathDisplay formula={ciFormula} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Understanding the Concept Step by Step -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding Sample Size Step by Step</h2>

		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">The Square Root Relationship</h3>
						<p class="text-gray-700 mb-3">
							Standard error (SE) determines how precise your estimate is. The formula SE = σ/√n has a crucial
							implication: precision improves with the <em>square root</em> of sample size, not linearly.
						</p>
						<div class="bg-gray-50 rounded-lg p-4">
							<p class="text-sm text-gray-600 mb-2"><strong>What this means practically:</strong></p>
							<ul class="text-sm text-gray-600 space-y-1">
								<li>• n = 25 → SE = σ/5</li>
								<li>• n = 100 → SE = σ/10 (4× the sample, only 2× more precise)</li>
								<li>• n = 400 → SE = σ/20 (16× the sample, only 4× more precise)</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">From SE to Margin of Error</h3>
						<p class="text-gray-700 mb-3">
							The margin of error (MOE) equals the critical value times SE. For a 95% confidence interval,
							the critical z-value is 1.96, so MOE = 1.96 × SE.
						</p>
						<div class="bg-blue-50 rounded-lg p-4">
							<MathDisplay formula={marginFormula} displayMode={true} />
							<p class="text-sm text-blue-800 mt-2">
								<strong>In plain English:</strong> The margin of error is how far your sample estimate
								might reasonably be from the true value. Smaller MOE = more useful estimate.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">The 4× Rule</h3>
						<p class="text-gray-700 mb-3">
							Want to cut your margin of error in half? You need <strong>4 times</strong> the sample size.
							This is because MOE depends on 1/√n, so halving MOE requires √n to double, meaning n must quadruple.
						</p>
						<div class="grid grid-cols-2 gap-4">
							<div class="bg-green-50 rounded-lg p-3 text-center">
								<div class="text-green-800 text-sm">Halve the MOE</div>
								<div class="text-green-900 font-bold">Need 4× n</div>
							</div>
							<div class="bg-red-50 rounded-lg p-3 text-center">
								<div class="text-red-800 text-sm">Quarter the MOE</div>
								<div class="text-red-900 font-bold">Need 16× n</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Planning Sample Size in Advance</h3>
						<p class="text-gray-700 mb-3">
							Often you need to decide sample size <em>before</em> collecting data. Start with your desired
							precision (margin of error E), then solve for n:
						</p>
						<div class="bg-gray-50 rounded-lg p-4 mb-3">
							<MathDisplay formula={nFormulaForWidth} displayMode={true} />
						</div>
						<p class="text-sm text-gray-600">
							This formula requires knowing σ (population SD). In practice, use a pilot study estimate,
							published values from similar studies, or a conservative guess.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Worked Examples -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Worked Examples</h2>

		<div class="space-y-6">
			<!-- Example 1 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 1: Calculating Required Sample Size</h3>
				<div class="bg-blue-50 rounded-lg p-4 mb-4">
					<p class="text-blue-900">
						<strong>Problem:</strong> You're designing a study to estimate average blood pressure.
						From prior research, σ ≈ 15 mmHg. You want a 95% CI with margin of error no larger than 3 mmHg.
						How many participants do you need?
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Identify what you know:</p>
							<ul class="text-sm text-gray-600 ml-4">
								<li>• σ = 15 mmHg</li>
								<li>• Desired E = 3 mmHg</li>
								<li>• For 95% CI, z = 1.96</li>
							</ul>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700">Apply the sample size formula:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`n = \left(\frac{z \times \sigma}{E}\right)^2 = \left(\frac{1.96 \times 15}{3}\right)^2`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
						<div>
							<p class="text-gray-700">Calculate step by step:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`n = \left(\frac{29.4}{3}\right)^2 = (9.8)^2 = 96.04`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Answer: Round up to n = 97 participants.</p>
							<p class="text-sm text-gray-600">Always round up to ensure you meet or exceed your precision goal.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 2 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 2: Understanding Diminishing Returns</h3>
				<div class="bg-purple-50 rounded-lg p-4 mb-4">
					<p class="text-purple-900">
						<strong>Problem:</strong> A researcher has n = 100 participants and wants to reduce their
						margin of error from 4 to 2 units. How many additional participants are needed?
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Apply the 4× rule: halving MOE requires 4× the sample size</p>
							<p class="text-sm text-gray-600">Current n = 100, so required n = 4 × 100 = 400</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700">Calculate additional participants needed:</p>
							<p class="text-sm text-gray-600">400 - 100 = 300 additional participants</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Answer: 300 additional participants needed.</p>
							<p class="text-sm text-gray-600">
								This illustrates diminishing returns: the first 100 participants gave MOE = 4, but
								you need 300 more just to halve it to MOE = 2.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 3 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 3: Comparing CI Widths</h3>
				<div class="bg-amber-50 rounded-lg p-4 mb-4">
					<p class="text-amber-900">
						<strong>Problem:</strong> Two studies estimate average response time (σ = 200ms).
						Study A has n = 25, Study B has n = 100. Compare their 95% CI widths.
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Calculate SE for each study:</p>
							<div class="grid md:grid-cols-2 gap-3 mt-2">
								<div class="bg-gray-50 rounded p-2 text-sm">
									<p>Study A: SE = 200/√25 = 200/5 = 40ms</p>
								</div>
								<div class="bg-gray-50 rounded p-2 text-sm">
									<p>Study B: SE = 200/√100 = 200/10 = 20ms</p>
								</div>
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700">Calculate MOE (= 1.96 × SE) for each:</p>
							<div class="grid md:grid-cols-2 gap-3 mt-2">
								<div class="bg-gray-50 rounded p-2 text-sm">
									<p>Study A: MOE = 1.96 × 40 = 78.4ms</p>
								</div>
								<div class="bg-gray-50 rounded p-2 text-sm">
									<p>Study B: MOE = 1.96 × 20 = 39.2ms</p>
								</div>
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Study B's CI is half as wide despite 4× (not 2×) the participants.</p>
							<p class="text-sm text-gray-600">CI widths: A ≈ ±78ms vs B ≈ ±39ms</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Interactive Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">CI Width by Sample Size</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<!-- Controls -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<Slider
					label="Population Mean (μ)"
					bind:value={populationMean}
					min={50}
					max={150}
					step={5}
				/>
				<Slider
					label="Population SD (σ)"
					bind:value={populationSd}
					min={5}
					max={30}
					step={1}
				/>
				<Slider
					label="Confidence Level (%)"
					bind:value={confidenceLevel}
					min={80}
					max={99}
					step={1}
				/>
			</div>

			<!-- Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- Population mean line -->
					<line
						x1={xScale(populationMean)}
						x2={xScale(populationMean)}
						y1={0}
						y2={innerHeight}
						stroke="#10b981"
						stroke-width="2"
						stroke-dasharray="5,5"
					/>
					<text
						x={xScale(populationMean)}
						y={-10}
						text-anchor="middle"
						fill="#10b981"
						font-size="11"
						font-weight="500"
					>
						μ = {populationMean}
					</text>

					<!-- CI bars for each sample size -->
					{#each comparisons as comp}
						<g transform="translate(0,{yScale(comp.n)})">
							<!-- CI bar -->
							<rect
								x={xScale(comp.lower)}
								y={0}
								width={xScale(comp.upper) - xScale(comp.lower)}
								height={yScale.bandwidth()}
								fill="#3b82f6"
								fill-opacity="0.3"
								rx="3"
							/>
							<!-- Center mark -->
							<line
								x1={xScale(populationMean)}
								x2={xScale(populationMean)}
								y1={0}
								y2={yScale.bandwidth()}
								stroke="#3b82f6"
								stroke-width="2"
							/>
							<!-- Lower bound -->
							<line
								x1={xScale(comp.lower)}
								x2={xScale(comp.lower)}
								y1={0}
								y2={yScale.bandwidth()}
								stroke="#3b82f6"
								stroke-width="2"
							/>
							<!-- Upper bound -->
							<line
								x1={xScale(comp.upper)}
								x2={xScale(comp.upper)}
								y1={0}
								y2={yScale.bandwidth()}
								stroke="#3b82f6"
								stroke-width="2"
							/>
							<!-- Label -->
							<text
								x={-8}
								y={yScale.bandwidth() / 2}
								text-anchor="end"
								dominant-baseline="middle"
								fill="#374151"
								font-size="12"
								font-weight="500"
							>
								n = {comp.n}
							</text>
							<!-- Width label -->
							<text
								x={xScale(comp.upper) + 8}
								y={yScale.bandwidth() / 2}
								dominant-baseline="middle"
								fill="#6b7280"
								font-size="10"
							>
								±{comp.moe.toFixed(1)}
							</text>
						</g>
					{/each}

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(7) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
						<text x={innerWidth / 2} y="35" text-anchor="middle" fill="#374151" font-size="11">
							Value
						</text>
					</g>
				</g>
			</svg>

			<div class="mt-4 p-4 bg-blue-50 rounded-lg text-center">
				<p class="text-sm text-blue-800">
					Notice how the bars get narrower as n increases, but the improvement slows down.
					Going from n=10 to n=25 helps more than going from n=200 to n=400.
				</p>
			</div>
		</div>
	</section>

	<!-- Diminishing Returns Section -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">The Diminishing Returns Problem</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				Because SE depends on √n (not n), you need <strong>4x the sample size</strong> to cut
				the margin of error in half. This creates a practical limit on precision through sample size alone.
			</p>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="py-2 px-4 text-left font-medium text-gray-600">Sample Size</th>
							<th class="py-2 px-4 text-left font-medium text-gray-600">Standard Error</th>
							<th class="py-2 px-4 text-left font-medium text-gray-600">Margin of Error ({confidenceLevel}% CI)</th>
							<th class="py-2 px-4 text-left font-medium text-gray-600">Reduction from Previous</th>
						</tr>
					</thead>
					<tbody>
						{#each comparisons as comp, i}
							<tr class="border-b border-gray-100">
								<td class="py-2 px-4 font-medium">{comp.n}</td>
								<td class="py-2 px-4">{comp.se.toFixed(2)}</td>
								<td class="py-2 px-4">±{comp.moe.toFixed(2)}</td>
								<td class="py-2 px-4 text-green-600">
									{#if i > 0}
										-{((1 - comp.moe / comparisons[i-1].moe) * 100).toFixed(0)}%
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<!-- Interactive Sample Demo -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Try It: Draw Samples</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<div class="mb-4">
				<Slider
					label="Sample Size (n)"
					bind:value={sampleSize}
					min={10}
					max={200}
					step={5}
				/>
			</div>

			<div class="flex gap-3 mb-6">
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={drawSample}
				>
					Draw Sample (n={sampleSize})
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearSamples}
				>
					Clear
				</button>
			</div>

			<!-- Display drawn samples -->
			{#if drawnSamples.length > 0}
				<div class="space-y-2">
					{#each drawnSamples as s, i}
						{@const containsMean = s.ci[0] <= populationMean && s.ci[1] >= populationMean}
						<div class="flex items-center gap-4 text-sm p-2 rounded {containsMean ? 'bg-green-50' : 'bg-red-50'}">
							<span class="w-8 text-gray-500">{i + 1}.</span>
							<span class="w-16">n = {s.n}</span>
							<span class="w-24">x̄ = {s.mean.toFixed(2)}</span>
							<span class="flex-1">
								{confidenceLevel}% CI: [{s.ci[0].toFixed(2)}, {s.ci[1].toFixed(2)}]
							</span>
							<span class="w-40 text-right {containsMean ? 'text-green-600' : 'text-red-600'}">
								{containsMean ? '✓ Contains μ' : '✗ Misses μ'}
							</span>
						</div>
					{/each}
				</div>

				<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
					<strong>Coverage:</strong> {drawnSamples.filter(s => s.ci[0] <= populationMean && s.ci[1] >= populationMean).length}
					of {drawnSamples.length} CIs contain μ = {populationMean}
					({((drawnSamples.filter(s => s.ci[0] <= populationMean && s.ci[1] >= populationMean).length / drawnSamples.length) * 100).toFixed(0)}%)
				</div>
			{:else}
				<div class="text-gray-400 text-center py-8">
					Draw some samples to see confidence intervals in action
				</div>
			{/if}
		</div>
	</section>

	<!-- Sample Size Planning -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Planning Your Sample Size</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-700 mb-4">
				Often you need to determine sample size <em>before</em> collecting data.
				Given your desired margin of error (E), population variability (σ), and confidence level:
			</p>

			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<MathDisplay formula={nFormulaForWidth} displayMode={true} />
			</div>

			<div class="grid md:grid-cols-3 gap-4">
				<div class="p-4 bg-blue-50 rounded-lg text-center">
					<div class="text-sm text-blue-700 mb-1">Want smaller margin?</div>
					<div class="text-blue-900 font-medium">Need larger n</div>
					<div class="text-xs text-blue-600 mt-1">(but n grows with E²)</div>
				</div>
				<div class="p-4 bg-amber-50 rounded-lg text-center">
					<div class="text-sm text-amber-700 mb-1">Higher variability?</div>
					<div class="text-amber-900 font-medium">Need larger n</div>
					<div class="text-xs text-amber-600 mt-1">(n grows with σ²)</div>
				</div>
				<div class="p-4 bg-green-50 rounded-lg text-center">
					<div class="text-sm text-green-700 mb-1">Higher confidence?</div>
					<div class="text-green-900 font-medium">Need larger n</div>
					<div class="text-xs text-green-600 mt-1">(n grows with z²)</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Key Takeaways -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-2">✓ Larger samples...</h3>
				<ul class="text-sm text-green-800 space-y-1">
					<li>• Give narrower confidence intervals</li>
					<li>• Reduce standard error</li>
					<li>• Provide more precise estimates</li>
					<li>• Increase statistical power</li>
				</ul>
			</div>
			<div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
				<h3 class="font-semibold text-amber-900 mb-2">⚠ But remember...</h3>
				<ul class="text-sm text-amber-800 space-y-1">
					<li>• Diminishing returns (√n relationship)</li>
					<li>• Larger samples cost more time/money</li>
					<li>• Can't fix bias with larger n</li>
					<li>• Very large n can detect trivial effects</li>
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

	<!-- Common Mistakes -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Common Mistakes to Avoid</h2>

		<div class="space-y-4">
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ "I'll just double my sample size to double precision"</h3>
				<p class="text-sm text-red-800">
					Wrong! Because precision depends on √n, doubling n only improves precision by √2 ≈ 1.41 (41% improvement).
					To double precision, you need to quadruple n.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ "A larger sample size will fix my biased sampling method"</h3>
				<p class="text-sm text-red-800">
					No amount of sample size can fix systematic bias. If your sampling method is flawed (e.g., only surveying
					volunteers), you'll just get a more precise estimate of the wrong answer.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ "I don't know σ, so I can't plan my sample size"</h3>
				<p class="text-sm text-red-800">
					You can estimate σ from pilot studies, published research on similar populations, or use conservative
					estimates. For proportions, using p = 0.5 gives the maximum required n (most conservative).
				</p>
			</div>

			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-medium text-green-900 mb-2">✓ Good practice</h3>
				<p class="text-sm text-green-800">
					Always do a power analysis or sample size calculation <em>before</em> collecting data. Consider the
					trade-off between precision and cost. Sometimes "good enough" precision is better than perfect precision
					at 10× the cost.
				</p>
			</div>
		</div>
	</section>

	<!-- What's Next -->
	<section class="mb-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
		<h2 class="text-xl font-semibold text-blue-900 mb-3">What's Next?</h2>
		<p class="text-blue-800 mb-4">
			Now that you understand how sample size affects precision, you're ready to learn about <strong>Standard Error</strong>
			in more depth. You'll discover:
		</p>
		<ul class="text-blue-700 space-y-2">
			<li>• The crucial difference between SD (data spread) and SE (estimate precision)</li>
			<li>• Why research papers report SE for means but SD for describing data</li>
			<li>• How to interpret error bars in scientific figures</li>
			<li>• The connection between SE and confidence intervals</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/1-foundations/sampling" class="text-gray-600 hover:text-gray-900">
			← Sampling Distributions
		</a>
		<a href="/modules/1-foundations/standard-error" class="text-blue-600 hover:text-blue-700 font-medium">
			Next: Standard Error →
		</a>
	</div>
</div>
