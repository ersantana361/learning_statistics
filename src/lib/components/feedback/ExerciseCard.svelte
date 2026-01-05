<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MathDisplay from '$lib/components/shared/MathDisplay.svelte';

	export type ExerciseType = 'multiple-choice' | 'numeric' | 'true-false';

	export interface Choice {
		id: string;
		text: string;
		isCorrect?: boolean;
	}

	export interface Exercise {
		id: string;
		type: ExerciseType;
		question: string;
		questionMath?: string; // Optional LaTeX formula in question
		choices?: Choice[];
		correctAnswer?: number; // For numeric type
		tolerance?: number; // For numeric type (default 0.01)
		explanation: string;
		explanationMath?: string;
		hint?: string;
		difficulty?: 'easy' | 'medium' | 'hard';
	}

	let {
		exercise,
		showFeedback = true,
		allowRetry = true
	}: {
		exercise: Exercise;
		showFeedback?: boolean;
		allowRetry?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		answered: { correct: boolean; answer: string | number };
		completed: { exerciseId: string; correct: boolean };
	}>();

	// State
	let selectedChoice = $state<string | null>(null);
	let numericAnswer = $state<string>('');
	let submitted = $state(false);
	let isCorrect = $state<boolean | null>(null);
	let showHint = $state(false);
	let attempts = $state(0);

	function checkAnswer() {
		attempts++;
		submitted = true;

		if (exercise.type === 'multiple-choice' || exercise.type === 'true-false') {
			const correctChoice = exercise.choices?.find((c) => c.isCorrect);
			isCorrect = selectedChoice === correctChoice?.id;
			dispatch('answered', { correct: isCorrect, answer: selectedChoice ?? '' });
		} else if (exercise.type === 'numeric') {
			const userAnswer = parseFloat(numericAnswer);
			const tolerance = exercise.tolerance ?? 0.01;
			const diff = Math.abs(userAnswer - (exercise.correctAnswer ?? 0));
			isCorrect = diff <= tolerance;
			dispatch('answered', { correct: isCorrect, answer: userAnswer });
		}

		if (isCorrect) {
			dispatch('completed', { exerciseId: exercise.id, correct: true });
		}
	}

	function retry() {
		submitted = false;
		isCorrect = null;
		selectedChoice = null;
		numericAnswer = '';
	}

	function toggleHint() {
		showHint = !showHint;
	}

	// Difficulty color
	const difficultyColor = $derived({
		easy: 'bg-green-100 text-green-700',
		medium: 'bg-yellow-100 text-yellow-700',
		hard: 'bg-red-100 text-red-700'
	}[exercise.difficulty ?? 'medium']);
</script>

