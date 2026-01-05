# StatLab: Interactive Statistics & Hypothesis Testing

A hands-on learning environment where abstract statistical concepts become tangible through interactive visualizations and real-world scenarios.

## Features

### Learning Modules
1. **Foundations of Uncertainty** - Central Limit Theorem, sampling distributions, sample size effects
2. **Logic of Hypothesis Testing** - P-values, Type I/II errors, statistical power, effect sizes
3. **Comparing Groups** - T-tests, paired vs independent designs, assumption checking
4. **Relationships and Patterns** - Correlation, regression, residuals, multiple predictors
5. **Beyond the Basics** - Robust methods, multiple testing, Bayesian thinking

### Interactive Features
- **The Sandbox** - Experiment with data and parameters in real-time
- **Scenario Challenges** - Apply knowledge to realistic A/B tests, clinical trials, and surveys
- **Visual Explainers** - Step-by-step animated concept guides
- **Misconception Museum** - Interactive demos debunking common statistical myths

### 75+ Exercises
Each module includes 15+ interactive exercises covering prediction, calculation, interpretation, and application.

## Tech Stack

- **Framework**: SvelteKit + TypeScript
- **Visualization**: D3.js
- **Statistics**: jStat + simple-statistics
- **Math Rendering**: KaTeX
- **Styling**: Tailwind CSS v4

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── visualizations/   # Distribution, Histogram, ScatterPlot, etc.
│   │   ├── controls/         # Slider, ParameterPanel
│   │   ├── feedback/         # ExerciseCard, Tooltip
│   │   └── shared/           # MathDisplay, DataTable
│   ├── stats/                # Statistical computation utilities
│   └── stores/               # Svelte stores for state
└── routes/
    ├── modules/              # 5 learning modules
    ├── sandbox/              # Experimentation playground
    ├── challenges/           # Scenario-based challenges
    ├── explainers/           # Visual concept explainers
    └── misconceptions/       # Misconception museum
```

## Philosophy

- **Learning by doing**: Every concept is accompanied by interactive exercises
- **Intuition before formulas**: Understand *why* before *how*
- **Honest about limitations**: Learn what statistical tools can't tell you
- **Connected to reality**: Examples from product analytics, research, and everyday decisions

## License

MIT
