<script lang="ts">
	const modules = [
		{
			id: 1,
			title: 'Foundations of Uncertainty',
			description: 'Build intuition for randomness, sampling distributions, and the Central Limit Theorem',
			href: '/modules/1-foundations',
			color: 'bg-blue-500'
		},
		{
			id: 2,
			title: 'Logic of Hypothesis Testing',
			description: 'Understand p-values, Type I/II errors, statistical power, and effect sizes',
			href: '/modules/2-hypothesis',
			color: 'bg-emerald-500'
		},
		{
			id: 3,
			title: 'Comparing Groups',
			description: 'Master t-tests, paired vs independent designs, and assumption checking',
			href: '/modules/3-comparing',
			color: 'bg-violet-500'
		},
		{
			id: 4,
			title: 'Relationships and Patterns',
			description: 'Explore correlation, regression, residuals, and multiple predictors',
			href: '/modules/4-relationships',
			color: 'bg-amber-500'
		},
		{
			id: 5,
			title: 'Beyond the Basics',
			description: 'Learn robust methods, multiple testing corrections, and Bayesian thinking',
			href: '/modules/5-beyond',
			color: 'bg-rose-500'
		}
	];

	const features = [
		{
			title: 'The Sandbox',
			description: 'Experiment freely with data and parameters',
			href: '/sandbox',
			icon: '🧪'
		},
		{
			title: 'Scenario Challenges',
			description: 'Apply your knowledge to realistic problems',
			href: '/challenges',
			icon: '🎯'
		},
		{
			title: 'Visual Explainers',
			description: 'Step-by-step animated concept guides',
			href: '/explainers',
			icon: '📊'
		},
		{
			title: 'Misconception Museum',
			description: 'Debunk common statistical myths',
			href: '/misconceptions',
			icon: '🔍'
		}
	];
</script>

<div class="max-w-6xl mx-auto px-4 py-12">
	<!-- Hero Section -->
	<header class="text-center mb-16">
		<h1 class="text-5xl font-bold text-gray-900 mb-4">StatLab</h1>
		<p class="text-xl text-gray-600 max-w-2xl mx-auto">
			Interactive Statistics & Hypothesis Testing.
			Build intuition through visualization and experimentation.
		</p>
	</header>

	<!-- Learning Modules -->
	<section class="mb-16">
		<h2 class="text-2xl font-semibold text-gray-800 mb-6">Learning Modules</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each modules as module}
				<a
					href={module.href}
					class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
				>
					<div class="flex items-start gap-4">
						<div class="{module.color} w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg">
							{module.id}
						</div>
						<div class="flex-1">
							<h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
								{module.title}
							</h3>
							<p class="text-sm text-gray-600 mt-1">{module.description}</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- Interactive Features -->
	<section>
		<h2 class="text-2xl font-semibold text-gray-800 mb-6">Interactive Features</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each features as feature}
				<a
					href={feature.href}
					class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-center"
				>
					<div class="text-4xl mb-3">{feature.icon}</div>
					<h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
						{feature.title}
					</h3>
					<p class="text-sm text-gray-600 mt-1">{feature.description}</p>
				</a>
			{/each}
		</div>
	</section>
</div>