<div class="exercise-card bg-white rounded-xl border border-gray-200 overflow-hidden">
	<!-- Header -->
	<div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium text-gray-500">Exercise</span>
			{#if exercise.difficulty}
				<span class="px-2 py-0.5 rounded-full text-xs font-medium {difficultyColor}">
					{exercise.difficulty}
				</span>
			{/if}
		</div>
		{#if attempts > 0}
			<span class="text-xs text-gray-400">Attempts: {attempts}</span>
		{/if}
	</div>

	<!-- Question -->
	<div class="p-6">
		<div class="mb-6">
			<p class="text-gray-900 text-lg leading-relaxed">{exercise.question}</p>
			{#if exercise.questionMath}
				<div class="mt-3">
					<MathDisplay formula={exercise.questionMath} displayMode={true} />
				</div>
			{/if}
		</div>

		<!-- Answer Options -->
		{#if exercise.type === 'multiple-choice' || exercise.type === 'true-false'}
			<div class="space-y-3">
				{#each exercise.choices ?? [] as choice}
					<button
						class="w-full text-left p-4 rounded-lg border-2 transition-all"
						class:border-gray-200={selectedChoice !== choice.id && !submitted}
						class:border-blue-500={selectedChoice === choice.id && !submitted}
						class:bg-blue-50={selectedChoice === choice.id && !submitted}
						class:border-green-500={submitted && choice.isCorrect}
						class:bg-green-50={submitted && choice.isCorrect}
						class:border-red-500={submitted && selectedChoice === choice.id && !choice.isCorrect}
						class:bg-red-50={submitted && selectedChoice === choice.id && !choice.isCorrect}
						disabled={submitted && !allowRetry}
						onclick={() => {
							if (!submitted) selectedChoice = choice.id;
						}}
					>
						<div class="flex items-center gap-3">
							<span
								class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium"
								class:border-gray-300={selectedChoice !== choice.id}
								class:border-blue-500={selectedChoice === choice.id && !submitted}
								class:bg-blue-500={selectedChoice === choice.id && !submitted}
								class:text-white={selectedChoice === choice.id && !submitted}
								class:border-green-500={submitted && choice.isCorrect}
								class:bg-green-500={submitted && choice.isCorrect}
								class:text-white={submitted && choice.isCorrect}
							>
								{#if submitted && choice.isCorrect}
									✓
								{:else if submitted && selectedChoice === choice.id && !choice.isCorrect}
									✗
								{/if}
							</span>
							<span class="flex-1">{choice.text}</span>
						</div>
					</button>
				{/each}
			</div>
		{:else if exercise.type === 'numeric'}
			<div class="space-y-3">
				<div class="flex items-center gap-4">
					<input
						type="number"
						bind:value={numericAnswer}
						placeholder="Enter your answer"
						class="flex-1 px-4 py-3 border-2 rounded-lg text-lg font-mono"
						class:border-gray-200={!submitted}
						class:border-green-500={submitted && isCorrect}
						class:border-red-500={submitted && !isCorrect}
						disabled={submitted && !allowRetry}
						step="any"
					/>
					{#if submitted}
						<div class="text-lg">
							{#if isCorrect}
								<span class="text-green-600 font-medium">✓ Correct!</span>
							{:else}
								<span class="text-red-600 font-medium">✗ Incorrect</span>
							{/if}
						</div>
					{/if}
				</div>
				{#if submitted && !isCorrect && exercise.correctAnswer !== undefined}
					<p class="text-sm text-gray-600">
						Correct answer: <span class="font-mono font-medium">{exercise.correctAnswer}</span>
						{#if exercise.tolerance && exercise.tolerance > 0.01}
							<span class="text-gray-400">(± {exercise.tolerance})</span>
						{/if}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Hint -->
		{#if exercise.hint && !submitted}
			<div class="mt-4">
				<button
					class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
					onclick={toggleHint}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{showHint ? 'Hide hint' : 'Show hint'}
				</button>
				{#if showHint}
					<p class="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
						{exercise.hint}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Actions -->
		<div class="mt-6 flex items-center gap-3">
			{#if !submitted}
				<button
					class="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={(exercise.type === 'multiple-choice' || exercise.type === 'true-false') && !selectedChoice ||
						exercise.type === 'numeric' && !numericAnswer}
					onclick={checkAnswer}
				>
					Check Answer
				</button>
			{:else if allowRetry && !isCorrect}
				<button
					class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
					onclick={retry}
				>
					Try Again
				</button>
			{/if}
		</div>

		<!-- Explanation -->
		{#if submitted && showFeedback}
			<div class="mt-6 p-4 rounded-lg" class:bg-green-50={isCorrect} class:bg-amber-50={!isCorrect}>
				<h4 class="font-medium mb-2" class:text-green-800={isCorrect} class:text-amber-800={!isCorrect}>
					{isCorrect ? 'Great job!' : 'Explanation'}
				</h4>
				<p class="text-sm" class:text-green-700={isCorrect} class:text-amber-700={!isCorrect}>
					{exercise.explanation}
				</p>
				{#if exercise.explanationMath}
					<div class="mt-2">
						<MathDisplay formula={exercise.explanationMath} displayMode={true} />
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.exercise-card {
		transition: box-shadow 0.2s ease;
	}

	.exercise-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}
</style>
