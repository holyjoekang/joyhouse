// 1인칭 걷기. goal은 가려는 자세, view는 지금 자세 — 매 프레임 view가 goal을 부드럽게 따라간다.
// 앞 방향은 (-sin yaw, -cos yaw): yaw 0이면 북쪽(-z, 집 쪽)을 본다.
export const EYE = 1.6;

// ground(x, z): 그 자리 땅 높이(언덕 골목). 없으면 평지.
export function createWalker(camera, collider, start, { onFade, ground = () => 0 }) {
  const goal = { x: start.x, z: start.z, yaw: start.yaw || 0, pitch: 0 };
  const view = { ...goal, y: ground(goal.x, goal.z) };
  const keys = new Set();
  let busy = false;
  // 하늘에서 보기: alt = 지금 높이(m), air = 가려는 높이. 날 때는 벽을 넘고 아래를 내려다본다.
  let flying = false, alt = 0, air = 0;
  const ALT = { start: 55, min: 14, max: 170 };

  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const near = a => goal.yaw + wrap(a - goal.yaw);

  function walk(d, s = 0) {
    if (flying) { d *= 1 + alt / 10; s *= 1 + alt / 10; }
    goal.x += -Math.sin(goal.yaw) * d + Math.cos(goal.yaw) * s;
    goal.z += -Math.cos(goal.yaw) * d - Math.sin(goal.yaw) * s;
    flying ? collider.clamp(goal) : collider.resolve(goal);
  }
  function look(dyaw, dpitch) {
    goal.yaw += dyaw;
    goal.pitch = flying ? Math.max(-1.52, Math.min(0.3, goal.pitch + dpitch)) : Math.max(-0.9, Math.min(0.8, goal.pitch + dpitch));
  }
  // 걸어서 갈 수 있으면 걷고, 벽에 막히거나 멀면 잠깐 어두워졌다가 도착한다
  async function go(x, z, yaw, pitch = 0) {
    if (flying) { Object.assign(goal, collider.clamp({ x, z })); return; }   // 하늘에서는 그 자리 위로 날아갈 뿐, 보는 방향은 그대로
    const target = collider.resolve({ x, z });
    const far = Math.hypot(target.x - view.x, target.z - view.z) > 22;
    const doFade = far || collider.blocked(view, target);
    if (doFade) {
      if (busy) return;
      busy = true;
      await onFade(1);
      Object.assign(goal, { x: target.x, z: target.z, yaw: yaw ?? goal.yaw, pitch });
      Object.assign(view, goal, { y: ground(goal.x, goal.z) });
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
    if (keys.has('KeyR') || keys.has('PageUp')) climb(40 * dt);
    if (keys.has('KeyF') || keys.has('PageDown')) climb(-40 * dt);
    if (d || s) { walk(d, s); view.x = goal.x - (goal.x - view.x) * 0.5; view.z = goal.z - (goal.z - view.z) * 0.5; }

    const k = 1 - Math.exp(-dt * 6);
    view.x += (goal.x - view.x) * k;
    view.z += (goal.z - view.z) * k;
    view.yaw += (goal.yaw - view.yaw) * k;
    view.pitch += (goal.pitch - view.pitch) * k;
    if (!flying && alt < 2) collider.resolve(view);          // 따라가는 길에도 벽을 뚫지 않는다
    view.y += (ground(view.x, view.z) - view.y) * Math.min(1, dt * 10);
    alt += (air - alt) * (1 - Math.exp(-dt * 2.2));
    if (!flying && alt < 0.02) alt = 0;
    camera.position.set(view.x, EYE + view.y + alt, view.z);
    camera.rotation.set(view.pitch, view.yaw, 0, 'YXZ');
    return d || s;
  }

  function setFlying(on) {
    if (on === flying) return;
    flying = on;
    if (on) { air = ALT.start; goal.pitch = -0.95; }
    else { air = 0; collider.resolve(goal); goal.pitch = 0; }
  }
  function climb(d) { if (flying) air = Math.max(ALT.min, Math.min(ALT.max, air + d)); }

  return { goal, view, keys, walk, look, go, update, setFlying, climb,
    toggleFly: () => setFlying(!flying), get flying() { return flying; }, get alt() { return alt; }, get busy() { return busy; } };
}
