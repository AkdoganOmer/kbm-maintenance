// Firebase referansı
const db = firebase.firestore();

// Debug fonksiyonu
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GALLERY-DETAILS: ${message}`);
    if (data) {
        console.log('Data:', data);
    }
}

// Veri doğrulama fonksiyonu
function validateGalleryData(gallery) {
    if (!gallery) {
        throw new Error('Galeri verisi bulunamadı!');
    }
    
    if (!gallery.name) {
        throw new Error('Galeri adı eksik!');
    }
    
    // Eksik alanları tamamla
    if (!gallery.units) {
        gallery.units = [];
    }
    
    if (!Array.isArray(gallery.units)) {
        gallery.units = [];
    }
    
    if (typeof gallery.totalUnits !== 'number') {
        gallery.totalUnits = gallery.units.length;
    }
    
    if (typeof gallery.faultyUnits !== 'number') {
        gallery.faultyUnits = gallery.units.filter(u => u.status === 'Arızalı').length;
    }
    
    return gallery;
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Sayfa yükleniyor...');
    
    try {
        // Firebase'in yüklenmesini bekle
        await new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                debugLog('Firebase zaten yüklü');
                resolve();
                return;
            }

            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    debugLog('Firebase yüklendi');
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        });

        // Sayfayı başlat
        await loadGalleryDetails();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        debugLog('Sayfa başlatılırken hata:', error);
        alert(error.message || 'Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

async function loadGalleryDetails() {
    debugLog('loadGalleryDetails başladı');
    
    try {
        // Önce URL'den galeri ID'sini almayı dene
        const urlParams = new URLSearchParams(window.location.search);
        let galleryId = urlParams.get('id');
        debugLog('URL\'den alınan galeri ID:', galleryId);
        
        // URL'de yoksa localStorage'dan almayı dene
        if (!galleryId) {
            galleryId = localStorage.getItem('selectedGalleryId');
            debugLog('localStorage\'dan alınan galeri ID:', galleryId);
        }
        
        if (!galleryId) {
            throw new Error('Galeri ID bulunamadı!');
        }

        // Firestore bağlantısını kontrol et
        if (!firebase.firestore()) {
            throw new Error('Firestore bağlantısı bulunamadı!');
        }

        debugLog('Firestore\'dan galeri detayları alınıyor...', { galleryId });
        const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            throw new Error('Galeri bulunamadı!');
        }

        let gallery = docRef.data();
        debugLog('Ham galeri verisi:', gallery);

        // Galeri verisini doğrula ve düzelt
        gallery = validateGalleryData(gallery);
        debugLog('Doğrulanmış galeri verisi:', gallery);
        
        // Galeri verisi eksikse güncelle
        if (!gallery.units || !Array.isArray(gallery.units) || typeof gallery.totalUnits !== 'number') {
            debugLog('Galeri verisi eksik, güncelleniyor...');
            const updateData = {
                units: gallery.units || [],
                totalUnits: gallery.units ? gallery.units.length : 0,
                faultyUnits: gallery.units ? gallery.units.filter(u => u.status === 'Arızalı').length : 0,
                updatedAt: new Date().toISOString()
            };
            
            await firebase.firestore().collection('galleries').doc(galleryId).update(updateData);
            debugLog('Galeri verisi güncellendi:', updateData);
            
            // Güncellenmiş veriyi al
            gallery = {
                ...gallery,
                ...updateData
            };
        }
        
        // Update page title
        const titleElement = document.getElementById('galleryTitle');
        if (!titleElement) {
            throw new Error('Sayfa elementleri bulunamadı!');
        }
        titleElement.textContent = gallery.name;

        // Get units for the selected gallery
        const units = gallery.units || [];
        debugLog('Galerinin üniteleri:', units);
        
        const tableBody = document.getElementById('unitsTable');
        if (!tableBody) {
            throw new Error('Tablo elementi bulunamadı!');
        }
        
        tableBody.innerHTML = '';

        if (units.length === 0) {
            debugLog('Hiç ünite bulunamadı');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">
                        Bu galeride henüz ünite bulunmamaktadır.
                    </td>
                </tr>
            `;
            return;
        }

        debugLog('Üniteler tabloya ekleniyor...', { uniteCount: units.length });
        units.forEach((unit, index) => {
            try {
                if (!unit || typeof unit !== 'object') {
                    debugLog('Geçersiz ünite verisi:', { index, unit });
                    return;
                }

                const row = document.createElement('tr');
                row.className = unit.status === 'Arızalı' ? 'table-danger' : '';
                row.style.cursor = 'pointer';
                row.onclick = () => showUnitDetails(unit.id);
                row.innerHTML = `
                    <td>${unit.name || 'İsimsiz Ünite'}</td>
                    <td>
                        <span class="badge ${unit.status === 'Arızalı' ? 'bg-danger' : 'bg-success'}">
                            ${unit.status || 'Çalışıyor'}
                        </span>
                    </td>
                    <td>${formatDate(unit.lastMaintenance)}</td>
                `;
                tableBody.appendChild(row);
                debugLog(`Ünite eklendi: ${unit.name}`, { index, unitId: unit.id });
            } catch (error) {
                console.error(`Ünite eklenirken hata (index: ${index}):`, error);
                debugLog(`Ünite eklenirken hata (index: ${index}):`, { error, unit });
            }
        });
        debugLog('Tüm üniteler başarıyla eklendi');
    } catch (error) {
        console.error('Galeri detayları yüklenirken hata:', error);
        debugLog('Galeri detayları yüklenirken hata:', error);
        alert(error.message || 'Galeri detayları yüklenirken bir hata oluştu.');
        window.location.href = 'index.html';
    }
}

// Function to show unit details
function showUnitDetails(unitId) {
    debugLog('Ünite detaylarına yönlendiriliyor:', { unitId });
    localStorage.setItem('selectedUnitId', String(unitId));
    window.location.href = 'unit-details.html';
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
    } catch (error) {
        debugLog('Tarih formatlanırken hata:', { dateString, error });
        return '-';
    }
} 