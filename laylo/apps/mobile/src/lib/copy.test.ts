/**
 * Pure-JS smoke test for the conversational copy bank. Runs in <50 ms.
 * Owner: Test Engineer.
 */
import { copy, randomTaskDoneToast } from './copy';

describe('copy bank', () => {
  it('exposes every documented brand key', () => {
    // These keys are wired into screens — if anyone renames one
    // the build would silently break a CTA. Lock them down.
    const required = [
      'saved',
      'addToHive',
      'lockItIn',
      'sendIt',
      'syncStalled',
      'missedYou',
      'letsGetSetUp',
      'thatsYou',
      'taskDoneToasts',
    ];
    for (const key of required) {
      expect(copy).toHaveProperty(key);
    }
  });

  it('ships exactly 7 task-done toast variants', () => {
    expect(copy.taskDoneToasts).toHaveLength(7);
  });
});

describe('randomTaskDoneToast()', () => {
  it('always returns a string from the toasts list (100 iters)', () => {
    const set = new Set<string>(copy.taskDoneToasts);
    for (let i = 0; i < 100; i++) {
      const toast = randomTaskDoneToast();
      expect(typeof toast).toBe('string');
      expect(set.has(toast)).toBe(true);
    }
  });

  it('eventually picks more than one distinct variant', () => {
    // Probabilistic: with 7 buckets, P(<2 distinct in 50 picks) ≈ 0.
    const picks = new Set<string>();
    for (let i = 0; i < 50; i++) picks.add(randomTaskDoneToast());
    expect(picks.size).toBeGreaterThan(1);
  });
});
