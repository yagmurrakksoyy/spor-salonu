/* Herkese açık salon sayfası: bilgiler salon_ayarlari tablosundan gelir */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG;
  // Tanıtım modu: salon.html?demo=<kod> → veritabanına hiç dokunulmaz
  const DEMO_KOD = new URLSearchParams(location.search).get('demo');
  const DEMO = DEMO_KOD && window.DEMOLAR && Object.prototype.hasOwnProperty.call(window.DEMOLAR, DEMO_KOD) ? window.DEMOLAR[DEMO_KOD] : null;
  const sb = DEMO ? null : window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: false } });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tl = (v) => `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(v) || 0)} TL`;
  const fmtPhone = (p) => (p && p.length === 11 ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9)}` : p || '');
  const brandHTML = (ad) => { const u = String(ad || '').toUpperCase(); return u.length <= 3 ? esc(u) : `${esc(u.slice(0, -3))}<span>${esc(u.slice(-3))}</span>`; };
  $('#yil').textContent = new Date().getFullYear();

  let S = {};
  let paketler = [];
  let kadro = [];
  let ozet = null;

  if (DEMO) {
    const root = document.documentElement;
    root.classList.add('demo');
    root.dataset.theme = 'light';
    const r = DEMO.renk;
    [['--primary', r.ana], ['--primary-600', r.koyu], ['--hero-1', r.ana], ['--hero-2', r.koyu], ['--hero-3', r.zemin], ['--hero-acik', r.acik]]
      .forEach(([k, v]) => root.style.setProperty(k, v));
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.appendChild(meta);
    const harf = DEMO.salon_adi.charAt(0).toLocaleUpperCase('tr-TR');
    $$('.brand-logo').forEach((el) => { el.textContent = harf; });
    const ico = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='${r.ana}'/><text x='32' y='45' font-family='Arial' font-weight='700' font-size='36' fill='white' text-anchor='middle'>${harf}</text></svg>`;
    const link = document.querySelector('link[rel=icon]'); if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(ico);
    $('a[href="./"]').hidden = true; // demo sayfasında yönetici girişi gösterilmez
  }

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

    // Kampanya şeridi
    let promoKapali = false;
    try { promoKapali = sessionStorage.getItem('promo-x') === (S.deneme_metni || ''); } catch (e) { /* yok say */ }
    $('#promo').hidden = !S.deneme_metni || promoKapali;
    $('#promo-text').textContent = S.deneme_metni || '';
    $('#promo-x').onclick = () => { $('#promo').hidden = true; try { sessionStorage.setItem('promo-x', S.deneme_metni || ''); } catch (e) { /* yok say */ } };

    // Kahraman alanındaki kısa bilgiler (rakamlarla salon)
    const facts = [];
    if (paketler.length) facts.push(`<li><b>${tl(Math.min(...paketler.map((p) => p.fiyat / p.sure_ay)))}</b><span>'den başlayan aylık fiyat</span></li>`);
    if (ozet && ozet.aktif_uye >= 10) facts.push(`<li><b>${ozet.aktif_uye}+</b><span>aktif üye</span></li>`);
    if (ozet && ozet.antrenor > 0) facts.push(`<li><b>${ozet.antrenor}</b><span>uzman antrenör</span></li>`);
    else if (paketler.length) facts.push(`<li><b>${paketler.length}</b><span>farklı üyelik paketi</span></li>`);
    if (S.sehir) facts.push(`<li><b>${esc(S.sehir)}</b><span>'da seni bekliyoruz</span></li>`);
    $('#hero-facts').innerHTML = facts.join('');

    // Paket kartları
    let adaylar = paketler.filter((x) => !/öğrenci|ogrenci/i.test(x.paket_adi));
    if (adaylar.some((x) => x.sure_ay > 1)) adaylar = adaylar.filter((x) => x.sure_ay > 1);
    const enIyi = adaylar.length > 1 ? adaylar.reduce((a, b) => (b.fiyat / b.sure_ay < a.fiyat / a.sure_ay ? b : a)) : null;
    $('#pkg-grid').innerHTML = paketler.length ? paketler.map((p) => `
      <div class="pkg ${enIyi && p.paket_id === enIyi.paket_id ? 'best' : ''}">
        ${enIyi && p.paket_id === enIyi.paket_id ? '<span class="pkg-tag">En avantajlı</span>' : ''}
        <h3>${esc(p.paket_adi)}</h3>
        <div class="pkg-price">${tl(p.fiyat)}</div>
        <div class="muted small">${p.sure_ay} ay${p.sure_ay > 1 ? ` · aylık ${tl(p.fiyat / p.sure_ay)}` : ''}</div>
        ${icerik(p.aciklama)}
        ${S.online_basvuru_acik ? `<a class="btn ${enIyi && p.paket_id === enIyi.paket_id ? 'btn-primary' : ''} btn-block" href="#basvuru" data-sec="${p.paket_id}">Bu paketi seç</a>` : ''}
      </div>`).join('') : '<p class="muted center">Paket bilgisi için bizimle iletişime geç.</p>';
    $$('[data-sec]').forEach((a) => a.addEventListener('click', () => { $('#apply-form').paket_id.value = a.dataset.sec; }));
    $('#odeme-not').textContent = 'Ödeme ilk gelişinde salonda nakit/kart ile' + (S.iban ? ' veya havale/EFT ile yapılabilir.' : ' yapılabilir.');
    $('#demo-note').hidden = !DEMO;

    // Kadro
    $('#kadro').hidden = !kadro.length;
    $('#team-grid').innerHTML = kadro.map((k) => `<div class="coach"><div class="ava" aria-hidden="true">${esc((k.ad || '?').charAt(0))}</div><b>${esc(k.ad)}</b><span>${esc(k.uzmanlik || 'Antrenör')}</span></div>`).join('');

    // SSS
    $('#faq').innerHTML = sssListesi().map(([soru, cevap]) => `<details><summary>${esc(soru)}</summary><p>${esc(cevap)}</p></details>`).join('');

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
    if (S.adres || S.sehir) c.push(kart('📍', 'Adres', `<span>${esc([S.adres, S.sehir].filter(Boolean).join(', '))}</span><span class="links"><a href="https://www.google.com/maps/search/?api=1&query=${mapQ}" target="_blank" rel="noopener">Haritada aç</a><a href="https://www.google.com/maps/dir/?api=1&destination=${mapQ}" target="_blank" rel="noopener">Yol tarifi al</a></span>`));
    if (S.calisma_saatleri) c.push(kart('🕒', 'Çalışma saatleri', `<span>${esc(S.calisma_saatleri)}</span>`));
    $('#contact-grid').innerHTML = c.join('') || '<p class="muted">İletişim bilgileri yakında eklenecek.</p>';

    // WhatsApp butonu
    const fab = $('#wa-fab');
    if (DEMO) {
      fab.hidden = false; fab.href = '#'; fab.removeAttribute('target');
      fab.onclick = (e) => { e.preventDefault(); showModal('WhatsApp butonu', `<p>Gerçek sitede bu buton, salonun panelden girdiği WhatsApp numarasına <b>hazır bir mesajla</b> sohbet açar:</p><p class="muted">“${esc(S.whatsapp_mesaj)}”</p><p class="muted small">Bu bir tanıtım sayfası olduğu için mesaj gönderilmez.</p>`); };
    } else if (wa) { fab.href = wa; fab.hidden = false; } else fab.hidden = true;

    // Alt bilgi (yasal)
    const legal = [S.unvan, S.vergi_dairesi && S.vergi_no ? `${S.vergi_dairesi} V.D. · ${S.vergi_no}` : (S.vergi_no ? `Vergi no: ${S.vergi_no}` : '')].filter(Boolean);
    $('#foot-legal').innerHTML = legal.map(esc).join('<br>');

    if (DEMO) {
      $('#demo-bar').hidden = false;
      $('#demo-bar').innerHTML = `Bu sayfa <b>${esc(S.salon_tam_adi)}</b> için hazırlanmış bir <b>tasarım örneğidir</b>; salonun resmi sitesi değildir. Bilgiler ve fiyatlar örnektir.`;
    }
    hesapla();
  }

  // Paket açıklamasını "+" , "·" ya da virgülle ayrılmış maddelere çevir
  function icerik(aciklama) {
    const parts = String(aciklama || '').split(/\s*(?:\+|·|,|\n)\s*/).map((x) => x.trim()).filter(Boolean);
    return parts.length ? `<ul class="pkg-list">${parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<ul class="pkg-list"></ul>';
  }

  function sssListesi() {
    const ozel = String(S.sss || '').split('\n').map((l) => l.split('|')).filter((x) => x.length >= 2 && x[0].trim() && x.slice(1).join('|').trim())
      .map((x) => [x[0].trim(), x.slice(1).join('|').trim()]);
    if (ozel.length) return ozel;
    const odeme = 'Ödemeyi ilk gelişinde salonda nakit ya da kartla yapabilirsin.' + (S.iban ? ' İstersen havale/EFT ile de ödeyebilirsin; IBAN bilgisi başvuru bölümünde.' : '');
    const l = [
      ['Daha önce hiç spor yapmadım, bana uygun mu?', 'Kesinlikle. İlk gün seviyeni birlikte belirliyor, sana uygun bir başlangıç programı hazırlıyoruz.'],
      ['Üyelik nasıl başlıyor?', S.online_basvuru_acik ? 'Bu sayfadaki formu doldurman yeterli. Seni arayıp üyeliğini başlatıyoruz, gerisini salonda birlikte hallediyoruz.' : 'Salona uğraman ya da bizi araman yeterli; üyeliğini birlikte başlatırız.'],
      ['Ödemeyi nasıl yapabilirim?', odeme],
      ['İlk gün yanımda ne getirmeliyim?', 'Rahat bir spor kıyafeti, temiz bir spor ayakkabı, küçük bir havlu ve su yeterli.'],
      ['Paketimi değiştirebilir ya da dondurabilir miyim?', 'Paketini yükseltmek ya da dondurma imkânlarını öğrenmek için bizimle görüşmen yeterli; paketine göre en uygun yolu birlikte buluruz.'],
    ];
    if (S.calisma_saatleri) l.push(['Hangi saatlerde açıksınız?', S.calisma_saatleri]);
    return l;
  }

  // VKİ ve günlük kalori hesaplayıcı (Mifflin-St Jeor)
  const calcForm = $('#calc-form');
  function hesapla() {
    const f = calcForm.elements;
    const yas = Number(f.yas.value), boy = Number(f.boy.value), kilo = Number(String(f.kilo.value).replace(',', '.'));
    const out = $('#calc-out');
    if (!(yas >= 14 && yas <= 90 && boy >= 120 && boy <= 230 && kilo >= 30 && kilo <= 250)) {
      out.innerHTML = '<div class="tag">Bilgilerini gir</div><p>Yaş 14–90, boy 120–230 cm, kilo 30–250 kg aralığında olmalı.</p>';
      return;
    }
    const m = boy / 100, vki = kilo / (m * m);
    const durum = vki < 18.5 ? 'Zayıf' : vki < 25 ? 'Normal' : vki < 30 ? 'Fazla kilolu' : 'Obez';
    const bmr = 10 * kilo + 6.25 * boy - 5 * yas + (f.cins.value === 'E' ? 5 : -161);
    const hedef = Number(f.hedef.value);
    const kcal = Math.round((bmr * Number(f.akt.value) + hedef) / 10) * 10;
    const protein = Math.round(kilo * (hedef < 0 ? 2 : 1.8));
    const yag = Math.round((kcal * 0.25) / 9);
    const karb = Math.max(0, Math.round((kcal - protein * 4 - yag * 9) / 4));
    const nf = (v, d = 0) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
    const hedefAd = { '-400': 'Yağ yakmak', 0: 'Formu korumak', 300: 'Kas kazanmak' }[hedef];
    out.innerHTML = `
      <div><small>Vücut kitle indeksin</small><div class="big">${nf(vki, 1)}</div><span class="tag">${durum}</span></div>
      <div><small>Boyuna göre sağlıklı kilo aralığı: <b>${nf(18.5 * m * m)}–${nf(24.9 * m * m)} kg</b></small></div>
      <div><small>Hedefin için günlük yaklaşık</small><div class="big" style="font-size:40px">${nf(kcal)} kcal</div></div>
      <div class="row"><div><b>${protein} g</b><span>protein</span></div><div><b>${karb} g</b><span>karbonhidrat</span></div><div><b>${yag} g</b><span>yağ</span></div></div>
      <small>Genel bilgi amaçlıdır. Sağlık durumun için doktoruna ya da diyetisyenine danış.</small>
      ${S.online_basvuru_acik ? `<a class="btn btn-light" href="#basvuru" id="calc-cta">“${hedefAd}” için başvur</a>` : ''}`;
    const cta = $('#calc-cta');
    if (cta) cta.addEventListener('click', () => { const t = $('#apply-form').elements.mesaj; if (!t.value.trim()) t.value = `Hedefim: ${hedefAd.toLocaleLowerCase('tr-TR')}.`; });
  }
  calcForm.addEventListener('input', hesapla);
  calcForm.addEventListener('change', hesapla);
  calcForm.addEventListener('submit', (e) => e.preventDefault());

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
    const { error } = DEMO ? await new Promise((r) => setTimeout(() => r({ error: null }), 500)) : await sb.from('uyelik_basvurulari').insert(rec);
    btn.disabled = false; btn.textContent = 'Başvurumu gönder';
    if (error) {
      errBox.textContent = /bugün zaten başvuru/.test(error.message) ? error.message
        : /Failed to fetch|NetworkError/.test(error.message) ? 'Bağlantı kurulamadı, internetini kontrol edip tekrar dene.'
          : 'Başvuru gönderilemedi. Lütfen bizi telefonla ya da WhatsApp\'tan ara.';
      errBox.hidden = false; return;
    }
    const p = paketler.find((x) => x.paket_id === rec.paket_id);
    $('#apply-ok').innerHTML = DEMO
      ? `<div><strong>Teşekkürler ${esc(rec.ad)}!</strong><p>Gerçek sitede bu başvuru salonun yönetim paneline anında düşer ve tek tıkla üyeye dönüştürülür. Bu bir tanıtım sayfası olduğu için bilgilerin hiçbir yere kaydedilmedi.</p></div>`
      : `<div><strong>Teşekkürler ${esc(rec.ad)}! 💗</strong><p>${esc(p?.paket_adi || '')} başvurun bize ulaştı. En kısa sürede ${fmtPhone(rec.telefon)} numarasından seni arayacağız.</p></div>`;
    $('#apply-ok').hidden = false;
    form.reset();
    $('#apply-ok').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  (async () => {
    if (DEMO) {
      S = Object.assign({}, DEMO);
      paketler = DEMO.paketler.slice();
      render();
      return;
    }
    try {
      const [{ data: s, error: e1 }, { data: p, error: e2 }] = await Promise.all([
        sb.from('salon_ayarlari').select('*').eq('ayar_id', 1).maybeSingle(),
        sb.from('uyelik_paketleri').select('paket_id, paket_adi, sure_ay, fiyat, aciklama').eq('aktif_mi', true).order('sure_ay'),
      ]);
      if (e1 || e2) throw e1 || e2;
      S = s || { salon_adi: cfg.SALON_ADI, online_basvuru_acik: false };
      paketler = p || [];
      // Kadro ve sayılar isteğe bağlı: alınamazsa sayfa yine çalışır
      const [{ data: k }, { data: o }] = await Promise.all([sb.rpc('fn_vitrin_antrenorler'), sb.rpc('fn_vitrin_ozet')]).catch(() => [{}, {}]);
      kadro = k || []; ozet = o || null;
      render();
    } catch (err) {
      console.error(err);
      $('#pkg-grid').innerHTML = '<p class="muted center">Bilgiler şu an yüklenemedi. Lütfen biraz sonra tekrar dene.</p>';
    }
  })();
})();
