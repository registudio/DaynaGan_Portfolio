/**
 * Squarified treemap (Bruls, Huizing & van Wijk): lays out weighted items in a rectangle so
 * every tile's area is proportional to its value and tiles stay as square as possible.
 * Pure and deterministic — the same input gives the same layout on server and client.
 */
export type TreeItem = { id: string; value: number };
export type TreeRect = { id: string; x: number; y: number; w: number; h: number };

export function squarify(items: TreeItem[], width: number, height: number): TreeRect[] {
  const total = items.reduce((a, i) => a + Math.max(0, i.value), 0);
  if (!items.length || total <= 0 || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  const queue = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((i) => ({ id: i.id, area: i.value * scale }));
  const out: TreeRect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  const worst = (row: { area: number }[], side: number) => {
    const sum = row.reduce((a, r) => a + r.area, 0);
    const max = Math.max(...row.map((r) => r.area));
    const min = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const layoutRow = (row: { id: string; area: number }[]) => {
    const sum = row.reduce((a, r) => a + r.area, 0);
    if (w >= h) {
      // Column along the left edge.
      const cw = sum / h;
      let cy = y;
      for (const r of row) {
        const rh = r.area / cw;
        out.push({ id: r.id, x, y: cy, w: cw, h: rh });
        cy += rh;
      }
      x += cw;
      w -= cw;
    } else {
      // Row along the top edge.
      const rh = sum / w;
      let cx = x;
      for (const r of row) {
        const rw = r.area / rh;
        out.push({ id: r.id, x: cx, y, w: rw, h: rh });
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
  };

  let row: { id: string; area: number }[] = [];
  while (queue.length) {
    const next = queue[0];
    const side = Math.min(w, h);
    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      queue.shift();
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return out;
}
