<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { normal, studentT, chiSquared, fDist, type DistributionPoint } from '$lib/stats/distributions';

	// Props
	let {
		type = 'normal',
		// Normal params
		mean = 0,
		sd = 1,
		// T and Chi-squared params
		df = 10,
		// F params
		df1 = 5,
		df2 = 10,
		// Visualization options
		width = 600,
		height = 300,
		showArea = null as { from: number; to: number; color?: string; label?: string } | null,
		highlightX = null as number | null,
		showGrid = true,
		animate = true,
		color = 'var(--color-distribution-primary, #3b82f6)'
	}: {
		type?: 'normal' | 't' | 'chi-squared' | 'f';
		mean?: number;
		sd?: number;
		df?: number;
		df1?: number;
		df2?: number;
		width?: number;
		height?: number;
		showArea?: { from: number; to: number; color?: string; label?: string } | null;
		highlightX?: number | null;
		showGrid?: boolean;
		animate?: boolean;
		color?: string;
	} = $props();

	let container: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

	const margin = { top: 20, right: 30, bottom: 40, left: 50 };
	const innerWidth = $derived(width - margin.left - margin.right);
	const innerHeight = $derived(height - margin.top - margin.bottom);

	// Generate curve points based on distribution type
	const curvePoints = $derived.by(() => {
		switch (type) {
			case 'normal':
				return normal.curve(mean, sd, 150);
			case 't':
				return studentT.curve(df, 150);
			case 'chi-squared':
				return chiSquared.curve(df, 150);
			case 'f':
				return fDist.curve(df1, df2, 150);
			default:
				return normal.curve(0, 1, 150);
		}
	});

	// Calculate PDF at a point
	function getPdf(x: number): number {
		switch (type) {
			case 'normal':
				return normal.pdf(x, mean, sd);
			case 't':
				return studentT.pdf(x, df);
			case 'chi-squared':
				return chiSquared.pdf(x, df);
			case 'f':
				return fDist.pdf(x, df1, df2);
			default:
				return normal.pdf(x, 0, 1);
		}
	}

	// X and Y scales
	const xScale = $derived(
		d3.scaleLinear()
			.domain(d3.extent(curvePoints, (d) => d.x) as [number, number])
			.range([0, innerWidth])
	);

	const yScale = $derived(
		d3.scaleLinear()
			.domain([0, d3.max(curvePoints, (d) => d.y) as number * 1.1])
			.range([innerHeight, 0])
	);

	// Line generator
	const line = $derived(
		d3.line<DistributionPoint>()
			.x((d) => xScale(d.x))
			.y((d) => yScale(d.y))
			.curve(d3.curveBasis)
	);

	// Area generator for shading
	const areaGenerator = $derived(
		d3.area<DistributionPoint>()
			.x((d) => xScale(d.x))
			.y0(innerHeight)
			.y1((d) => yScale(d.y))
			.curve(d3.curveBasis)
	);

	// Filter points for shaded area
	const areaPoints = $derived.by(() => {
		if (!showArea) return [];
		return curvePoints.filter(
			(p) => p.x >= showArea.from && p.x <= showArea.to
		);
	});

	onMount(() => {
		svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height);

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Grid
		if (showGrid) {
			g.append('g')
				.attr('class', 'grid-x')
				.attr('transform', `translate(0,${innerHeight})`)
				.call(
					d3.axisBottom(xScale)
						.tickSize(-innerHeight)
						.tickFormat(() => '')
				)
				.selectAll('line')
				.attr('stroke', '#e5e7eb')
				.attr('stroke-dasharray', '2,2');

			g.append('g')
				.attr('class', 'grid-y')
				.call(
					d3.axisLeft(yScale)
						.tickSize(-innerWidth)
						.tickFormat(() => '')
				)
				.selectAll('line')
				.attr('stroke', '#e5e7eb')
				.attr('stroke-dasharray', '2,2');
		}

		// X axis
		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(d3.axisBottom(xScale).ticks(10));

		// Y axis
		g.append('g')
			.attr('class', 'y-axis')
			.call(d3.axisLeft(yScale).ticks(5));

		// Shaded area
		g.append('path')
			.attr('class', 'shaded-area')
			.attr('fill', showArea?.color || 'var(--color-shade-medium, rgba(59, 130, 246, 0.3))')
			.attr('opacity', 0.6);

		// Distribution curve
		g.append('path')
			.attr('class', 'distribution-curve')
			.attr('fill', 'none')
			.attr('stroke', color)
			.attr('stroke-width', 2.5);

		// Highlight marker
		g.append('g')
			.attr('class', 'highlight-marker')
			.style('display', 'none');

		// Area label
		g.append('text')
			.attr('class', 'area-label')
			.attr('text-anchor', 'middle')
			.attr('font-size', '12px')
			.attr('fill', '#374151');
	});

	// Update visualization when props change
	$effect(() => {
		if (!svg) return;

		const g = svg.select('g');

		// Update scales
		const xAxis = d3.axisBottom(xScale).ticks(10);
		const yAxis = d3.axisLeft(yScale).ticks(5);

		g.select<SVGGElement>('.x-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(xAxis);

		g.select<SVGGElement>('.y-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(yAxis);

		// Update curve
		g.select('.distribution-curve')
			.datum(curvePoints)
			.transition()
			.duration(animate ? 500 : 0)
			.attr('d', line);

		// Update shaded area
		if (showArea && areaPoints.length > 0) {
			g.select('.shaded-area')
				.datum(areaPoints)
				.transition()
				.duration(animate ? 500 : 0)
				.attr('d', areaGenerator)
				.attr('fill', showArea.color || 'var(--color-shade-medium, rgba(59, 130, 246, 0.3))');

			// Area label
			if (showArea.label) {
				const midX = (showArea.from + showArea.to) / 2;
				const midY = getPdf(midX);
				g.select('.area-label')
					.attr('x', xScale(midX))
					.attr('y', yScale(midY) - 10)
					.text(showArea.label);
			}
		} else {
			g.select('.shaded-area').attr('d', '');
			g.select('.area-label').text('');
		}

		// Update highlight marker
		const marker = g.select('.highlight-marker');
		if (highlightX !== null) {
			const y = getPdf(highlightX);
			marker
				.style('display', 'block')
				.attr('transform', `translate(${xScale(highlightX)},${yScale(y)})`);

			// Add circle if not exists
			if (marker.select('circle').empty()) {
				marker.append('circle')
					.attr('r', 6)
					.attr('fill', 'var(--color-data-point-hover, #1d4ed8)')
					.attr('stroke', 'white')
					.attr('stroke-width', 2);

				marker.append('line')
					.attr('y1', 0)
					.attr('stroke', 'var(--color-data-point-hover, #1d4ed8)')
					.attr('stroke-width', 1)
					.attr('stroke-dasharray', '4,4');
			}

			marker.select('line')
				.attr('y2', innerHeight - yScale(y));
		} else {
			marker.style('display', 'none');
		}
	});
</script>

<div bind:this={container} class="distribution-chart"></div>

<style>
	.distribution-chart :global(.domain) {
		stroke: #9ca3af;
	}

	.distribution-chart :global(.tick line) {
		stroke: #d1d5db;
	}

	.distribution-chart :global(.tick text) {
		fill: #6b7280;
		font-size: 11px;
	}
</style>
