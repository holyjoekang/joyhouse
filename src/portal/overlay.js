// 콘텐츠 연결 단계: 포털 문을 지나면 사이트가 집 안 화면으로 열린다.
// 이 단계의 유일한 HTML UI다(사이트 자체가 HTML이므로). 돌아가기를 누르면 같은 자리로 돌아온다.
export function createOverlay({ onOpen, onClose }) {
  const root = document.createElement('div');
  root.setAttribute('role', 'dialog');
  root.style.cssText = 'position:fixed;inset:0;display:none;flex-direction:column;background:#14100c;z-index:10;';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;background:#2f2419;color:#f4e2b8;font:600 17px "Malgun Gothic","Apple SD Gothic Neo",sans-serif;';
  const back = document.createElement('button');
  back.textContent = '← Joyhouse로 돌아가기';
  back.style.cssText = 'font:inherit;color:#2f2419;background:#f4e2b8;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;min-height:44px;';
  const title = document.createElement('span');
  title.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  const tab = document.createElement('a');
  tab.textContent = '새 탭에서 열기 ↗';
  tab.target = '_blank'; tab.rel = 'noopener';
  tab.style.cssText = 'color:#f4e2b8;text-decoration:none;padding:10px 6px;white-space:nowrap;';
  bar.append(back, title, tab);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'flex:1;width:100%;border:0;background:#fff;';
  frame.setAttribute('allow', 'fullscreen');
  root.append(bar, frame);
  document.body.append(root);

  let open = false;
  function close() {
    if (!open) return;
    open = false;
    root.style.display = 'none';
    frame.src = 'about:blank';
    onClose?.();
  }
  back.addEventListener('click', close);
  addEventListener('keydown', e => { if (open && e.key === 'Escape') close(); });

  return {
    get open() { return open; },
    show(url, label) {
      open = true;
      title.textContent = label || url;
      tab.href = url;
      frame.src = url;
      root.style.display = 'flex';
      back.focus();
      onOpen?.();
    },
    close,
  };
}

// 새 탭으로만 여는 곳(다른 출처가 프레임을 막는 사이트)
export function openTab(url) {
  window.open(url, '_blank', 'noopener');
}
