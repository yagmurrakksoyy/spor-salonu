/* Herkese açık salon sayfası: bilgiler salon_ayarlari tablosundan gelir */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: false } });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tl = (v) => `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(v) || 0)} TL`;
  const fmtPhone = (p) => (p && p.length === 11 ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9)}` : p || '');
  const brandHTML = (ad) => { const u = String(ad || '').toUpperCase(); return u.length <= 3 ? esc(u) : `${esc(u.slice(0, -3))}<span>${esc(u.slice(-3))}</span>`; };
  $('#yil').textContent = new Date().getFullYear();

  let S = {};
  let paketler = [];

  function kvkkText() {
    const kim = S.unvan || S.salon_tam_adi || S.salon_adi;
    return `<p><b>${esc(kim)}</b> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla bilgilendirme yaparız.</p>
      <p><b>Toplanan veriler:</b> Ad, soyad, cep telefonu, e-posta (isteğe bağlı), seçtiğiniz paket ve notunuz.</p>
      <p><b>Amaç:</b> Üyelik başvurunuzu değerlendirmek ve sizinle iletişime geçmek. Verileriniz pazarlama amacıyla üçüncü kişilerle paylaşılmaz.</p>
      <p><b>Saklama:</b> Başvurunuz sonuçlanana kadar, üye olursanız üyelik süresince ve yasal saklama süreleri boyunca saklanır.</p>
      <p><b>Haklarınız:</b> KVKK'nın 11. maddesi uyarınca verilerinize erişme, düzeltilmesini veya silinmesini isteme haklarınız vardır.${S.eposta ? ` Talepleriniz için: <a href="mailto:${esc(S.eposta)}">${esc(S.eposta)}</a>` : ''}</p>`;
  }
  function showModal(title, html) {
    const w = document.createElement('div');
    w.className = 'modal-backdrop';
    w.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="Kapat">✕</button></div><div class="modal-body">${html}</div></div>`;
    const close = () => w.remove();
    w.addEventListener('mousedown', (e) => { if (e.target === w) close(); });
    $('[data-x]', w).addEventListener('click', close);
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    $('#modal-root').appendChild(w);
  }
  ['#kvkk-link', '#kvkk-link2'].forEach((id) => $(id).addEventListener('click', (e) => { e.preventDefault(); showModal('KVKK Aydınlatma Metni', kvkkText()); }));

  function render() {
    document.title = `${S.salon_adi}${S.salon_tam_adi ? ' · ' + S.salon_tam_adi : ''}`;
    $$('[data-s="brand"]').forEach((el) => { el.innerHTML = brandHTML(S.salon_adi); });
    $$('[data-s="salon_adi"]').forEach((el) => { el.textContent = S.salon_adi; });
    $$('[data-s="salon_tam_adi"]').forEach((el) => { el.textContent = S.salon_tam_adi || ''; });
    $('[data-s="slogan"]').textContent = S.slogan || S.salon_tam_adi || S.salon_adi;
    $('[data-s="sehir_kicker"]').textContent = S.sehir ? `${S.sehir} · ${S.salon_tam_adi || S.salon_adi}` : (S.salon_tam_adi || 'Hoş geldin');
    const hk = $('[data-s="hakkimizda"]');
    hk.textContent = S.hakkimizda || '';
    if (S.calisma_saatleri) $('[data-s="calisma_saatleri"]').textContent = S.calisma_saatleri;

    // Başvuru kapalıysa ilgili her şeyi gizle
    $$('[data-need="basvuru"]').forEach((el) => { el.hidden = !S.online_basvuru_acik; });

    // Kahraman alanındaki kısa bilgiler
    const facts = [];
    if (paketler.length) facts.push(`<li><b>${tl(Math.min(...paketler.map((p) => p.fiyat / p.sure_ay)))}</b><span>'den başlayan aylık fiyat</span></li>`);
    if (paketler.length) facts.push(`<li><b>${paketler.length}</b><span>farklı üyelik paketi</span></li>`);
    if (S.sehir) facts.push(`<li><b>${esc(S.sehir)}</b><span>'da seni bekliyoruz</span></li>`);
    $('#hero-facts').innerHTML = facts.join('');

    // Paket kartları
    const enIyi = paketler.length > 1 ? paketler.reduce((a, b) => (b.fiyat / b.sure_ay < a.fiyat / a.sure_ay ? b : a)) : null;
    $('#pkg-grid').innerHTML = paketler.length ? paketler.map((p) => `
      <div class="pkg ${enIyi && p.paket_id === enIyi.paket_id ? 'best' : ''}">
        ${enIyi && p.paket_id === enIyi.paket_id ? '<span class="pkg-tag">En avantajlı</span>' : ''}
        <h3>${esc(p.paket_adi)}</h3>
        <div class="pkg-price">${tl(p.fiyat)}</div>
        <div class="muted small">${p.sure_ay} ay${p.sure_ay > 1 ? ` · aylık ${tl(p.fiyat / p.sure_ay)}` : ''}</div>
        ${p.aciklama ? `<p>${esc(p.aciklama)}</p>` : '<p></p>'}
        ${S.online_basvuru_acik ? `<a class="btn ${enIyi && p.paket_id === enIyi.paket_id ? 'btn-primary' : ''} btn-block" href="#basvuru" data-sec="${p.paket_id}">Bu paketi seç</a>` : ''}
      </div>`).join('') : '<p class="muted center">Paket bilgisi için bizimle iletişime geç.</p>';
    $$('[data-sec]').forEach((a) => a.addEventListener('click', () => { $('#apply-form').paket_id.value = a.dataset.sec; }));
    $('#odeme-not').textContent = 'Ödeme ilk gelişinde salonda nakit/kart ile' + (S.iban ? ' veya havale/EFT ile yapılabilir.' : ' yapılabilir.');

    // Paket seçimi
    $('#apply-form').paket_id.innerHTML = '<option value="">Seç…</option>' + paketler.map((p) => `<option value="${p.paket_id}">${esc(p.paket_adi)} · ${p.sure_ay} ay · ${tl(p.fiyat)}</option>`).join('');

    // Havale bilgisi
    if (S.iban) {
      $('#pay-box').hidden = false;
      $('#iban-text').textContent = S.iban.replace(/(.{4})/g, '$1 ').trim();
      $('#iban-alici').textContent = S.iban_alici ? `Alıcı: ${S.iban_alici}` : '';
      $('#iban-copy').onclick = async () => {
        try { await navigator.clipboard.writeText(S.iban); $('#iban-copy').textContent = 'Kopyalandı ✓'; } catch (e) { $('#iban-copy').textContent = S.iban; }
        setTimeout(() => { $('#iban-copy').textContent = "IBAN'ı kopyala"; }, 2000);
      };
    }

    // İletişim kartları
    const wa = S.whatsapp ? `https://wa.me/9${S.whatsapp}${S.whatsapp_mesaj ? `?text=${encodeURIComponent(S.whatsapp_mesaj)}` : ''}` : null;
    const mapQ = encodeURIComponent([S.salon_tam_adi || S.salon_adi, S.adres, S.sehir].filter(Boolean).join(', '));
    const kart = (ikon, baslik, icerik) => `<div class="contact"><span class="c-ico">${ikon}</span><div><b>${baslik}</b>${icerik}</div></div>`;
    const c = [];
    if (wa) c.push(kart('💬', 'WhatsApp', `<a href="${wa}" target="_blank" rel="noopener">${fmtPhone(S.whatsapp)}</a>`));
    if (S.telefon) c.push(kart('📞', 'Telefon', `<a href="tel:${esc(S.telefon)}">${fmtPhone(S.telefon)}</a>`));
    if (S.eposta) c.push(kart('✉️', 'E-posta', `<a href="mailto:${esc(S.eposta)}">${esc(S.eposta)}</a>`));
    if (S.instagram) c.push(kart('📸', 'Instagram', `<a href="https://instagram.com/${encodeURIComponent(S.instagram)}" target="_blank" rel="noopener">@${esc(S.instagram)}</a>`));
    if (S.adres || S.sehir) c.push(kart('📍', 'Adres', `<span>${esc([S.adres, S.sehir].filter(Boolean).join(', '))}</span><a href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">Haritada aç</a>`));
    if (S.calisma_saatleri) c.push(kart('🕒', 'Çalışma saatleri', `<span>${esc(S.calisma_saatleri)}</span>`));
    $('#contact-grid').innerHTML = c.join('') || '<p class="muted">İletişim bilgileri yakında eklenecek.</p>';

    // WhatsApp butonu
    const fab = $('#wa-fab');
    if (wa) { fab.href = wa; fab.hidden = false; } else fab.hidden = true;

    // Alt bilgi (yasal)
    const legal = [S.unvan, S.vergi_dairesi && S.vergi_no ? `${S.vergi_dairesi} V.D. · ${S.vergi_no}` : (S.vergi_no ? `Vergi no: ${S.vergi_no}` : '')].filter(Boolean);
    $('#foot-legal').innerHTML = legal.map(esc).join('<br>');
  }

  // Başvuru formu
  const RULES = {
    ad: (v) => (v.trim().length < 2 ? 'Adını yaz.' : ''),
    soyad: (v) => (v.trim().length < 2 ? 'Soyadını yaz.' : ''),
    telefon: (v) => (!/^05[0-9]{9}$/.test(v.replace(/\D/g, '')) ? '05 ile başlayan 11 haneli numara.' : ''),
    eposta: (v) => (v && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v.trim()) ? 'Geçerli bir e-posta yaz ya da boş bırak.' : ''),
    paket_id: (v) => (!v ? 'Bir paket seç.' : ''),
  };
  const form = $('#apply-form');
  const check = (n) => {
    const el = form.elements[n]; const err = RULES[n](el.value);
    el.classList.toggle('invalid', !!err); el.closest('.field').querySelector('.field-err').textContent = err; return !err;
  };
  Object.keys(RULES).forEach((n) => form.elements[n].addEventListener('blur', () => check(n)));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = $('#apply-err'); errBox.hidden = true;
    const ok = Object.keys(RULES).map(check).every(Boolean);
    const kvkk = form.elements.kvkk.checked;
    $('#kvkk-err').textContent = kvkk ? '' : 'Devam etmek için aydınlatma metnini onayla.';
    if (!ok || !kvkk) { const b = $('.invalid', form); if (b) b.focus(); return; }
    if (form.elements.website.value) return; // bot
    const rec = {
      ad: form.elements.ad.value.trim(), soyad: form.elements.soyad.value.trim(),
      telefon: form.elements.telefon.value.replace(/\D/g, ''), eposta: form.elements.eposta.value.trim().toLowerCase() || null,
      paket_id: Number(form.elements.paket_id.value), mesaj: form.elements.mesaj.value.trim() || null, kvkk_onay: true,
    };
    const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    const { error } = await sb.from('uyelik_basvurulari').insert(rec);
    btn.disabled = false; btn.textContent = 'Başvurumu gönder';
    if (error) {
      errBox.textContent = /bugün zaten başvuru/.test(error.message) ? error.message
        : /Failed to fetch|NetworkError/.test(error.message) ? 'Bağlantı kurulamadı, internetini kontrol edip tekrar dene.'
          : 'Başvuru gönderilemedi. Lütfen bizi telefonla ya da WhatsApp\'tan ara.';
      errBox.hidden = false; return;
    }
    const p = paketler.find((x) => x.paket_id === rec.paket_id);
    $('#apply-ok').innerHTML = `<div><strong>Teşekkürler ${esc(rec.ad)}! 💗</strong><p>${esc(p?.paket_adi || '')} başvurun bize ulaştı. En kısa sürede ${fmtPhone(rec.telefon)} numarasından seni arayacağız.</p></div>`;
    $('#apply-ok').hidden = false;
    form.reset();
    $('#apply-ok').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  (async () => {
    try {
      const [{ data: s, error: e1 }, { data: p, error: e2 }] = await Promise.all([
        sb.from('salon_ayarlari').select('*').eq('ayar_id', 1).maybeSingle(),
        sb.from('uyelik_paketleri').select('paket_id, paket_adi, sure_ay, fiyat, aciklama').eq('aktif_mi', true).order('sure_ay'),
      ]);
      if (e1 || e2) throw e1 || e2;
      S = s || { salon_adi: cfg.SALON_ADI, online_basvuru_acik: false };
      paketler = p || [];
      render();
    } catch (err) {
      console.error(err);
      $('#pkg-grid').innerHTML = '<p class="muted center">Bilgiler şu an yüklenemedi. Lütfen biraz sonra tekrar dene.</p>';
    }
  })();
})();
