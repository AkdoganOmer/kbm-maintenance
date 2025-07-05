// Tüm üniteleri Denizaltı ünitesiyle aynı yapma scripti
// Bu scripti tarayıcı konsolunda çalıştırın

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

// Tüm üniteleri güncelleme fonksiyonu
async function updateAllUnitsToDenizalti() {
    try {
        console.log('Tüm üniteleri Denizaltı ünitesiyle aynı yapma işlemi başlatılıyor...');
        
        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || !window.db) {
            console.error('Firebase bağlantısı bulunamadı!');
            return;
        }

        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        let totalUnits = 0;
        let updatedUnits = 0;

        // Her galeri için üniteleri güncelle
        for (const galleryDoc of galleriesSnapshot.docs) {
            const gallery = galleryDoc.data();
            console.log(`Galeri işleniyor: ${gallery.name}`);

            if (gallery.units && Array.isArray(gallery.units)) {
                totalUnits += gallery.units.length;
                
                // Her üniteyi güncelle
                for (let i = 0; i < gallery.units.length; i++) {
                    const unit = gallery.units[i];
                    
                    // Üniteyi güncelle
                    gallery.units[i] = {
                        ...unit,
                        technicalDetails: DENIZALTI_DATA.technicalDetails,
                        maintenanceInstructions: DENIZALTI_DATA.maintenanceInstructions
                    };
                    
                    updatedUnits++;
                    console.log(`Ünite güncellendi: ${unit.name}`);
                }

                // Galeriyi Firebase'e kaydet
                await window.db.collection('galleries').doc(galleryDoc.id).update({
                    units: gallery.units
                });
                
                console.log(`${gallery.name} galerisi güncellendi`);
            }
        }

        console.log(`İşlem tamamlandı!`);
        console.log(`Toplam ünite sayısı: ${totalUnits}`);
        console.log(`Güncellenen ünite sayısı: ${updatedUnits}`);
        
        alert(`Tüm üniteler başarıyla güncellendi!\nToplam: ${totalUnits} ünite\nGüncellenen: ${updatedUnits} ünite`);

    } catch (error) {
        console.error('Üniteler güncellenirken hata:', error);
        alert('Hata oluştu: ' + error.message);
    }
}

// Sadece belirli bir galeriyi güncelleme fonksiyonu
async function updateGalleryUnitsToDenizalti(galleryId) {
    try {
        console.log(`Galeri güncelleniyor: ${galleryId}`);
        
        // Galeriyi al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        if (!galleryDoc.exists) {
            console.error('Galeri bulunamadı!');
            return;
        }

        const gallery = galleryDoc.data();
        let updatedUnits = 0;

        if (gallery.units && Array.isArray(gallery.units)) {
            // Her üniteyi güncelle
            for (let i = 0; i < gallery.units.length; i++) {
                const unit = gallery.units[i];
                
                // Üniteyi güncelle
                gallery.units[i] = {
                    ...unit,
                    technicalDetails: DENIZALTI_DATA.technicalDetails,
                    maintenanceInstructions: DENIZALTI_DATA.maintenanceInstructions
                };
                
                updatedUnits++;
                console.log(`Ünite güncellendi: ${unit.name}`);
            }

            // Galeriyi Firebase'e kaydet
            await window.db.collection('galleries').doc(galleryId).update({
                units: gallery.units
            });
            
            console.log(`${gallery.name} galerisi güncellendi`);
            alert(`${gallery.name} galerisindeki ${updatedUnits} ünite güncellendi!`);
        }

    } catch (error) {
        console.error('Galeri güncellenirken hata:', error);
        alert('Hata oluştu: ' + error.message);
    }
}

// Kullanım talimatları
console.log('=== TÜM ÜNİTELERİ DENİZALTI ÜNİTESİYLE AYNI YAPMA SCRIPTİ ===');
console.log('');
console.log('Kullanım:');
console.log('1. Tüm üniteleri güncellemek için: updateAllUnitsToDenizalti()');
console.log('2. Belirli bir galeriyi güncellemek için: updateGalleryUnitsToDenizalti("GALERI_ID")');
console.log('');
console.log('Örnek:');
console.log('updateAllUnitsToDenizalti();');
console.log('updateGalleryUnitsToDenizalti("galeri1");');
console.log('');
console.log('DİKKAT: Bu işlem geri alınamaz! Yedek almayı unutmayın!'); 