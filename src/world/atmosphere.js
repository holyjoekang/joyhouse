import * as THREE from 'three';
import { mats } from './materials.js';

// 지금 이 순간의 서울 하늘: 실제 해 위치(위도·경도·시각으로 계산) + 실제 날씨(Open-Meteo, 키 없음).
// 해가 지면 하늘이 어두워지고 별이 뜨며 가로등·창호·초롱에 불이 들어온다. 비·눈은 카메라 둘레에 내린다.
// 점검용 주소 인자: ?time=21:30  ?weather=clear|cloudy|fog|rain|snow|storm
const SEOUL = { lat: 37.57, lon: 126.98 };
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL.lat}&longitude=${SEOUL.lon}` +
  '&current=temperature_2m,weather_code,cloud_cover&timezone=Asia%2FSeoul';

const KINDS = {
  clear: { label: '맑음', cloud: 0.05 }, cloudy: { label: '흐림', cloud: 0.8 }, fog: { label: '안개', cloud: 0.7 },
  rain: { label: '비', cloud: 0.95 }, snow: { label: '눈', cloud: 0.9 }, storm: { label: '뇌우', cloud: 1 },
};
function fromCode(code, cover) {
  const c = cover / 100;
  if (code <= 1) return { kind: 'clear', label: code ? '대체로 맑음' : '맑음', cloud: Math.min(c, 0.3) };
  if (code <= 3) return { kind: 'cloudy', label: code === 2 ? '구름 조금' : '흐림', cloud: Math.max(c, code === 2 ? 0.4 : 0.8) };
  if (code === 45 || code === 48) return { kind: 'fog', label: '안개', cloud: Math.max(c, 0.6) };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: '눈', cloud: Math.max(c, 0.85) };
  if (code >= 95) return { kind: 'storm', label: '뇌우', cloud: 1 };
  return { kind: 'rain', label: code < 60 ? '이슬비' : code >= 80 ? '소나기' : '비', cloud: Math.max(c, 0.9) };
}

// 해의 고도·방위(라디안, 방위는 북에서 시계방향). 천문 연감 근사식, 오차 1° 안팎.
export function sunAltAz(date, lat = SEOUL.lat, lon = SEOUL.lon) {
  const rad = Math.PI / 180, d = date.getTime() / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const H = ((18.697374558 + 24.06570982441908 * d) * 15 + lon) * rad - ra, p = lat * rad;
  const alt = Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(p) - Math.sin(p) * Math.cos(H));
  return { alt, az };
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

export function createAtmosphere({ scene, renderer, sky, sun, hemi, lights, phone }) {
  const q = new URLSearchParams(location.search);
  const fixedTime = /^\d{1,2}:\d{2}$/.test(q.get('time') || '') ? q.get('time') : null;
  const fixedWeather = KINDS[q.get('weather')] ? q.get('weather') : null;
  let weather = fixedWeather ? { kind: fixedWeather, ...KINDS[fixedWeather] } : { kind: 'clear', ...KINDS.clear, pending: true };
  let temp = null, look = null, sinceSun = 0, sinceWx = 0, flash = 0, nextFlash = 8;
  const fogBase = { near: 120, far: 420 };
  const dir = new THREE.Vector3();

  function now() {
    const d = new Date();
    if (!fixedTime) return d;
    const [h, m] = fixedTime.split(':').map(Number);
    const kst = new Date(d.getTime() + 9 * 3600000);   // 서울 날짜 기준으로 그 시각
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), h - 9, m));
  }

  async function fetchWeather() {
    if (fixedWeather) return;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(WEATHER_URL, { signal: ctl.signal });
      clearTimeout(t);
      const c = (await r.json()).current;
      weather = fromCode(c.weather_code, c.cloud_cover ?? 0);
      temp = Math.round(c.temperature_2m);
      apply();
    } catch { weather.pending = false; }
  }

  // 해 고도·날씨 → 빛·하늘·안개·조명. 1분마다, 날씨가 바뀌면 바로.
  function apply() {
    const { alt, az } = sunAltAz(now());
    const A = alt * 180 / Math.PI, k = weather.kind, c = weather.cloud;
    const day = smooth(-4, 10, A), night = 1 - smooth(-5, 6, A), warm = smooth(-4, 2, A) * (1 - smooth(4, 22, A));
    const gloom = Math.min(0.85, c * 0.5 + (k === 'rain' ? 0.2 : 0) + (k === 'storm' ? 0.35 : 0) + (k === 'fog' ? 0.25 : 0) + (k === 'snow' ? 0.1 : 0));
    const lit = Math.max(1 - smooth(-1, 8, A), gloom > 0.55 ? gloom * 0.6 : 0);

    dir.set(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));
    // 해가 지면 같은 빛이 달빛이 된다: 해 반대편 하늘 높이에서 푸르고 약하게
    const light = A > -2 ? dir.clone().setY(Math.max(dir.y, 0.08)).normalize()
      : new THREE.Vector3(-dir.x, 0.9, -dir.z).normalize();
    sun.position.copy(light).multiplyScalar(160).add(sun.target.position);
    sun.intensity = A > -2 ? 3.2 * day * (1 - gloom * 0.85) + 0.02 : 0.5 * night * (1 - c * 0.7);
    sun.color.copy(A > -2 ? mix(0xffe6c4, 0xff9450, warm) : new THREE.Color(0x9db2ff));
    hemi.intensity = 0.55 * day * (1 - gloom * 0.3) + 0.3 * night + 0.12 * gloom * day;
    hemi.color.copy(mix(0xdfe9ff, 0x41507c, night));
    hemi.groundColor.copy(mix(0x6b5a40, 0x15130f, night));
    scene.environmentIntensity = 0.55 * day * (1 - gloom * 0.5) + 0.06 * night;
    renderer.shadowMap.needsUpdate = true;

    const veil = Math.min(0.94, c * 0.78 + (k === 'rain' || k === 'storm' ? 0.12 : 0) + (k === 'fog' ? 0.25 : 0));
    const veilColor = mix(k === 'rain' || k === 'storm' ? 0x8c949c : 0xbcc3cb, 0x10141c, night).lerp(new THREE.Color(0xe0a27a), warm * 0.35);
    sky.update(dir, {
      turbidity: 3.2 + c * 7 + (k === 'fog' ? 6 : 0), rayleigh: 1.4 - c * 0.6 + warm * 0.8, mie: 0.004 + c * 0.01,
      cloud: veil, cloudColor: veilColor, stars: night * (1 - c) * 0.95,
      groundColor: mix(0x4a5a3a, 0x0c0e0b, night),
    });

    const fogColor = mix(0xcfdcec, k === 'fog' ? 0xc4c8cc : 0xa7b0b9, Math.min(1, c * 1.1)).lerp(new THREE.Color(0xe7b48d), warm * 0.4)
      .lerp(new THREE.Color(0x0b1120), night);
    scene.fog.color.copy(fogColor);
    Object.assign(fogBase, { clear: { near: 120, far: 420 }, cloudy: { near: 110, far: 380 }, rain: { near: 50, far: 230 },
      storm: { near: 40, far: 200 }, snow: { near: 40, far: 190 }, fog: { near: 12, far: 110 } }[k]);

    lights.setLevel(lit);
    scene.userData.lit = lit;   // 스마트팜 온실 LED가 읽는다
    mats.paperDoor.emissive.copy(mix(0x3a2c14, 0xa8692a, lit));
    mats.paperDoor.emissiveIntensity = 0.25 + 1.5 * lit;
    mats.lantern.emissiveIntensity = 0.9 + 2.8 * lit;
    mats.glass.emissive.set(0xffb468);
    mats.glass.emissiveIntensity = 0.32 * lit;
    mats.daylight.color.copy(mix(0xeef4ff, 0x1a2234, night));
    precip.set(k);
    look = { A, night, lit, kind: k, hemi: hemi.intensity };
    window.__joyAtmos = look;   // 점검용
  }

  // 비·눈: 카메라 둘레 상자 안에서 떨어지고, 바닥에 닿으면 위로 되돌린다
  const precip = (() => {
    const N = phone ? 1400 : 3600, B = 36, H = 26;
    const pos = new Float32Array(N * 6), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      seed[i] = Math.random();
      const x = (Math.random() - 0.5) * B * 2, y = Math.random() * H, z = (Math.random() - 0.5) * B * 2;
      pos.set([x, y, z, x, y, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xb8c6d4, transparent: true, opacity: 0.4, depthWrite: false }));
    const snowGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(N * 3);
    snowGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
    rain.frustumCulled = snow.frustumCulled = false;
    rain.userData.noMap = snow.userData.noMap = true;   // 미니맵 사진에는 찍지 않는다
    rain.visible = snow.visible = false;
    scene.add(rain, snow);
    let mode = null;
    return {
      set(k) { mode = k === 'rain' || k === 'storm' ? 'rain' : k === 'snow' ? 'snow' : null; rain.visible = mode === 'rain'; snow.visible = mode === 'snow'; },
      update(dt, cam) {
        if (!mode) return;
        const t = performance.now() / 1000;
        for (let i = 0; i < N; i++) {
          const o = i * 6;
          let x = pos[o], y = pos[o + 1], z = pos[o + 2];
          y -= (mode === 'rain' ? 17 + seed[i] * 5 : 1 + seed[i] * 0.8) * dt;
          if (mode === 'snow') { x += Math.sin(t * 0.8 + seed[i] * 40) * 0.35 * dt; z += Math.cos(t * 0.6 + seed[i] * 30) * 0.3 * dt; }
          if (y < 0) { y += H; x = (Math.random() - 0.5) * B * 2; z = (Math.random() - 0.5) * B * 2; }
          pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
          pos[o + 3] = x + 0.06; pos[o + 4] = y + 0.55; pos[o + 5] = z;
          if (mode === 'snow') sPos.set([x, y, z], i * 3);
        }
        const g = mode === 'rain' ? geo : snowGeo;
        g.attributes.position.needsUpdate = true;
        (mode === 'rain' ? rain : snow).position.set(Math.round(cam.x), Math.max(0, cam.y - H * 0.6), Math.round(cam.z));
      },
    };
  })();

  apply();
  fetchWeather();

  return {
    // 매 프레임: 강수, 번개, 하늘 따라다니기, 높이 오를수록 안개를 멀리
    update(dt, cam, alt, post) {
      sky.follow(cam);
      precip.update(dt, cam);
      if ((sinceSun += dt) > 60) { sinceSun = 0; apply(); }
      if ((sinceWx += dt) > 900) { sinceWx = 0; fetchWeather(); }
      scene.fog.near = fogBase.near + alt * 1.5;
      scene.fog.far = fogBase.far + alt * 3;
      if (look?.kind === 'storm' && (nextFlash -= dt) < 0) { flash = 0.18; nextFlash = 6 + Math.random() * 10; }
      if (flash > 0) { flash -= dt; hemi.intensity = look.hemi + (flash > 0 ? 2.5 : 0); }
      if (look) post?.setGlow?.(look.lit);
      lights.update(dt, cam);
    },
    // HUD에 쓰는 한 줄: "서울 21:34 · 맑음 12°C"
    info() {
      const d = now(), kst = new Date(d.getTime() + 9 * 3600000);
      const hm = `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
      return `서울 ${hm} · ${weather.label}${temp !== null ? ` ${temp}°C` : ''}`;
    },
    get state() { return look; },
  };
}
