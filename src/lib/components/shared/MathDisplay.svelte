<script lang="ts">
	import { onMount } from 'svelte';
	import katex from 'katex';

	let {
		formula = '',
		displayMode = false,
		variables = {} as Record<string, number | string>,
		highlightVariables = [] as string[],
		errorColor = '#ef4444'
	}: {
		formula?: string;
		displayMode?: boolean;
		variables?: Record<string, number | string>;
		highlightVariables?: string[];
		errorColor?: string;
	} = $props();

	let container: HTMLSpanElement;
	let error = $state<string | null>(null);

	// Replace variable placeholders with their values
	function interpolateFormula(latex: string, vars: Record<string, number | string>): string {
		let result = latex;
		for (const [key, value] of Object.entries(vars)) {
			const formattedValue = typeof value === 'number'
				? formatNumber(value)
				: value;
			// Replace {varName} with the value
			result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), formattedValue);
		}
		return result;
	}

	// Format numbers nicely
	function formatNumber(n: number): string {
		if (Number.isInteger(n)) return n.toString();
		if (Math.abs(n) < 0.001 || Math.abs(n) >= 10000) {
			return n.toExponential(2);
		}
		return n.toFixed(3).replace(/\.?0+$/, '');
	}

	// Add highlighting to specific variables
	function addHighlighting(latex: string, highlights: string[]): string {
		let result = latex;
		for (const varName of highlights) {
			// Wrap the variable in a colored box
			result = result.replace(
				new RegExp(`(${varName})`, 'g'),
				`\\textcolor{blue}{\\boxed{$1}}`
			);
		}
		return result;
	}

	// Render the formula
	function render() {
		if (!container || !formula) return;

		try {
			let processedFormula = interpolateFormula(formula, variables);

			if (highlightVariables.length > 0) {
				processedFormula = addHighlighting(processedFormula, highlightVariables);
			}

			katex.render(processedFormula, container, {
				displayMode,
				throwOnError: false,
				errorColor,
				trust: true,
				strict: false
			});
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to render formula';
			container.textContent = formula;
		}
	}

	onMount(() => {
		render();
	});

	$effect(() => {
		// Re-render when any prop changes
		formula;
		displayMode;
		variables;
		highlightVariables;
		render();
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
</svelte:head>

<span
	bind:this={container}
	class="math-display"
	class:block={displayMode}
	class:inline={!displayMode}
	class:error
></span>

{#if error}
	<span class="text-red-500 text-xs ml-2" title={error}>
		(Error)
	</span>
{/if}

<style>
	.math-display {
		font-size: inherit;
	}

	.math-display.block {
		display: block;
		text-align: center;
		margin: 1rem 0;
	}

	.math-display.inline {
		display: inline;
	}

	.math-display.error {
		color: #ef4444;
		font-family: monospace;
	}

	/* KaTeX overrides for better integration */
	.math-display :global(.katex) {
		font-size: 1.1em;
	}

	.math-display :global(.katex-display) {
		margin: 0.5em 0;
	}

	/* Highlight animation for variables */
	.math-display :global(.mord.text) {
		transition: color 0.2s ease;
	}
</style>
