/**
 * Time-of-day greeting variant — cross-cutting delight #1 (LAYOUT_REDESIGN_BRIEF §4).
 *
 * 14 variants, picked from (weekday * 4 + timeBucket) so the greeting persists
 * within an hour. Pass the user's first name; bee pose is picked separately.
 */

type Bucket = 0 | 1 | 2 | 3; // morning / midday / afternoon / evening

function bucketFor(hour: number): Bucket {
  if (hour < 5) return 3; // late night → evening tone
  if (hour < 12) return 0;
  if (hour < 14) return 1;
  if (hour < 18) return 2;
  return 3;
}

const TEMPLATES: ((name: string) => string)[] = [
  (n) => `Monday. Let’s earn it, ${n}.`,
  (n) => `Tuesday. Steady wins, ${n}.`,
  (n) => `Wednesday. Halfway there, ${n}.`,
  (n) => `Thursday. Almost the weekend, ${n}.`,
  (n) => `Friday. You made it, ${n}.`,
  (n) => `Weekend mode, ${n}.`,
  (n) => `Sunday calm, ${n}.`,
  (n) => `Good morning, ${n}.`,
  (n) => `Good afternoon, ${n}.`,
  (n) => `Good evening, ${n}.`,
  (n) => `Quiet midday, ${n}.`,
  (n) => `Late hours, ${n}. Anything urgent?`,
  (n) => `Hey ${n}. What’s worth your time?`,
  (n) => `Welcome back, ${n}.`,
];

export function getGreeting(name: string, now: Date = new Date()): string {
  const hour = now.getHours();
  const bucket = bucketFor(hour);
  const weekday = now.getDay();
  const idx = (weekday * 4 + bucket) % TEMPLATES.length;
  const template = TEMPLATES[idx] ?? TEMPLATES[0];
  return template!(name);
}

export type BeePose = 'standing' | 'magnifying' | 'sleeping';

export function getBeePoseForHour(now: Date = new Date()): BeePose {
  const hour = now.getHours();
  if (hour < 12) return 'standing';
  if (hour < 20) return 'magnifying';
  return 'sleeping';
}
