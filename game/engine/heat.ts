/** Contribution count → 0–4 intensity, shared by the Professional heatmap and the Mainframe floor. */
export const heatLevel = (count: number, max: number) =>
  count === 0 ? 0 : Math.min(4, Math.ceil((count / Math.max(1, max)) * 4));
