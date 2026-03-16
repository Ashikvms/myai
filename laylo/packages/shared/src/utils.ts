import type { BillFrequency, Plan, PlanFeature } from './types';
import { PLAN_LIMITS } from './constants';

/**
 * Normalize a bill/subscription amount to monthly equivalent.
 */
export function normalizeToMonthly(
  amount: number,
  frequency: BillFrequency,
): number {
  switch (frequency) {
    case 'WEEKLY':
      return amount * (52 / 12);
    case 'BIWEEKLY':
      return amount * (26 / 12);
    case 'MONTHLY':
      return amount;
    case 'QUARTERLY':
      return amount / 3;
    case 'ANNUALLY':
      return amount / 12;
    default:
      return amount;
  }
}

/**
 * Format cents or dollars to display string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Check if a user's plan allows a specific feature.
 */
export function canUseFeature(plan: Plan, feature: PlanFeature): boolean {
  switch (feature) {
    case 'AI_CHAT':
    case 'AI_SUMMARIZE':
    case 'AI_INSIGHTS':
      return plan === 'PREMIUM';
    case 'UNLIMITED_TASKS':
    case 'UNLIMITED_DOCUMENTS':
    case 'UNLIMITED_REMINDERS':
    case 'ADVANCED_NOTIFICATIONS':
      return plan === 'PREMIUM';
    default:
      return true;
  }
}

/**
 * Get plan limits for a given plan.
 */
export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

/**
 * Generate a greeting based on time of day.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
