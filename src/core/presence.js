// 실시간 접속자 — 공개 MQTT 브로커(WebSocket)로 같은 3D 집에 들어온 사람끼리 위치·이름표·한마디를 주고받는다.
// 서버를 따로 두지 않는다. 주고받는 것은 무작위 접속 번호, 동네 이름표, 가상 공간 좌표, 말풍선 글뿐이다.
// 공개 브로커라 누구나 같은 주제를 읽을 수 있으므로 개인정보는 보내지 않는다.
const LIB = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.esm.js';
const BROKERS = window.JH_BROKERS || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const TOPIC = 'joyhouse-toripapa/3d/v1';

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);

function myId() {
  try {
    let v = sessionStorage.getItem('joyhouse.pid');
    if (!v) { v = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('joyhouse.pid', v); }
    return v;
  } catch { return Math.random().toString(36).slice(2, 10); }
}

// onPeer({ id, label, x, z, yaw, say, sid }) · onLeave(id) · onStatus('on' | 'off')
export function createPresence({ bounds, onPeer, onLeave, onStatus: report }) {
  const id = myId();
  const onStatus = s => { if (window.JH_DEBUG) console.info('[presence]', id, s); report(s); };
  let client = null;

  let got = 0;
  function onMessage(topic, buf) {
    if (window.JH_DEBUG && ++got % 5 === 1) console.info('[presence] recv', id, got, topic);
    let m;
    try { m = JSON.parse(buf.toString()); } catch { return; }
    if (topic.endsWith('/bye')) { const who = clean(m.i ?? buf.toString(), 16); if (who && who !== id) onLeave(who); return; }
    const who = clean(m.i, 16);
    if (!who || who === id) return;
    const x = num(m.x, bounds.x0, bounds.x1), z = num(m.z, bounds.z1, bounds.z0);
    if (x == null || z == null) return;
    try { onPeer({ id: who, label: clean(m.l, 12) || '방문러', x, z, yaw: num(m.y, -10, 10) ?? 0, say: clean(m.s, 40), sid: num(m.n, 0, 1e9) ?? 0 }); } catch (e) { if (window.JH_DEBUG) console.warn('[presence] peer', e); }
  }

  async function connect() {
    let mqtt;
    try { mqtt = (await import(LIB)).default; } catch { onStatus('off'); return; }
    for (const url of BROKERS) {
      client = await new Promise(res => {
        const c = mqtt.connect(url, {
          clientId: `jh_${id}_${Math.random().toString(36).slice(2, 6)}`, clean: true, keepalive: 60, connectTimeout: 6000, reconnectPeriod: 0,
          will: { topic: `${TOPIC}/bye`, payload: JSON.stringify({ i: id }), qos: 0, retain: false },
        });
        const t = setTimeout(() => { c.end(true); res(null); }, 8000);
        c.once('connect', () => { clearTimeout(t); res(c); });
        c.once('error', () => { clearTimeout(t); c.end(true); res(null); });
      });
      if (client) break;
    }
    if (!client) { onStatus('off'); setTimeout(connect, 30000); return; }
    client.options.reconnectPeriod = 5000;   // 연결된 뒤에는 끊겨도 다시 붙는다
    client.on('message', onMessage);
    client.on('connect', () => { client.subscribe([`${TOPIC}/p`, `${TOPIC}/bye`]); onStatus('on'); });
    client.on('offline', () => onStatus('off'));
    client.subscribe([`${TOPIC}/p`, `${TOPIC}/bye`]);
    onStatus('on');
  }

  function send(s) {
    if (!client?.connected) return;
    client.publish(`${TOPIC}/p`, JSON.stringify({ v: 1, i: id, l: s.label, x: +s.x.toFixed(2), z: +s.z.toFixed(2), y: +s.yaw.toFixed(2), s: s.say || undefined, n: s.sid || undefined }));
  }
  const bye = () => { try { client?.connected && client.publish(`${TOPIC}/bye`, JSON.stringify({ i: id })); } catch {} };
  addEventListener('pagehide', bye);

  setTimeout(connect, 3000);   // 첫 화면이 자리 잡은 뒤에 붙는다
  return { id, send, get online() { return !!client?.connected; } };
}
