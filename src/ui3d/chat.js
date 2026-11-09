export function createChat({ send, stopWalking, peerOnline }) {
  const threads = new Map(); let active = null, busy = false;
  const dialog = document.createElement('dialog'); dialog.id = 'jh-chat';
  dialog.innerHTML = `<form method="dialog" class="chat-heading"><div><small>JOYHOUSE · 대화</small><h2></h2></div><button aria-label="대화 닫기">×</button></form><p class="chat-note"></p><div class="chat-messages" role="log" aria-live="polite" aria-label="대화 내용"></div><form class="chat-compose"><label for="jh-message">메시지</label><textarea id="jh-message" maxlength="500" rows="2" placeholder="상대방에게 인사를 건네 보세요"></textarea><div><span class="chat-status" role="status"></span><button type="submit">보내기</button></div></form>`;
  const inbox = document.createElement('button'); inbox.id = 'jh-inbox'; inbox.type = 'button'; inbox.hidden = true;
  const style = document.createElement('style');
  style.textContent = `#jh-chat{width:min(420px,calc(100vw - 32px));box-sizing:border-box;border:1px solid #bba376;border-radius:20px;padding:22px;background:#faf7f0;color:#23313b;box-shadow:0 24px 80px #0005;font:14px/1.6 system-ui}#jh-chat::backdrop{background:#15222b80}#jh-chat .chat-heading{display:flex;justify-content:space-between;align-items:center}#jh-chat small{letter-spacing:.12em;font-size:10px;color:#77633e}#jh-chat h2{margin:2px 0;font-size:22px}#jh-chat button{border:0;border-radius:9px;padding:9px 15px;background:#233e48;color:white;font:inherit;cursor:pointer}#jh-chat button:disabled{opacity:.5;cursor:wait}#jh-chat .chat-note{font-size:12px;color:#68706e}#jh-chat .chat-messages{height:240px;max-height:32dvh;overflow:auto;border-block:1px solid #d9d2c4;padding:10px 0}#jh-chat .message{margin:7px 0;padding:9px 12px;background:#e8ece8;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}#jh-chat .message.mine{background:#e9dfcb;margin-left:36px}#jh-chat .message strong{display:block;font-size:11px;color:#64716e}#jh-chat textarea{box-sizing:border-box;width:100%;resize:vertical;max-height:100px;border:1px solid #c8c2b6;border-radius:10px;padding:10px;font:inherit;background:white}#jh-chat .chat-compose label{display:block;margin:10px 0 4px}#jh-chat .chat-compose>div{display:flex;justify-content:space-between;gap:12px;margin-top:8px}#jh-chat .chat-status{font-size:12px}#jh-chat :focus-visible{outline:2px solid #986d28;outline-offset:3px}#jh-inbox{position:fixed;right:18px;bottom:24px;z-index:18;border:1px solid #bba376;border-radius:24px;padding:12px 18px;background:#233e48;color:#fff;font:600 14px system-ui;cursor:pointer}`;
  document.head.append(style); document.body.append(dialog, inbox);
  for (const e of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel']) dialog.addEventListener(e, event => event.stopPropagation());
  const log = dialog.querySelector('.chat-messages'), input = dialog.querySelector('textarea'), status = dialog.querySelector('.chat-status'), submit = dialog.querySelector('.chat-compose button');
  function thread(person) {
    if (!threads.has(person.id)) {
      if (threads.size >= 40) { const oldest = [...threads.keys()].find(k => k !== active?.id); threads.delete(oldest); }
      threads.set(person.id, { ...person, messages: [], unread: 0 });
    }
    const t = threads.get(person.id); t.label = person.label; return t;
  }
  function notice() { const t = [...threads.values()].find(t => t.unread); inbox.hidden = !t; inbox.textContent = t ? `${t.label} · 새 대화 ${t.unread}개` : ''; }
  function render() {
    if (!active) return;
    log.replaceChildren();
    for (const m of active.messages) {
      const row = document.createElement('div'); row.className = 'message' + (m.mine ? ' mine' : '');
      const label = document.createElement('strong'); label.textContent = m.mine ? '나' : active.label;
      row.append(label, document.createTextNode(m.text)); log.append(row);
    }
    log.scrollTop = log.scrollHeight;
  }
  function append(t, text, mine) { t.messages.push({ text, mine }); if (t.messages.length > 50) t.messages.shift(); if (active === t && dialog.open) render(); }
  function open(person) {
    active = thread(person); active.unread = 0; notice(); stopWalking();
    dialog.querySelector('h2').textContent = active.label;
    dialog.querySelector('.chat-note').textContent = active.npc ? '마을 안내 캐릭터입니다. 준비된 안내로 답하며 실제 접속자가 아닙니다.' : '이 방문자에게만 보내는 암호화 대화입니다. 익명 접속으로 신원은 확인되지 않습니다. 대화는 이 페이지를 닫으면 사라집니다.';
    if (active.npc && !active.messages.length) append(active, active.lines?.[0] || '반가워요! 관람 안내에서 공간을 골라 보세요.', false);
    status.textContent = active.npc ? '마을 주민 안내' : peerOnline(active.id) ? '접속 중 · 500자까지' : '상대방 연결을 기다리는 중';
    input.value = ''; render(); if (!dialog.open) dialog.showModal(); input.focus();
  }
  inbox.onclick = () => { const t = [...threads.values()].find(t => t.unread); if (t) open(t); };
  dialog.querySelector('.chat-compose').onsubmit = async event => {
    event.preventDefault(); const text = input.value.trim(), target = active;
    if (!text || busy || !target) return;
    busy = true; submit.disabled = true;
    try {
      if (target.npc) {
        append(target, text, true);
        const answer = /책|서재/.test(text) ? '블루룸에서 책과 독서 기록을 만나세요.' : /여행|지도/.test(text) ? '맵룸에는 여행 지도와 장소 이야기가 있어요.' : /어디|길|안내/.test(text) ? '왼쪽 관람 안내에서 추천 코스를 시작해 보세요. 그랜드 홀부터 안내해 드려요.' : target.lines?.[target.messages.length % (target.lines?.length || 1)] || '반가워요! 궁금한 공간은 관람 안내에서 골라 보세요.';
        append(target, answer, false); status.textContent = '주민의 준비된 안내';
      } else {
        if (!peerOnline(target.id)) throw Error('상대방이 떠났거나 연결이 끊겼습니다.');
        await send(target.id, text); append(target, text, true); status.textContent = '전송 요청 완료 · 수신 확인은 제공하지 않습니다';
      }
      if (active === target) input.value = '';
    } catch (e) { status.textContent = e.message; }
    finally { busy = false; submit.disabled = false; }
  };
  return { open, get open_() { return dialog.open; }, receive(person, text) { const t = thread(person); append(t, text, false); if (!dialog.open || active !== t) t.unread++; notice(); } };
}
