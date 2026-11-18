// Map directory: an opt-in menu on the Floorplan mark, available when this map is registered in a directory.
(() => {
  const SC = window.Floorplan, S = window.FLOORPLAN_SERVER;
  if (!SC || !S) return;
  const brand = document.querySelector('.brand'); if (!brand) return;
  brand.tabIndex = 0; brand.setAttribute('role', 'button'); brand.setAttribute('aria-label', 'Open map directory'); brand.style.cursor = 'pointer';
  const menu = document.createElement('div'); menu.className = 'menu glass'; menu.id = 'fp-directory-menu'; document.body.append(menu);
  const api = async (method = 'GET', body) => { const r = await fetch('/api/directory', { method, headers: { 'content-type': 'application/json', 'x-floorplan-token': S.token }, ...(body ? { body: JSON.stringify(body) } : {}) }); if (!r.ok) throw new Error('Directory unavailable'); return r.json(); };
  const esc = SC.h;
  const openMap = (id, running) => {
    const href = window.FLOORPLAN_LAUNCHER ? `/map/${id}${running ? '' : '/static/'}` : null;
    if (href) window.location.href = href;
    else { const m = currentMaps.find((x) => x.id === id); SC.openWindow(running ? m?.url : m?.staticUrl); }
  };
  let currentMaps = [];
  function place() { const r = brand.getBoundingClientRect(); menu.style.left = Math.max(8, r.left) + 'px'; menu.style.top = r.bottom + 8 + 'px'; }
  function draw(maps) { currentMaps = maps; menu.innerHTML = `<div class="dir-title">Maps in this folder</div>${maps.map((m) => `<div class="dir-row"><div><b>${esc(m.name)}</b><span>${esc(m.projectPath)} · ${m.running ? 'Server on' : 'Static'}</span></div><div><button data-static="${esc(m.id)}">Open</button><button data-server="${esc(m.id)}">${m.running ? 'Server' : 'Start'}</button>${m.running && m.projectPath !== '.' ? `<button data-stop="${esc(m.id)}" aria-label="Stop server">×</button>` : ''}</div></div>`).join('')}`;
    menu.querySelectorAll('[data-static]').forEach((b) => b.onclick = () => openMap(b.dataset.static, false));
    menu.querySelectorAll('[data-server]').forEach((b) => b.onclick = async () => { const m = maps.find((x) => x.id === b.dataset.server); if (m.running) return openMap(m.id, true); b.disabled = true; try { await api('POST', { action: 'start', id: m.id }); openMap(m.id, true); } catch { SC.toast('Could not start this map server.'); } finally { b.disabled = false; } });
    menu.querySelectorAll('[data-stop]').forEach((b) => b.onclick = async () => { try { await api('POST', { action: 'stop', id: b.dataset.stop }); await open(); } catch { SC.toast('Could not stop this map server.'); } });
  }
  async function open() { try { const d = await api(); draw(d.maps); place(); menu.classList.add('open'); } catch { SC.toast('No Floorplan directory includes this map.'); } }
  function close() { menu.classList.remove('open'); }
  brand.onclick = (e) => { e.preventDefault(); e.stopPropagation(); menu.classList.contains('open') ? close() : open(); };
  brand.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); brand.click(); } };
  window.addEventListener('pointerdown', (e) => { if (!menu.contains(e.target) && !brand.contains(e.target)) close(); }, true);
  window.addEventListener('resize', () => { if (menu.classList.contains('open')) place(); });
  const style = document.createElement('style'); style.textContent = `#fp-directory-menu{position:fixed;width:min(460px,calc(100vw - 16px));padding:8px;max-height:70vh;overflow:auto}.dir-title{padding:8px 10px 6px;font-size:12px;color:var(--text-3)}.dir-row{display:flex;justify-content:space-between;gap:12px;padding:10px;border-radius:12px}.dir-row:hover{background:rgba(var(--ink),.06)}.dir-row b,.dir-row span{display:block}.dir-row b{font-size:13px;font-weight:550}.dir-row span{font-family:var(--mono);font-size:11px;color:var(--text-3);margin-top:3px}.dir-row button{border:0;border-radius:9px;padding:6px 8px;background:rgba(var(--ink),.08);color:var(--text);cursor:pointer;font:inherit;font-size:11px}.dir-row button:hover{background:rgba(var(--ink),.14)}`; document.head.append(style);
})();
