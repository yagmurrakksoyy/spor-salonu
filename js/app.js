/* =====================================================================
   FitPark Spor Salonu Yönetim Paneli
   Supabase (PostgreSQL) üzerinde çalışan tek sayfalık uygulama.
   ===================================================================== */
(function () {
  'use strict';

  const cfg = window.APP_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  // ------------------------------------------------------------------
  // Yardımcılar
  // ------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TZ = 'Europe/Istanbul';
  const nf = new Intl.NumberFormat('tr-TR');
  const _tl = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  const money = { format: (v) => `${_tl.format(Number(v) || 0)} TL` };
  const trLower = (s) => String(s ?? '').toLocaleLowerCase('tr-TR');

  /** İstanbul'daki şu anki zaman: { date: 'YYYY-MM-DD', time: 'HH:MM:SS', iso: 'YYYY-MM-DDTHH:MM:SS' } */
  function istNow() {
    const parts = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}:${parts.second}`;
    return { date, time, iso: `${date}T${time}` };
  }
  // Veritabanındaki zaman damgaları "İstanbul yerel saati" olarak (saat dilimsiz) tutuluyor.
  // Hesaplarda iki tarafı da aynı şekilde UTC gibi yorumlayarak fark alıyoruz.
  const naive = (s) => new Date(String(s).replace(' ', 'T').slice(0, 19) + 'Z');
  const addDays = (dateStr, n) => { const d = naive(dateStr + 'T00:00:00'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((naive(b + 'T00:00:00') - naive(a + 'T00:00:00')) / 86400000);
  const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  function fmtDate(s, long) {
    if (!s) return '—';
    const d = naive(String(s).slice(0, 10) + 'T00:00:00');
    return `${d.getUTCDate()} ${(long ? MONTHS_LONG : MONTHS)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const fmtTime = (s) => (s ? String(s).replace(' ', 'T').slice(11, 16) : '—');
  const fmtDateTime = (s) => (s ? `${fmtDate(s)} ${fmtTime(s)}` : '—');
  function fmtDuration(mins) {
    if (mins == null || isNaN(mins)) return '—';
    mins = Math.max(0, Math.round(mins));
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h} sa ${m} dk` : `${m} dk`;
  }
  const minutesBetween = (a, b) => (naive(b) - naive(a)) / 60000;
  const initials = (ad, soyad) => (String(ad || '?')[0] + String(soyad || '')[0]).toLocaleUpperCase('tr-TR');
  function age(dob) {
    const t = istNow().date;
    let a = Number(t.slice(0, 4)) - Number(dob.slice(0, 4));
    if (t.slice(5) < dob.slice(5)) a--;
    return a;
  }
  const fmtPhone = (p) => (p && p.length === 11 ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9)}` : p || '—');

  const STATUS = {
    'Aktif': 'ok', 'Yakında Bitiyor': 'warn', 'Süresi Doldu': 'bad', 'Başlamadı': 'info',
  };
  const statusBadge = (d) => `<span class="badge ${STATUS[d] || 'muted'}">${esc(d)}</span>`;

  const ICON = {
    search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4zm8 0h-1a4 4 0 0 1 2 4v3h7v-3c0-2.7-5.3-4-8-4z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    in: '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v3H3v4h7zm9-14h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M14 17l5-5-5-5v3H8v4h6zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4l3.5 2.1-.8 1.2L11 13V7h2z"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    money: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.3-.6-3-1.2-3-2.1 0-1.1 1-1.9 2.7-1.9 1.8 0 2.4.8 2.5 2.1h2.2c-.1-1.7-1.1-3.3-3.2-3.8V3h-3v2.2C8.1 5.6 6.5 6.9 6.5 8.8c0 2.3 1.9 3.4 4.6 4.1 2.5.6 3 1.5 3 2.4 0 .7-.5 1.8-2.7 1.8-2.1 0-2.9-.9-3-2.1H6.2c.1 2.2 1.8 3.5 3.8 3.9V21h3v-2.2c1.9-.4 3.5-1.5 3.5-3.6 0-2.8-2.4-3.8-4.7-4.3z"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.6L15.6 17 12 13.4 8.4 17 7 15.6l3.6-3.6L7 8.4 8.4 7l3.6 3.6L15.6 7 17 8.4 13.4 12z"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8l11-11-3.8-3.8-11 11zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8L20.7 7z"/></svg>',
    renew: '<svg viewBox="0 0 24 24"><path d="M12 6v3l4-4-4-4v3a8 8 0 0 0-6.8 12.2l1.5-1.5A6 6 0 0 1 12 6zm6.8 1.8l-1.5 1.5A6 6 0 0 1 12 18v-3l-4 4 4 4v-3a8 8 0 0 0 6.8-12.2z"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zm-3 11H8v-5h8v5zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM18 3H6v4h12z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M17.6 6.4A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.4-6.2L13 11h7V4z"/></svg>',
  };

  // ------------------------------------------------------------------
  // Hata mesajlarını Türkçeleştirme (veritabanı kısıtlarına göre)
  // ------------------------------------------------------------------
  const CONSTRAINT_MSG = {
    uyeler_eposta_key: 'Bu e-posta adresiyle kayıtlı başka bir üye var.',
    uyeler_telefon_key: 'Bu telefon numarasıyla kayıtlı başka bir üye var.',
    uyeler_eposta_check: 'E-posta adresi geçerli değil.',
    uyeler_telefon_check: 'Telefon numarası 05 ile başlayan 11 haneli olmalı (ör. 05321234567).',
    uyeler_cinsiyet_check: 'Cinsiyet K veya E olmalı.',
    uyeler_dogum_tarihi_check: 'Doğum tarihi 1920 sonrası olmalı.',
    chk_uyelik_kayittan_sonra: 'Üyelik başlangıcı kayıt tarihinden önce olamaz.',
    chk_cikis_giristen_sonra: 'Giriş ve çıkış aynı saniyede olamaz; birkaç saniye sonra tekrar deneyin.',
  };
  function trError(err) {
    if (!err) return 'Bilinmeyen bir hata oluştu.';
    const msg = err.message || String(err);
    for (const k in CONSTRAINT_MSG) if (msg.includes(k) || (err.details || '').includes(k)) return CONSTRAINT_MSG[k];
    if (err.code === '23505') return 'Bu kayıt zaten var (tekrar eden değer).';
    if (err.code === '23503') return 'İlişkili kayıt bulunamadı.';
    if (err.code === '42501' || /row-level security/i.test(msg)) return 'Bu işlem için yetkiniz yok.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.';
    if (/JWT expired/i.test(msg)) return 'Oturum süresi doldu, lütfen tekrar giriş yapın.';
    return msg;
  }

  // ------------------------------------------------------------------
  // Bildirim (toast) ve modal
  // ------------------------------------------------------------------
  function toast(title, text = '', type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<strong>${esc(title)}</strong>${text ? esc(text) : ''}`;
    $('#toast-root').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 4200);
    setTimeout(() => el.remove(), 4600);
  }

  function modal({ title, body, footer, onMount, wide }) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${wide ? 'style="max-width:760px"' : ''}>
        <div class="modal-head"><h3>${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Kapat"><svg viewBox="0 0 24 24"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg></button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    root.appendChild(wrap);
    const first = $('input, select', wrap);
    if (first) setTimeout(() => first.focus(), 30);
    if (onMount) onMount(wrap, close);
    return close;
  }

  function confirmBox(title, text, okLabel = 'Onayla', danger) {
    return new Promise((resolve) => {
      let done = false;
      const close = modal({
        title,
        body: `<p style="margin:0">${text}</p>`,
        footer: `<button class="btn" data-close>Vazgeç</button><button class="btn ${danger ? 'btn-bad' : 'btn-primary'}" id="cf-ok">${esc(okLabel)}</button>`,
        onMount: (w, c) => {
          $('#cf-ok', w).addEventListener('click', () => { done = true; c(); resolve(true); });
          const obs = new MutationObserver(() => { if (!w.isConnected) { obs.disconnect(); if (!done) resolve(false); } });
          obs.observe($('#modal-root'), { childList: true });
        },
      });
      return close;
    });
  }

  // ------------------------------------------------------------------
  // Veri katmanı
  // ------------------------------------------------------------------
  async function q(promise) {
    const { data, error, count } = await promise;
    if (error) throw error;
    return count != null ? { data, count } : data;
  }
  const api = {
    paketler: () => q(sb.from('uyelik_paketleri').select('*').order('sure_ay')),
    uyeler: () => q(sb.from('uyeler').select('*').order('uye_id')),
    durumlar: () => q(sb.from('vw_uye_uyelik_durumu').select('*')),
    icerdekiler: () => q(sb.from('giris_cikis_log').select('log_id, uye_id, giris_zamani, uyeler(ad, soyad, cinsiyet)').is('cikis_zamani', null).order('giris_zamani', { ascending: false })),
    loglarSince: (fromDate) => q(sb.from('giris_cikis_log').select('log_id, uye_id, giris_zamani, cikis_zamani').gte('giris_zamani', fromDate).order('giris_zamani', { ascending: false }).limit(5000)),
    saatYogunluk: () => q(sb.from('vw_rapor_saat_yogunluk').select('*').order('saat')),
    girisYap: (uye_id) => q(sb.from('giris_cikis_log').insert({ uye_id }).select().single()),
    cikisYap: (uye_id) => q(sb.rpc('fn_cikis_yap', { p_uye_id: uye_id })),
  };

  /** Üyeler + durum görünümü + paket bilgisini birleştirir */
  async function loadMembers() {
    const [uyeler, durumlar, paketler, icerde] = await Promise.all([api.uyeler(), api.durumlar(), api.paketler(), api.icerdekiler()]);
    const dMap = new Map(durumlar.map((d) => [d.uye_id, d]));
    const pMap = new Map(paketler.map((p) => [p.paket_id, p]));
    const iMap = new Map(icerde.map((l) => [l.uye_id, l]));
    const members = uyeler.map((u) => {
      const d = dMap.get(u.uye_id) || {};
      return {
        ...u, ad_soyad: `${u.ad} ${u.soyad}`, paket: pMap.get(u.paket_id), durum: d.durum, kalan_gun: d.kalan_gun,
        uyelik_bitis: d.uyelik_bitis, icerde: iMap.get(u.uye_id) || null,
      };
    });
    updateBadges(members, icerde);
    return { members, paketler, icerde };
  }

  function updateBadges(members, icerde) {
    const b1 = $('#badge-icerde'), b2 = $('#badge-bitiyor');
    if (icerde) { b1.textContent = icerde.length; b1.hidden = !icerde.length; b1.title = 'Şu an salonda'; }
    if (members) {
      const n = members.filter((m) => m.durum === 'Yakında Bitiyor').length;
      b2.textContent = n; b2.hidden = !n; b2.title = 'Üyeliği 7 gün içinde bitecek';
    }
  }

  // ------------------------------------------------------------------
  // Grafikler
  // ------------------------------------------------------------------
  const charts = [];
  function destroyCharts() { while (charts.length) charts.pop().destroy(); }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function chartDefaults() {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = cssVar('--text-2');
    Chart.defaults.borderColor = cssVar('--border');
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.maintainAspectRatio = false;
  }
  const PALETTE = ['#ea580c', '#2563eb', '#16a34a', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#64748b'];
  function makeChart(canvas, config) { chartDefaults(); const c = new Chart(canvas, config); charts.push(c); return c; }

  // ------------------------------------------------------------------
  // Yönlendirme (router)
  // ------------------------------------------------------------------
  const routes = {};
  let refreshTimer = null;
  let currentRoute = null;
  function route(name, title, fn) { routes[name] = { title, fn }; }

  async function render() {
    clearInterval(refreshTimer); refreshTimer = null;
    destroyCharts();
    const hash = location.hash.replace(/^#\/?/, '') || 'panel';
    const [name, ...params] = hash.split('?')[0].split('/');
    const r = routes[name] || routes.panel;
    currentRoute = name;
    $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (name === 'uye' ? 'uyeler' : name)));
    $('#page-title').textContent = r.title;
    document.title = `${r.title} · ${cfg.SALON_ADI}`;
    $('#sidebar').classList.remove('open');
    const view = $('#view');
    view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      await r.fn(view, ...params);
    } catch (err) {
      console.error(err);
      if (currentRoute !== name) return;
      view.innerHTML = `<div class="card"><div class="empty">
        <p style="color:var(--bad);font-weight:600">Veriler yüklenemedi</p>
        <p>${esc(trError(err))}</p>
        <button class="btn" onclick="location.reload()">${ICON.refresh} Yeniden dene</button></div></div>`;
    }
    view.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', render);

  // ------------------------------------------------------------------
  // SAYFA: Gösterge Paneli
  // ------------------------------------------------------------------
  route('panel', 'Gösterge Paneli', async (view) => {
    const today = istNow().date;
    const since = addDays(today, -13);
    const [{ members, paketler, icerde }, loglar, saatler] = await Promise.all([loadMembers(), api.loglarSince(since), api.saatYogunluk()]);

    const aktif = members.filter((m) => m.durum === 'Aktif' || m.durum === 'Yakında Bitiyor');
    const bitiyor = members.filter((m) => m.durum === 'Yakında Bitiyor').sort((a, b) => a.kalan_gun - b.kalan_gun);
    const doldu = members.filter((m) => m.durum === 'Süresi Doldu').sort((a, b) => b.kalan_gun - a.kalan_gun);
    const bugun = loglar.filter((l) => l.giris_zamani.slice(0, 10) === today);
    const ayBas = today.slice(0, 7);
    const buAyYeni = members.filter((m) => String(m.kayit_tarihi).slice(0, 7) === ayBas).length;
    const aylikGelir = aktif.reduce((s, m) => s + (m.paket ? Number(m.paket.fiyat) / m.paket.sure_ay : 0), 0);

    const stat = (icon, cls, label, value, hint) => `
      <div class="card stat"><div class="stat-icon ${cls}">${icon}</div>
      <div><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-hint">${hint}</div></div></div>`;

    view.innerHTML = `
      <div class="grid stats six">
        ${stat(ICON.users, '', 'Toplam Üye', nf.format(members.length), `Bu ay ${buAyYeni} yeni kayıt`)}
        ${stat(ICON.ok, 'ok', 'Aktif Üyelik', nf.format(aktif.length), `%${members.length ? Math.round(100 * aktif.length / members.length) : 0} oran`)}
        ${stat(ICON.in, 'info', 'Şu An Salonda', `<span id="st-icerde">${icerde.length}</span>`, 'Çıkış yapmamış üye')}
        ${stat(ICON.clock, '', 'Bugünkü Giriş', nf.format(bugun.length), DAYS[naive(today + 'T00:00:00').getUTCDay()])}
        ${stat(ICON.warn, 'warn', 'Yakında Bitecek', nf.format(bitiyor.length), `${doldu.length} üyeliğin süresi doldu`)}
        ${stat(ICON.money, 'ok', 'Aylık Gelir (aktif)', money.format(aylikGelir), 'Paket fiyatı / süre')}
      </div>

      <div class="grid cols-3 mb">
        <div class="card"><div class="card-head"><div><h2>Son 14 Gün Ziyaretler</h2><div class="sub">Günlük turnike giriş sayısı</div></div></div>
          <div class="card-body"><div class="chart-box"><canvas id="ch-gunluk"></canvas></div></div></div>
        <div class="card"><div class="card-head"><div><h2>Paket Dağılımı</h2><div class="sub">Üyelerin güncel paketleri</div></div></div>
          <div class="card-body"><div class="chart-box"><canvas id="ch-paket"></canvas></div></div></div>
      </div>

      <div class="grid cols-2 mb">
        <div class="card"><div class="card-head"><div><h2>Şu An Salonda</h2><div class="sub">Her 30 saniyede bir yenilenir</div></div>
          <a class="btn btn-sm" href="#/turnike">Turnikeye git</a></div>
          <div class="card-body flush" id="icerde-list"></div></div>
        <div class="card"><div class="card-head"><div><h2>Üyelik Uyarıları</h2><div class="sub">7 gün içinde bitecek ve süresi dolmuş üyelikler</div></div>
          <a class="btn btn-sm" href="#/uyeler?durum=Yakında Bitiyor">Tümünü gör</a></div>
          <div class="card-body flush">
            ${bitiyor.length + doldu.length ? `<ul class="list">${[...bitiyor, ...doldu.slice(0, 6)].map((m) => `
              <li><a class="person grow" href="#/uye/${m.uye_id}" style="color:inherit;text-decoration:none">
                <span class="avatar">${esc(initials(m.ad, m.soyad))}</span>
                <span style="min-width:0"><span class="person-name">${esc(m.ad_soyad)}</span>
                <span class="person-sub" style="display:block">${esc(m.paket?.paket_adi)} · bitiş ${fmtDate(m.uyelik_bitis)}</span></span></a>
                ${m.durum === 'Yakında Bitiyor' ? `<span class="badge warn">${m.kalan_gun} gün kaldı</span>` : `<span class="badge bad">${-m.kalan_gun} gün önce bitti</span>`}
                <button class="btn btn-sm" data-renew="${m.uye_id}">Yenile</button>
              </li>`).join('')}</ul>` : '<div class="empty">Uyarı gerektiren üyelik yok.</div>'}
          </div></div>
      </div>

      <div class="card"><div class="card-head"><div><h2>Saatlere Göre Salon Yoğunluğu</h2><div class="sub">Tüm zamanlar · giriş saatine göre (kadın / erkek)</div></div></div>
        <div class="card-body"><div class="chart-box sm"><canvas id="ch-saat"></canvas></div></div></div>
    `;

    // Günlük ziyaret grafiği
    const days = Array.from({ length: 14 }, (_, i) => addDays(since, i));
    const counts = days.map((d) => loglar.filter((l) => l.giris_zamani.slice(0, 10) === d).length);
    makeChart($('#ch-gunluk'), {
      type: 'bar',
      data: { labels: days.map((d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`),
        datasets: [{ label: 'Giriş', data: counts, backgroundColor: days.map((d) => (d === today ? '#ea580c' : 'rgba(234,88,12,.45)')), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } },
    });
    // Paket dağılımı
    makeChart($('#ch-paket'), {
      type: 'doughnut',
      data: { labels: paketler.map((p) => p.paket_adi),
        datasets: [{ data: paketler.map((p) => members.filter((m) => m.paket_id === p.paket_id).length), backgroundColor: PALETTE, borderWidth: 0 }] },
      options: { cutout: '62%', plugins: { legend: { position: 'bottom' } } },
    });
    // Saatlik yoğunluk
    const hours = Array.from({ length: 18 }, (_, i) => i + 6);
    const hm = new Map(saatler.map((s) => [s.saat, s]));
    makeChart($('#ch-saat'), {
      type: 'bar',
      data: { labels: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
        datasets: [
          { label: 'Kadın', data: hours.map((h) => hm.get(h)?.kadin || 0), backgroundColor: '#db2777', borderRadius: 4, stack: 's' },
          { label: 'Erkek', data: hours.map((h) => hm.get(h)?.erkek || 0), backgroundColor: '#2563eb', borderRadius: 4, stack: 's' },
        ] },
      options: { plugins: { legend: { position: 'top', align: 'end' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } },
    });

    bindRenewButtons(view, members, paketler);
    renderIcerdeList($('#icerde-list'), icerde);
    refreshTimer = setInterval(async () => {
      try { const ic = await api.icerdekiler(); renderIcerdeList($('#icerde-list'), ic); $('#st-icerde').textContent = ic.length; updateBadges(null, ic); } catch (e) { /* sessizce geç */ }
    }, 30000);
  });

  function renderIcerdeList(el, icerde, onChange) {
    if (!el) return;
    const now = istNow().iso;
    el.innerHTML = icerde.length ? `<ul class="list">${icerde.map((l) => `
      <li><a class="person grow" href="#/uye/${l.uye_id}" style="color:inherit;text-decoration:none">
        <span class="avatar">${esc(initials(l.uyeler?.ad, l.uyeler?.soyad))}</span>
        <span style="min-width:0"><span class="person-name">${esc(l.uyeler?.ad)} ${esc(l.uyeler?.soyad)}</span>
        <span class="person-sub" style="display:block">Giriş: ${fmtTime(l.giris_zamani)}${l.giris_zamani.slice(0, 10) !== now.slice(0, 10) ? ' (' + fmtDate(l.giris_zamani) + ')' : ''}</span></span></a>
        <span class="elapsed">${fmtDuration(minutesBetween(l.giris_zamani, now))}</span>
        <button class="btn btn-sm btn-bad" data-cikis="${l.uye_id}" data-ad="${esc(l.uyeler?.ad + ' ' + l.uyeler?.soyad)}">${ICON.out} Çıkış</button>
      </li>`).join('')}</ul>` : '<div class="empty">Şu anda salonda kimse yok.</div>';
    $$('[data-cikis]', el).forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await api.cikisYap(Number(b.dataset.cikis));
        toast('Çıkış kaydedildi', `${b.dataset.ad} salondan çıktı.`);
        if (onChange) onChange(); else render();
      } catch (e) { toast('Çıkış yapılamadı', trError(e), 'bad'); b.disabled = false; }
    }));
  }

  // ------------------------------------------------------------------
  // SAYFA: Üyeler
  // ------------------------------------------------------------------
  route('uyeler', 'Üyeler', async (view) => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const { members, paketler } = await loadMembers();
    const state = { q: '', durum: params.get('durum') || '', paket: '', konum: '', sort: 'uye_id', dir: -1 };

    view.innerHTML = `
      <div class="section-title"><div><h2>Üye Listesi</h2><p>${members.length} kayıtlı üye</p></div>
        <div class="btn-row"><button class="btn" id="csv-btn">${ICON.download} CSV indir</button>
        <button class="btn btn-primary" id="new-btn">${ICON.plus} Yeni Üye</button></div></div>
      <div class="card">
        <div class="toolbar">
          <label class="search grow">${ICON.search}<input type="search" id="f-q" placeholder="Ad, soyad, e-posta veya telefon ara…" aria-label="Üye ara"></label>
          <select id="f-durum" aria-label="Durum filtresi"><option value="">Tüm durumlar</option>
            ${Object.keys(STATUS).map((s) => `<option ${s === state.durum ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <select id="f-paket" aria-label="Paket filtresi"><option value="">Tüm paketler</option>
            ${paketler.map((p) => `<option value="${p.paket_id}">${esc(p.paket_adi)}</option>`).join('')}</select>
          <select id="f-konum" aria-label="Konum filtresi"><option value="">Herkes</option><option value="1">Şu an salonda</option></select>
        </div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th class="sortable" data-sort="ad_soyad">Üye <span class="arr"></span></th>
            <th class="hide-sm">Telefon</th>
            <th class="sortable" data-sort="paket_id">Paket <span class="arr"></span></th>
            <th class="sortable" data-sort="uyelik_baslangic">Başlangıç <span class="arr"></span></th>
            <th class="sortable" data-sort="uyelik_bitis">Bitiş <span class="arr"></span></th>
            <th class="sortable r" data-sort="kalan_gun">Kalan <span class="arr"></span></th>
            <th>Durum</th><th>Konum</th>
          </tr></thead>
          <tbody id="tbody"></tbody></table></div>
        <div class="pager"><span class="muted small" id="count"></span></div>
      </div>`;

    const filtered = () => {
      const qq = trLower(state.q.trim());
      let list = members.filter((m) =>
        (!qq || trLower(`${m.ad_soyad} ${m.eposta} ${m.telefon} #${m.uye_id}`).includes(qq)) &&
        (!state.durum || m.durum === state.durum) &&
        (!state.paket || String(m.paket_id) === state.paket) &&
        (!state.konum || m.icerde));
      const k = state.sort;
      list.sort((a, b) => {
        const x = a[k], y = b[k];
        if (typeof x === 'string') return x.localeCompare(y, 'tr') * state.dir;
        return ((x ?? 0) - (y ?? 0)) * state.dir;
      });
      return list;
    };
    const draw = () => {
      const list = filtered();
      $('#tbody').innerHTML = list.length ? list.map((m) => `
        <tr class="clickable" data-id="${m.uye_id}">
          <td><div class="person"><span class="avatar">${esc(initials(m.ad, m.soyad))}</span>
            <div style="min-width:0"><div class="person-name">${esc(m.ad_soyad)}</div><div class="person-sub">#${m.uye_id} · ${esc(m.eposta)}</div></div></div></td>
          <td class="hide-sm nowrap num">${fmtPhone(m.telefon)}</td>
          <td class="nowrap">${esc(m.paket?.paket_adi)}</td>
          <td class="nowrap">${fmtDate(m.uyelik_baslangic)}</td>
          <td class="nowrap">${fmtDate(m.uyelik_bitis)}</td>
          <td class="r num nowrap">${m.kalan_gun >= 0 ? m.kalan_gun + ' gün' : '—'}</td>
          <td>${statusBadge(m.durum)}</td>
          <td>${m.icerde ? `<span class="badge info">Salonda · ${fmtTime(m.icerde.giris_zamani)}</span>` : '<span class="badge muted">Dışarıda</span>'}</td>
        </tr>`).join('') : '<tr><td colspan="8"><div class="empty">Aramaya uyan üye bulunamadı.</div></td></tr>';
      $('#count').textContent = `${list.length} / ${members.length} üye gösteriliyor`;
      $$('th[data-sort]').forEach((th) => { $('.arr', th).textContent = th.dataset.sort === state.sort ? (state.dir > 0 ? '▲' : '▼') : ''; });
      $$('#tbody tr[data-id]').forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/uye/${tr.dataset.id}`; }));
    };
    $('#f-q').addEventListener('input', (e) => { state.q = e.target.value; draw(); });
    $('#f-durum').addEventListener('change', (e) => { state.durum = e.target.value; draw(); });
    $('#f-paket').addEventListener('change', (e) => { state.paket = e.target.value; draw(); });
    $('#f-konum').addEventListener('change', (e) => { state.konum = e.target.value; draw(); });
    $$('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
      if (state.sort === th.dataset.sort) state.dir *= -1; else { state.sort = th.dataset.sort; state.dir = 1; }
      draw();
    }));
    $('#new-btn').addEventListener('click', () => memberForm(null, paketler));
    $('#csv-btn').addEventListener('click', () => downloadCSV('uyeler.csv',
      ['Üye No', 'Ad', 'Soyad', 'Cinsiyet', 'Doğum Tarihi', 'E-posta', 'Telefon', 'Kayıt Tarihi', 'Paket', 'Başlangıç', 'Bitiş', 'Kalan Gün', 'Durum'],
      filtered().map((m) => [m.uye_id, m.ad, m.soyad, m.cinsiyet, m.dogum_tarihi, m.eposta, m.telefon, m.kayit_tarihi, m.paket?.paket_adi, m.uyelik_baslangic, m.uyelik_bitis, m.kalan_gun, m.durum])));
    draw();
    if (params.get('yeni')) memberForm(null, paketler);
  });

  // ------------------------------------------------------------------
  // Üye ekleme / düzenleme formu
  // ------------------------------------------------------------------
  const RULES = {
    ad: (v) => (v.trim().length < 2 ? 'Ad en az 2 karakter olmalı.' : v.length > 50 ? 'En fazla 50 karakter.' : ''),
    soyad: (v) => (v.trim().length < 2 ? 'Soyad en az 2 karakter olmalı.' : v.length > 50 ? 'En fazla 50 karakter.' : ''),
    eposta: (v) => (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v.trim()) ? 'Geçerli bir e-posta girin (ör. ad@ornek.com).' : ''),
    telefon: (v) => (!/^05[0-9]{9}$/.test(v.replace(/\D/g, '')) ? '05 ile başlayan 11 haneli numara girin.' : ''),
    dogum_tarihi: (v) => {
      if (!v) return 'Doğum tarihi gerekli.';
      if (v <= '1920-01-01') return '1920 sonrası bir tarih girin.';
      if (v > istNow().date) return 'Doğum tarihi gelecekte olamaz.';
      if (age(v) < 12) return 'Üye en az 12 yaşında olmalı.';
      return '';
    },
    cinsiyet: (v) => (!v ? 'Cinsiyet seçin.' : ''),
    paket_id: (v) => (!v ? 'Paket seçin.' : ''),
    uyelik_baslangic: (v) => (!v ? 'Başlangıç tarihi gerekli.' : v < istNow().date ? 'Başlangıç bugünden önce olamaz.' : ''),
  };

  function memberForm(m, paketler) {
    const isEdit = !!m;
    const today = istNow().date;
    const aktifPaketler = paketler.filter((p) => p.aktif_mi);
    const body = `
      <form id="mf" novalidate>
        <p class="form-error" id="mf-err" hidden></p>
        <div class="form-grid">
          <label class="field"><span>Ad <b class="req">*</b></span><input type="text" name="ad" maxlength="50" value="${esc(m?.ad)}" autocomplete="off"><small class="field-err"></small></label>
          <label class="field"><span>Soyad <b class="req">*</b></span><input type="text" name="soyad" maxlength="50" value="${esc(m?.soyad)}" autocomplete="off"><small class="field-err"></small></label>
          <div class="field"><span>Cinsiyet <b class="req">*</b></span>
            <div class="radio-row"><label><input type="radio" name="cinsiyet" value="K" ${m?.cinsiyet === 'K' ? 'checked' : ''}> Kadın</label>
            <label><input type="radio" name="cinsiyet" value="E" ${m?.cinsiyet === 'E' ? 'checked' : ''}> Erkek</label></div><small class="field-err"></small></div>
          <label class="field"><span>Doğum Tarihi <b class="req">*</b></span><input type="date" name="dogum_tarihi" min="1920-01-02" max="${today}" value="${esc(m?.dogum_tarihi)}"><small class="field-err"></small></label>
          <label class="field"><span>E-posta <b class="req">*</b></span><input type="email" name="eposta" maxlength="100" value="${esc(m?.eposta)}" placeholder="ad.soyad@ornek.com"><small class="field-err"></small></label>
          <label class="field"><span>Telefon <b class="req">*</b></span><input type="tel" name="telefon" maxlength="14" value="${esc(m?.telefon)}" placeholder="05XXXXXXXXX" inputmode="numeric"><small class="field-err"></small></label>
          ${isEdit ? '' : `
          <label class="field"><span>Üyelik Paketi <b class="req">*</b></span><select name="paket_id"><option value="">Seçin…</option>
            ${aktifPaketler.map((p) => `<option value="${p.paket_id}">${esc(p.paket_adi)} · ${p.sure_ay} ay · ${money.format(p.fiyat)}</option>`).join('')}</select><small class="field-err"></small></label>
          <label class="field"><span>Üyelik Başlangıcı <b class="req">*</b></span><input type="date" name="uyelik_baslangic" min="${today}" value="${today}"><small class="field-err"></small></label>
          <div class="full muted small" id="mf-ozet" style="margin:-4px 0 6px"></div>`}
        </div>
      </form>`;
    modal({
      title: isEdit ? 'Üye Bilgilerini Düzenle' : 'Yeni Üye Kaydı',
      body,
      footer: `<button class="btn" data-close>Vazgeç</button><button class="btn btn-primary" id="mf-save">${isEdit ? 'Kaydet' : 'Üyeyi Kaydet'}</button>`,
      onMount: (w, close) => {
        const form = $('#mf', w);
        const val = (n) => (n === 'cinsiyet' ? (form.querySelector('input[name=cinsiyet]:checked')?.value || '') : (form.elements[n]?.value ?? ''));
        const fields = Object.keys(RULES).filter((n) => form.elements[n]);
        const check = (n, show) => {
          const err = RULES[n](val(n));
          const el = n === 'cinsiyet' ? form.querySelector('.radio-row') : form.elements[n];
          const holder = (n === 'cinsiyet' ? el.parentElement : el.closest('.field')).querySelector('.field-err');
          if (show) { holder.textContent = err; if (el.classList) el.classList.toggle('invalid', !!err); }
          return !err;
        };
        fields.forEach((n) => {
          const els = n === 'cinsiyet' ? $$('input[name=cinsiyet]', form) : [form.elements[n]];
          els.forEach((el) => {
            el.addEventListener('blur', () => check(n, true));
            el.addEventListener('change', () => { check(n, true); ozet(); });
            el.addEventListener('input', () => { if (el.classList.contains('invalid')) check(n, true); });
          });
        });
        const ozet = () => {
          const o = $('#mf-ozet', w); if (!o) return;
          const p = paketler.find((x) => String(x.paket_id) === val('paket_id'));
          const s = val('uyelik_baslangic');
          if (p && s) {
            const d = naive(s + 'T00:00:00'); d.setUTCMonth(d.getUTCMonth() + p.sure_ay); d.setUTCDate(d.getUTCDate() - 1);
            o.innerHTML = `Üyelik <b>${fmtDate(s)}</b> – <b>${fmtDate(d.toISOString().slice(0, 10))}</b> arasında geçerli olacak. Ücret: <b>${money.format(p.fiyat)}</b>`;
          } else o.textContent = '';
        };
        const save = async () => {
          const ok = fields.map((n) => check(n, true)).every(Boolean);
          if (!ok) { const bad = $('.invalid', form); if (bad) bad.focus(); return; }
          const rec = {
            ad: val('ad').trim(), soyad: val('soyad').trim(), cinsiyet: val('cinsiyet'), dogum_tarihi: val('dogum_tarihi'),
            eposta: val('eposta').trim().toLowerCase(), telefon: val('telefon').replace(/\D/g, ''),
          };
          if (!isEdit) { rec.paket_id = Number(val('paket_id')); rec.uyelik_baslangic = val('uyelik_baslangic'); rec.kayit_tarihi = today; }
          const btn = $('#mf-save', w); btn.disabled = true; btn.textContent = 'Kaydediliyor…';
          try {
            const res = isEdit
              ? await q(sb.from('uyeler').update(rec).eq('uye_id', m.uye_id).select().single())
              : await q(sb.from('uyeler').insert(rec).select().single());
            close();
            toast(isEdit ? 'Bilgiler güncellendi' : 'Yeni üye kaydedildi', `${res.ad} ${res.soyad} (#${res.uye_id})`);
            location.hash = `#/uye/${res.uye_id}`;
            if (isEdit) render();
          } catch (e) {
            const err = $('#mf-err', w); err.textContent = trError(e); err.hidden = false;
            btn.disabled = false; btn.textContent = isEdit ? 'Kaydet' : 'Üyeyi Kaydet';
          }
        };
        $('#mf-save', w).addEventListener('click', save);
        form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
        form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } });
      },
    });
  }

  // Üyelik yenileme
  function renewForm(m, paketler) {
    const today = istNow().date;
    const aktifMi = m.durum === 'Aktif' || m.durum === 'Yakında Bitiyor';
    modal({
      title: 'Üyelik Yenile / Paket Değiştir',
      body: `
        <p style="margin-top:0"><b>${esc(m.ad_soyad)}</b> · şu anki paket: ${esc(m.paket?.paket_adi)} (bitiş ${fmtDate(m.uyelik_bitis)})</p>
        ${aktifMi ? `<p class="form-error" style="background:var(--warn-soft);color:var(--warn)">Bu üyenin üyeliği hâlâ devam ediyor (${m.kalan_gun} gün kaldı). Sistem üyenin yalnızca güncel paketini tuttuğu için yeni paket bugünden başlar ve kalan süre yeni pakete eklenmez.</p>` : ''}
        <p class="form-error" id="rn-err" hidden></p>
        <label class="field"><span>Yeni Paket</span><select id="rn-paket">
          ${paketler.filter((p) => p.aktif_mi).map((p) => `<option value="${p.paket_id}" ${p.paket_id === m.paket_id ? 'selected' : ''}>${esc(p.paket_adi)} · ${p.sure_ay} ay · ${money.format(p.fiyat)}</option>`).join('')}</select></label>
        <label class="field"><span>Başlangıç Tarihi</span><input type="date" id="rn-bas" min="${today}" value="${today}"></label>
        <div class="muted small" id="rn-ozet"></div>`,
      footer: '<button class="btn" data-close>Vazgeç</button><button class="btn btn-primary" id="rn-save">Üyeliği Yenile</button>',
      onMount: (w, close) => {
        const ozet = () => {
          const p = paketler.find((x) => String(x.paket_id) === $('#rn-paket', w).value);
          const s = $('#rn-bas', w).value;
          if (!p || !s) return;
          const d = naive(s + 'T00:00:00'); d.setUTCMonth(d.getUTCMonth() + p.sure_ay); d.setUTCDate(d.getUTCDate() - 1);
          $('#rn-ozet', w).innerHTML = `Yeni üyelik <b>${fmtDate(s)}</b> – <b>${fmtDate(d.toISOString().slice(0, 10))}</b> · Ücret <b>${money.format(p.fiyat)}</b>`;
        };
        $('#rn-paket', w).addEventListener('change', ozet); $('#rn-bas', w).addEventListener('change', ozet); ozet();
        $('#rn-save', w).addEventListener('click', async () => {
          const s = $('#rn-bas', w).value;
          const err = $('#rn-err', w);
          if (!s || s < today) { err.textContent = 'Başlangıç bugünden önce olamaz.'; err.hidden = false; return; }
          const btn = $('#rn-save', w); btn.disabled = true;
          try {
            await q(sb.from('uyeler').update({ paket_id: Number($('#rn-paket', w).value), uyelik_baslangic: s }).eq('uye_id', m.uye_id).select().single());
            close(); toast('Üyelik yenilendi', m.ad_soyad); render();
          } catch (e) { err.textContent = trError(e); err.hidden = false; btn.disabled = false; }
        });
      },
    });
  }
  function bindRenewButtons(root, members, paketler) {
    $$('[data-renew]', root).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      renewForm(members.find((m) => m.uye_id === Number(b.dataset.renew)), paketler);
    }));
  }

  // ------------------------------------------------------------------
  // SAYFA: Üye detayı
  // ------------------------------------------------------------------
  route('uye', 'Üye Detayı', async (view, idStr) => {
    const id = Number(idStr);
    const [{ members, paketler }, loglar, programlar] = await Promise.all([
      loadMembers(),
      q(sb.from('giris_cikis_log').select('*').eq('uye_id', id).order('giris_zamani', { ascending: false }).limit(500)),
      q(sb.from('antrenman_programlari').select('*, antrenorler(ad, soyad, uzmanlik_alani), program_detay(*, egzersiz_kutuphanesi(egzersiz_adi, kas_grubu, ekipman))').eq('uye_id', id).order('baslangic_tarihi', { ascending: false })),
    ]);
    const m = members.find((x) => x.uye_id === id);
    if (!m) { view.innerHTML = `<a class="back-link" href="#/uyeler">${ICON.back} Üyelere dön</a><div class="card"><div class="empty">Üye bulunamadı (#${esc(idStr)}).</div></div>`; return; }
    $('#page-title').textContent = m.ad_soyad;
    document.title = `${m.ad_soyad} · ${cfg.SALON_ADI}`;

    const now = istNow();
    const toplam = daysBetween(m.uyelik_baslangic, m.uyelik_bitis) + 1;
    const gecen = Math.min(toplam, Math.max(0, daysBetween(m.uyelik_baslangic, now.date) + 1));
    const pct = Math.round((100 * gecen) / toplam);
    const kapali = loglar.filter((l) => l.cikis_zamani);
    const son30 = loglar.filter((l) => l.giris_zamani.slice(0, 10) >= addDays(now.date, -29));
    const ortSure = kapali.length ? kapali.reduce((s, l) => s + minutesBetween(l.giris_zamani, l.cikis_zamani), 0) / kapali.length : null;
    const aktifMi = m.durum === 'Aktif' || m.durum === 'Yakında Bitiyor';

    view.innerHTML = `
      <a class="back-link" href="#/uyeler">${ICON.back} Üyelere dön</a>
      <div class="card mb"><div class="card-body">
        <div class="profile">
          <span class="avatar">${esc(initials(m.ad, m.soyad))}</span>
          <div style="flex:1;min-width:200px">
            <h2>${esc(m.ad_soyad)}</h2>
            <div class="muted">Üye #${m.uye_id} · ${m.cinsiyet === 'K' ? 'Kadın' : 'Erkek'} · ${age(m.dogum_tarihi)} yaş · Kayıt ${fmtDate(m.kayit_tarihi, true)}</div>
            <div class="btn-row" style="margin-top:8px">${statusBadge(m.durum)}
              ${m.icerde ? `<span class="badge info">Şu an salonda · ${fmtTime(m.icerde.giris_zamani)}'den beri</span>` : '<span class="badge muted">Salonda değil</span>'}</div>
          </div>
          <div class="btn-row">
            ${m.icerde
              ? `<button class="btn btn-bad" id="d-cikis">${ICON.out} Çıkış Yap</button>`
              : `<button class="btn btn-ok" id="d-giris" ${aktifMi ? '' : 'title="Üyelik geçerli değil, veritabanı trigger\'ı girişi reddedecek"'}>${ICON.in} Giriş Yap</button>`}
            <button class="btn" id="d-renew">${ICON.renew} Üyelik Yenile</button>
            <button class="btn" id="d-edit">${ICON.edit} Düzenle</button>
            <button class="btn" id="d-card">${ICON.print} Üye Kartı</button>
          </div>
        </div>
      </div></div>

      <div class="grid stats">
        <div class="card stat"><div><div class="stat-label">Toplam Ziyaret</div><div class="stat-value">${loglar.length}</div><div class="stat-hint">Tüm zamanlar</div></div></div>
        <div class="card stat"><div><div class="stat-label">Son 30 Gün</div><div class="stat-value">${son30.length}</div><div class="stat-hint">ziyaret</div></div></div>
        <div class="card stat"><div><div class="stat-label">Ortalama Süre</div><div class="stat-value" style="font-size:22px">${fmtDuration(ortSure)}</div><div class="stat-hint">ziyaret başına</div></div></div>
        <div class="card stat"><div><div class="stat-label">Son Ziyaret</div><div class="stat-value" style="font-size:18px">${loglar[0] ? fmtDate(loglar[0].giris_zamani) : '—'}</div><div class="stat-hint">${loglar[0] ? fmtTime(loglar[0].giris_zamani) : 'Henüz ziyaret yok'}</div></div></div>
      </div>

      <div class="grid cols-2 mb">
        <div class="card"><div class="card-head"><h2>Üyelik Bilgisi</h2></div><div class="card-body">
          <dl class="kv">
            <dt>Paket</dt><dd>${esc(m.paket?.paket_adi)} · ${m.paket?.sure_ay} ay</dd>
            <dt>Ücret</dt><dd>${money.format(m.paket?.fiyat || 0)}</dd>
            <dt>Başlangıç</dt><dd>${fmtDate(m.uyelik_baslangic, true)}</dd>
            <dt>Bitiş</dt><dd>${fmtDate(m.uyelik_bitis, true)} <span class="muted small">(fn_uyelik_bitis_tarihi ile hesaplanır)</span></dd>
            <dt>Kalan</dt><dd>${m.kalan_gun >= 0 ? `${m.kalan_gun} gün` : `${-m.kalan_gun} gün önce sona erdi`}</dd>
          </dl>
          <div class="progress ${m.durum === 'Süresi Doldu' ? 'bad' : m.durum === 'Yakında Bitiyor' ? 'warn' : ''}"><span style="width:${pct}%"></span></div>
          <div class="muted small" style="margin-top:4px">Üyelik süresinin %${pct}'i kullanıldı</div>
        </div></div>
        <div class="card"><div class="card-head"><h2>İletişim</h2></div><div class="card-body">
          <dl class="kv">
            <dt>E-posta</dt><dd><a href="mailto:${esc(m.eposta)}">${esc(m.eposta)}</a></dd>
            <dt>Telefon</dt><dd><a href="tel:${esc(m.telefon)}">${fmtPhone(m.telefon)}</a></dd>
            <dt>Doğum Tarihi</dt><dd>${fmtDate(m.dogum_tarihi, true)}</dd>
            <dt>Kayıt Tarihi</dt><dd>${fmtDate(m.kayit_tarihi, true)}</dd>
          </dl>
        </div></div>
      </div>

      <div class="card mb"><div class="card-head"><div><h2>Antrenman Programları</h2><div class="sub">${programlar.length} program</div></div></div>
        <div class="card-body">${programlar.length ? programlar.map((p) => programCard(p, now.date, false)).join('') : '<div class="empty">Bu üyeye henüz program atanmamış.</div>'}</div></div>

      <div class="card"><div class="card-head"><div><h2>Giriş-Çıkış Geçmişi</h2><div class="sub">Son ${Math.min(loglar.length, 500)} kayıt</div></div>
        <button class="btn btn-sm" id="d-csv">${ICON.download} CSV</button></div>
        <div class="table-wrap" style="max-height:420px;overflow-y:auto"><table>
          <thead><tr><th>Tarih</th><th>Gün</th><th>Giriş</th><th>Çıkış</th><th class="r">Süre</th></tr></thead>
          <tbody>${loglar.length ? loglar.map((l) => `<tr>
            <td class="nowrap">${fmtDate(l.giris_zamani)}</td>
            <td class="muted">${DAYS[naive(l.giris_zamani).getUTCDay()]}</td>
            <td class="num">${fmtTime(l.giris_zamani)}</td>
            <td class="num">${l.cikis_zamani ? fmtTime(l.cikis_zamani) : '<span class="badge info">İçeride</span>'}</td>
            <td class="r num">${l.cikis_zamani ? fmtDuration(minutesBetween(l.giris_zamani, l.cikis_zamani)) : fmtDuration(minutesBetween(l.giris_zamani, now.iso))}</td>
          </tr>`).join('') : '<tr><td colspan="5"><div class="empty">Kayıt yok.</div></td></tr>'}</tbody></table></div></div>
    `;

    $('#d-edit').addEventListener('click', () => memberForm(m, paketler));
    $('#d-renew').addEventListener('click', () => renewForm(m, paketler));
    $('#d-card').addEventListener('click', () => memberCard(m));
    $('#d-csv').addEventListener('click', () => downloadCSV(`uye_${m.uye_id}_giris_cikis.csv`, ['Giriş', 'Çıkış', 'Süre (dk)'],
      loglar.map((l) => [l.giris_zamani.replace('T', ' '), l.cikis_zamani ? l.cikis_zamani.replace('T', ' ') : '', l.cikis_zamani ? Math.round(minutesBetween(l.giris_zamani, l.cikis_zamani)) : ''])));
    const g = $('#d-giris'), c = $('#d-cikis');
    if (g) g.addEventListener('click', async () => {
      g.disabled = true;
      try { await api.girisYap(m.uye_id); toast('Giriş kaydedildi', `${m.ad_soyad} salona giriş yaptı.`); render(); }
      catch (e) { toast('Giriş reddedildi', trError(e), 'bad'); g.disabled = false; }
    });
    if (c) c.addEventListener('click', async () => {
      c.disabled = true;
      try { await api.cikisYap(m.uye_id); toast('Çıkış kaydedildi', `${m.ad_soyad} salondan çıktı.`); render(); }
      catch (e) { toast('Çıkış yapılamadı', trError(e), 'bad'); c.disabled = false; }
    });
  });

  function memberCard(m) {
    modal({
      title: 'Üye Kartı',
      body: `
        <div id="member-card" style="border-radius:16px;padding:22px;color:#fff;background:linear-gradient(135deg,#ea580c,#9a3412);max-width:420px;margin:0 auto;box-shadow:var(--shadow-lg)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:800;font-size:20px">${esc(cfg.SALON_ADI)}</div><div style="opacity:.85;font-size:12px">ÜYE KARTI</div></div>
          <div style="font-size:22px;font-weight:700;margin-top:28px">${esc(m.ad_soyad)}</div>
          <div style="opacity:.9">${esc(m.paket?.paket_adi)} Üyelik</div>
          <div style="display:flex;justify-content:space-between;margin-top:22px;font-size:13px">
            <div><div style="opacity:.75;font-size:11px">ÜYE NO</div><b style="font-size:18px;letter-spacing:.08em">${String(m.uye_id).padStart(6, '0')}</b></div>
            <div><div style="opacity:.75;font-size:11px">GEÇERLİLİK</div><b>${fmtDate(m.uyelik_baslangic)} – ${fmtDate(m.uyelik_bitis)}</b></div>
          </div>
        </div>`,
      footer: '<button class="btn" data-close>Kapat</button><button class="btn btn-primary" id="mc-print">Yazdır</button>',
      onMount: (w) => $('#mc-print', w).addEventListener('click', () => {
        const win = window.open('', '_blank', 'width=520,height=400');
        if (!win) { toast('Açılır pencere engellendi', 'Tarayıcının açılır pencere iznini verin.', 'warn'); return; }
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Üye Kartı</title></head><body style="font-family:system-ui;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact">${$('#member-card', w).outerHTML}<script>setTimeout(()=>print(),300)<\/script></body></html>`);
        win.document.close();
      }),
    });
  }

  function programCard(p, today, showUye) {
    const devam = today >= p.baslangic_tarihi && today <= p.bitis_tarihi;
    const bitti = today > p.bitis_tarihi;
    const byDay = {};
    (p.program_detay || []).forEach((d) => { (byDay[d.gun_no] = byDay[d.gun_no] || []).push(d); });
    const gunAd = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    return `<details class="prog-card" ${devam && !showUye ? 'open' : ''}>
      <summary><div style="min-width:0"><div style="font-weight:700">${esc(p.program_adi)}</div>
        <div class="muted small">${showUye ? `<a href="#/uye/${p.uye_id}">${esc(p.uyeler?.ad)} ${esc(p.uyeler?.soyad)}</a> · ` : ''}Antrenör: ${esc(p.antrenorler?.ad)} ${esc(p.antrenorler?.soyad)} · ${fmtDate(p.baslangic_tarihi)} – ${fmtDate(p.bitis_tarihi)}</div></div>
        <span class="badge plain muted">${esc(p.hedef)}</span>
        <span class="badge ${devam ? 'ok' : bitti ? 'muted' : 'info'}">${devam ? 'Devam ediyor' : bitti ? 'Tamamlandı' : 'Başlamadı'}</span>
        <span class="muted small">${(p.program_detay || []).length} egzersiz</span>
      </summary>
      <div class="prog-body"><div class="day-grid">
        ${Object.keys(byDay).sort((a, b) => a - b).map((g) => `<div class="day"><h4>${g}. Gün · ${gunAd[g]}</h4><ol>
          ${byDay[g].sort((a, b) => a.sira_no - b.sira_no).map((d) => `<li><b>${esc(d.egzersiz_kutuphanesi?.egzersiz_adi)}</b>
            <small>${d.set_sayisi} set${d.tekrar_sayisi ? ` × ${d.tekrar_sayisi} tekrar` : ''}${d.sure_dakika ? ` · ${d.sure_dakika} dk` : ''}${d.agirlik_kg ? ` · ${Number(d.agirlik_kg)} kg` : ''} · ${esc(d.egzersiz_kutuphanesi?.kas_grubu)}</small></li>`).join('')}
        </ol></div>`).join('') || '<div class="muted">Bu programda egzersiz yok.</div>'}
      </div></div></details>`;
  }

  // ------------------------------------------------------------------
  // SAYFA: Turnike (giriş / çıkış)
  // ------------------------------------------------------------------
  route('turnike', 'Turnike · Giriş / Çıkış', async (view) => {
    let { members, icerde } = await loadMembers();
    let son = await q(sb.from('giris_cikis_log').select('log_id, uye_id, giris_zamani, cikis_zamani, uyeler(ad, soyad)').order('log_id', { ascending: false }).limit(12));

    view.innerHTML = `
      <div class="gate">
        <div>
          <div class="card mb"><div class="card-head"><div><h2>Üye Bul</h2><div class="sub">Ad, telefon veya üye numarasıyla arayın, ardından Giriş ya da Çıkış'a basın</div></div></div>
            <div class="card-body">
              <div id="gate-result"></div>
              <label class="search gate-search">${ICON.search}<input type="search" id="g-q" placeholder="Örn. Ayşe, 0532… veya #5" autocomplete="off" aria-label="Üye ara"></label>
            </div>
            <div class="card-body flush" id="g-list" style="max-height:520px;overflow-y:auto;border-top:1px solid var(--border)"></div>
          </div>
        </div>
        <div>
          <div class="card mb"><div class="card-head"><div><h2>Şu An Salonda <span class="badge info plain" id="g-count"></span></h2><div class="sub">Süreler canlı güncellenir</div></div></div>
            <div class="card-body flush" id="g-icerde"></div></div>
          <div class="card"><div class="card-head"><div><h2>Son Hareketler</h2><div class="sub">Turnikeden geçen son kayıtlar</div></div></div>
            <div class="card-body flush" id="g-son"></div></div>
        </div>
      </div>`;

    const showResult = (type, title, text) => {
      $('#gate-result').innerHTML = `<div class="gate-result ${type}">${type === 'ok' ? ICON.ok : type === 'bad' ? ICON.bad : ICON.in}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;
    };
    const reload = async () => {
      ({ members, icerde } = await loadMembers());
      son = await q(sb.from('giris_cikis_log').select('log_id, uye_id, giris_zamani, cikis_zamani, uyeler(ad, soyad)').order('log_id', { ascending: false }).limit(12));
      drawAll();
    };
    const drawList = () => {
      const qq = trLower($('#g-q').value.trim()).replace(/^#/, '');
      let list = members;
      if (qq) list = members.filter((m) => trLower(`${m.ad_soyad} ${m.telefon} ${m.uye_id}`).includes(qq) || String(m.uye_id) === qq);
      list = [...list].sort((a, b) => (b.icerde ? 1 : 0) - (a.icerde ? 1 : 0) || a.ad_soyad.localeCompare(b.ad_soyad, 'tr'));
      $('#g-list').innerHTML = list.length ? `<ul class="list">${list.map((m) => `
        <li><a class="person grow" href="#/uye/${m.uye_id}" style="color:inherit;text-decoration:none">
          <span class="avatar">${esc(initials(m.ad, m.soyad))}</span>
          <span style="min-width:0"><span class="person-name">${esc(m.ad_soyad)}</span>
          <span class="person-sub" style="display:block">#${m.uye_id} · ${esc(m.paket?.paket_adi)} · bitiş ${fmtDate(m.uyelik_bitis)}</span></span></a>
          ${statusBadge(m.durum)}
          ${m.icerde
            ? `<button class="btn btn-sm btn-bad" data-out="${m.uye_id}">${ICON.out} Çıkış</button>`
            : `<button class="btn btn-sm btn-ok" data-in="${m.uye_id}">${ICON.in} Giriş</button>`}
        </li>`).join('')}</ul>` : '<div class="empty">Üye bulunamadı.</div>';
      $$('[data-in]', $('#g-list')).forEach((b) => b.addEventListener('click', () => doGiris(Number(b.dataset.in), b)));
      $$('[data-out]', $('#g-list')).forEach((b) => b.addEventListener('click', () => doCikis(Number(b.dataset.out), b)));
    };
    const drawSide = () => {
      $('#g-count').textContent = icerde.length;
      renderIcerdeList($('#g-icerde'), icerde, reload);
      $('#g-son').innerHTML = son.length ? `<ul class="list">${son.map((l) => {
        const out = !!l.cikis_zamani;
        return `<li>${out ? `<span class="badge muted plain">Çıkış</span>` : `<span class="badge ok plain">Giriş</span>`}
          <span class="grow"><b>${esc(l.uyeler?.ad)} ${esc(l.uyeler?.soyad)}</b></span>
          <span class="muted small num nowrap">${out ? `${fmtTime(l.giris_zamani)} → ${fmtTime(l.cikis_zamani)}` : fmtTime(l.giris_zamani)} · ${fmtDate(l.giris_zamani)}</span></li>`;
      }).join('')}</ul>` : '<div class="empty">Kayıt yok.</div>';
    };
    const drawAll = () => { drawList(); drawSide(); };

    async function doGiris(id, btn) {
      const m = members.find((x) => x.uye_id === id);
      btn.disabled = true;
      try {
        const rec = await api.girisYap(id);
        showResult('ok', `Hoş geldin, ${m.ad}!`, `${m.ad_soyad} için giriş kaydedildi (${fmtTime(rec.giris_zamani)}). Üyelik ${m.kalan_gun} gün daha geçerli.`);
        await reload();
      } catch (e) {
        showResult('bad', 'Giriş reddedildi', trError(e));
        btn.disabled = false;
      }
    }
    async function doCikis(id, btn) {
      const m = members.find((x) => x.uye_id === id);
      btn.disabled = true;
      try {
        await api.cikisYap(id);
        const dk = m.icerde ? minutesBetween(m.icerde.giris_zamani, istNow().iso) : null;
        showResult('info', `Güle güle, ${m.ad}!`, `Çıkış kaydedildi. Salonda geçirilen süre: ${fmtDuration(dk)}.`);
        await reload();
      } catch (e) { showResult('bad', 'Çıkış yapılamadı', trError(e)); btn.disabled = false; }
    }

    $('#g-q').addEventListener('input', drawList);
    $('#g-q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const b = $('#g-list [data-in], #g-list [data-out]'); if (b && $$('#g-list li').length === 1) b.click(); }
    });
    drawAll();
    $('#g-q').focus();
    refreshTimer = setInterval(() => { if (document.visibilityState === 'visible') drawSide(); }, 30000);
  });

  // ------------------------------------------------------------------
  // SAYFA: Giriş-Çıkış Geçmişi
  // ------------------------------------------------------------------
  route('gecmis', 'Giriş-Çıkış Geçmişi', async (view) => {
    const today = istNow().date;
    const uyeler = await api.uyeler();
    const PAGE = 50;
    const st = { from: addDays(today, -6), to: today, uye: '', durum: '', page: 0 };

    view.innerHTML = `
      <div class="section-title"><div><h2>Turnike Kayıtları</h2><p>Giris_Cikis_Log tablosundaki tüm hareketler</p></div>
        <button class="btn" id="h-csv">${ICON.download} CSV indir</button></div>
      <div class="grid stats" id="h-stats"></div>
      <div class="card">
        <div class="toolbar">
          <label class="field" style="margin:0"><span>Başlangıç</span><input type="date" id="h-from" value="${st.from}" max="${today}"></label>
          <label class="field" style="margin:0"><span>Bitiş</span><input type="date" id="h-to" value="${st.to}" max="${today}"></label>
          <label class="field" style="margin:0"><span>Üye</span><select id="h-uye"><option value="">Tüm üyeler</option>
            ${uyeler.sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr')).map((u) => `<option value="${u.uye_id}">${esc(u.ad)} ${esc(u.soyad)}</option>`).join('')}</select></label>
          <label class="field" style="margin:0"><span>Durum</span><select id="h-durum"><option value="">Tümü</option><option value="ic">İçeride</option><option value="cik">Çıkış yapmış</option></select></label>
          <div class="btn-row" style="align-self:flex-end">
            <button class="btn btn-sm" data-range="0">Bugün</button><button class="btn btn-sm" data-range="6">7 gün</button><button class="btn btn-sm" data-range="29">30 gün</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Üye</th><th>Tarih</th><th>Giriş</th><th>Çıkış</th><th class="r">Süre</th></tr></thead>
          <tbody id="h-body"></tbody></table></div>
        <div class="pager"><span class="muted small" id="h-info"></span>
          <div class="btn-row"><button class="btn btn-sm" id="h-prev">‹ Önceki</button><button class="btn btn-sm" id="h-next">Sonraki ›</button></div></div>
      </div>`;

    const build = (sel, opts) => {
      let qy = sb.from('giris_cikis_log').select(sel, opts)
        .gte('giris_zamani', st.from).lt('giris_zamani', addDays(st.to, 1));
      if (st.uye) qy = qy.eq('uye_id', Number(st.uye));
      if (st.durum === 'ic') qy = qy.is('cikis_zamani', null);
      if (st.durum === 'cik') qy = qy.not('cikis_zamani', 'is', null);
      return qy;
    };
    const load = async () => {
      $('#h-body').innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr>';
      try {
        const [{ data, count }, all] = await Promise.all([
          q(build('log_id, uye_id, giris_zamani, cikis_zamani, uyeler(ad, soyad)', { count: 'exact' }).order('giris_zamani', { ascending: false }).range(st.page * PAGE, st.page * PAGE + PAGE - 1)),
          q(build('uye_id, giris_zamani, cikis_zamani').limit(10000)),
        ]);
        const now = istNow().iso;
        $('#h-body').innerHTML = data.length ? data.map((l) => `<tr>
          <td class="muted num">${l.log_id}</td>
          <td><a href="#/uye/${l.uye_id}" class="person-name">${esc(l.uyeler?.ad)} ${esc(l.uyeler?.soyad)}</a></td>
          <td class="nowrap">${fmtDate(l.giris_zamani)} <span class="muted small hide-sm">${DAYS[naive(l.giris_zamani).getUTCDay()]}</span></td>
          <td class="num">${fmtTime(l.giris_zamani)}</td>
          <td class="num">${l.cikis_zamani ? fmtTime(l.cikis_zamani) : '<span class="badge info">İçeride</span>'}</td>
          <td class="r num nowrap">${fmtDuration(minutesBetween(l.giris_zamani, l.cikis_zamani || now))}</td></tr>`).join('')
          : '<tr><td colspan="6"><div class="empty">Bu filtrelerle kayıt bulunamadı.</div></td></tr>';
        const pages = Math.max(1, Math.ceil(count / PAGE));
        $('#h-info').textContent = `${nf.format(count)} kayıt · Sayfa ${st.page + 1} / ${pages}`;
        $('#h-prev').disabled = st.page === 0; $('#h-next').disabled = st.page >= pages - 1;
        const closed = all.filter((l) => l.cikis_zamani);
        const ort = closed.length ? closed.reduce((s, l) => s + minutesBetween(l.giris_zamani, l.cikis_zamani), 0) / closed.length : null;
        const tekil = new Set(all.map((l) => l.uye_id)).size;
        const gunSay = daysBetween(st.from, st.to) + 1;
        $('#h-stats').innerHTML = `
          <div class="card stat"><div><div class="stat-label">Toplam Ziyaret</div><div class="stat-value">${nf.format(all.length)}</div><div class="stat-hint">${gunSay} gün</div></div></div>
          <div class="card stat"><div><div class="stat-label">Farklı Üye</div><div class="stat-value">${tekil}</div><div class="stat-hint">bu aralıkta gelen</div></div></div>
          <div class="card stat"><div><div class="stat-label">Günlük Ortalama</div><div class="stat-value">${(all.length / gunSay).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</div><div class="stat-hint">ziyaret / gün</div></div></div>
          <div class="card stat"><div><div class="stat-label">Ortalama Süre</div><div class="stat-value" style="font-size:22px">${fmtDuration(ort)}</div><div class="stat-hint">ziyaret başına</div></div></div>`;
      } catch (e) {
        $('#h-body').innerHTML = `<tr><td colspan="6"><div class="empty" style="color:var(--bad)">${esc(trError(e))}</div></td></tr>`;
      }
    };
    const apply = () => {
      st.from = $('#h-from').value || today; st.to = $('#h-to').value || today;
      if (st.from > st.to) { [st.from, st.to] = [st.to, st.from]; $('#h-from').value = st.from; $('#h-to').value = st.to; }
      st.uye = $('#h-uye').value; st.durum = $('#h-durum').value; st.page = 0; load();
    };
    ['#h-from', '#h-to', '#h-uye', '#h-durum'].forEach((s) => $(s).addEventListener('change', apply));
    $$('[data-range]').forEach((b) => b.addEventListener('click', () => { $('#h-from').value = addDays(today, -Number(b.dataset.range)); $('#h-to').value = today; apply(); }));
    $('#h-prev').addEventListener('click', () => { st.page--; load(); });
    $('#h-next').addEventListener('click', () => { st.page++; load(); });
    $('#h-csv').addEventListener('click', async () => {
      try {
        const rows = await q(build('log_id, giris_zamani, cikis_zamani, uyeler(ad, soyad)').order('giris_zamani', { ascending: false }).limit(10000));
        downloadCSV(`giris_cikis_${st.from}_${st.to}.csv`, ['Kayıt No', 'Üye', 'Giriş', 'Çıkış', 'Süre (dk)'],
          rows.map((l) => [l.log_id, `${l.uyeler?.ad} ${l.uyeler?.soyad}`, l.giris_zamani.replace('T', ' '), (l.cikis_zamani || '').replace('T', ' '), l.cikis_zamani ? Math.round(minutesBetween(l.giris_zamani, l.cikis_zamani)) : '']));
      } catch (e) { toast('CSV oluşturulamadı', trError(e), 'bad'); }
    });
    load();
  });

  // ------------------------------------------------------------------
  // SAYFA: Antrenman & Kadro (programlar, antrenörler, egzersizler, paketler)
  // ------------------------------------------------------------------
  route('programlar', 'Antrenman & Kadro', async (view) => {
    const today = istNow().date;
    const [programlar, antrenorler, egzersizler, paketler, uyeler] = await Promise.all([
      q(sb.from('antrenman_programlari').select('*, uyeler(ad, soyad), antrenorler(ad, soyad), program_detay(*, egzersiz_kutuphanesi(egzersiz_adi, kas_grubu, ekipman))').order('baslangic_tarihi', { ascending: false })),
      q(sb.from('vw_rapor_antrenor').select('*').order('ogrenci_sayisi', { ascending: false })),
      q(sb.from('egzersiz_kutuphanesi').select('*').order('kas_grubu').order('egzersiz_adi')),
      q(sb.from('vw_rapor_paket_gelir').select('*').order('sure_ay')),
      q(sb.from('antrenorler').select('*')),
    ]);
    const aMap = new Map(uyeler.map((a) => [a.antrenor_id, a]));
    const tab = (location.hash.split('?')[1] || '').replace('tab=', '') || 'programlar';
    const TABS = { programlar: `Programlar (${programlar.length})`, antrenorler: `Antrenörler (${antrenorler.length})`, egzersizler: `Egzersiz Kütüphanesi (${egzersizler.length})`, paketler: `Üyelik Paketleri (${paketler.length})` };
    view.innerHTML = `<div class="tabs" role="tablist">${Object.entries(TABS).map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${v}</button>`).join('')}</div><div id="tab-body"></div>`;
    const draw = (t) => {
      $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
      const el = $('#tab-body');
      if (t === 'programlar') {
        el.innerHTML = `<div class="card"><div class="toolbar">
          <label class="search grow">${ICON.search}<input type="search" id="p-q" placeholder="Program, üye veya antrenör ara…"></label>
          <select id="p-durum"><option value="">Tüm programlar</option><option value="devam">Devam eden</option><option value="bitti">Tamamlanan</option></select></div>
          <div class="card-body" id="p-list"></div></div>`;
        const dl = () => {
          const qq = trLower($('#p-q').value);
          const d = $('#p-durum').value;
          const list = programlar.filter((p) => trLower(`${p.program_adi} ${p.uyeler?.ad} ${p.uyeler?.soyad} ${p.antrenorler?.ad} ${p.antrenorler?.soyad} ${p.hedef}`).includes(qq)
            && (!d || (d === 'devam' ? today >= p.baslangic_tarihi && today <= p.bitis_tarihi : today > p.bitis_tarihi)));
          $('#p-list').innerHTML = list.length ? list.map((p) => programCard(p, today, true)).join('') : '<div class="empty">Program bulunamadı.</div>';
        };
        $('#p-q').addEventListener('input', dl); $('#p-durum').addEventListener('change', dl); dl();
      } else if (t === 'antrenorler') {
        el.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Antrenör</th><th>Uzmanlık</th><th class="hide-sm">İletişim</th><th class="r">Öğrenci</th><th class="r">Program</th><th class="r">Devam Eden</th><th>Durum</th></tr></thead><tbody>
          ${antrenorler.map((a) => { const x = aMap.get(a.antrenor_id) || {}; return `<tr>
            <td><div class="person"><span class="avatar">${esc(initials(x.ad, x.soyad))}</span><div><div class="person-name">${esc(a.antrenor)}</div><div class="person-sub">${x.ise_baslama_tarihi ? 'Başlangıç ' + fmtDate(x.ise_baslama_tarihi) : ''}</div></div></div></td>
            <td>${esc(a.uzmanlik_alani)}</td>
            <td class="hide-sm small"><a href="mailto:${esc(x.eposta)}">${esc(x.eposta)}</a><br><span class="muted">${fmtPhone(x.telefon)}</span></td>
            <td class="r num">${a.ogrenci_sayisi}</td><td class="r num">${a.program_sayisi}</td><td class="r num">${a.devam_eden_program}</td>
            <td>${x.aktif_mi ? '<span class="badge ok">Aktif</span>' : '<span class="badge muted">Pasif</span>'}</td></tr>`; }).join('')}
          </tbody></table></div></div>`;
      } else if (t === 'egzersizler') {
        const gruplar = [...new Set(egzersizler.map((e) => e.kas_grubu))];
        el.innerHTML = `<div class="card"><div class="toolbar"><label class="search grow">${ICON.search}<input type="search" id="e-q" placeholder="Egzersiz veya ekipman ara…"></label>
          <select id="e-g"><option value="">Tüm kas grupları</option>${gruplar.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
          <select id="e-z"><option value="">Tüm seviyeler</option><option>Başlangıç</option><option>Orta</option><option>İleri</option></select></div>
          <div class="table-wrap"><table><thead><tr><th>Egzersiz</th><th>Kas Grubu</th><th>Ekipman</th><th>Seviye</th></tr></thead><tbody id="e-body"></tbody></table></div></div>`;
        const de = () => {
          const qq = trLower($('#e-q').value), g = $('#e-g').value, z = $('#e-z').value;
          const list = egzersizler.filter((e) => trLower(`${e.egzersiz_adi} ${e.ekipman}`).includes(qq) && (!g || e.kas_grubu === g) && (!z || e.zorluk_seviyesi === z));
          $('#e-body').innerHTML = list.length ? list.map((e) => `<tr><td class="person-name">${esc(e.egzersiz_adi)}</td><td>${esc(e.kas_grubu)}</td><td>${esc(e.ekipman)}</td>
            <td><span class="badge ${e.zorluk_seviyesi === 'Başlangıç' ? 'ok' : e.zorluk_seviyesi === 'Orta' ? 'warn' : 'bad'}">${esc(e.zorluk_seviyesi)}</span></td></tr>`).join('') : '<tr><td colspan="4"><div class="empty">Egzersiz bulunamadı.</div></td></tr>';
        };
        ['#e-q', '#e-g', '#e-z'].forEach((s) => $(s).addEventListener('input', de)); de();
      } else {
        el.innerHTML = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${paketler.map((p) => `
          <div class="card"><div class="card-body">
            <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="font-size:16px">${esc(p.paket_adi)}</h3><span class="badge plain muted">${p.sure_ay} ay</span></div>
            <div class="stat-value" style="margin:10px 0 2px">${money.format(p.fiyat)}</div>
            <div class="muted small">Aylık ${money.format(p.fiyat / p.sure_ay)}</div>
            <hr style="border:0;border-top:1px solid var(--border);margin:14px 0">
            <div class="small"><b>${p.toplam_uye}</b> üye · <b>${p.aktif_uye}</b> aktif · %${p.uye_payi_yuzde ?? 0} pay</div>
          </div></div>`).join('')}</div>`;
      }
    };
    $$('.tabs button').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', `#/programlar?tab=${b.dataset.tab}`); draw(b.dataset.tab); }));
    draw(TABS[tab] ? tab : 'programlar');
  });

  // ------------------------------------------------------------------
  // SAYFA: Raporlar (ders projesindeki JOIN + GROUP BY sorguları)
  // ------------------------------------------------------------------
  const REPORTS = [
    {
      id: 'paket', title: 'Rapor 1 · Paket Bazında Üye ve Gelir', view: 'vw_rapor_paket_gelir', order: ['toplam_satis_tl', false],
      desc: 'Her paketin toplam üye sayısı, aktif üye sayısı, toplam satış tutarı ve üye payı.',
      cols: [['paket_adi', 'Paket'], ['fiyat', 'Fiyat', 'money'], ['toplam_uye', 'Toplam Üye', 'num'], ['aktif_uye', 'Aktif Üye', 'num'], ['toplam_satis_tl', 'Toplam Satış', 'money'], ['uye_payi_yuzde', 'Pay (%)', 'num']],
      chart: (rows) => ({ type: 'bar', data: { labels: rows.map((r) => r.paket_adi), datasets: [{ label: 'Toplam satış (TL)', data: rows.map((r) => r.toplam_satis_tl), backgroundColor: '#ea580c', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } }),
      sql: `SELECT  p.paket_adi, p.fiyat,
        COUNT(u.uye_id)                                          AS toplam_uye,
        COUNT(u.uye_id) FILTER (WHERE fn_uye_aktif_mi(u.uye_id)) AS aktif_uye,
        COALESCE(SUM(p.fiyat) FILTER (WHERE u.uye_id IS NOT NULL), 0) AS toplam_satis_tl,
        ROUND(100.0 * COUNT(u.uye_id) / SUM(COUNT(u.uye_id)) OVER (), 1) AS uye_payi_yuzde
FROM    Uyelik_Paketleri p
LEFT JOIN Uyeler u ON u.paket_id = p.paket_id
GROUP BY p.paket_id, p.paket_adi, p.fiyat
ORDER BY toplam_satis_tl DESC;`,
    },
    {
      id: 'antrenor', title: 'Rapor 2 · Antrenör Performansı', view: 'vw_rapor_antrenor', order: ['ogrenci_sayisi', false],
      desc: 'Antrenörlerin öğrenci, program ve egzersiz satırı sayıları ile ortalama program süresi.',
      cols: [['antrenor', 'Antrenör'], ['uzmanlik_alani', 'Uzmanlık'], ['ogrenci_sayisi', 'Öğrenci', 'num'], ['program_sayisi', 'Program', 'num'], ['devam_eden_program', 'Devam Eden', 'num'], ['toplam_egzersiz_satiri', 'Egzersiz Satırı', 'num'], ['ort_program_suresi_gun', 'Ort. Süre (gün)', 'num']],
      chart: (rows) => ({ type: 'bar', data: { labels: rows.map((r) => r.antrenor), datasets: [{ label: 'Öğrenci', data: rows.map((r) => r.ogrenci_sayisi), backgroundColor: '#ea580c', borderRadius: 6 }, { label: 'Program', data: rows.map((r) => r.program_sayisi), backgroundColor: '#2563eb', borderRadius: 6 }] } }),
      sql: `SELECT  a.ad || ' ' || a.soyad AS antrenor, a.uzmanlik_alani,
        COUNT(DISTINCT ap.uye_id)     AS ogrenci_sayisi,
        COUNT(DISTINCT ap.program_id) AS program_sayisi,
        COUNT(DISTINCT ap.program_id) FILTER (WHERE CURRENT_DATE BETWEEN ap.baslangic_tarihi AND ap.bitis_tarihi) AS devam_eden_program,
        COUNT(pd.detay_id)            AS toplam_egzersiz_satiri,
        ROUND(AVG(ap.bitis_tarihi - ap.baslangic_tarihi)) AS ort_program_suresi_gun
FROM    Antrenorler a
LEFT JOIN Antrenman_Programlari ap ON ap.antrenor_id = a.antrenor_id
LEFT JOIN Program_Detay pd         ON pd.program_id  = ap.program_id
GROUP BY a.antrenor_id, a.ad, a.soyad, a.uzmanlik_alani
ORDER BY ogrenci_sayisi DESC, program_sayisi DESC;`,
    },
    {
      id: 'kas', title: 'Rapor 3 · Kas Gruplarına Göre Çalışma', view: 'vw_rapor_kas_grubu', order: ['toplam_set', false],
      desc: 'Programlarda en çok çalıştırılan kas grupları, toplam set ve ortalama ağırlık.',
      cols: [['kas_grubu', 'Kas Grubu'], ['farkli_egzersiz', 'Farklı Egzersiz', 'num'], ['kullanan_program', 'Kullanan Program', 'num'], ['toplam_set', 'Toplam Set', 'num'], ['ort_agirlik_kg', 'Ort. Ağırlık (kg)', 'num'], ['egzersizler', 'Egzersizler']],
      chart: (rows) => ({ type: 'bar', data: { labels: rows.map((r) => r.kas_grubu), datasets: [{ label: 'Toplam set', data: rows.map((r) => r.toplam_set), backgroundColor: PALETTE, borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } }),
      sql: `SELECT  e.kas_grubu,
        COUNT(DISTINCT e.egzersiz_id) AS farkli_egzersiz,
        COUNT(DISTINCT pd.program_id) AS kullanan_program,
        SUM(pd.set_sayisi)            AS toplam_set,
        ROUND(AVG(pd.agirlik_kg), 1)  AS ort_agirlik_kg,
        STRING_AGG(DISTINCT e.egzersiz_adi, ', ' ORDER BY e.egzersiz_adi) AS egzersizler
FROM    Egzersiz_Kutuphanesi e
JOIN    Program_Detay pd ON pd.egzersiz_id = e.egzersiz_id
GROUP BY e.kas_grubu
ORDER BY toplam_set DESC;`,
    },
    {
      id: 'sadakat', title: 'Rapor 4 · Sadakat (Son 30 Gün)', view: 'vw_rapor_sadakat', order: ['ziyaret_sayisi', false],
      desc: 'Son 30 günde en az 8 kez gelen üyeler: ziyaret sayısı, ortalama süre ve toplam saat.',
      cols: [['uye', 'Üye', 'link'], ['paket_adi', 'Paket'], ['ziyaret_sayisi', 'Ziyaret', 'num'], ['ort_sure_dk', 'Ort. Süre (dk)', 'num'], ['toplam_saat', 'Toplam Saat', 'num'], ['son_ziyaret', 'Son Ziyaret', 'date']],
      chart: (rows) => ({ type: 'bar', data: { labels: rows.map((r) => r.uye), datasets: [{ label: 'Toplam saat', data: rows.map((r) => r.toplam_saat), backgroundColor: '#16a34a', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } }),
      sql: `SELECT  u.ad || ' ' || u.soyad AS uye, p.paket_adi,
        COUNT(l.log_id) AS ziyaret_sayisi,
        ROUND(AVG(EXTRACT(EPOCH FROM (l.cikis_zamani - l.giris_zamani)) / 60)) AS ort_sure_dk,
        ROUND(SUM(EXTRACT(EPOCH FROM (l.cikis_zamani - l.giris_zamani)) / 3600), 1) AS toplam_saat,
        MAX(l.giris_zamani)::date AS son_ziyaret
FROM    Uyeler u
JOIN    Uyelik_Paketleri p ON p.paket_id = u.paket_id
JOIN    Giris_Cikis_Log  l ON l.uye_id   = u.uye_id
WHERE   l.giris_zamani >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.uye_id, u.ad, u.soyad, p.paket_adi
HAVING  COUNT(l.log_id) >= 8
ORDER BY ziyaret_sayisi DESC, toplam_saat DESC;`,
    },
    {
      id: 'saat', title: 'Bonus · Saatlik Yoğunluk', view: 'vw_rapor_saat_yogunluk', order: ['saat', true],
      desc: 'Giriş saatine göre salon yoğunluğu ve cinsiyet dağılımı.',
      cols: [['saat', 'Saat', 'hour'], ['giris_sayisi', 'Giriş', 'num'], ['kadin', 'Kadın', 'num'], ['erkek', 'Erkek', 'num']],
      chart: (rows) => ({ type: 'line', data: { labels: rows.map((r) => String(r.saat).padStart(2, '0') + ':00'), datasets: [{ label: 'Giriş', data: rows.map((r) => r.giris_sayisi), borderColor: '#ea580c', backgroundColor: 'rgba(234,88,12,.15)', fill: true, tension: .35 }] }, options: { plugins: { legend: { display: false } } } }),
      sql: `SELECT  EXTRACT(HOUR FROM l.giris_zamani) AS saat,
        COUNT(*) AS giris_sayisi,
        COUNT(*) FILTER (WHERE u.cinsiyet = 'K') AS kadin,
        COUNT(*) FILTER (WHERE u.cinsiyet = 'E') AS erkek
FROM    Giris_Cikis_Log l
JOIN    Uyeler u ON u.uye_id = l.uye_id
GROUP BY EXTRACT(HOUR FROM l.giris_zamani)
ORDER BY 1;`,
    },
  ];

  route('raporlar', 'Raporlar', async (view) => {
    const sel = (location.hash.split('?')[1] || '').replace('r=', '') || 'paket';
    view.innerHTML = `
      <div class="section-title"><div><h2>Veritabanı Raporları</h2><p>JOIN + GROUP BY sorguları, veritabanındaki VIEW'lar üzerinden canlı çalışır.</p></div></div>
      <div class="tabs">${REPORTS.map((r) => `<button data-r="${r.id}">${esc(r.title.split(' · ')[1].replace(/ \(.*\)/, ''))}</button>`).join('')}</div>
      <div id="r-body"></div>`;
    const show = async (id) => {
      destroyCharts();
      const r = REPORTS.find((x) => x.id === id) || REPORTS[0];
      $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.r === r.id));
      const el = $('#r-body');
      el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      try {
        const rows = await q(sb.from(r.view).select('*').order(r.order[0], { ascending: r.order[1] }));
        const cell = (row, [k, , t]) => {
          const v = row[k];
          if (v == null) return '—';
          if (t === 'money') return money.format(v);
          if (t === 'num') return nf.format(v);
          if (t === 'date') return fmtDate(v);
          if (t === 'hour') return String(v).padStart(2, '0') + ':00';
          if (t === 'link' && row.uye_id) return `<a href="#/uye/${row.uye_id}">${esc(v)}</a>`;
          return esc(v);
        };
        el.innerHTML = `
          <div class="card mb"><div class="card-head"><div><h2>${esc(r.title)}</h2><div class="sub">${esc(r.desc)}</div></div>
            <button class="btn btn-sm" id="r-csv">${ICON.download} CSV</button></div>
            <div class="card-body"><div class="chart-box"><canvas id="r-chart"></canvas></div></div>
            <div class="table-wrap"><table><thead><tr>${r.cols.map(([, h, t]) => `<th class="${t === 'num' || t === 'money' ? 'r' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${rows.length ? rows.map((row) => `<tr>${r.cols.map((c) => `<td class="${c[2] === 'num' || c[2] === 'money' ? 'r num' : ''}" ${c[0] === 'egzersizler' ? 'style="min-width:260px"' : ''}>${cell(row, c)}</td>`).join('')}</tr>`).join('')
              : `<tr><td colspan="${r.cols.length}"><div class="empty">Bu rapor için uygun kayıt yok.</div></td></tr>`}</tbody></table></div>
            <div class="card-body"><details class="sql-box"><summary>Kullanılan SQL sorgusunu göster</summary><pre class="sql">${esc(r.sql)}</pre></details></div>
          </div>`;
        if (rows.length) makeChart($('#r-chart'), r.chart(rows)); else $('#r-chart').parentElement.parentElement.remove();
        $('#r-csv').addEventListener('click', () => downloadCSV(`${r.id}_raporu.csv`, r.cols.map((c) => c[1]), rows.map((row) => r.cols.map(([k]) => row[k]))));
      } catch (e) {
        el.innerHTML = `<div class="card"><div class="empty" style="color:var(--bad)">${esc(trError(e))}</div></div>`;
      }
    };
    $$('.tabs button').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', `#/raporlar?r=${b.dataset.r}`); show(b.dataset.r); }));
    show(sel);
  });

  // ------------------------------------------------------------------
  // CSV indirme (Excel'de Türkçe karakterler düzgün açılsın diye BOM ve ; ayırıcı)
  // ------------------------------------------------------------------
  function downloadCSV(name, header, rows) {
    const cell = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('CSV hazır', `${rows.length} satır indirildi.`);
  }

  // ------------------------------------------------------------------
  // Oturum, üst çubuk, tema
  // ------------------------------------------------------------------
  function tick() {
    const n = istNow();
    const d = naive(n.iso);
    $('#clock').textContent = `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} · ${n.time.slice(0, 5)}`;
  }
  setInterval(tick, 15000);

  $('#theme-btn').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('tema', root.dataset.theme); } catch (e) {}
    render();
  });
  $('#menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#sidebar-backdrop').addEventListener('click', () => $('#sidebar').classList.remove('open'));
  $('#user-btn').addEventListener('click', (e) => { e.stopPropagation(); $('#user-dropdown').hidden = !$('#user-dropdown').hidden; });
  document.addEventListener('click', () => { $('#user-dropdown').hidden = true; });
  $('#logout-btn').addEventListener('click', async () => { await sb.auth.signOut(); toast('Çıkış yapıldı'); });
  $('#pw-change-btn').addEventListener('click', () => modal({
    title: 'Şifre Değiştir',
    body: `<p class="form-error" id="pw-err" hidden></p>
      <label class="field"><span>Yeni şifre</span><input type="password" id="pw1" autocomplete="new-password" minlength="8"></label>
      <label class="field"><span>Yeni şifre (tekrar)</span><input type="password" id="pw2" autocomplete="new-password"></label>
      <p class="muted small" style="margin:0">En az 8 karakter; harf ve rakam içermeli.</p>`,
    footer: '<button class="btn" data-close>Vazgeç</button><button class="btn btn-primary" id="pw-save">Kaydet</button>',
    onMount: (w, close) => $('#pw-save', w).addEventListener('click', async () => {
      const a = $('#pw1', w).value, b = $('#pw2', w).value, err = $('#pw-err', w);
      const show = (t) => { err.textContent = t; err.hidden = false; };
      if (a.length < 8 || !/[a-zA-Z]/.test(a) || !/\d/.test(a)) return show('Şifre en az 8 karakter olmalı ve harf ile rakam içermeli.');
      if (a !== b) return show('Şifreler eşleşmiyor.');
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) return show(trError(error));
      close(); toast('Şifre güncellendi', 'Bir sonraki girişte yeni şifrenizi kullanın.');
    }),
  }));

  // Giriş formu
  $('.pw-toggle').addEventListener('click', (e) => {
    const inp = $('#login-form input[name=password]');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    e.target.textContent = inp.type === 'password' ? 'Göster' : 'Gizle';
  });
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, err = $('#login-error'), btn = $('button[type=submit]', f);
    err.hidden = true;
    const email = f.email.value.trim(), password = f.password.value;
    if (!email || !password) { err.textContent = 'E-posta ve şifre gerekli.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Giriş Yap';
    if (error) {
      err.textContent = /invalid login credentials/i.test(error.message) ? 'E-posta veya şifre hatalı.' : trError(error);
      err.hidden = false;
    }
  });

  let started = false;
  async function onSession(session) {
    if (!session) {
      started = false;
      $('#app').hidden = true; $('#login-screen').hidden = false;
      document.title = `Giriş · ${cfg.SALON_ADI}`;
      setTimeout(() => $('#login-form input[name=email]').focus(), 50);
      return;
    }
    if (started) return;
    // Yetki kontrolü: yönetici değilse RLS hiçbir satır döndürmez
    const { data, error } = await sb.from('uyelik_paketleri').select('paket_id').limit(1);
    if (error || !data.length) {
      await sb.auth.signOut();
      const err = $('#login-error');
      err.textContent = 'Bu hesabın yönetim paneline erişim yetkisi yok.'; err.hidden = false;
      return;
    }
    started = true;
    const email = session.user.email || '';
    $('#user-email').textContent = email;
    $('#user-avatar').textContent = email[0]?.toLocaleUpperCase('tr-TR') || 'Y';
    $('#login-screen').hidden = true; $('#app').hidden = false;
    tick();
    render();
  }
  sb.auth.onAuthStateChange((_evt, session) => { setTimeout(() => onSession(session), 0); });
})();
