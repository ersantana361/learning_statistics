/**
 * Statistical distribution utilities
 * Wraps jStat with TypeScript types for StatLab
 */

import jStat from 'jstat';

// Types
export interface DistributionPoint {
	x: number;
	y: number;
}

export interface NormalParams {
	mean: number;
	sd: number;
}

export interface TParams {
	df: number;
}

export interface ChiSquaredParams {
	df: number;
}

export interface FParams {
	df1: number;
	df2: number;
}

export type DistributionType = 'normal' | 't' | 'chi-squared' | 'f';

// Normal Distribution
export const normal = {
	pdf: (x: number, mean: number = 0, sd: number = 1): number => {
		return jStat.normal.pdf(x, mean, sd);
	},

	cdf: (x: number, mean: number = 0, sd: number = 1): number => {
		return jStat.normal.cdf(x, mean, sd);
	},

	inv: (p: number, mean: number = 0, sd: number = 1): number => {
		return jStat.normal.inv(p, mean, sd);
	},

	sample: (mean: number = 0, sd: number = 1): number => {
		return jStat.normal.sample(mean, sd);
	},

	/**
	 * Generate points for plotting the PDF curve
	 */
	curve: (mean: number = 0, sd: number = 1, numPoints: number = 100): DistributionPoint[] => {
		const xMin = mean - 4 * sd;
		const xMax = mean + 4 * sd;
		const step = (xMax - xMin) / numPoints;
		const points: DistributionPoint[] = [];

		for (let x = xMin; x <= xMax; x += step) {
			points.push({ x, y: jStat.normal.pdf(x, mean, sd) });
		}

		return points;
	}
};

// Student's t Distribution
export const studentT = {
	pdf: (x: number, df: number): number => {
		return jStat.studentt.pdf(x, df);
	},

	cdf: (x: number, df: number): number => {
		return jStat.studentt.cdf(x, df);
	},

	inv: (p: number, df: number): number => {
		return jStat.studentt.inv(p, df);
	},

	curve: (df: number, numPoints: number = 100): DistributionPoint[] => {
		const xMin = -4;
		const xMax = 4;
		const step = (xMax - xMin) / numPoints;
		const points: DistributionPoint[] = [];

		for (let x = xMin; x <= xMax; x += step) {
			points.push({ x, y: jStat.studentt.pdf(x, df) });
		}

		return points;
	}
};

// Chi-Squared Distribution
export const chiSquared = {
	pdf: (x: number, df: number): number => {
		return x >= 0 ? jStat.chisquare.pdf(x, df) : 0;
	},

	cdf: (x: number, df: number): number => {
		return x >= 0 ? jStat.chisquare.cdf(x, df) : 0;
	},

	inv: (p: number, df: number): number => {
		return jStat.chisquare.inv(p, df);
	},

	curve: (df: number, numPoints: number = 100): DistributionPoint[] => {
		const xMax = Math.max(df * 3, 20);
		const step = xMax / numPoints;
		const points: DistributionPoint[] = [];

		for (let x = 0.01; x <= xMax; x += step) {
			points.push({ x, y: jStat.chisquare.pdf(x, df) });
		}

		return points;
	}
};

// F Distribution
export const fDist = {
	pdf: (x: number, df1: number, df2: number): number => {
		return x >= 0 ? jStat.centralF.pdf(x, df1, df2) : 0;
	},

	cdf: (x: number, df1: number, df2: number): number => {
		return x >= 0 ? jStat.centralF.cdf(x, df1, df2) : 0;
	},

	inv: (p: number, df1: number, df2: number): number => {
		return jStat.centralF.inv(p, df1, df2);
	},

	curve: (df1: number, df2: number, numPoints: number = 100): DistributionPoint[] => {
		const xMax = 5;
		const step = xMax / numPoints;
		const points: DistributionPoint[] = [];

		for (let x = 0.01; x <= xMax; x += step) {
			points.push({ x, y: jStat.centralF.pdf(x, df1, df2) });
		}

		return points;
	}
};

// Utility functions for hypothesis testing
export const hypothesis = {
	/**
	 * Calculate z-score
	 */
	zScore: (x: number, mean: number, sd: number): number => {
		return (x - mean) / sd;
	},

	/**
	 * Calculate t-statistic for one-sample t-test
	 */
	tStatistic: (sampleMean: number, populationMean: number, sampleSd: number, n: number): number => {
		const se = sampleSd / Math.sqrt(n);
		return (sampleMean - populationMean) / se;
	},

	/**
	 * Calculate p-value for z-test (two-tailed)
	 */
	zTestPValue: (z: number, twoTailed: boolean = true): number => {
		const p = 1 - normal.cdf(Math.abs(z), 0, 1);
		return twoTailed ? 2 * p : p;
	},

	/**
	 * Calculate p-value for t-test (two-tailed)
	 */
	tTestPValue: (t: number, df: number, twoTailed: boolean = true): number => {
		const p = 1 - studentT.cdf(Math.abs(t), df);
		return twoTailed ? 2 * p : p;
	},

	/**
	 * Get critical value for significance level
	 */
	criticalValue: (alpha: number, df?: number, twoTailed: boolean = true): number => {
		const p = twoTailed ? 1 - alpha / 2 : 1 - alpha;
		if (df !== undefined) {
			return studentT.inv(p, df);
		}
		return normal.inv(p, 0, 1);
	}
};

