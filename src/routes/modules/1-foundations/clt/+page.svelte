<script lang="ts">
	import SamplingAnimation from '$lib/components/visualizations/SamplingAnimation.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// LaTeX formulas
	const cltFormula = String.raw`\bar{X} \sim N\left(\mu, \frac{\sigma}{\sqrt{n}}\right)`;
	const seFormula = String.raw`SE = \frac{\sigma}{\sqrt{n}}`;
	const example1Formula = String.raw`SE = \frac{20}{\sqrt{100}} = \frac{20}{10} = 2`;
	const example2Formula = String.raw`SE = \frac{15}{\sqrt{36}} = \frac{15}{6} = 2.5`;
	const zScoreFormula = String.raw`z = \frac{\bar{x} - \mu}{SE} = \frac{\bar{x} - \mu}{\sigma/\sqrt{n}}`;

	// Parameters
	let populationType = $state<'uniform' | 'exponential' | 'bimodal' | 'normal'>('uniform');
	let sampleSize = $state(30);
	let numSamples = $state(200);
	let speed = $state<'slow' | 'normal' | 'fast'>('normal');

	// Animation key for re-rendering
	let animationKey = $state(0);
	function resetAnimation() {
		animationKey++;
	}

	// Expanded exercises (8 total)
	const exercises: Exercise[] = [
		{
			id: 'clt-1',
			type: 'multiple-choice',
			question: 'What happens to the sampling distribution of the mean as sample size increases?',
			choices: [
				{ id: 'a', text: 'It becomes more spread out' },
				{ id: 'b', text: 'It becomes narrower and more normal', isCorrect: true },
				{ id: 'c', text: 'It stays the same shape' },
				{ id: 'd', text: 'It becomes more skewed' }
			],
			explanation: 'As sample size increases, the sampling distribution becomes narrower (smaller standard error) and approaches a normal distribution regardless of the population shape.',
			difficulty: 'easy'
		},
		{
			id: 'clt-2',
			type: 'true-false',
			question: 'The Central Limit Theorem only works when the population distribution is normal.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! The beauty of the CLT is that it works regardless of the population distribution. The sampling distribution of means approaches normal even from highly skewed or unusual populations, given sufficient sample size.',
			difficulty: 'easy'
		},
		{
			id: 'clt-3',
			type: 'numeric',
			question: 'A population has σ = 20. If you take samples of size n = 100, what is the standard error of the mean?',
			correctAnswer: 2,
			tolerance: 0.01,
			explanation: 'SE = σ/√n = 20/√100 = 20/10 = 2. The standard error decreases as sample size increases.',
			difficulty: 'easy'
		},
		{
			id: 'clt-4',
			type: 'multiple-choice',
			question: 'A factory produces batteries with mean life μ = 500 hours and σ = 50 hours. If you test 25 batteries, what is the probability the sample mean exceeds 510 hours?',
			choices: [
				{ id: 'a', text: 'About 16%', isCorrect: true },
				{ id: 'b', text: 'About 50%' },
				{ id: 'c', text: 'About 84%' },
				{ id: 'd', text: 'Cannot be determined' }
			],
			explanation: 'SE = 50/√25 = 10. z = (510-500)/10 = 1. P(Z > 1) ≈ 0.16 or 16%. The CLT allows us to use the normal distribution for this probability.',
			difficulty: 'medium'
		},
		{
			id: 'clt-5',
			type: 'multiple-choice',
			question: 'Which statement about the sampling distribution is TRUE?',
			choices: [
				{ id: 'a', text: 'Its mean equals the sample mean' },
				{ id: 'b', text: 'Its mean equals the population mean', isCorrect: true },
				{ id: 'c', text: 'Its standard deviation equals the population standard deviation' },
				{ id: 'd', text: 'Its shape always matches the population shape' }
			],
			explanation: 'The sampling distribution is centered at the population mean (μ). This is why sample means are unbiased estimators of the population mean.',
			difficulty: 'medium'
		},
		{
			id: 'clt-6',
			type: 'numeric',
			question: 'To cut the standard error in half, by what factor must you multiply the sample size?',
			correctAnswer: 4,
			tolerance: 0.1,
			explanation: 'Since SE = σ/√n, to halve SE you need √n to double. If √n doubles, then n must quadruple. So multiply n by 4.',
			difficulty: 'medium'
		},
		{
			id: 'clt-7',
			type: 'multiple-choice',
			question: 'Income distributions are typically highly right-skewed. For a study of household incomes, which sample size would best ensure the sampling distribution is approximately normal?',
			choices: [
				{ id: 'a', text: 'n = 10' },
				{ id: 'b', text: 'n = 20' },
				{ id: 'c', text: 'n = 50', isCorrect: true },
				{ id: 'd', text: 'Any size works equally well' }
			],
			explanation: 'For highly skewed distributions, larger samples are needed. While n ≥ 30 is a common rule of thumb, highly skewed distributions may need n ≥ 50 or more for good normality.',
			difficulty: 'hard'
		},
		{
			id: 'clt-8',
			type: 'true-false',
			question: 'If the population is perfectly normal, the sampling distribution of the mean is normal for ANY sample size, even n = 2.',
			choices: [
				{ id: 'true', text: 'True', isCorrect: true },
				{ id: 'false', text: 'False' }
			],
			explanation: 'True! If the population is normal, the sampling distribution is exactly normal for all sample sizes. The CLT is about non-normal populations approaching normality.',
			difficulty: 'hard'
		}
	];

	let currentExerciseIndex = $state(0);
