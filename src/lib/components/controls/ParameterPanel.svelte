<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Slider from './Slider.svelte';

	export interface Parameter {
		name: string;
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		description?: string;
	}

	let {
		title = 'Parameters',
		parameters = [] as Parameter[],
		collapsed = false
	}: {
		title?: string;
		parameters?: Parameter[];
		collapsed?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		change: { name: string; value: number; all: Record<string, number> };
	}>();

	let isCollapsed = $state(collapsed);

	function handleParameterChange(param: Parameter, newValue: number) {
		param.value = newValue;
		dispatch('change', {
			name: param.name,
			value: newValue,
			all: Object.fromEntries(parameters.map((p) => [p.name, p.value]))
		});
	}

	function toggleCollapsed() {
		isCollapsed = !isCollapsed;
	}
</script>

<div class="parameter-panel bg-white rounded-xl border border-gray-200 overflow-hidden">
	<!-- Header -->
	<button
		class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
		onclick={toggleCollapsed}
	>
		<h3 class="font-semibold text-gray-900">{title}</h3>
		<svg
			class="w-5 h-5 text-gray-500 transform transition-transform"
			class:rotate-180={!isCollapsed}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Parameters -->
	{#if !isCollapsed}
		<div class="p-4 space-y-5">
			{#each parameters as param}
				<div class="parameter-item">
					<Slider
						label={param.label}
						bind:value={param.value}
						min={param.min}
						max={param.max}
						step={param.step ?? 1}
						unit={param.unit ?? ''}
						on:change={(e) => handleParameterChange(param, e.detail)}
					/>
					{#if param.description}
						<p class="text-xs text-gray-500 mt-1">{param.description}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.parameter-panel {
		width: 100%;
	}

	.parameter-item {
		padding-bottom: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.parameter-item:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}
</style>
