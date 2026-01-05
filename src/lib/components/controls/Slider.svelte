<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label = '',
		unit = '',
		showValue = true,
		precision = 2,
		disabled = false
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		label?: string;
		unit?: string;
		showValue?: boolean;
		precision?: number;
		disabled?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{ change: number }>();

	function formatValue(val: number): string {
		if (Number.isInteger(step) && step >= 1) {
			return val.toString();
		}
		return val.toFixed(precision);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = parseFloat(target.value);
		dispatch('change', value);
	}

	// Calculate percentage for custom styling
	const percentage = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="slider-container" class:disabled>
	{#if label}
		<div class="flex items-center justify-between mb-1.5">
			<label class="text-sm font-medium text-gray-700">{label}</label>
			{#if showValue}
				<span class="text-sm font-mono text-gray-900">
					{formatValue(value)}{unit}
				</span>
			{/if}
		</div>
	{/if}

	<div class="relative">
		<input
			type="range"
			{min}
			{max}
			{step}
			{value}
			{disabled}
			oninput={handleInput}
			class="slider"
			style="--percentage: {percentage}%"
		/>

		<!-- Tick marks for certain ranges -->
		{#if max - min <= 10}
			<div class="flex justify-between mt-1 px-1">
				{#each Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step) as tick}
					<span class="text-xs text-gray-400">{tick}</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.slider-container {
		width: 100%;
	}

	.slider-container.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(
			to right,
			#3b82f6 0%,
			#3b82f6 var(--percentage),
			#e5e7eb var(--percentage),
			#e5e7eb 100%
		);
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 2px solid #3b82f6;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
	}

	.slider::-webkit-slider-thumb:active {
		transform: scale(0.95);
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 2px solid #3b82f6;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.slider:focus::-webkit-slider-thumb {
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}
</style>