</script>

<div class="max-w-5xl mx-auto px-4">
	<!-- Header -->
	<header class="mb-8">
		<nav class="text-sm text-gray-500 mb-2">
			<a href="/modules/1-foundations" class="hover:text-blue-600">Module 1: Foundations</a>
			<span class="mx-2">/</span>
			<span>Central Limit Theorem</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Central Limit Theorem</h1>
		<p class="text-lg text-gray-600">
			The statistical foundation that makes inference possible
		</p>
	</header>

	<!-- Why This Matters -->
	<section class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-8 border border-amber-200">
		<h2 class="text-xl font-semibold text-amber-900 mb-3">Why This Matters</h2>
		<p class="text-amber-800 mb-4">
			Imagine you're a quality control engineer at a factory that produces millions of light bulbs.
			You can't test every bulb (they'd all burn out!), so you test a sample of 50. But how can you
			draw conclusions about <em>all</em> bulbs from just 50? The Central Limit Theorem (CLT) is the
			mathematical magic that makes this possible.
		</p>
		<p class="text-amber-800 mb-4">
			The CLT is perhaps the most important theorem in statistics. It explains why the normal
			distribution appears everywhere in nature and why we can make reliable inferences from samples.
			Every confidence interval you calculate, every hypothesis test you run—they all rely on this theorem.
		</p>
		<div class="bg-white/60 rounded-lg p-4 mt-4">
			<h3 class="font-medium text-amber-900 mb-2">Learning Objectives</h3>
			<ul class="text-amber-800 space-y-1">
				<li>• Understand why sample means follow a normal distribution</li>
				<li>• Calculate the standard error of the mean</li>
				<li>• Recognize how sample size affects the sampling distribution</li>
				<li>• Apply the CLT to real-world probability problems</li>
			</ul>
		</div>
	</section>

	<!-- Key Concept -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-blue-900 mb-3">The Central Limit Theorem</h2>
		<p class="text-blue-800 mb-4">
			When you take many random samples from <strong>any population</strong> and calculate their means,
			those means will form an approximately <strong>normal distribution</strong>—even if the original
			population is wildly non-normal!
		</p>
		<div class="bg-white rounded-lg p-4 mb-4">
			<MathDisplay formula={cltFormula} displayMode={true} />
			<p class="text-sm text-gray-600 text-center mt-2">
				The sampling distribution has mean μ and standard error σ/√n
			</p>
		</div>
		<div class="bg-blue-100 rounded-lg p-4">
			<p class="text-blue-900 font-medium">In Plain English:</p>
			<p class="text-blue-800 mt-1">
				Take a sample, calculate the mean. Repeat thousands of times. Plot all those means.
				You'll get a bell curve centered at the true population mean, regardless of what
				the original data looked like.
			</p>
		</div>
	</section>

	<!-- Understanding the Concept -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Understanding the CLT Step by Step</h2>

		<div class="space-y-6">
			<!-- Step 1 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">1</span>
					The Population Can Be Any Shape
				</h3>
				<p class="text-gray-700 mb-3">
					Your data might come from a uniform distribution (like rolling a fair die), a skewed
					distribution (like income or house prices), or even a bimodal distribution (like heights
					combining men and women). The CLT works for all of them.
				</p>
				<div class="bg-gray-50 rounded-lg p-4">
					<p class="text-sm text-gray-600">
						<strong>Try it:</strong> In the interactive demo below, switch between population shapes.
						Notice that the histogram of sample means (right side) always tends toward a bell curve.
					</p>
				</div>
			</div>

			<!-- Step 2 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
					Sample Means Cluster Around the Population Mean
				</h3>
				<p class="text-gray-700 mb-3">
					Each sample mean is an estimate of the true population mean (μ). Some samples will give
					means slightly above μ, others slightly below. But on average, they're right on target.
					This is why we say the sample mean is an <strong>unbiased estimator</strong>.
				</p>
				<p class="text-gray-700">
					The center of the sampling distribution equals the population mean: E(X̄) = μ
				</p>
			</div>

			<!-- Step 3 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">3</span>
					The Spread Depends on Sample Size
				</h3>
				<p class="text-gray-700 mb-3">
					The <strong>standard error (SE)</strong> measures how spread out sample means are:
				</p>
				<div class="bg-gray-50 rounded-lg p-4 mb-3">
					<MathDisplay formula={seFormula} displayMode={true} />
				</div>
				<p class="text-gray-700">
					Larger samples → smaller standard error → means cluster more tightly around μ.
					This is the mathematical reason why larger studies give more precise estimates.
				</p>
			</div>

			<!-- Step 4 -->
			<div class="bg-white rounded-lg border border-gray-200 p-5">
				<h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
					<span class="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">4</span>
					The Shape Becomes Normal (with Large Enough n)
				</h3>
				<p class="text-gray-700 mb-3">
					The rule of thumb is n ≥ 30 for most populations. For very skewed distributions,
					you might need n ≥ 50 or more. For populations that are already normal, even n = 2 works!
				</p>
				<div class="bg-green-50 rounded-lg p-4">
					<p class="text-green-800">
						<strong>Why this matters:</strong> Once we know the sampling distribution is normal,
						we can use all our normal distribution tools—z-scores, probability tables,
						confidence intervals—to make inferences.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Interactive Demo -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Demonstration</h2>
		<p class="text-gray-600 mb-4">
			Watch the CLT in action! Adjust the population shape and sample size to see how the
			sampling distribution changes. The left panel shows individual samples being drawn;
			the right panel builds up the distribution of sample means.
		</p>

		<!-- Controls -->
		<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2" for="population-shape">Population Shape</label>
					<select
						id="population-shape"
						bind:value={populationType}
						onchange={resetAnimation}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					>
						<option value="uniform">Uniform (flat)</option>
						<option value="exponential">Exponential (right-skewed)</option>
						<option value="bimodal">Bimodal (two peaks)</option>
						<option value="normal">Normal (bell curve)</option>
					</select>
				</div>
				<div>
					<Slider
						label="Sample Size (n)"
						bind:value={sampleSize}
						min={5}
						max={100}
						step={5}
						on:change={resetAnimation}
					/>
				</div>
				<div>
					<Slider
						label="Number of Samples"
						bind:value={numSamples}
						min={50}
						max={500}
						step={50}
						on:change={resetAnimation}
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2" for="animation-speed">Animation Speed</label>
					<select
						id="animation-speed"
						bind:value={speed}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					>
						<option value="slow">Slow</option>
						<option value="normal">Normal</option>
						<option value="fast">Fast</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Animation -->
		{#key animationKey}
			<SamplingAnimation
				{populationType}
				{sampleSize}
				{numSamples}
				{speed}
				width={900}
				height={350}
			/>
		{/key}

		<div class="bg-gray-50 rounded-lg p-4 mt-4">
			<h3 class="font-medium text-gray-900 mb-2">What to Notice:</h3>
			<ul class="text-gray-700 space-y-1 text-sm">
				<li>• <strong>Population shape doesn't matter:</strong> Try exponential or bimodal—the means still form a bell curve</li>
				<li>• <strong>Larger n = narrower distribution:</strong> Increase sample size and watch the histogram get tighter</li>
				<li>• <strong>Center stays fixed:</strong> The histogram is always centered at the population mean</li>
			</ul>
		</div>
	</section>

	<!-- Worked Examples -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Worked Examples</h2>

		<!-- Example 1 -->
		<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
			<h3 class="font-semibold text-gray-900 mb-3">Example 1: Light Bulb Lifespans</h3>
			<div class="bg-gray-50 rounded-lg p-4 mb-4">
				<p class="text-gray-700">
					A factory produces light bulbs with mean lifespan μ = 1000 hours and standard deviation
					σ = 100 hours. A quality inspector tests a random sample of 25 bulbs and calculates the
					sample mean. What is the probability the sample mean is between 980 and 1020 hours?
				</p>
			</div>

			<div class="space-y-3">
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 1</span>
					<p class="text-gray-700">Calculate the standard error: SE = σ/√n = 100/√25 = 100/5 = <strong>20</strong></p>
				</div>
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 2</span>
					<p class="text-gray-700">Convert to z-scores: z₁ = (980-1000)/20 = <strong>-1</strong>, z₂ = (1020-1000)/20 = <strong>+1</strong></p>
				</div>
				<div class="flex gap-3">
					<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Step 3</span>
					<p class="text-gray-700">Find probability: P(-1 &lt; Z &lt; 1) = 0.8413 - 0.1587 = <strong>0.6826 (68.26%)</strong></p>
				</div>
			</div>

			<div class="bg-green-50 rounded-lg p-4 mt-4">
				<p class="text-green-800">
					<strong>Answer:</strong> There's about a 68% chance the sample mean falls within ±20 hours of the true mean.
					This is the famous 68-95-99.7 rule: about 68% of data falls within 1 standard deviation.
				</p>
			</div>
		</div>

		<!-- Example 2 -->
		<div class="bg-white rounded-xl border border-gray-200 p-6">
			<h3 class="font-semibold text-gray-900 mb-3">Example 2: Comparing Sample Sizes</h3>
			<div class="bg-gray-50 rounded-lg p-4 mb-4">
				<p class="text-gray-700">
					A population has σ = 15. How does the standard error change if we use n = 36 vs n = 144?
				</p>
			</div>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="bg-blue-50 rounded-lg p-4">
					<h4 class="font-medium text-blue-900 mb-2">With n = 36:</h4>
					<MathDisplay formula={example2Formula} displayMode={true} />
				</div>
				<div class="bg-purple-50 rounded-lg p-4">
					<h4 class="font-medium text-purple-900 mb-2">With n = 144:</h4>
					<p class="text-center">SE = 15/√144 = 15/12 = <strong>1.25</strong></p>
				</div>
			</div>

			<div class="bg-amber-50 rounded-lg p-4 mt-4">
				<p class="text-amber-800">
					<strong>Key insight:</strong> Quadrupling the sample size (36 → 144) cuts the standard error
					in half (2.5 → 1.25). This is because SE depends on √n, not n directly.
					Diminishing returns: to halve SE again, you'd need n = 576!
				</p>
			</div>
		</div>
	</section>

	<!-- Common Misconceptions -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Common Misconceptions</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div class="bg-red-50 rounded-lg p-5 border border-red-200">
				<h3 class="font-semibold text-red-900 mb-2 flex items-center gap-2">
					<span class="text-xl">✗</span> Myth
				</h3>
				<p class="text-red-800">"The CLT says your data becomes normal with large samples"</p>
			</div>
			<div class="bg-green-50 rounded-lg p-5 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-2 flex items-center gap-2">
					<span class="text-xl">✓</span> Reality
				</h3>
				<p class="text-green-800">The CLT applies to <em>sample means</em>, not the data itself. Your raw data keeps its original shape.</p>
			</div>
			<div class="bg-red-50 rounded-lg p-5 border border-red-200">
				<h3 class="font-semibold text-red-900 mb-2 flex items-center gap-2">
					<span class="text-xl">✗</span> Myth
				</h3>
				<p class="text-red-800">"You always need n ≥ 30"</p>
			</div>
			<div class="bg-green-50 rounded-lg p-5 border border-green-200">
				<h3 class="font-semibold text-green-900 mb-2 flex items-center gap-2">
					<span class="text-xl">✓</span> Reality
				</h3>
				<p class="text-green-800">n ≥ 30 is a rough guideline. Symmetric distributions work with smaller n; heavily skewed ones may need more.</p>
			</div>
		</div>
	</section>

	<!-- Key Takeaways -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-medium text-gray-900 mb-1">Shape → Normal</h3>
				<p class="text-sm text-gray-600">
					No matter the population shape, the sampling distribution of means approaches normal with large n.
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">🎯</div>
				<h3 class="font-medium text-gray-900 mb-1">Center = μ</h3>
				<p class="text-sm text-gray-600">
					The mean of all sample means equals the population mean. Sample means are unbiased.
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">📏</div>
				<h3 class="font-medium text-gray-900 mb-1">SE = σ/√n</h3>
				<p class="text-sm text-gray-600">
					Standard error shrinks with √n. Quadruple n to halve SE.
				</p>
			</div>
		</div>

		<div class="bg-blue-50 rounded-xl p-5 mt-4">
			<h3 class="font-semibold text-blue-900 mb-2">The Bottom Line</h3>
			<p class="text-blue-800">
				The CLT is why statistics works. It guarantees that with large enough samples, we can use
				normal distribution tools to calculate probabilities and make inferences—even when the
				underlying population is far from normal.
			</p>
		</div>
	</section>

	<!-- Practice Exercises -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-2">Practice Exercises</h2>
		<p class="text-gray-600 mb-4">Test your understanding with these {exercises.length} exercises, progressing from basic concepts to applications.</p>

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

			<!-- Exercise Navigation -->
			<div class="flex items-center justify-between pt-4 border-t border-gray-200">
				<button
					class="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
					disabled={currentExerciseIndex === 0}
					onclick={() => currentExerciseIndex--}
				>
					← Previous
				</button>
				<div class="flex items-center gap-2">
					{#each exercises as _, i}
						<button
							class="w-3 h-3 rounded-full transition-colors {i === currentExerciseIndex ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'}"
							onclick={() => currentExerciseIndex = i}
							aria-label="Go to exercise {i + 1}"
						></button>
					{/each}
				</div>
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

	<!-- What's Next -->
	<section class="bg-gray-50 rounded-xl p-6 mb-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-3">What's Next?</h2>
		<p class="text-gray-700 mb-4">
			Now that you understand why sample means follow a normal distribution, you're ready to explore:
		</p>
		<ul class="text-gray-700 space-y-2">
			<li>• <strong>Sampling Distributions:</strong> Dive deeper into the properties of different statistics</li>
			<li>• <strong>Standard Error:</strong> Master the calculation and interpretation of SE</li>
			<li>• <strong>Confidence Intervals:</strong> Use the CLT to quantify uncertainty in estimates</li>
		</ul>
	</section>

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/1-foundations" class="text-gray-600 hover:text-gray-900">
			← Back to Module 1
		</a>
		<a href="/modules/1-foundations/sampling" class="text-blue-600 hover:text-blue-700 font-medium">
			Next: Sampling Distributions →
		</a>
	</div>
</div>
