// Orkestra düzeneğini Denizaltı ünitesiyle aynı yapma scripti
// Tarayıcı konsolunda çalıştırın

// Denizaltı ünitesi için örnek veriler
const DENIZALTI_DATA = {
    technicalDetails: `DENİZALTI DÜZENEĞİ TEKNİK ÖZELLİKLERİ

Çalışma Prensibi:
- Hidrolik sistem ile su altında hareket simülasyonu
- Elektronik kontrol sistemi ile gerçekçi denizaltı deneyimi
- Ses efektleri ve görsel animasyonlar ile interaktif deneyim

Teknik Özellikler:
- Güç: 220V AC, 50Hz
- Güç Tüketimi: 2.5 kW
- Hidrolik Basınç: 150 bar
- Su Sıcaklığı: 15-25°C
- Çalışma Süresi: Sürekli (8 saat/gün)
- Boyutlar: 3m x 2m x 2.5m
- Ağırlık: 1500 kg

Elektronik Sistemler:
- PLC Kontrol Ünitesi (Siemens S7-1200)
- Dokunmatik Ekran (10 inç)
- Ses Sistemi (4x50W hoparlör)
- LED Aydınlatma Sistemi
- Sensör Sistemi (Sıcaklık, Basınç, Seviye)

Hidrolik Sistem:
- Hidrolik Pompa: 5 HP
- Hidrolik Motor: 2 HP
- Basınç Regülatörü
- Filtre Sistemi
- Soğutma Ünitesi

Güvenlik Sistemleri:
- Acil Durdurma Butonu
- Basınç Sensörleri
- Sıcaklık Kontrolü
- Su Seviye Kontrolü
- Elektrik Güvenlik Devresi`,

    maintenanceInstructions: `DENİZALTI DÜZENEĞİ BAKIM TALİMATLARI

GÜNLÜK BAKIM:
1. Genel Temizlik
   - Dış yüzeylerin temizlenmesi
   - Dokunmatik ekranın temizlenmesi
   - Su kaçağı kontrolü

2. Çalışma Kontrolü
   - Hidrolik sistem basınç kontrolü
   - Ses sisteminin test edilmesi
   - LED aydınlatmanın kontrolü
   - Sensör okumalarının kontrolü

HAFTALIK BAKIM:
1. Hidrolik Sistem
   - Hidrolik yağ seviyesi kontrolü
   - Filtre temizliği
   - Basınç ayarlarının kontrolü
   - Pompa performans kontrolü

2. Elektronik Sistem
   - PLC program kontrolü
   - Sensör kalibrasyonu
   - Bağlantı noktalarının kontrolü
   - Güvenlik devrelerinin testi

AYLIK BAKIM:
1. Detaylı Kontrol
   - Hidrolik yağ değişimi (gerekirse)
   - Filtre değişimi
   - Sensör temizliği
   - Elektrik bağlantılarının sıkılması

2. Performans Testi
   - Tam sistem testi
   - Basınç testleri
   - Ses sistemi kalibrasyonu
   - Güvenlik sistemi testi

YILLIK BAKIM:
1. Kapsamlı Bakım
   - Hidrolik sistem revizyonu
   - Elektronik kart kontrolü
   - Yazılım güncellemesi
   - Yedek parça değişimi

2. Kalibrasyon
   - Tüm sensörlerin kalibrasyonu
   - Basınç sisteminin kalibrasyonu
   - Ses sisteminin kalibrasyonu

DİKKAT EDİLECEK HUSUSLAR:
- Su sıcaklığının 15-25°C arasında tutulması
- Hidrolik basıncın 150 bar'ı geçmemesi
- Elektrik bağlantılarının kuru tutulması
- Düzenli yağ analizi yapılması
- Güvenlik sistemlerinin her zaman aktif olması

ACİL DURUMLAR:
- Su kaçağı durumunda acil durdurma
- Elektrik arızası durumunda sistem kapatma
- Basınç aşımı durumunda otomatik devre kesme
- Sıcaklık aşımı durumunda soğutma sistemi devreye alma`
};

// Orkestra düzeneğini Denizaltı ile aynı yapma fonksiyonu
async function updateOrkestraToMatchDenizalti() {
    try {
        console.log('Orkestra düzeneği Denizaltı ile aynı yapılıyor...');
        
        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || !window.db) {
            console.error('Firebase bağlantısı bulunamadı!');
            return;
        }

        const galleryId = '9oHBM7Dzw0ALCG2fNZyI';
        const orkestraUnitId = 2; // Orkestra düzeneği
        
        // Galeriyi al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        if (!galleryDoc.exists) {
            console.error('Galeri bulunamadı!');
            return;
        }

        const gallery = galleryDoc.data();
        
        if (!gallery.units || !Array.isArray(gallery.units)) {
            console.error('Galeri üniteleri bulunamadı!');
            return;
        }

        // Orkestra düzeneğini bul (unitId 2)
        const orkestraIndex = gallery.units.findIndex(unit => unit.id === orkestraUnitId);
        
        if (orkestraIndex === -1) {
            console.error('Orkestra düzeneği bulunamadı!');
            return;
        }

        const orkestraUnit = gallery.units[orkestraIndex];
        console.log(`Güncellenen ünite: ${orkestraUnit.name}`);

        // Orkestra düzeneğini güncelle
        gallery.units[orkestraIndex] = {
            ...orkestraUnit,
            technicalDetails: DENIZALTI_DATA.technicalDetails,
            maintenanceInstructions: DENIZALTI_DATA.maintenanceInstructions
        };

        // Galeriyi Firebase'e kaydet
        await window.db.collection('galleries').doc(galleryId).update({
            units: gallery.units
        });
        
        console.log('Orkestra düzeneği başarıyla güncellendi!');
        alert('Orkestra düzeneği Denizaltı ile aynı yapıya getirildi!');
        
        // Sayfayı yenile
        if (confirm('Değişiklikleri görmek için sayfayı yenilemek ister misiniz?')) {
            window.location.reload();
        }

    } catch (error) {
        console.error('Güncelleme sırasında hata:', error);
        alert('Hata oluştu: ' + error.message);
    }
}

// Manuel çalıştırma için
console.log('Orkestra düzeneğini Denizaltı ile aynı yapmak için şu komutu çalıştırın:');
console.log('updateOrkestraToMatchDenizalti()'); 