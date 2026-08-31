type MilestoneName =
  | 'navigation'
  | 'fonts'
  | 'lcpImage'
  | 'supabaseData';

interface MilestoneConfig {
  name: MilestoneName;
  weight: number;
  auto?: 'domInteractive' | 'domContentLoadedEventEnd' | 'loadEventStart';
  check?: () => Promise<void>;
  selector?: string;
  manual?: true;
}

let currentProgress = 0;
let completed = false;
let progressCallback: ((p: number) => void) | null = null;
let completeCallback: (() => void) | null = null;
const milestonesDone = new Set<MilestoneName>();

function updateBar(progress: number) {
  currentProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const circle = document.querySelector<SVGElement>('#nprogress circle');
  if (circle) {
    circle.style.strokeDashoffset = String(100 * (1 - currentProgress / 100));
  }
  if (progressCallback) {
    progressCallback(currentProgress);
  }
}

function markMilestone(name: MilestoneName) {
  if (completed || milestonesDone.has(name)) return;
  milestonesDone.add(name);
  recalc();
}

function recalc() {
  const totalWeight = MILESTONES.reduce((sum, m) => sum + m.weight, 0);
  let doneWeight = 0;
  for (const m of MILESTONES) {
    if (milestonesDone.has(m.name)) {
      doneWeight += m.weight;
    }
  }
  const progress = (doneWeight / totalWeight) * 100;
  updateBar(progress);
  if (progress >= 100 && !completed) {
    complete();
  }
}

function complete() {
  if (completed) return;
  completed = true;
  updateBar(100);
  const svg = document.getElementById('nprogress');
  if (svg) {
    svg.classList.add('done');
  }
  if (completeCallback) {
    completeCallback();
  }
  setTimeout(() => {
    const circle = document.querySelector<SVGElement>('#nprogress circle');
    if (circle) circle.style.strokeDashoffset = '100';
  }, 500);
}

const MILESTONES: MilestoneConfig[] = [
  { name: 'navigation', weight: 10, auto: 'domInteractive' },
  { name: 'navigation', weight: 15, auto: 'domContentLoadedEventEnd' },
  { name: 'navigation', weight: 10, auto: 'loadEventStart' },
  { name: 'fonts', weight: 15, check: () => document.fonts.ready.then(() => {}) },
  { name: 'lcpImage', weight: 15, selector: '#brand-logo' },
  { name: 'supabaseData', weight: 35, manual: true },
];

export function initProgressTracker() {
  if (typeof window === 'undefined') return;

  if (completed) return;
  milestonesDone.clear();
  updateBar(0);

  const navEntries = performance.getEntriesByType('navigation');
  const navEntry = navEntries[0] as PerformanceNavigationTiming | undefined;

  if (navEntry) {
    if (navEntry.domInteractive > 0) markMilestone('navigation');
    if (navEntry.domContentLoadedEventEnd > 0) markMilestone('navigation');
    if (navEntry.loadEventStart > 0) markMilestone('navigation');
  } else {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      markMilestone('navigation');
    }
    if (document.readyState === 'complete') {
      markMilestone('navigation');
    }
  }

  document.fonts.ready.then(() => markMilestone('fonts'));

  markMilestone('lcpImage');

  if (document.readyState === 'complete') {
    markMilestone('navigation');
    markMilestone('navigation');
    markMilestone('navigation');
  }
}

export function onProgress(cb: (p: number) => void) {
  progressCallback = cb;
}

export function onComplete(cb: () => void) {
  completeCallback = cb;
}

export function markDataLoaded() {
  markMilestone('supabaseData');
}

export function completeProgress() {
  complete();
}

export function resetProgress() {
  if (typeof window === 'undefined') return;
  completed = false;
  milestonesDone.clear();
  updateBar(0);
  const svg = document.getElementById('nprogress');
  if (svg) svg.classList.remove('done');
  initProgressTracker();
}