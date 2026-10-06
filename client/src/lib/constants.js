export const STAGES = ['new', 'contacted', 'qualified', 'application', 'won', 'lost'];
export const LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  application: 'Application', won: 'Won', lost: 'Lost',
};

// One accent color per stage (full class names, so Tailwind can find them)
export const STAGE_ACCENT = {
  new:         { border: 'border-sky-400',     bar: 'bg-sky-500' },
  contacted:   { border: 'border-indigo-400',  bar: 'bg-indigo-500' },
  qualified:   { border: 'border-violet-400',  bar: 'bg-violet-500' },
  application: { border: 'border-amber-400',   bar: 'bg-amber-500' },
  won:         { border: 'border-emerald-500', bar: 'bg-emerald-500' },
  lost:        { border: 'border-rose-400',    bar: 'bg-rose-500' },
};