import type { ScheduledTask, TaskExecutionResult } from '@/lib/services/task-scheduler';

/**
 * Self-education task — runs the improvement loop on a schedule:
 * research (code) → rank (low-cost model) → report (Alpha model) → queue proposals.
 *
 * Nothing is implemented automatically; the output is a report plus a proposal
 * queue the human approves. See docs/SELF-EDUCATION.md.
 */
export async function executeSelfEducationTask(
  task: ScheduledTask
): Promise<TaskExecutionResult> {
  try {
    const { runSelfEducation } = await import('@/lib/agent/self-education');
    const run = await runSelfEducation();

    const summary =
      `Checked ${run.checked} tools · ${run.updates} update(s) · ` +
      `${run.proposals} pending proposal(s) · Alpha: ${run.alpha}`;

    return {
      success: true,
      result: summary,
      data: {
        checked: run.checked,
        updates: run.updates,
        baselines: run.baselines,
        errors: run.errors,
        reportFile: run.reportFile,
        alpha: run.alpha,
        pendingProposals: run.proposals,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Self-education run failed',
    };
  }
}
