<script lang="ts">
	import * as d3 from 'd3';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';
	import { sample, normal } from '$lib/stats/distributions';

	// LaTeX formulas
	const sePopulationFormula = String.raw`SE = \frac{\sigma}{\sqrt{n}}`;
	const seSampleFormula = String.raw`SE = \frac{s}{\sqrt{n}}`;
	const sdFormula = String.raw`s = \sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}`;
	const relationshipFormula = String.raw`\text{SD measures spread of data; SE measures precision of } \bar{x}`;

	// Parameters
	let populationSd = $state(10);
	let sampleSize = $state(30);

	// Visualization type
	let showType = $state<'both' | 'sd' | 'se'>('both');

	// Generate population data for illustration
	const populationData = Array.from({ length: 1000 }, () => normal.sample(50, 10));

	// Sampling simulation
	let samples = $state<Array<{ data: number[]; mean: number; sd: number }>>([]);

	function drawSamples(count: number) {
		const newSamples = Array.from({ length: count }, () => {
			const data = sample.normal(sampleSize, 50, populationSd);
			return {
				data,
				mean: d3.mean(data) ?? 50,
				sd: d3.deviation(data) ?? populationSd
			};
		});
		samples = [...samples, ...newSamples].slice(-100);
	}

	function clearSamples() {
		samples = [];
	}

	// Computed statistics
	const sampleMeans = $derived(samples.map(s => s.mean));
	const theoreticalSE = $derived(populationSd / Math.sqrt(sampleSize));
	const observedSE = $derived(sampleMeans.length > 1 ? d3.deviation(sampleMeans) ?? 0 : 0);
	const avgSampleSd = $derived(samples.length > 0 ? d3.mean(samples.map(s => s.sd)) ?? populationSd : populationSd);

	// SVG dimensions
	const width = 450;
	const height = 200;
	const margin = { top: 20, right: 20, bottom: 35, left: 45 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	// Distribution scales
	const xScale = $derived(
		d3.scaleLinear()
			.domain([50 - 4 * populationSd, 50 + 4 * populationSd])
			.range([0, innerWidth])
	);

	// Generate distribution curves
	const sdCurvePoints = $derived(() => {
		const points: [number, number][] = [];
		for (let x = 50 - 4 * populationSd; x <= 50 + 4 * populationSd; x += 0.5) {
			const y = normal.pdf(x, 50, populationSd);
			points.push([x, y]);
		}
		return points;
	});

	const seCurvePoints = $derived(() => {
		const points: [number, number][] = [];
		const se = theoreticalSE;
		for (let x = 50 - 4 * populationSd; x <= 50 + 4 * populationSd; x += 0.5) {
			const y = normal.pdf(x, 50, se);
			points.push([x, y]);
		}
		return points;
	});

	const yMaxSD = $derived(Math.max(...sdCurvePoints().map(p => p[1])));
	const yMaxSE = $derived(Math.max(...seCurvePoints().map(p => p[1])));
	const yMax = $derived(Math.max(yMaxSD, showType !== 'sd' ? yMaxSE : 0));

	const yScale = $derived(
		d3.scaleLinear()
			.domain([0, yMax * 1.1])
			.range([innerHeight, 0])
	);

	const sdPath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(sdCurvePoints())
	);

	const sePath = $derived(
		d3.line<[number, number]>()
			.x(d => xScale(d[0]))
			.y(d => yScale(d[1]))
			.curve(d3.curveMonotoneX)(seCurvePoints())
	);

	// Exercises
	const exercises: Exercise[] = [
		{
			id: 'se-1',
			type: 'multiple-choice',
			question: 'What is the fundamental difference between SD and SE?',
			choices: [
				{ id: 'a', text: 'SD is for populations, SE is for samples' },
				{ id: 'b', text: 'SD measures data spread, SE measures precision of the mean estimate', isCorrect: true },
				{ id: 'c', text: 'SD is always larger than SE' },
				{ id: 'd', text: 'They are different names for the same thing' }
			],
			explanation: 'SD tells you how spread out individual data points are. SE tells you how precisely you\'ve estimated the mean — how much the sample mean would vary if you repeated the study.',
			difficulty: 'easy'
		},
		{
			id: 'se-2',
			type: 'numeric',
			question: 'A sample of n = 36 has a standard deviation of s = 12. What is the standard error of the mean?',
			questionMath: String.raw`SE = \frac{s}{\sqrt{n}} = \frac{12}{\sqrt{36}} = ?`,
			correctAnswer: 2,
			tolerance: 0.01,
			explanation: 'SE = s/√n = 12/√36 = 12/6 = 2',
			difficulty: 'easy'
		},
		{
			id: 'se-3',
			type: 'multiple-choice',
			question: 'You read that a study found "mean = 75, SE = 3" for IQ scores. What can you infer?',
			choices: [
				{ id: 'a', text: 'Individual IQ scores varied by about 3 points' },
				{ id: 'b', text: 'The sample mean is likely within about 3 points of the true population mean', isCorrect: true },
				{ id: 'c', text: 'The study had very large variability' },
				{ id: 'd', text: '3% of scores were outliers' }
			],
			explanation: 'SE measures the precision of the mean estimate. An SE of 3 means the sample mean of 75 is probably within about 3 points (one SE) of the true population mean.',
			difficulty: 'medium',
			hint: 'Think about what SE measures — it\'s not about individual scores.'
		},
		{
			id: 'se-4',
			type: 'multiple-choice',
			question: 'If a study reports SD = 15 and SE = 3, what was the approximate sample size?',
			choices: [
				{ id: 'a', text: 'n ≈ 5' },
				{ id: 'b', text: 'n ≈ 12' },
				{ id: 'c', text: 'n ≈ 25', isCorrect: true },
				{ id: 'd', text: 'n ≈ 45' }
			],
			explanation: 'From SE = SD/√n, we get √n = SD/SE = 15/3 = 5, so n = 25.',
			explanationMath: String.raw`n = \left(\frac{SD}{SE}\right)^2 = \left(\frac{15}{3}\right)^2 = 25`,
			difficulty: 'medium'
		},
		{
			id: 'se-5',
			type: 'true-false',
			question: 'Two studies measure reaction time. Study A: mean = 250ms, SE = 10ms. Study B: mean = 250ms, SE = 25ms. Study A\'s estimate is more precise.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! Lower SE means higher precision. Study A\'s smaller SE indicates less uncertainty about where the true population mean lies.',
			difficulty: 'easy'
		},
		{
			id: 'se-6',
			type: 'numeric',
			question: 'A study with n = 100 reports SE = 5. What is the SD of the data?',
			correctAnswer: 50,
			tolerance: 0.1,
			explanation: 'Rearranging SE = SD/√n gives SD = SE × √n = 5 × √100 = 5 × 10 = 50',
			explanationMath: String.raw`SD = SE \times \sqrt{n} = 5 \times \sqrt{100} = 50`,
			difficulty: 'medium',
			hint: 'Rearrange the SE formula to solve for SD.'
		},
		{
			id: 'se-7',
			type: 'multiple-choice',
			question: 'A researcher increases sample size from 25 to 100. What happens to SD and SE?',
			choices: [
				{ id: 'a', text: 'Both decrease' },
				{ id: 'b', text: 'SD stays roughly the same; SE decreases by half', isCorrect: true },
				{ id: 'c', text: 'Both increase' },
				{ id: 'd', text: 'SE stays roughly the same; SD decreases' }
			],
			explanation: 'SD estimates population variability—it shouldn\'t change systematically with n. SE = SD/√n, so when n goes from 25 to 100 (4×), √n goes from 5 to 10 (2×), so SE halves.',
			difficulty: 'medium'
		},
		{
			id: 'se-8',
			type: 'multiple-choice',
			question: 'A paper shows error bars of ±5 but doesn\'t specify what they represent. Which interpretation is most conservative?',
			choices: [
				{ id: 'a', text: 'Assume they\'re SE bars' },
				{ id: 'b', text: 'Assume they\'re SD bars', isCorrect: true },
				{ id: 'c', text: 'Assume they\'re 95% CI bars' },
				{ id: 'd', text: 'It doesn\'t matter which they are' }
			],
			explanation: 'Since SD > SE (for n > 1), assuming SD bars is conservative—if you concluded significance with SD bars, it would also be significant with SE bars. But really, papers should always label their error bars!',
			difficulty: 'hard'
		},
		{
			id: 'se-9',
			type: 'true-false',
			question: 'If you double the sample size, the standard error decreases by approximately 29%.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'When n doubles, √n increases by √2 ≈ 1.414. So SE becomes SE/1.414 ≈ 0.71 × SE, a decrease of about 29%.',
			explanationMath: String.raw`\text{New SE} = \frac{SD}{\sqrt{2n}} = \frac{SD}{\sqrt{n}} \times \frac{1}{\sqrt{2}} \approx 0.71 \times SE`,
			difficulty: 'hard'
		},
		{
			id: 'se-10',
			type: 'multiple-choice',
			question: 'When should you report SD instead of SE?',
			choices: [
				{ id: 'a', text: 'When your goal is to describe how variable the data is', isCorrect: true },
				{ id: 'b', text: 'When you have a large sample size' },
				{ id: 'c', text: 'When you want to make your results look more precise' },
				{ id: 'd', text: 'Never — always use SE' }
			],
			explanation: 'Report SD when describing data variability (e.g., "heights varied by SD = 4 inches"). Report SE when discussing precision of the mean estimate (e.g., for confidence intervals or hypothesis tests).',
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
			<span>Standard Error</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Standard Error</h1>
		<p class="text-lg text-gray-600">
			Understand the crucial distinction between standard deviation and standard error.
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-8 border border-purple-200">
		<h2 class="text-xl font-semibold text-purple-900 mb-3">Why This Matters</h2>
		<p class="text-purple-800 mb-4">
			Confusing standard deviation (SD) with standard error (SE) is one of the most common mistakes in statistics.
			Papers have been retracted, studies misinterpreted, and conclusions invalidated because researchers used
			the wrong measure. The difference might seem subtle, but it's fundamental: <strong>SD describes your data,
			SE describes how well you've estimated the mean.</strong>
		</p>
		<p class="text-purple-800 mb-4">
			When you see error bars on a graph, which are they showing? When a study reports "mean ± something," is that
			the variability in the data or the uncertainty in the estimate? These questions have different answers and
			different implications. Master this distinction and you'll avoid a trap that catches even experienced researchers.
		</p>
		<div class="bg-white/60 rounded-lg p-4">
			<h3 class="font-semibold text-purple-900 mb-2">Learning Objectives</h3>
			<ul class="text-sm text-purple-800 space-y-1">
				<li>• Distinguish between SD (data spread) and SE (estimate precision)</li>
				<li>• Calculate SE from SD and sample size</li>
				<li>• Understand why SE decreases with larger samples but SD doesn't</li>
				<li>• Correctly interpret error bars and "mean ± X" reports in research</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-purple-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-purple-900 mb-3">The Key Distinction</h2>
		<p class="text-purple-800 mb-4">
			<strong>Standard deviation (SD)</strong> measures how spread out your data is.
			<strong>Standard error (SE)</strong> measures how precisely you've estimated the mean.
		</p>
		<div class="bg-white rounded-lg p-4 grid md:grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-600 mb-2">Population SD known:</p>
				<MathDisplay formula={sePopulationFormula} displayMode={true} />
			</div>
			<div>
				<p class="text-sm text-gray-600 mb-2">Sample SD used:</p>
				<MathDisplay formula={seSampleFormula} displayMode={true} />
			</div>
		</div>
	</section>

	<!-- Understanding the Concept Step by Step -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding the Difference Step by Step</h2>

		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Standard Deviation (SD): How Spread Out Is Your Data?</h3>
						<p class="text-gray-700 mb-3">
							SD answers the question: "How much do individual observations vary from the mean?"
							It's a property of your data—whether you measure heights, test scores, or blood pressure,
							SD tells you how much values scatter around the average.
						</p>
						<div class="bg-orange-50 rounded-lg p-4">
							<p class="text-sm text-orange-800">
								<strong>Example:</strong> If adult heights have SD = 4 inches, this means individual heights
								typically deviate about 4 inches from the average. This is true whether you measure 20 people
								or 2000 people—the population spread doesn't change.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Standard Error (SE): How Precisely Did You Estimate the Mean?</h3>
						<p class="text-gray-700 mb-3">
							SE answers a different question: "If I repeated this study, how much would my sample mean vary?"
							It measures the precision of your <em>estimate</em>, not the spread of your data.
						</p>
						<div class="bg-blue-50 rounded-lg p-4">
							<p class="text-sm text-blue-800">
								<strong>Example:</strong> With n = 100, SE = SD/√100 = SD/10. Your sample mean is about 10×
								more stable than individual measurements. With n = 400, SE = SD/20—even more precise.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">The Key Relationship</h3>
						<p class="text-gray-700 mb-3">
							SE and SD are related by a simple formula that captures their different roles:
						</p>
						<div class="bg-gray-50 rounded-lg p-4 mb-3">
							<MathDisplay formula={seSampleFormula} displayMode={true} />
						</div>
						<div class="grid md:grid-cols-2 gap-4">
							<div class="bg-orange-50 rounded-lg p-3 text-center">
								<div class="text-orange-900 font-bold">SD stays constant</div>
								<div class="text-sm text-orange-800">as sample size changes</div>
							</div>
							<div class="bg-blue-50 rounded-lg p-3 text-center">
								<div class="text-blue-900 font-bold">SE decreases</div>
								<div class="text-sm text-blue-800">as sample size increases</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">An Analogy: Weighing Yourself</h3>
						<p class="text-gray-700 mb-3">
							Imagine weighing yourself on a bathroom scale. Each measurement has some random error.
						</p>
						<ul class="text-sm text-gray-600 space-y-2">
							<li><strong>SD of single measurements:</strong> How much do individual scale readings vary? (Maybe ±0.5 lbs)</li>
							<li><strong>SE of the average:</strong> If you take 4 measurements and average them, how precise is that average? (About ±0.25 lbs)</li>
							<li><strong>Key insight:</strong> The scale didn't become more accurate—your estimate did, by averaging out the random errors.</li>
						</ul>
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
				<h3 class="font-semibold text-gray-900 mb-3">Example 1: Calculating SE from Sample Statistics</h3>
				<div class="bg-blue-50 rounded-lg p-4 mb-4">
					<p class="text-blue-900">
						<strong>Problem:</strong> A study of reaction times in 49 participants found:
						mean = 350ms, SD = 70ms. Calculate the standard error and interpret it.
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Apply the SE formula:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`SE = \frac{s}{\sqrt{n}} = \frac{70}{\sqrt{49}} = \frac{70}{7} = 10\text{ ms}`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Answer: SE = 10ms</p>
							<p class="text-sm text-gray-600">
								<strong>Interpretation:</strong> While individuals vary by about 70ms around the mean (SD),
								the sample mean of 350ms is estimated with precision of about ±10ms. If we repeated this study,
								we'd expect most sample means to fall within 350 ± 10ms.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 2 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 2: Inferring Sample Size from SD and SE</h3>
				<div class="bg-purple-50 rounded-lg p-4 mb-4">
					<p class="text-purple-900">
						<strong>Problem:</strong> A paper reports "mean = 82, SD = 20, SE = 4" for test scores.
						What was the sample size?
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
						<div>
							<p class="text-gray-700">Rearrange SE = SD/√n to solve for n:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`\sqrt{n} = \frac{SD}{SE} = \frac{20}{4} = 5`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
						<div>
							<p class="text-gray-700">Square both sides:</p>
							<div class="bg-gray-50 rounded p-3 my-2">
								<MathDisplay formula={String.raw`n = 5^2 = 25`} displayMode={true} />
							</div>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Answer: n = 25 participants</p>
							<p class="text-sm text-gray-600">
								This technique is useful for checking reported statistics or recovering missing information from publications.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Example 3 -->
			<div class="bg-white rounded-xl border border-gray-200 p-6">
				<h3 class="font-semibold text-gray-900 mb-3">Example 3: Interpreting Error Bars</h3>
				<div class="bg-amber-50 rounded-lg p-4 mb-4">
					<p class="text-amber-900">
						<strong>Scenario:</strong> A graph shows two treatment groups with means 50 and 55.
						Both have error bars extending ±8 units. Which interpretation is correct if the bars represent SD vs SE?
					</p>
				</div>

				<div class="space-y-3">
					<div class="grid md:grid-cols-2 gap-4">
						<div class="bg-orange-50 rounded-lg p-4">
							<h4 class="font-medium text-orange-900 mb-2">If SD = 8:</h4>
							<p class="text-sm text-orange-800">
								Individual scores in each group vary by about 8 units around their mean.
								The groups may or may not differ statistically—SD doesn't tell us about estimation uncertainty.
							</p>
						</div>
						<div class="bg-blue-50 rounded-lg p-4">
							<h4 class="font-medium text-blue-900 mb-2">If SE = 8:</h4>
							<p class="text-sm text-blue-800">
								The true mean for each group could plausibly be within ±8 of the reported mean.
								The 5-point difference might or might not be significant depending on overlap.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="bg-green-200 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">✓</span>
						<div>
							<p class="text-green-800 font-medium">Key takeaway: Always check what the error bars represent!</p>
							<p class="text-sm text-gray-600">
								SE bars are more relevant for comparing means between groups.
								SD bars show data variability but don't directly indicate statistical significance.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Visual Comparison -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Visualizing the Difference</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<!-- Controls -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<Slider
					label="Population SD (σ)"
					bind:value={populationSd}
					min={5}
					max={20}
					step={1}
				/>
				<Slider
					label="Sample Size (n)"
					bind:value={sampleSize}
					min={5}
					max={100}
					step={5}
				/>
			</div>

			<!-- Toggle -->
			<div class="flex gap-2 mb-6">
				<button
					class="px-4 py-2 rounded-lg font-medium transition-colors {showType === 'both' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => showType = 'both'}
				>
					Show Both
				</button>
				<button
					class="px-4 py-2 rounded-lg font-medium transition-colors {showType === 'sd' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => showType = 'sd'}
				>
					SD Only
				</button>
				<button
					class="px-4 py-2 rounded-lg font-medium transition-colors {showType === 'se' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => showType = 'se'}
				>
					SE Only
				</button>
			</div>

			<!-- Chart -->
			<svg {width} {height} class="mx-auto">
				<g transform="translate({margin.left},{margin.top})">
					<!-- SD distribution (population) -->
					{#if showType === 'both' || showType === 'sd'}
						<path
							d={sdPath}
							fill="rgba(249, 115, 22, 0.2)"
							stroke="#f97316"
							stroke-width="2"
						/>
					{/if}

					<!-- SE distribution (sampling distribution of mean) -->
					{#if showType === 'both' || showType === 'se'}
						<path
							d={sePath}
							fill="rgba(59, 130, 246, 0.2)"
							stroke="#3b82f6"
							stroke-width="2"
						/>
					{/if}

					<!-- Mean line -->
					<line
						x1={xScale(50)}
						x2={xScale(50)}
						y1={0}
						y2={innerHeight}
						stroke="#10b981"
						stroke-width="2"
						stroke-dasharray="5,5"
					/>

					<!-- X Axis -->
					<g transform="translate(0,{innerHeight})">
						{#each xScale.ticks(7) as tick}
							<g transform="translate({xScale(tick)},0)">
								<line y2="6" stroke="#9ca3af" />
								<text y="20" text-anchor="middle" fill="#6b7280" font-size="10">{tick}</text>
							</g>
						{/each}
					</g>
				</g>
			</svg>

			<!-- Legend -->
			<div class="flex justify-center gap-8 mt-4">
				{#if showType === 'both' || showType === 'sd'}
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 bg-orange-500 rounded"></div>
						<span class="text-sm">Population (SD = {populationSd})</span>
					</div>
				{/if}
				{#if showType === 'both' || showType === 'se'}
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 bg-blue-500 rounded"></div>
						<span class="text-sm">Sampling Distribution (SE = {theoreticalSE.toFixed(2)})</span>
					</div>
				{/if}
			</div>

			<!-- Stats -->
			<div class="grid md:grid-cols-3 gap-4 mt-6 text-center">
				<div class="p-4 bg-orange-50 rounded-lg">
					<div class="text-2xl font-bold text-orange-600">{populationSd.toFixed(1)}</div>
					<div class="text-sm text-orange-800">Population SD (σ)</div>
				</div>
				<div class="p-4 bg-gray-50 rounded-lg">
					<div class="text-2xl font-bold text-gray-600">{sampleSize}</div>
					<div class="text-sm text-gray-800">Sample Size (n)</div>
				</div>
				<div class="p-4 bg-blue-50 rounded-lg">
					<div class="text-2xl font-bold text-blue-600">{theoreticalSE.toFixed(2)}</div>
					<div class="text-sm text-blue-800">Standard Error (σ/√n)</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Simulation -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Verify with Simulation</h2>

		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<p class="text-gray-600 mb-4">
				Draw repeated samples and watch the SE emerge as the SD of sample means:
			</p>

			<div class="flex flex-wrap gap-3 mb-6">
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => drawSamples(1)}
				>
					Draw 1 Sample
				</button>
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => drawSamples(10)}
				>
					Draw 10 Samples
				</button>
				<button
					class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
					onclick={() => drawSamples(50)}
				>
					Draw 50 Samples
				</button>
				<button
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
					onclick={clearSamples}
				>
					Clear
				</button>
			</div>

			{#if samples.length > 0}
				<div class="grid md:grid-cols-2 gap-6">
					<div class="p-4 bg-orange-50 rounded-lg">
						<h4 class="font-medium text-orange-900 mb-2">Within Samples (SD)</h4>
						<p class="text-sm text-orange-800 mb-2">
							Average SD across samples: <strong>{avgSampleSd.toFixed(2)}</strong>
						</p>
						<p class="text-xs text-orange-700">
							This estimates the population SD (σ = {populationSd})
						</p>
					</div>
					<div class="p-4 bg-blue-50 rounded-lg">
						<h4 class="font-medium text-blue-900 mb-2">Between Sample Means (SE)</h4>
						<p class="text-sm text-blue-800 mb-2">
							SD of sample means: <strong>{observedSE.toFixed(2)}</strong>
						</p>
						<p class="text-xs text-blue-700">
							This estimates SE (σ/√n = {theoreticalSE.toFixed(2)})
						</p>
					</div>
				</div>

				<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
					{samples.length} samples drawn | Sample means range: [{d3.min(sampleMeans)?.toFixed(1)}, {d3.max(sampleMeans)?.toFixed(1)}]
				</div>
			{:else}
				<div class="text-center text-gray-400 py-8">
					Draw samples to see the relationship between SD and SE
				</div>
			{/if}
		</div>
	</section>

	<!-- Comparison Table -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">SD vs SE: Quick Reference</h2>

		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th class="py-3 px-4 text-left font-semibold text-gray-700">Aspect</th>
						<th class="py-3 px-4 text-left font-semibold text-orange-700">Standard Deviation (SD)</th>
						<th class="py-3 px-4 text-left font-semibold text-blue-700">Standard Error (SE)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					<tr>
						<td class="py-3 px-4 font-medium">Measures</td>
						<td class="py-3 px-4">Spread of individual data points</td>
						<td class="py-3 px-4">Precision of the mean estimate</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Formula</td>
						<td class="py-3 px-4"><MathDisplay formula={String.raw`\sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}`} /></td>
						<td class="py-3 px-4"><MathDisplay formula={String.raw`\frac{s}{\sqrt{n}}`} /></td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Affected by n?</td>
						<td class="py-3 px-4">No (estimates population parameter)</td>
						<td class="py-3 px-4">Yes (decreases with √n)</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">Typical use</td>
						<td class="py-3 px-4">Describing data variability</td>
						<td class="py-3 px-4">Confidence intervals, hypothesis tests</td>
					</tr>
					<tr>
						<td class="py-3 px-4 font-medium">In plots</td>
						<td class="py-3 px-4">Error bars showing data spread</td>
						<td class="py-3 px-4">Error bars showing mean uncertainty</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Common Confusion -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Common Confusions</h2>

		<div class="space-y-4">
			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ "SE is the same as SD for small samples"</h3>
				<p class="text-sm text-red-800">
					No — they measure different things entirely. SE = SD/√n, so SE is always smaller than SD
					(assuming n > 1). Even for n = 4, SE is half the size of SD.
				</p>
			</div>

			<div class="bg-red-50 rounded-lg p-4 border border-red-200">
				<h3 class="font-medium text-red-900 mb-2">❌ "Reports should use SD for error bars"</h3>
				<p class="text-sm text-red-800">
					It depends! Use SD when showing data spread is the goal. Use SE (or 95% CI) when showing
					precision of the mean is the goal. Always label which you're using.
				</p>
			</div>

			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-medium text-green-900 mb-2">✓ Key insight</h3>
				<p class="text-sm text-green-800">
					If you repeat a study, the SD should stay roughly the same (it estimates σ).
					But the SE will change if sample size changes. More data → smaller SE → more precise estimate.
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

	<!-- Key Takeaways -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-2">✓ Remember</h3>
				<ul class="text-sm text-green-800 space-y-1">
					<li>• SD describes data spread; SE describes mean precision</li>
					<li>• SE = SD/√n (always smaller than SD for n &gt; 1)</li>
					<li>• SE decreases with larger samples; SD doesn't</li>
					<li>• Always check what error bars represent</li>
				</ul>
			</div>
			<div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
				<h3 class="font-semibold text-amber-900 mb-2">⚠ Watch Out For</h3>
				<ul class="text-sm text-amber-800 space-y-1">
					<li>• Papers that don't label their error bars</li>
					<li>• Using SE when SD is more appropriate (or vice versa)</li>
					<li>• Thinking SE = 0 means perfect precision</li>
					<li>• Comparing SEs between studies with different n</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Summary -->
	<section class="mb-8 bg-gray-50 rounded-xl p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Module 1 Summary</h2>
		<p class="text-gray-700 mb-4">
			Congratulations! You've completed the Foundations module. You now have the statistical intuition
			needed to understand sampling, estimation, and uncertainty—the building blocks for hypothesis testing.
		</p>
		<ul class="space-y-2 text-gray-600">
			<li class="flex items-start gap-2">
				<span class="text-green-500">✓</span>
				<span><strong>Central Limit Theorem</strong>: Sample means become normally distributed regardless of population shape (n ≥ 30 is usually sufficient)</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-500">✓</span>
				<span><strong>Sampling Distributions</strong>: Theoretical distributions showing how statistics vary across repeated samples</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-500">✓</span>
				<span><strong>Sample Size Effects</strong>: Larger n means narrower CIs, but with diminishing returns (the √n rule)</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-green-500">✓</span>
				<span><strong>Standard Error</strong>: Measures precision of estimates (SE = SD/√n), distinct from data spread (SD)</span>
			</li>
		</ul>
	</section>

	<!-- What's Next -->
	<section class="mb-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
		<h2 class="text-xl font-semibold text-blue-900 mb-3">What's Next: Hypothesis Testing</h2>
		<p class="text-blue-800 mb-4">
			With these foundations in place, you're ready for <strong>Module 2: Hypothesis Testing</strong>.
			You'll learn how to use sampling distributions and standard errors to make decisions about populations:
		</p>
		<ul class="text-blue-700 space-y-2">
			<li>• <strong>Hypothesis Testing Concepts</strong>: Null and alternative hypotheses, test statistics</li>
			<li>• <strong>Type I and Type II Errors</strong>: Understanding the risks of wrong conclusions</li>
			<li>• <strong>P-values</strong>: What they mean (and what they don't)</li>
			<li>• <strong>Statistical Power</strong>: Designing studies that can detect real effects</li>
			<li>• <strong>Effect Size</strong>: Measuring the magnitude of differences</li>
		</ul>
		<p class="text-blue-800 mt-4">
			The concepts you've learned—especially standard error and the Central Limit Theorem—are the
			foundation for all hypothesis tests!
		</p>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/1-foundations/sample-size" class="text-gray-600 hover:text-gray-900">
			← Sample Size Effects
		</a>
		<a href="/modules/2-hypothesis" class="text-blue-600 hover:text-blue-700 font-medium">
			Next: Module 2 - Hypothesis Testing →
		</a>
	</div>
</div>
