// Per-session encrypted visitor messages. Public keys are anonymous, not verified identities.
const encode = b => btoa(String.fromCharCode(...new Uint8Array(b)));
const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export function createDirect(id, publish, receive) {
  const peers = new Map(), seen = new Set();
  let publicKey = null, lastSent = 0;
  const ready = (async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
    return pair;
  })();
  // Unsupported/insecure browsers keep public presence usable.
  ready.catch(() => {});
  async function key(jwk) {
    const pair = await ready;
    const other = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: other }, pair.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  return {
    get publicKey() { return publicKey; },
    remember(who, jwk) {
      if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || typeof jwk.x !== 'string' || typeof jwk.y !== 'string' || jwk.x.length > 64 || jwk.y.length > 64) return;
      if (!peers.has(who) && peers.size >= 128) return;
      peers.set(who, { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
    },
    forget(who) { peers.delete(who); },
    available(who) { return !!publicKey && peers.has(who); },
    async send(who, text) {
      if (!peers.has(who)) throw Error('상대방의 대화 연결을 기다려 주세요.');
      if (Date.now() - lastSent < 500) throw Error('잠시 후 다시 보내 주세요.');
      text = String(text).trim();
      if (!text || text.length > 500) throw Error('메시지는 1~500자로 적어 주세요.');
      lastSent = Date.now();
      const packet = { from: id, to: who, mid: crypto.randomUUID(), iv: encode(crypto.getRandomValues(new Uint8Array(12))) };
      const aad = new TextEncoder().encode(`${packet.from}|${packet.to}|${packet.mid}`);
      packet.body = encode(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: decode(packet.iv), additionalData: aad }, await key(peers.get(who)), new TextEncoder().encode(text)));
      await publish(who, packet);
      return packet.mid;
    },
    async accept(packet) {
      try {
        if (packet.to !== id || !peers.has(packet.from) || typeof packet.mid !== 'string' || packet.mid.length > 64 || seen.has(packet.mid) || typeof packet.iv !== 'string' || packet.iv.length !== 16 || typeof packet.body !== 'string' || packet.body.length > 6000) return;
        const aad = new TextEncoder().encode(`${packet.from}|${packet.to}|${packet.mid}`);
        const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(packet.iv), additionalData: aad }, await key(peers.get(packet.from)), decode(packet.body));
        const text = new TextDecoder().decode(bytes);
        if (!text.trim() || text.length > 500 || seen.has(packet.mid)) return;
        seen.add(packet.mid); if (seen.size > 200) seen.delete(seen.values().next().value);
        receive({ from: packet.from, text, mid: packet.mid });
      } catch { /* malformed, changed-key, or tampered messages are ignored */ }
    },
  };
}
