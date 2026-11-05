/** Grid A* pathfinding (4-neighbour). */

export function findPath(w: number, h: number, walk: (x: number, y: number) => boolean, sx: number, sy: number, tx: number, ty: number, maxNodes = 25000): [number, number][] | null {
  if (sx === tx && sy === ty) return [];
  const idx = (x: number, y: number) => y * w + x;
  const g = new Float32Array(w * h).fill(Infinity);
  const from = new Int32Array(w * h).fill(-1);
  const closed = new Uint8Array(w * h);
  // binary heap of [f, index]
  const heap: number[] = [];
  const fs: number[] = [];
  const push = (f: number, i: number) => {
    heap.push(i);
    fs.push(f);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fs[p] <= fs[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      [fs[p], fs[c]] = [fs[c], fs[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const lastI = heap.pop()!;
    const lastF = fs.pop()!;
    if (heap.length) {
      heap[0] = lastI;
      fs[0] = lastF;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1,
          r = l + 1;
        let m = c;
        if (l < heap.length && fs[l] < fs[m]) m = l;
        if (r < heap.length && fs[r] < fs[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        [fs[m], fs[c]] = [fs[c], fs[m]];
        c = m;
      }
    }
    return top;
  };
  const hfn = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);
  g[idx(sx, sy)] = 0;
  push(hfn(sx, sy), idx(sx, sy));
  let n = 0;
  const target = idx(tx, ty);
  while (heap.length && n++ < maxNodes) {
    const cur = pop();
    if (cur === target) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w,
      cy = (cur / w) | 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx,
        ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      if (ni !== target && !walk(nx, ny)) continue;
      const ng = g[cur] + 1;
      if (ng < g[ni]) {
        g[ni] = ng;
        from[ni] = cur;
        push(ng + hfn(nx, ny), ni);
      }
    }
  }
  if (from[target] === -1) return null;
  const out: [number, number][] = [];
  let c = target;
  while (c !== idx(sx, sy) && c !== -1) {
    out.push([c % w, (c / w) | 0]);
    c = from[c];
  }
  out.reverse();
  return out;
}
