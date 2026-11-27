# Akfit · Aksoy Fitness Stüdyosu

Spor salonu üyelik ve antrenman programı yönetim sistemi.

PostgreSQL (Supabase) üzerinde çalışan bir spor salonu yönetim paneli.

**Canlı site:** https://yagmurrakksoyy.github.io/spor-salonu/

## Özellikler

- **Yönetici girişi:** Supabase Auth + satır düzeyi güvenlik (RLS). Sadece yönetici tablosundaki hesaplar veriyi görebilir.
- **Gösterge paneli:** Toplam/aktif üye, salondaki kişi sayısı, günlük girişler, aylık gelir, grafikler ve üyelik uyarıları.
- **Üyeler:** Arama, durum/paket filtreleri, sıralama, CSV dışa aktarma, yeni üye kaydı (anlık doğrulama), bilgi düzenleme ve üyelik yenileme.
- **Üye detayı:** Üyelik ilerlemesi, iletişim, antrenman programları, giriş-çıkış geçmişi, yazdırılabilir üye kartı.
- **Turnike:** Tek tıkla giriş / çıkış. Üyeliği bitmiş veya zaten içeride olan üyeyi veritabanı trigger'ı reddeder.
- **Giriş-çıkış geçmişi:** Tarih aralığı, üye ve durum filtreleri, sayfalama, özet istatistikler, CSV.
- **Antrenman & kadro:** Programlar (gün gün egzersizler), antrenörler, egzersiz kütüphanesi, üyelik paketleri.
- **Raporlar:** Ders kapsamındaki 4 JOIN + GROUP BY raporu ve bonus saatlik yoğunluk raporu; grafik, tablo ve SQL metniyle.
- Açık / koyu tema, mobil uyumlu arayüz.

## Veritabanı nesneleri

| Tür | Ad | Sitede kullanıldığı yer |
|---|---|---|
| VIEW | `vw_uye_uyelik_durumu` | Üye durumları (Aktif / Yakında Bitiyor / Süresi Doldu) |
| VIEW | `vw_rapor_*` | Raporlar sayfası |
| FUNCTION | `fn_uyelik_bitis_tarihi`, `fn_uye_aktif_mi` | Bitiş tarihi ve aktiflik hesabı |
| PROCEDURE | `sp_cikis_yap` (`fn_cikis_yap` ile çağrılır) | Turnike çıkışı |
| TRIGGER | `trg_giris_kontrol` | Turnike girişi doğrulaması |

## Teknik

Saf HTML, CSS ve JavaScript (derleme adımı yok). `vendor/` klasöründe supabase-js 2.86.0 ve Chart.js 4.5.1 bulunur.
Bağlantı ayarları `js/config.js` dosyasındadır; buradaki anahtar Supabase'in herkese açık (publishable) anahtarıdır,
verilere erişim RLS kurallarıyla korunur.

Yerelde çalıştırmak için: `python3 -m http.server` ve tarayıcıda `http://localhost:8000`.
