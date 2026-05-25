/**
 * Conversational copy bank — Liveliness pass.
 *
 * Single source of truth for the bee-voiced microcopy that lights up the
 * mobile app. The functionality engineer wires these into screens — keeping
 * the strings here means we can tweak personality without touching layouts.
 *
 * Mirrors the website's `copy` map so brand voice stays in lockstep across
 * platforms.
 */

export const copy = {
  saved: "Got it, saved! \u{1F41D}",
  addToHive: 'Add it to the hive',
  lockItIn: 'Lock it in',
  sendIt: 'Send it',
  syncStalled: 'Hmm, sync stalled. Try again?',
  missedYou: 'Missed you \u{1F41D}',
  letsGetSetUp: "Let's get you set up \u{1F41D}",
  thatsYou: "That's you \u{1F41D}",
  /**
   * Toast strings rotated through on task complete. Pick one at random per
   * completion so successive checks feel varied, not robotic.
   */
  taskDoneToasts: [
    'Boom — done.',
    'Another one bites the dust.',
    'Look at you go!',
    'Crushed it.',
    'Off the hive.',
    'Stamp it: complete.',
    'Onto the next one!',
  ] as const,
} as const;

/** Pick a random task-done toast string. */
export function randomTaskDoneToast(): string {
  const list = copy.taskDoneToasts;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] ?? list[0];
}

export type CopyKey = keyof typeof copy;
