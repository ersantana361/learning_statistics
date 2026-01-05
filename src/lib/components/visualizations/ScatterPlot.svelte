<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import * as d3 from 'd3';
	import ss from 'simple-statistics';

	export interface DataPoint {
		x: number;
		y: number;
		id?: string;
	}

	let {
		data = [] as DataPoint[],
		width = 600,
		height = 400,
		showRegressionLine = false,
		showCorrelation = true,
		allowAddPoints = true,
		allowDragPoints = true,
		xLabel = 'X',
		yLabel = 'Y',
		pointColor = 'var(--color-data-point, #3b82f6)',
		regressionColor = 'var(--color-regression-line, #10b981)',
		animate = true
	}: {
		data?: DataPoint[];
		width?: number;
		height?: number;
		showRegressionLine?: boolean;
		showCorrelation?: boolean;
		allowAddPoints?: boolean;
		allowDragPoints?: boolean;
		xLabel?: string;
		yLabel?: string;
		pointColor?: string;
		regressionColor?: string;
		animate?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		pointAdded: DataPoint;
		pointMoved: { point: DataPoint; index: number };
		pointRemoved: { index: number };
	}>();

	let container: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
	let isDragging = false;

	const margin = { top: 30, right: 30, bottom: 50, left: 60 };
	const innerWidth = $derived(width - margin.left - margin.right);
	const innerHeight = $derived(height - margin.top - margin.bottom);

	// Calculate correlation
	const correlation = $derived(() => {
		if (data.length < 2) return 0;
		const xs = data.map((d) => d.x);
		const ys = data.map((d) => d.y);
		return ss.sampleCorrelation(xs, ys);
	});

	// Calculate regression line
	const regressionLine = $derived(() => {
		if (data.length < 2) return null;
		const xs = data.map((d) => d.x);
		const ys = data.map((d) => d.y);
		const regression = ss.linearRegression(data.map((d) => [d.x, d.y]));
		return {
			slope: regression.m,
			intercept: regression.b,
			predict: (x: number) => regression.m * x + regression.b
		};
	});

	// Scales with padding
	const xExtent = $derived(d3.extent(data, (d) => d.x) as [number, number]);
	const yExtent = $derived(d3.extent(data, (d) => d.y) as [number, number]);

	const xScale = $derived(
		d3.scaleLinear()
			.domain(data.length > 0 ? [xExtent[0] - 1, xExtent[1] + 1] : [0, 10])
			.range([0, innerWidth])
	);

	const yScale = $derived(
		d3.scaleLinear()
			.domain(data.length > 0 ? [yExtent[0] - 1, yExtent[1] + 1] : [0, 10])
			.range([innerHeight, 0])
	);

	onMount(() => {
		svg = d3.select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height);

		const g = svg.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Grid
		g.append('g')
			.attr('class', 'grid-x')
			.attr('transform', `translate(0,${innerHeight})`);

		g.append('g')
			.attr('class', 'grid-y');

		// Axes
		g.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${innerHeight})`);

		g.append('g')
			.attr('class', 'y-axis');

		// Regression line
		g.append('line')
			.attr('class', 'regression-line')
			.attr('stroke', regressionColor)
			.attr('stroke-width', 2)
			.style('display', 'none');

		// Points group
		g.append('g').attr('class', 'points');

		// Correlation display
		g.append('text')
			.attr('class', 'correlation-label')
			.attr('x', innerWidth - 10)
			.attr('y', 20)
			.attr('text-anchor', 'end')
			.attr('font-size', '14px')
			.attr('font-weight', 'bold');

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
			.attr('transform', 'rotate(-90)')
			.attr('x', -innerHeight / 2)
			.attr('y', -45)
			.attr('fill', '#6b7280')
			.attr('font-size', '12px');

		// Click to add points
		if (allowAddPoints) {
			g.append('rect')
				.attr('class', 'click-area')
				.attr('width', innerWidth)
				.attr('height', innerHeight)
				.attr('fill', 'transparent')
				.style('cursor', 'crosshair')
				.on('click', (event: MouseEvent) => {
					if (isDragging) return;
					const [mx, my] = d3.pointer(event);
					const newPoint: DataPoint = {
						x: xScale.invert(mx),
						y: yScale.invert(my),
						id: `point-${Date.now()}`
					};
					dispatch('pointAdded', newPoint);
				});
		}
	});

	// Update visualization
	$effect(() => {
		if (!svg) return;

		const g = svg.select('g');

		// Update axes
		const xAxis = d3.axisBottom(xScale).ticks(10);
		const yAxis = d3.axisLeft(yScale).ticks(8);

		g.select<SVGGElement>('.x-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(xAxis);

		g.select<SVGGElement>('.y-axis')
			.transition()
			.duration(animate ? 300 : 0)
			.call(yAxis);

		// Update grid
		g.select('.grid-x')
			.call(
				d3.axisBottom(xScale)
					.tickSize(-innerHeight)
					.tickFormat(() => '') as any
			)
			.selectAll('line')
			.attr('stroke', '#e5e7eb')
			.attr('stroke-dasharray', '2,2');

		g.select('.grid-y')
			.call(
				d3.axisLeft(yScale)
					.tickSize(-innerWidth)
					.tickFormat(() => '') as any
			)
			.selectAll('line')
			.attr('stroke', '#e5e7eb')
			.attr('stroke-dasharray', '2,2');

		// Update regression line
		const reg = regressionLine();
		if (showRegressionLine && reg && data.length >= 2) {
			const x1 = xScale.domain()[0];
			const x2 = xScale.domain()[1];
			g.select('.regression-line')
				.transition()
				.duration(animate ? 300 : 0)
				.attr('x1', xScale(x1))
				.attr('y1', yScale(reg.predict(x1)))
				.attr('x2', xScale(x2))
				.attr('y2', yScale(reg.predict(x2)))
				.style('display', 'block');
		} else {
			g.select('.regression-line').style('display', 'none');
		}

		// Update points
		const points = g.select('.points')
			.selectAll<SVGCircleElement, DataPoint>('circle')
			.data(data, (d, i) => d.id ?? i.toString());

		// Drag behavior
		const drag = d3.drag<SVGCircleElement, DataPoint>()
			.on('start', () => { isDragging = true; })
			.on('drag', (event, d) => {
				const newX = xScale.invert(event.x);
				const newY = yScale.invert(event.y);
				d.x = newX;
				d.y = newY;
				d3.select(event.sourceEvent.target)
					.attr('cx', xScale(newX))
					.attr('cy', yScale(newY));
			})
			.on('end', (event, d) => {
				setTimeout(() => { isDragging = false; }, 100);
				const index = data.indexOf(d);
				dispatch('pointMoved', { point: d, index });
			});

		// Enter
		const enterPoints = points.enter()
			.append('circle')
			.attr('r', 0)
			.attr('cx', (d) => xScale(d.x))
			.attr('cy', (d) => yScale(d.y))
			.attr('fill', pointColor)
			.attr('stroke', 'white')
			.attr('stroke-width', 2)
			.style('cursor', allowDragPoints ? 'grab' : 'default');

		if (allowDragPoints) {
			enterPoints.call(drag);
		}

		enterPoints.transition()
			.duration(animate ? 300 : 0)
			.attr('r', 8);

		// Update
		points.transition()
			.duration(animate ? 300 : 0)
			.attr('cx', (d) => xScale(d.x))
			.attr('cy', (d) => yScale(d.y));

		// Exit
		points.exit()
			.transition()
			.duration(animate ? 200 : 0)
			.attr('r', 0)
			.remove();

		// Update correlation display
		const r = correlation();
		if (showCorrelation && data.length >= 2) {
			const color = r >= 0 ? '#10b981' : '#ef4444';
			g.select('.correlation-label')
				.text(`r = ${r.toFixed(3)}`)
				.attr('fill', color)
				.style('display', 'block');
		} else {
			g.select('.correlation-label').style('display', 'none');
		}

		// Update labels
		g.select('.x-label').text(xLabel);
		g.select('.y-label').text(yLabel);
	});
</script>

<div bind:this={container} class="scatter-plot">
	{#if data.length === 0 && allowAddPoints}
		<div
			class="absolute inset-0 flex items-center justify-center pointer-events-none"
			style="width: {width}px; height: {height}px"
		>
			<p class="text-gray-400 text-sm bg-white px-3 py-1 rounded">Click to add points</p>
		</div>
	{/if}
</div>

<style>
	.scatter-plot {
		position: relative;
	}

	.scatter-plot :global(.domain) {
		stroke: #9ca3af;
	}

	.scatter-plot :global(.tick line) {
		stroke: #d1d5db;
	}

	.scatter-plot :global(.tick text) {
		fill: #6b7280;
		font-size: 11px;
	}

	.scatter-plot :global(circle) {
		transition: transform 0.15s ease;
	}

	.scatter-plot :global(circle:hover) {
		transform: scale(1.2);
	}
</style>
