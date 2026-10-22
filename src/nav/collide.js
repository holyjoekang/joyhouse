// 벽·기둥·담은 바닥 위 직사각형(x0..x1, z0..z1)으로만 다룬다. 몸 반지름 R만큼 띄운다.
export function makeCollider(blocks, site, R = 0.35) {
  // 대지 밖으로만 못 나가게 (하늘에서 볼 때는 벽을 넘는다)
  function clamp(p) {
    p.x = Math.max(site.x0 + 1, Math.min(site.x1 - 1, p.x));
    p.z = Math.max(site.z1 + 1, Math.min(site.z0 - 1, p.z));
    return p;
  }
  function resolve(p) {
    clamp(p);
    for (const b of blocks) {
      const x0 = b.x0 - R, x1 = b.x1 + R, z0 = b.z0 - R, z1 = b.z1 + R;
      if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
      const d = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z], m = Math.min(...d);
      if (m === d[0]) p.x = x0; else if (m === d[1]) p.x = x1; else if (m === d[2]) p.z = z0; else p.z = z1;
    }
    return p;
  }
  // a → b 직선이 벽에 막히는가 (멀리 갈 때 걸을지, 페이드로 건너뛸지 정한다)
  function blocked(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    return blocks.some(r => {
      let t0 = 0, t1 = 1;
      for (const [p, d, lo, hi] of [[a.x, dx, r.x0 - 0.15, r.x1 + 0.15], [a.z, dz, r.z0 - 0.15, r.z1 + 0.15]]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
        let u = (lo - p) / d, v = (hi - p) / d;
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u); t1 = Math.min(t1, v);
        if (t0 > t1) return false;
      }
      return true;
    });
  }
  return { resolve, blocked, clamp };
}
