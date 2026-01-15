/**
 * Performance Monitoring Utilities for Edge Functions
 * 
 * Tracks latency, throughput, and errors for matching system
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric>;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.metrics = new Map();
  }

  /**
   * Start tracking a specific operation
   */
  start(operationName: string, metadata?: Record<string, any>): void {
    this.metrics.set(operationName, {
      operation: `${this.operation}:${operationName}`,
      startTime: Date.now(),
      metadata,
    });
    console.log(`[PERF] START ${operationName}`, metadata || '');
  }

  /**
   * End tracking an operation
   */
  end(operationName: string, success: boolean = true, error?: string): number {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      console.warn(`[PERF] No start time found for ${operationName}`);
      return 0;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    console.log(
      `[PERF] END ${operationName} - ${metric.duration}ms ${success ? '✅' : '❌'}`,
      error || ''
    );

    return metric.duration;
  }

  /**
   * Get all metrics for this monitoring session
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    operation: string;
    totalDuration: number;
    operations: number;
    successCount: number;
    errorCount: number;
    metrics: PerformanceMetric[];
  } {
    const metrics = this.getMetrics();
    const completedMetrics = metrics.filter((m) => m.duration !== undefined);

    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const successCount = completedMetrics.filter((m) => m.success).length;
    const errorCount = completedMetrics.filter((m) => !m.success).length;

    return {
      operation: this.operation,
      totalDuration,
      operations: completedMetrics.length,
      successCount,
      errorCount,
      metrics: completedMetrics,
    };
  }

  /**
   * Log summary to console
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.log('\n========== PERFORMANCE SUMMARY ==========');
    console.log(`Operation: ${summary.operation}`);
    console.log(`Total Duration: ${summary.totalDuration}ms`);
    console.log(`Operations: ${summary.operations}`);
    console.log(`Success: ${summary.successCount} | Errors: ${summary.errorCount}`);
    console.log('\nDetailed Breakdown:');
    summary.metrics.forEach((metric) => {
      const status = metric.success ? '✅' : '❌';
      console.log(`  ${status} ${metric.operation}: ${metric.duration}ms`);
      if (metric.error) {
        console.log(`     Error: ${metric.error}`);
      }
      if (metric.metadata) {
        console.log(`     Metadata:`, metric.metadata);
      }
    });
    console.log('========================================\n');
  }
}

/**
 * Create a simple timer for measuring duration
 */
export function createTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    log: (label: string) => {
      const duration = Date.now() - start;
      console.log(`[TIMER] ${label}: ${duration}ms`);
      return duration;
    },
  };
}

/**
 * Measure the execution time of an async function
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[MEASURE] ${label}: ${duration}ms ✅`);
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[MEASURE] ${label}: ${duration}ms ❌`, error);
    throw error;
  }
}

/**
 * Store performance metrics to database (future: for analytics)
 */
export async function logMetricsToDatabase(
  supabase: any,
  metrics: {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  // TODO: Create match_metrics table and store metrics
  // For now, just log to console
  console.log('[METRICS]', metrics);
}
