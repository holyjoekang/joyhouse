// 1인칭 걷기. goal은 가려는 자세, view는 지금 자세 — 매 프레임 view가 goal을 부드럽게 따라간다.
// 앞 방향은 (-sin yaw, -cos yaw): yaw 0이면 북쪽(-z, 집 쪽)을 본다.
export const EYE = 1.6;

export function createWalker(camera, collider, start, { onFade }) {
  const goal = { x: start.x, z: start.z, yaw: start.yaw || 0, pitch: 0 };
  const view = { ...goal };
  const keys = new Set();
  let busy = false;

  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const near = a => goal.yaw + wrap(a - goal.yaw);

  function walk(d, s = 0) {
    goal.x += -Math.sin(goal.yaw) * d + Math.cos(goal.yaw) * s;
    goal.z += -Math.cos(goal.yaw) * d - Math.sin(goal.yaw) * s;
    collider.resolve(goal);
  }
  function look(dyaw, dpitch) {
    goal.yaw += dyaw;
    goal.pitch = Math.max(-0.9, Math.min(0.8, goal.pitch + dpitch));
  }
  // 걸어서 갈 수 있으면 걷고, 벽에 막히거나 멀면 잠깐 어두워졌다가 도착한다
  async function go(x, z, yaw, pitch = 0) {
    const target = collider.resolve({ x, z });
    const far = Math.hypot(target.x - view.x, target.z - view.z) > 22;
    const doFade = far || collider.blocked(view, target);
    if (doFade) {
      if (busy) return;
      busy = true;
      await onFade(1);
      Object.assign(goal, { x: target.x, z: target.z, yaw: yaw ?? goal.yaw, pitch });
      Object.assign(view, goal);
      await onFade(0);
      busy = false;
    } else {
      Object.assign(goal, { x: target.x, z: target.z, pitch });
      if (yaw !== undefined) goal.yaw = near(yaw);
    }
  }

  function update(dt) {
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2 : 1;
    const v = 4.2 * run * dt, turn = 1.9 * dt;
    let d = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) d += v;
    if (keys.has('KeyS') || keys.has('ArrowDown')) d -= v;
    if (keys.has('KeyA')) s -= v;
    if (keys.has('KeyD')) s += v;
    if (keys.has('ArrowLeft') || keys.has('KeyQ')) look(turn, 0);
    if (keys.has('ArrowRight') || keys.has('KeyE')) look(-turn, 0);
    if (d || s) { walk(d, s); view.x = goal.x - (goal.x - view.x) * 0.5; view.z = goal.z - (goal.z - view.z) * 0.5; }

    const k = 1 - Math.exp(-dt * 6);
    view.x += (goal.x - view.x) * k;
    view.z += (goal.z - view.z) * k;
    view.yaw += (goal.yaw - view.yaw) * k;
    view.pitch += (goal.pitch - view.pitch) * k;
    collider.resolve(view);          // 따라가는 길에도 벽을 뚫지 않는다
    camera.position.set(view.x, EYE, view.z);
    camera.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
    return d || s;
  }

  return { goal, view, keys, walk, look, go, update, get busy() { return busy; } };
}
