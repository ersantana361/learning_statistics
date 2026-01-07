<script lang="ts">
	import SamplingAnimation from '$lib/components/visualizations/SamplingAnimation.svelte';
	import Slider from '$lib/components/controls/Slider.svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';
	import ExerciseCard from '$lib/components/feedback/ExerciseCard.svelte';
	import type { Exercise } from '$lib/components/feedback/ExerciseCard.svelte';

	// LaTeX formulas (defined here to avoid template escaping issues)
	const cltFormula = String.raw`\bar{X} \sim N\left(\mu, \frac{\sigma}{\sqrt{n}}\right)`;
	const seFormula = String.raw`SE = \frac{\sigma}{\sqrt{n}} = \frac{20}{\sqrt{100}} = ?`;
	const seExplanation = String.raw`SE = \frac{20}{\sqrt{100}} = \frac{20}{10} = 2`;

	// Parameters
	let populationType = $state<'uniform' | 'exponential' | 'bimodal' | 'normal'>('uniform');
	let sampleSize = $state(30);
	let numSamples = $state(200);
	let speed = $state<'slow' | 'normal' | 'fast'>('normal');

	// Force re-render of SamplingAnimation when params change
	let animationKey = $state(0);
	function resetAnimation() {
		animationKey++;
	}

	// Sample exercises for this topic
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
			type: 'numeric',
			question: 'If a population has σ = 20 and you take samples of size n = 100, what is the standard error of the mean?',
			questionMath: seFormula,
			correctAnswer: 2,
			tolerance: 0.01,
			explanation: 'The standard error is calculated as σ/√n = 20/√100 = 20/10 = 2',
			explanationMath: seExplanation,
			difficulty: 'medium'
		},
		{
			id: 'clt-3',
			type: 'true-false',
			question: 'The Central Limit Theorem only works when the population distribution is normal.',
			choices: [
				{ id: 'true', text: 'True' },
				{ id: 'false', text: 'False', isCorrect: true }
			],
			explanation: 'False! The beauty of the CLT is that it works regardless of the population distribution. The sampling distribution of means approaches normal even from highly skewed or unusual populations, given sufficient sample size.',
			difficulty: 'easy'
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
			<span>Central Limit Theorem</span>
		</nav>
		<h1 class="text-3xl font-bold text-gray-900 mb-3">Central Limit Theorem</h1>
		<p class="text-lg text-gray-600">
			Watch how sample means form a normal distribution, regardless of the population shape.
		</p>
	</header>

	<!-- Key Concept -->
	<section class="bg-blue-50 rounded-xl p-6 mb-8">
		<h2 class="font-semibold text-blue-900 mb-3">The Big Idea</h2>
		<p class="text-blue-800 mb-4">
			When you take many samples from any population and calculate their means,
			those means will form an approximately <strong>normal distribution</strong> —
			even if the original population is not normal!
		</p>
		<div class="bg-white rounded-lg p-4">
			<MathDisplay
				formula={cltFormula}
				displayMode={true}
			/>
			<p class="text-sm text-gray-600 text-center mt-2">
				The sampling distribution of the mean has mean μ and standard error σ/√n
			</p>
		</div>
	</section>

	<!-- Interactive Demo -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Interactive Demonstration</h2>

		<!-- Controls -->
		<div class="bg-white rounded-xl border border-gray-200 p-6 mb-4">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2" for="population-shape">Population Shape</label>
					<select
						id="population-shape"
						bind:value={populationType}
						onchange={resetAnimation}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
					>
						<option value="uniform">Uniform</option>
						<option value="exponential">Exponential (Skewed)</option>
						<option value="bimodal">Bimodal</option>
						<option value="normal">Normal</option>
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
						class="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
	</section>

	<!-- Key Points -->
	<section class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Key Takeaways</h2>
		<div class="grid md:grid-cols-3 gap-4">
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">📊</div>
				<h3 class="font-medium text-gray-900 mb-1">Shape → Normal</h3>
				<p class="text-sm text-gray-600">
					No matter the population shape, the sampling distribution of means approaches normal.
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">🎯</div>
				<h3 class="font-medium text-gray-900 mb-1">Center Stays Same</h3>
				<p class="text-sm text-gray-600">
					The mean of the sampling distribution equals the population mean (μ).
				</p>
			</div>
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="text-2xl mb-2">📏</div>
				<h3 class="font-medium text-gray-900 mb-1">Spread Shrinks</h3>
				<p class="text-sm text-gray-600">
					Standard error = σ/√n. Larger samples → narrower distribution.
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

			<!-- Exercise Navigation -->
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

	<!-- Next Topic -->
	<div class="flex justify-between pt-6 border-t border-gray-200">
		<a href="/modules/1-foundations" class="text-gray-600 hover:text-gray-900">
			← Back to Module 1
		</a>
		<a href="/modules/1-foundations/sampling" class="text-blue-600 hover:text-blue-700 font-medium">
			Next: Sampling Distributions →
		</a>
	</div>
</div>
