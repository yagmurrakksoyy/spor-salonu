/* Tanıtım (demo) sayfaları: salon.html?demo=<kod>
   Bu sayfalar veritabanına hiçbir şey yazmaz ve okumaz; her şey buradaki örnek veridir.
   Her salon kendi adı ve renk paletiyle görünür, fiyatlar örnektir. */
(function () {
  'use strict';

  const SAAT = 'Hafta içi 07:00 – 23:00 · Cumartesi 09:00 – 21:00 · Pazar 10:00 – 18:00';
  const PAKET_FITNESS = [
    { paket_id: 1, paket_adi: 'Aylık', sure_ay: 1, fiyat: 1500, aciklama: 'Tüm alanlar + Başlangıç programı' },
    { paket_id: 2, paket_adi: 'Öğrenci Aylık', sure_ay: 1, fiyat: 1200, aciklama: 'Öğrenci belgesi ile + Hafta içi 07-17' },
    { paket_id: 3, paket_adi: '3 Aylık', sure_ay: 3, fiyat: 4000, aciklama: 'Tüm alanlar + 1 ücretsiz PT seansı + Vücut analizi' },
    { paket_id: 4, paket_adi: '6 Aylık', sure_ay: 6, fiyat: 7500, aciklama: 'Tüm alanlar + 3 PT seansı + Aylık vücut analizi' },
    { paket_id: 5, paket_adi: 'Yıllık', sure_ay: 12, fiyat: 13500, aciklama: 'Sınırsız erişim + Aylık vücut analizi + 1 ay dondurma hakkı' },
  ];
  const PAKET_FIGHT = [
    { paket_id: 1, paket_adi: 'Fitness Aylık', sure_ay: 1, fiyat: 1500, aciklama: 'Tüm fitness alanı + Başlangıç programı' },
    { paket_id: 2, paket_adi: 'Kick Boks Aylık', sure_ay: 1, fiyat: 1800, aciklama: 'Haftada 3 grup dersi + Ekipman desteği' },
    { paket_id: 3, paket_adi: 'Fitness + Dövüş', sure_ay: 1, fiyat: 2600, aciklama: 'Fitness alanı + Tüm dövüş dersleri' },
    { paket_id: 4, paket_adi: '3 Aylık Kombine', sure_ay: 3, fiyat: 7000, aciklama: 'Fitness + Dövüş dersleri + 1 özel ders' },
    { paket_id: 5, paket_adi: 'Yıllık Kombine', sure_ay: 12, fiyat: 24000, aciklama: 'Sınırsız erişim + Aylık 1 özel ders' },
  ];
  const PAKET_EMS = [
    { paket_id: 2, paket_adi: '8 Seans', sure_ay: 1, fiyat: 3600, aciklama: '8 EMS seansı + Haftalık takip' },
    { paket_id: 3, paket_adi: '12 Seans', sure_ay: 2, fiyat: 5000, aciklama: '12 EMS seansı + Beslenme önerileri' },
    { paket_id: 4, paket_adi: '24 Seans', sure_ay: 3, fiyat: 9000, aciklama: '24 EMS seansı + Aylık vücut analizi' },
  ];

  const yap = (o) => Object.assign({
    sehir: 'Elazığ',
    calisma_saatleri: SAAT,
    online_basvuru_acik: true,
    paketler: PAKET_FITNESS,
    deneme_metni: 'İlk antrenmanın bizden! Ücretsiz deneme günü için hemen başvur.',
    whatsapp_mesaj: `Merhaba, ${o.salon_adi} üyelikleri hakkında bilgi almak istiyorum.`,
  }, o);

  window.DEMOLAR = {
    'star-fit-life': yap({
      salon_adi: 'Star Fit', salon_tam_adi: 'Star Fit Life', semt: 'Çaydaçıra',
      adres: 'Adnan Kahveci Blv. No: 103E, Çaydaçıra', telefon: '05385299566',
      slogan: 'Yıldızın burada parlasın.',
      hakkimizda: 'Star Fit Life, Çaydaçıra\'da herkesin kendi hedefine göre çalışabildiği modern bir fitness salonudur. Antrenörlerimiz sana özel program hazırlar, sen de sadece gelip çalışırsın.',
      renk: { ana: '#2448c8', koyu: '#172d80', zemin: '#0b1233', acik: '#ffd34d' },
    }),
    'gym-life-elazig': yap({
      salon_adi: 'Gym Life', salon_tam_adi: 'Gym Life Elazığ', semt: 'Cumhuriyet', adres: 'Cumhuriyet Mahallesi', instagram: 'gymlifeelazig',
      slogan: 'Spor bir hayat tarzı.',
      hakkimizda: 'Gym Life, Cumhuriyet Mahallesi\'nde sporu hayatının bir parçası yapmak isteyen herkes için var. Ağırlık, kardiyo ve fonksiyonel alanlarımızla her seviyeye uygun.',
      renk: { ana: '#0284c7', koyu: '#075985', zemin: '#082032', acik: '#bae6fd' },
    }),
    'power-gym-elazig': yap({
      salon_adi: 'Power Gym', salon_tam_adi: 'Power Gym Elazığ', semt: 'Kızılay', adres: 'Kızılay Mahallesi', instagram: 'powergymelazig',
      slogan: 'Gücünü keşfet.',
      hakkimizda: 'Power Gym, Kızılay\'da güç ve kuvvet antrenmanına odaklanan bir salondur. Serbest ağırlık alanımız ve deneyimli antrenörlerimizle hedefine güvenle ilerlersin.',
      renk: { ana: '#dc2626', koyu: '#8f1414', zemin: '#190a0a', acik: '#fecaca' },
    }),
    'form-fit': yap({
      salon_adi: 'Form Fit', salon_tam_adi: 'Form Fit Spor Salonu', semt: 'Üniversite', adres: 'Üniversite Mahallesi',
      slogan: 'Formunu birlikte yakalayalım.',
      hakkimizda: 'Form Fit, Üniversite Mahallesi\'nde öğrencilerden çalışanlara herkese uygun saatler ve fiyatlarla hizmet veren samimi bir spor salonudur.',
      renk: { ana: '#0d9488', koyu: '#0f5f59', zemin: '#062421', acik: '#99f6e4' },
    }),
    'titan-fitness-fight-club': yap({
      salon_adi: 'Titan', salon_tam_adi: 'Titan Fitness & Fight Club', semt: 'Aksaray', adres: 'Aksaray Mahallesi',
      slogan: 'Antrenman sahada başlar.',
      hakkimizda: 'Titan Fitness & Fight Club, fitness ve dövüş sporlarını tek çatı altında buluşturur. Kondisyonunu artırmak, kendini savunmayı öğrenmek ya da ringe çıkmak için doğru yer.',
      paketler: PAKET_FIGHT,
      deneme_metni: 'Kick boks deneme dersi ücretsiz! Yerini ayırt.',
      renk: { ana: '#ea580c', koyu: '#8a3306', zemin: '#1c130e', acik: '#fed7aa' },
    }),
    'emir-gym-center': yap({
      salon_adi: 'Emir Gym', salon_tam_adi: 'Emir Gym Center', semt: 'Çaydaçıra',
      adres: 'Akıncı Cad. No: 10AA, Çaydaçıra', telefon: '05423647496', instagram: 'emirgym_center',
      slogan: 'Bugün başla, farkı hisset.',
      hakkimizda: 'Emir Gym Center, Çaydaçıra\'da geniş antrenman alanı ve kişiye özel programlarıyla her seviyeden sporcuyu ağırlar.',
      renk: { ana: '#7c3aed', koyu: '#4c1d95', zemin: '#160b2e', acik: '#ddd6fe' },
    }),
    'olympus-fitness-center': yap({
      salon_adi: 'Olympus', salon_tam_adi: 'Olympus Fitness Center', instagram: 'olympussfitnesscenter',
      slogan: 'Zirveye giden yol burada.',
      hakkimizda: 'Olympus Fitness Center, disiplinli antrenman ve kaliteli ekipmanla hedeflerine ulaşmak isteyenler için kuruldu.',
      renk: { ana: '#1f2937', koyu: '#3b3220', zemin: '#0d1117', acik: '#e5c07b' },
    }),
    'elazig-fitness-center': yap({
      salon_adi: 'Elazığ FC', salon_tam_adi: 'Elazığ Fitness Center', instagram: 'elazigfitnesscenter',
      slogan: 'Elazığ\'ın enerjisi burada.',
      hakkimizda: 'Elazığ Fitness Center, şehrin kalbinde fitness, kardiyo ve grup dersleriyle sağlıklı yaşamı herkes için ulaşılabilir kılar.',
      renk: { ana: '#3b5b8c', koyu: '#26395a', zemin: '#0e1624', acik: '#bcd3f5' },
    }),
    'aktug-gym-fitness': yap({
      salon_adi: 'Aktuğ Gym', salon_tam_adi: 'Aktuğ Gym Fitness', instagram: 'aktuggymfitness',
      slogan: 'Her tekrar seni ileri taşır.',
      hakkimizda: 'Aktuğ Gym Fitness, kişisel antrenman ve takip odaklı yaklaşımıyla üyelerinin gelişimini adım adım izler.',
      renk: { ana: '#4d7c0f', koyu: '#365314', zemin: '#11180a', acik: '#d9f99d' },
    }),
    'optimum-fitness-club': yap({
      salon_adi: 'Optimum', salon_tam_adi: 'Optimum Fitness Club',
      slogan: 'Senin için en iyisi.',
      hakkimizda: 'Optimum Fitness Club, bilimsel antrenman ilkeleri ve rahat bir ortamla sana en uygun programı sunar.',
      renk: { ana: '#a21caf', koyu: '#701a75', zemin: '#1f0721', acik: '#f5d0fe' },
    }),
    'golden-ems-fitness': yap({
      salon_adi: 'Golden EMS', salon_tam_adi: 'Golden Ems Fitness', semt: 'Üniversite', adres: 'Üniversite Mahallesi', telefon: '05494242123',
      slogan: '20 dakikada tam antrenman.',
      hakkimizda: 'Golden Ems Fitness, elektriksel kas uyarımı (EMS) teknolojisiyle kısa sürede etkili antrenman sunar. Seanslar uzman eşliğinde, randevuyla yapılır.',
      paketler: PAKET_EMS,
      deneme_metni: 'İlk EMS seansında vücut analizi hediye!',
      renk: { ana: '#a16207', koyu: '#5c3a05', zemin: '#1a1406', acik: '#fde047' },
    }),
  };
})();