// Standard error calculations
export const standardError = {
	/**
	 * Standard error of the mean
	 */
	mean: (sd: number, n: number): number => {
		return sd / Math.sqrt(n);
	},

	/**
	 * Standard error of proportion
	 */
	proportion: (p: number, n: number): number => {
		return Math.sqrt((p * (1 - p)) / n);
	},

	/**
	 * Standard error of difference between two means (independent samples)
	 */
	differenceIndependent: (sd1: number, n1: number, sd2: number, n2: number): number => {
		return Math.sqrt((sd1 * sd1) / n1 + (sd2 * sd2) / n2);
	},

	/**
	 * Pooled standard error for two-sample t-test (equal variances)
	 */
	pooled: (sd1: number, n1: number, sd2: number, n2: number): number => {
		const pooledVar =
			((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
		return Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
	}
};

// Confidence interval calculations
export const confidenceInterval = {
	/**
	 * CI for mean (known sigma)
	 */
	meanZ: (
		sampleMean: number,
		sigma: number,
		n: number,
		confidence: number = 0.95
	): [number, number] => {
		const z = normal.inv(1 - (1 - confidence) / 2, 0, 1);
		const margin = z * (sigma / Math.sqrt(n));
		return [sampleMean - margin, sampleMean + margin];
	},

	/**
	 * CI for mean (unknown sigma, use t)
	 */
	meanT: (
		sampleMean: number,
		sampleSd: number,
		n: number,
		confidence: number = 0.95
	): [number, number] => {
		const df = n - 1;
		const t = studentT.inv(1 - (1 - confidence) / 2, df);
		const margin = t * (sampleSd / Math.sqrt(n));
		return [sampleMean - margin, sampleMean + margin];
	},

	/**
	 * CI for proportion
	 */
	proportion: (
		p: number,
		n: number,
		confidence: number = 0.95
	): [number, number] => {
		const z = normal.inv(1 - (1 - confidence) / 2, 0, 1);
		const se = standardError.proportion(p, n);
		const margin = z * se;
		return [Math.max(0, p - margin), Math.min(1, p + margin)];
	}
};

// Effect size calculations
export const effectSize = {
	/**
	 * Cohen's d for two independent groups
	 */
	cohensD: (mean1: number, mean2: number, sd1: number, sd2: number, n1: number, n2: number): number => {
		const pooledSd = Math.sqrt(
			((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2)
		);
		return (mean1 - mean2) / pooledSd;
	},

	/**
	 * Cohen's d interpretation
	 */
	interpretD: (d: number): string => {
		const absD = Math.abs(d);
		if (absD < 0.2) return 'negligible';
		if (absD < 0.5) return 'small';
		if (absD < 0.8) return 'medium';
		return 'large';
	},

	/**
	 * Correlation coefficient (r) from Cohen's d
	 */
	dToR: (d: number): number => {
		return d / Math.sqrt(d * d + 4);
	},

	/**
	 * Cohen's d from correlation coefficient
	 */
	rToD: (r: number): number => {
		return (2 * r) / Math.sqrt(1 - r * r);
	}
};

// Power analysis
export const power = {
	/**
	 * Calculate power for one-sample z-test
	 */
	oneSampleZ: (effectSize: number, n: number, alpha: number = 0.05): number => {
		const criticalZ = normal.inv(1 - alpha / 2, 0, 1);
		const se = 1 / Math.sqrt(n);
		const nonCentrality = effectSize / se;
		return 1 - normal.cdf(criticalZ - nonCentrality, 0, 1) + normal.cdf(-criticalZ - nonCentrality, 0, 1);
	},

	/**
	 * Calculate required sample size for desired power
	 */
	sampleSizeOneSample: (effectSize: number, power: number = 0.8, alpha: number = 0.05): number => {
		const zAlpha = normal.inv(1 - alpha / 2, 0, 1);
		const zBeta = normal.inv(power, 0, 1);
		return Math.ceil(Math.pow((zAlpha + zBeta) / effectSize, 2));
	}
};

// Random sample generation
export const sample = {
	/**
	 * Generate random sample from normal distribution
	 */
	normal: (n: number, mean: number = 0, sd: number = 1): number[] => {
		return Array.from({ length: n }, () => jStat.normal.sample(mean, sd));
	},

	/**
	 * Generate random sample from uniform distribution
	 */
	uniform: (n: number, min: number = 0, max: number = 1): number[] => {
		return Array.from({ length: n }, () => jStat.uniform.sample(min, max));
	},

	/**
	 * Generate random sample from exponential distribution
	 */
	exponential: (n: number, rate: number = 1): number[] => {
		return Array.from({ length: n }, () => jStat.exponential.sample(rate));
	},

	/**
	 * Generate bimodal sample (mixture of two normals)
	 */
	bimodal: (n: number, mean1: number, sd1: number, mean2: number, sd2: number, mix: number = 0.5): number[] => {
		return Array.from({ length: n }, () => {
			return Math.random() < mix
				? jStat.normal.sample(mean1, sd1)
				: jStat.normal.sample(mean2, sd2);
		});
	}
};
