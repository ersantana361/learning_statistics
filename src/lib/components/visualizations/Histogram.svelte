<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let {
		data = [] as number[],
		bins = 20,
		width = 600,
		height = 300,
		color = 'var(--color-distribution-primary, #3b82f6)',
		showMean = true,
		showDensity = false,
		xLabel = '',
		yLabel = 'Frequency',
		animate = true
	}: {
		data?: number[];
		bins?: number;
		width?: number;
		height?: number;
		color?: string;
		showMean?: boolean;
		showDensity?: boolean;
		xLabel?: string;
		yLabel?: string;
		animate?: boolean;
	} = $props();

	let container: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

	const margin = { top: 20, right: 30, bottom: 50, left: 60 };
	const innerWidth = $derived(width - margin.left - margin.right);
	const innerHeight = $derived(height - margin.top - margin.bottom);

	// Calculate statistics
	const mean = $derived(data.length > 0 ? d3.mean(data) ?? 0 : 0);
	const std = $derived(data.length > 0 ? d3.deviation(data) ?? 0 : 0);

	// Create histogram bins
	const histogram = $derived(
		d3.bin()
			.domain(d3.extent(data) as [number, number])
			.thresholds(bins)
	);

	const histogramData = $derived(data.length > 0 ? histogram(data) : []);

	// Scales
	const xScale = $derived(
		d3.scaleLinear()
			.domain(d3.extent(data) as [number, number])
			.range([0, innerWidth])
			.nice()
	);

	const yScale = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(histogramData, (d) => d.length) ?? 1])
			.range([innerHeight, 0])
			.nice()
	);

	onMount(() => {
		svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height);

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// X axis
		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`);

		// Y axis
		g.append('g')
			.attr('class', 'y-axis');

		// Bars group
		g.append('g').attr('class', 'bars');

		// Mean line
		g.append('line')
			.attr('class', 'mean-line')
			.attr('stroke', '#ef4444')
			.attr('stroke-width', 2)
			.attr('stroke-dasharray', '5,5');

		// Mean label
		g.append('text')
			.attr('class', 'mean-label')
			.attr('fill', '#ef4444')
			.attr('font-size', '12px')
			.attr('text-anchor', 'middle');

		// X axis label
		g.append('text')
			.attr('class', 'x-label')
			.attr('text-anchor', 'middle')
			.attr('x', innerWidth / 2)
			.attr('y', innerHeight + 40)
			.attr('fill', '#6b7280')
			.attr('font-size', '12px');

		// Y axis label
		g.append('text')
			.attr('class', 'y-label')
			.attr('text-anchor', 'middle')
			.attr('transform', `rotate(-90)`)
			.attr('x', -innerHeight / 2)
			.attr('y', -45)
			.attr('fill', '#6b7280')
			.attr('font-size', '12px');
	});

	// Update visualization when data changes
	$effect(() => {
		if (!svg || data.length === 0) return;

		const g = svg.select('g');

		// Update axes
		const xAxis = d3.axisBottom(xScale).ticks(10);
		const yAxis = d3.axisLeft(yScale).ticks(6);

		g.select<SVGGElement>('.x-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(xAxis);

		g.select<SVGGElement>('.y-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(yAxis);

		// Update bars
		const bars = g.select('.bars')
			.selectAll<SVGRectElement, d3.Bin<number, number>>('rect')
			.data(histogramData, (d, i) => i.toString());

		// Enter
		bars.enter()
			.append('rect')
			.attr('fill', color)
			.attr('x', (d) => xScale(d.x0 ?? 0) + 1)
			.attr('y', innerHeight)
			.attr('width', (d) => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 2))
			.attr('height', 0)
			.attr('rx', 2)
			.transition()
			.duration(animate ? 500 : 0)
			.attr('y', (d) => yScale(d.length))
			.attr('height', (d) => innerHeight - yScale(d.length));

		// Update
		bars.transition()
			.duration(animate ? 300 : 0)
			.attr('x', (d) => xScale(d.x0 ?? 0) + 1)
			.attr('y', (d) => yScale(d.length))
			.attr('width', (d) => Math.max(0, xScale(d.x1 ?? 0) - xScale(d.x0 ?? 0) - 2))
			.attr('height', (d) => innerHeight - yScale(d.length));

		// Exit
		bars.exit()
			.transition()
			.duration(animate ? 300 : 0)
			.attr('y', innerHeight)
			.attr('height', 0)
			.remove();

		// Update mean line
		if (showMean && data.length > 0) {
			g.select('.mean-line')
				.transition()
				.duration(animate ? 300 : 0)
				.attr('x1', xScale(mean))
				.attr('x2', xScale(mean))
				.attr('y1', 0)
				.attr('y2', innerHeight)
				.style('display', 'block');

			g.select('.mean-label')
				.transition()
				.duration(animate ? 300 : 0)
				.attr('x', xScale(mean))
				.attr('y', -5)
				.text(`μ = ${mean.toFixed(2)}`)
				.style('display', 'block');
		} else {
			g.select('.mean-line').style('display', 'none');
			g.select('.mean-label').style('display', 'none');
		}

		// Update labels
		g.select('.x-label').text(xLabel);
		g.select('.y-label').text(yLabel);
	});
</script>

<div bind:this={container} class="histogram-chart">
	{#if data.length === 0}
		<div
			class="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
			style="width: {width}px; height: {height}px"
		>
			<p class="text-gray-500">No data to display. Generate a sample first.</p>
		</div>
	{/if}
</div>

<style>
	.histogram-chart :global(.domain) {
		stroke: #9ca3af;
	}

	.histogram-chart :global(.tick line) {
		stroke: #d1d5db;
	}

	.histogram-chart :global(.tick text) {
		fill: #6b7280;
		font-size: 11px;
	}

	.histogram-chart :global(rect) {
		transition: opacity 0.15s ease;
	}

	.histogram-chart :global(rect:hover) {
		opacity: 0.8;
	}
</style>
