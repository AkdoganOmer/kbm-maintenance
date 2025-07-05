// Debug modu
const isDebug = true;

// Debug fonksiyonu
function debug(message, data = null) {
    if (isDebug) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
}

// Debug fonksiyonu
function dashboardDebug(message, data = null) {
    if (window.debug) {
        const prefix = '[Dashboard]';
        if (data) {
            window.debug(prefix + ' ' + message, data);
        } else {
            window.debug(prefix + ' ' + message);
        }
    }
}



// Bakımda olan sergileri yükle
async function loadMaintenanceInProgress() {
    try {
        dashboardDebug('Bakımda olan sergiler yükleniyor...');

        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const maintenanceInProgress = [];

        // Tüm galerilerdeki bakımda olan üniteleri topla
        galleriesSnapshot.forEach(doc => {
            const gallery = doc.data();
            if (gallery.units) {
                gallery.units.forEach(unit => {
                    if (unit.maintenanceHistory && Array.isArray(unit.maintenanceHistory)) {
                        // Son bakım kaydını bul
                        const lastMaintenance = unit.maintenanceHistory
                            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                        
                        // Eğer son bakım kaydı "Devam Ediyor" durumundaysa listeye ekle
                        if (lastMaintenance && lastMaintenance.status === 'Devam Ediyor') {
                            maintenanceInProgress.push({
                                ...lastMaintenance,
                                unitName: unit.name,
                                galleryName: gallery.name,
                                unitId: unit.id,
                                galleryId: doc.id
                            });
                        }
                    }
                });
            }
        });

        // Bakımda olan sergileri göster
        const maintenanceListElement = document.getElementById('maintenanceList');
        if (maintenanceInProgress.length === 0) {
            maintenanceListElement.innerHTML = '<tr><td colspan="5" class="text-center">Şu anda bakımda olan sergi bulunmuyor.</td></tr>';
        } else {
            maintenanceListElement.innerHTML = maintenanceInProgress.map(record => `
                <tr>
                    <td>
                        ${record.galleryName}
                    </td>
                    <td>
                        <a href="unit-details.html?galleryId=${record.galleryId}&unitId=${record.unitId}" class="text-decoration-none">
                            ${record.unitName}
                        </a>
                    </td>
                    <td>${record.type || 'Bakım'}</td>
                    <td>${formatDate(record.date)}</td>
                    <td>
                        <span class="badge bg-warning text-dark">Devam Ediyor</span>
                    </td>
                </tr>
            `).join('');
        }

        dashboardDebug('Bakımda olan sergiler yüklendi:', maintenanceInProgress.length);

    } catch (error) {
        console.error('Bakımda olan sergiler yüklenirken hata:', error);
        showError('Bakımda olan sergiler yüklenirken bir hata oluştu.');
    }
}

// İstatistikleri yükle
async function loadDashboardStats() {
    try {
        dashboardDebug('İstatistikler yükleniyor...');

        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
            dashboardDebug('Firebase henüz başlatılmadı, bekleniyor...');
            setTimeout(loadDashboardStats, 1000);
            return;
        }

        // Firestore referansını kontrol et
        if (!window.db) {
            dashboardDebug('Firestore referansı bulunamadı');
            showError('Veritabanı bağlantısı kurulamadı');
            return;
        }

        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const galleries = [];
        galleriesSnapshot.forEach(doc => {
            const galleryData = doc.data();
            galleries.push({
                id: doc.id,
                ...galleryData
            });
        });

        dashboardDebug('Galeriler alındı:', galleries.length);

        // İstatistikleri hesapla
        let totalUnits = 0;
        let faultyUnits = 0;
        let monthlyMaintenance = 0;
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        galleries.forEach(gallery => {
            dashboardDebug(`Galeri işleniyor: ${gallery.name}`, gallery);
            
            if (gallery.units && Array.isArray(gallery.units)) {
                // Toplam ünite sayısı
                totalUnits += gallery.units.length;

                // Arızalı ünite sayısı
                const faultyInGallery = gallery.units.filter(unit => unit.status === 'Arızalı').length;
                faultyUnits += faultyInGallery;

                dashboardDebug(`${gallery.name} galerisi: ${gallery.units.length} ünite, ${faultyInGallery} arızalı`);

                // Bu ayki bakım sayısı
                gallery.units.forEach(unit => {
                    if (unit.maintenanceHistory && Array.isArray(unit.maintenanceHistory)) {
                        const monthlyRecords = unit.maintenanceHistory.filter(record => {
                            if (!record.date) return false;
                            const maintenanceDate = new Date(record.date);
                            return maintenanceDate >= firstDayOfMonth;
                        });
                        monthlyMaintenance += monthlyRecords.length;
                    }
                });
            } else {
                dashboardDebug(`${gallery.name} galerisinde ünite bulunamadı`);
            }
        });

        // İstatistikleri göster
        const totalUnitsElement = document.getElementById('totalUnits');
        const workingUnitsElement = document.getElementById('workingUnits');
        const brokenUnitsElement = document.getElementById('brokenUnits');
        const galleryCountElement = document.getElementById('galleryCount');

        if (totalUnitsElement) totalUnitsElement.textContent = totalUnits;
        if (workingUnitsElement) workingUnitsElement.textContent = totalUnits - faultyUnits;
        if (brokenUnitsElement) brokenUnitsElement.textContent = faultyUnits;
        if (galleryCountElement) galleryCountElement.textContent = galleries.length;

        dashboardDebug('İstatistikler güncellendi', {
            totalGalleries: galleries.length,
            totalUnits,
            workingUnits: totalUnits - faultyUnits,
            faultyUnits,
            monthlyMaintenance
        });

    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
        showError('İstatistikler yüklenirken bir hata oluştu: ' + error.message);
    }
}

// Tarih formatla
function formatDate(dateString) {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Dashboard verilerini yükle
async function loadDashboard() {
    try {
        dashboardDebug('Dashboard verilerini yüklüyorum...');
        
        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
            dashboardDebug('Firebase henüz başlatılmadı, bekleniyor...');
            setTimeout(loadDashboard, 1000);
            return;
        }

        // Firestore referansını kontrol et
        if (!window.db) {
            dashboardDebug('Firestore referansı bulunamadı');
            showError('Veritabanı bağlantısı kurulamadı');
            return;
        }
        
        // Kullanıcı bilgilerini kontrol et
        const userRole = sessionStorage.getItem('userRole');
        const userName = sessionStorage.getItem('userName');
        
        if (!userRole || !userName) {
            dashboardDebug('Kullanıcı bilgileri eksik, login sayfasına yönlendiriliyor');
            window.location.href = 'login.html';
            return;
        }

        // Kullanıcı bilgilerini göster
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <span class="me-2"><i class="bi bi-person-circle"></i> ${userName}</span>
            `;
        }

        // İstatistikleri yükle
        await loadDashboardStats();

        // Bakımda olan sergileri yükle
        await loadMaintenanceInProgress();
        
        dashboardDebug('Dashboard yüklendi');
    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
        showError('Dashboard yüklenirken bir hata oluştu: ' + error.message);
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
    try {
        dashboardDebug('Sayfa yükleniyor...');

        // Firebase başlatma kontrolü
        if (!window.checkFirebaseStatus()) {
            throw new Error('Firebase başlatılamadı');
        }

        // Auth state değişikliklerini dinle
        window.auth.onAuthStateChanged(async (user) => {
            dashboardDebug('Auth state değişti:', user ? user.email : 'oturum kapalı');

            if (!user) {
                dashboardDebug('Kullanıcı oturum açmamış, login sayfasına yönlendiriliyor');
                window.location.href = 'login.html';
                return;
            }

            // Kullanıcı bilgilerini kontrol et
            const userRole = sessionStorage.getItem('userRole');
            const userName = sessionStorage.getItem('userName');

            if (!userRole || !userName) {
                try {
                    // Kullanıcı bilgilerini Firestore'dan al
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        sessionStorage.setItem('userRole', userData.role || 'staff');
                        sessionStorage.setItem('userName', userData.name || user.email.split('@')[0]);
                        dashboardDebug('Kullanıcı bilgileri Firestore\'dan alındı:', userData);
                    } else {
                        // Kullanıcı dokümanı yoksa varsayılan değerler ata
                        sessionStorage.setItem('userRole', 'staff');
                        sessionStorage.setItem('userName', user.email.split('@')[0]);
                        dashboardDebug('Varsayılan kullanıcı bilgileri atandı');
                    }
                } catch (error) {
                    console.error('Kullanıcı bilgileri alınırken hata:', error);
                    dashboardDebug('Kullanıcı bilgileri alınırken hata:', error);
                }
            }

            // Dashboard'ı yükle
            await loadDashboard();
            
            // URL parametresi kontrolü - galeri modalı açılacak mı?
            const urlParams = new URLSearchParams(window.location.search);
            const openGalleryId = urlParams.get('openGallery');
            
            if (openGalleryId) {
                // URL'den parametreyi temizle
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Galeri üniteler modalını aç
                setTimeout(() => {
                    showGalleryUnits(openGalleryId);
                }, 1000); // Dashboard yüklendikten sonra modal açılsın
            }
        });

    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        showError('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

// Hata mesajını göster
function showError(message) {
    const errorDiv = document.getElementById('dashboardError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Hata mesajını gizle
function hideError() {
    const errorDiv = document.getElementById('dashboardError');
    errorDiv.classList.add('d-none');
}

// Arızalı üniteler modalını göster
async function showFaultyUnitsModal() {
    try {
        dashboardDebug('Arızalı üniteler modalı açılıyor...');
        
        // Modal'ı aç
        const modal = new bootstrap.Modal(document.getElementById('faultyUnitsModal'));
        modal.show();
        
        // Arızalı üniteleri yükle
        await loadFaultyUnitsList();
        
    } catch (error) {
        console.error('Modal açılırken hata:', error);
        showError('Modal açılırken bir hata oluştu.');
    }
}

// Arızalı üniteleri listele
async function loadFaultyUnitsList() {
    try {
        dashboardDebug('Arızalı üniteler listesi yükleniyor...');
        
        const faultyUnitsListElement = document.getElementById('faultyUnitsList');
        
        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const faultyUnits = [];

        // Tüm galerilerdeki arızalı üniteleri topla
        galleriesSnapshot.forEach(doc => {
            const gallery = doc.data();
            if (gallery.units && Array.isArray(gallery.units)) {
                const faulty = gallery.units.filter(unit => unit.status === 'Arızalı');
                faultyUnits.push(...faulty.map(unit => ({
                    ...unit,
                    galleryName: gallery.name,
                    galleryId: doc.id
                })));
            }
        });

        // Arızalı üniteleri göster
        if (faultyUnits.length === 0) {
            faultyUnitsListElement.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    <strong>Harika!</strong> Şu anda arızalı ünite bulunmuyor.
                </div>
            `;
        } else {
            faultyUnitsListElement.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Galeri</th>
                                <th>Ünite</th>
                                <th>Arıza Sebebi</th>
                                <th>Arıza Tarihi</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${faultyUnits.map(unit => `
                                <tr>
                                    <td>
                                        ${unit.galleryName}
                                    </td>
                                    <td>
                                        <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" class="text-decoration-none">
                                            ${unit.name}
                                        </a>
                                    </td>
                                    <td>
                                        <span class="text-danger">
                                            ${unit.faultyReason || 'Arıza sebebi belirtilmemiş'}
                                        </span>
                                    </td>
                                    <td>
                                        ${unit.faultyDate ? formatDate(unit.faultyDate) : 'Belirtilmemiş'}
                                    </td>
                                    <td>
                                        <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" 
                                           class="btn btn-sm btn-primary">
                                            <i class="bi bi-tools"></i> Bakım Yap
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i>
                        Toplam ${faultyUnits.length} arızalı ünite bulundu.
                    </small>
                </div>
            `;
        }

        dashboardDebug('Arızalı üniteler listesi yüklendi:', faultyUnits.length);

    } catch (error) {
        console.error('Arızalı üniteler listesi yüklenirken hata:', error);
        const faultyUnitsListElement = document.getElementById('faultyUnitsList');
        faultyUnitsListElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Arızalı üniteler yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Çalışan üniteler modalını göster
async function showWorkingUnitsModal() {
    try {
        dashboardDebug('Çalışan üniteler modalı açılıyor...');
        
        // Modal'ı aç
        const modal = new bootstrap.Modal(document.getElementById('workingUnitsModal'));
        modal.show();
        
        // Çalışan üniteleri yükle
        await loadWorkingUnitsList();
        
    } catch (error) {
        console.error('Modal açılırken hata:', error);
        showError('Modal açılırken bir hata oluştu.');
    }
}

// Çalışan üniteleri listele
async function loadWorkingUnitsList() {
    try {
        dashboardDebug('Çalışan üniteler listesi yükleniyor...');
        
        const workingUnitsListElement = document.getElementById('workingUnitsList');
        
        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const workingUnits = [];

        // Tüm galerilerdeki çalışan üniteleri topla
        galleriesSnapshot.forEach(doc => {
            const gallery = doc.data();
            if (gallery.units && Array.isArray(gallery.units)) {
                const working = gallery.units.filter(unit => unit.status === 'Çalışıyor');
                workingUnits.push(...working.map(unit => ({
                    ...unit,
                    galleryName: gallery.name,
                    galleryId: doc.id
                })));
            }
        });

        // Çalışan üniteleri göster
        if (workingUnits.length === 0) {
            workingUnitsListElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Dikkat!</strong> Şu anda çalışan ünite bulunmuyor.
                </div>
            `;
        } else {
            workingUnitsListElement.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Galeri</th>
                                <th>Ünite</th>
                                <th>Son Bakım</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workingUnits.map(unit => `
                                <tr>
                                    <td>
                                        ${unit.galleryName}
                                    </td>
                                    <td>
                                        <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" class="text-decoration-none">
                                            ${unit.name}
                                        </a>
                                    </td>
                                    <td>
                                        ${unit.maintenanceHistory && unit.maintenanceHistory.length > 0 
                                            ? formatDate(unit.maintenanceHistory[unit.maintenanceHistory.length - 1].date)
                                            : 'Bakım yapılmamış'}
                                    </td>
                                    <td>
                                        <span class="badge bg-success">Çalışıyor</span>
                                    </td>
                                    <td>
                                        <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" 
                                           class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-eye"></i> Görüntüle
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i>
                        Toplam ${workingUnits.length} çalışan ünite bulundu.
                    </small>
                </div>
            `;
        }

        dashboardDebug('Çalışan üniteler listesi yüklendi:', workingUnits.length);

    } catch (error) {
        console.error('Çalışan üniteler listesi yüklenirken hata:', error);
        const workingUnitsListElement = document.getElementById('workingUnitsList');
        workingUnitsListElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Çalışan üniteler yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Tüm üniteler modalını göster
async function showAllUnitsModal() {
    try {
        dashboardDebug('Tüm üniteler modalı açılıyor...');
        
        // Modal'ı aç
        const modal = new bootstrap.Modal(document.getElementById('allUnitsModal'));
        modal.show();
        
        // Tüm üniteleri yükle
        await loadAllUnitsList();
        
        // Admin butonlarını göster
        showAdminButtons();
        
    } catch (error) {
        console.error('Modal açılırken hata:', error);
        showError('Modal açılırken bir hata oluştu.');
    }
}

// Tüm üniteleri listele
async function loadAllUnitsList() {
    try {
        dashboardDebug('Tüm üniteler listesi yükleniyor...');
        
        const allUnitsListElement = document.getElementById('allUnitsList');
        
        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const allUnits = [];

        // Tüm galerilerdeki üniteleri topla
        galleriesSnapshot.forEach(doc => {
            const gallery = doc.data();
            if (gallery.units && Array.isArray(gallery.units)) {
                allUnits.push(...gallery.units.map(unit => ({
                    ...unit,
                    galleryName: gallery.name,
                    galleryId: doc.id
                })));
            }
        });

        // Tüm üniteleri göster
        if (allUnits.length === 0) {
            allUnitsListElement.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    <strong>Bilgi:</strong> Henüz ünite bulunmuyor.
                </div>
            `;
        } else {
            // Durumlara göre grupla
            const workingUnits = allUnits.filter(unit => unit.status === 'Çalışıyor');
            const faultyUnits = allUnits.filter(unit => unit.status === 'Arızalı');
            const maintenanceUnits = allUnits.filter(unit => unit.status === 'Bakımda');

            allUnitsListElement.innerHTML = `
                <div class="stats-overview mb-4">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="stat-card working">
                                <div class="stat-icon">
                                    <i class="bi bi-check-circle-fill"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${workingUnits.length}</div>
                                    <div class="stat-label">Çalışan</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card faulty">
                                <div class="stat-icon">
                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${faultyUnits.length}</div>
                                    <div class="stat-label">Arızalı</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card maintenance">
                                <div class="stat-icon">
                                    <i class="bi bi-tools"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${maintenanceUnits.length}</div>
                                    <div class="stat-label">Bakımda</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card total">
                                <div class="stat-icon">
                                    <i class="bi bi-boxes"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${allUnits.length}</div>
                                    <div class="stat-label">Toplam</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="units-section">
                    <div class="section-header">
                        <h6 class="section-title">
                            <i class="bi bi-list-ul me-2"></i>
                            Tüm Üniteler
                        </h6>
                        <div class="section-actions">
                            <button class="btn btn-sm btn-outline-secondary" onclick="filterUnits('all')">
                                <i class="bi bi-funnel"></i> Tümü
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="filterUnits('working')">
                                <i class="bi bi-check-circle"></i> Çalışan
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="filterUnits('faulty')">
                                <i class="bi bi-exclamation-triangle"></i> Arızalı
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="filterUnits('maintenance')">
                                <i class="bi bi-tools"></i> Bakımda
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-hover units-table" id="allUnitsTable">
                            <thead>
                                <tr>
                                    <th>Galeri</th>
                                    <th>Ünite</th>
                                    <th>Durum</th>
                                    <th>Son Bakım</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allUnits.map(unit => {
                                    let statusBadge = '';
                                    let statusClass = '';
                                    switch(unit.status) {
                                        case 'Çalışıyor':
                                            statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Çalışıyor</span>';
                                            statusClass = 'working';
                                            break;
                                        case 'Arızalı':
                                            statusBadge = '<span class="badge bg-danger"><i class="bi bi-exclamation-triangle me-1"></i>Arızalı</span>';
                                            statusClass = 'faulty';
                                            break;
                                        case 'Bakımda':
                                            statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-tools me-1"></i>Bakımda</span>';
                                            statusClass = 'maintenance';
                                            break;
                                        default:
                                            statusBadge = '<span class="badge bg-secondary"><i class="bi bi-question-circle me-1"></i>Bilinmiyor</span>';
                                            statusClass = 'unknown';
                                    }
                                    
                                    return `
                                        <tr class="unit-row ${statusClass}" data-status="${unit.status.toLowerCase()}">
                                            <td>
                                                <div class="gallery-info">
                                                    <i class="bi bi-collection text-primary me-2"></i>
                                                    ${unit.galleryName}
                                                </div>
                                            </td>
                                            <td>
                                                <div class="unit-info">
                                                    <i class="bi bi-box text-secondary me-2"></i>
                                                    <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" class="text-decoration-none fw-medium">
                                                        ${unit.name}
                                                    </a>
                                                </div>
                                            </td>
                                            <td>${statusBadge}</td>
                                            <td>
                                                <div class="maintenance-info">
                                                    ${unit.maintenanceHistory && unit.maintenanceHistory.length > 0 
                                                        ? `<i class="bi bi-calendar-check text-success me-1"></i>${formatDate(unit.maintenanceHistory[unit.maintenanceHistory.length - 1].date)}`
                                                        : '<i class="bi bi-calendar-x text-muted me-1"></i>Bakım yapılmamış'}
                                                </div>
                                            </td>
                                            <td>
                                                <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" 
                                                   class="btn btn-sm btn-primary">
                                                    <i class="bi bi-eye"></i> Görüntüle
                                                </a>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="summary-footer">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                Toplam ${allUnits.length} ünite bulundu
                            </small>
                        </div>
                        <div class="col-md-6 text-end">
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>
                                Son güncelleme: ${new Date().toLocaleString('tr-TR')}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }

        dashboardDebug('Tüm üniteler listesi yüklendi:', allUnits.length);

    } catch (error) {
        console.error('Tüm üniteler listesi yüklenirken hata:', error);
        const allUnitsListElement = document.getElementById('allUnitsList');
        allUnitsListElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Tüm üniteler yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Galeriler modalını göster
async function showGalleriesModal() {
    try {
        dashboardDebug('Galeriler modalı açılıyor...');
        
        // Modal'ı aç
        const modal = new bootstrap.Modal(document.getElementById('galleriesModal'));
        modal.show();
        
        // Galerileri yükle
        await loadGalleriesList();
        
        // Admin butonlarını göster
        showAdminButtons();
        
    } catch (error) {
        console.error('Modal açılırken hata:', error);
        showError('Modal açılırken bir hata oluştu.');
    }
}

// Galerileri listele
async function loadGalleriesList() {
    try {
        dashboardDebug('Galeriler listesi yükleniyor...');
        
        const galleriesListElement = document.getElementById('galleriesList');
        
        // Tüm galerileri al
        const galleriesSnapshot = await window.db.collection('galleries').get();
        const galleries = [];

        galleriesSnapshot.forEach(doc => {
            const gallery = doc.data();
            galleries.push({
                id: doc.id,
                ...gallery
            });
        });

        // Galerileri göster
        if (galleries.length === 0) {
            galleriesListElement.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    <strong>Bilgi:</strong> Henüz galeri bulunmuyor.
                </div>
            `;
        } else {
            galleriesListElement.innerHTML = `
                <div class="row">
                    ${galleries.map(gallery => {
                        // Ünite durumlarını hesapla
                        const totalUnits = gallery.units ? gallery.units.length : 0;
                        const workingUnits = gallery.units ? gallery.units.filter(unit => unit.status === 'Çalışıyor').length : 0;
                        const faultyUnits = gallery.units ? gallery.units.filter(unit => unit.status === 'Arızalı').length : 0;
                        const maintenanceUnits = gallery.units ? gallery.units.filter(unit => unit.status === 'Bakımda').length : 0;

                        return `
                            <div class="col-md-6 col-lg-4 mb-4">
                                <div class="card gallery-card h-100" style="cursor: pointer;" onclick="showGalleryUnits('${gallery.id}')">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-start mb-3">
                                            <h6 class="card-title text-primary mb-0">
                                                <i class="bi bi-collection me-2"></i>
                                                ${gallery.name}
                                            </h6>
                                            <div class="btn-group admin-only" style="display: none;">
                                                <button class="btn btn-sm btn-outline-warning" onclick="event.stopPropagation(); showEditGalleryModal('${gallery.id}', '${gallery.name}', '${gallery.description || ''}')" title="Galeri Adını Değiştir">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteGallery('${gallery.id}', '${gallery.name}')" title="Galeri Sil">
                                                    <i class="bi bi-trash3"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div style="display: table; width: 100%; table-layout: fixed; height: 60px; margin-bottom: 1rem;">
                                            <div style="display: table-cell; vertical-align: middle; text-align: center; height: 60px;">
                                                <div class="text-success" style="display: inline-block; vertical-align: middle;">
                                                    <div style="font-size: 1.4rem; font-weight: bold; line-height: 1.2; margin-bottom: 2px;">${workingUnits}</div>
                                                    <div style="font-size: 0.75rem; line-height: 1;">Çalışan</div>
                                                </div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: middle; text-align: center; height: 60px;">
                                                <div class="text-danger" style="display: inline-block; vertical-align: middle;">
                                                    <div style="font-size: 1.4rem; font-weight: bold; line-height: 1.2; margin-bottom: 2px;">${faultyUnits}</div>
                                                    <div style="font-size: 0.75rem; line-height: 1;">Arızalı</div>
                                                </div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: middle; text-align: center; height: 60px;">
                                                <div class="text-warning" style="display: inline-block; vertical-align: middle;">
                                                    <div style="font-size: 1.4rem; font-weight: bold; line-height: 1.2; margin-bottom: 2px;">${maintenanceUnits}</div>
                                                    <div style="font-size: 0.75rem; line-height: 1;">Bakımda</div>
                                                </div>
                                            </div>
                                            <div style="display: table-cell; vertical-align: middle; text-align: center; height: 60px;">
                                                <div class="text-info" style="display: inline-block; vertical-align: middle;">
                                                    <div style="font-size: 1.4rem; font-weight: bold; line-height: 1.2; margin-bottom: 2px;">${totalUnits}</div>
                                                    <div style="font-size: 0.75rem; line-height: 1;">Toplam</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="d-grid">
                                            <button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation(); showGalleryUnits('${gallery.id}')">
                                                <i class="bi bi-eye"></i> Üniteleri Görüntüle
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i>
                        Toplam ${galleries.length} galeri bulundu.
                    </small>
                </div>
            `;
        }

        dashboardDebug('Galeriler listesi yüklendi:', galleries.length);
        
        // Admin butonlarını göster
        showAdminButtons();

    } catch (error) {
        console.error('Galeriler listesi yüklenirken hata:', error);
        const galleriesListElement = document.getElementById('galleriesList');
        galleriesListElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Galeriler yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Galeri ünitelerini göster
async function showGalleryUnits(galleryId) {
    try {
        dashboardDebug('Galeri üniteleri modalı açılıyor...', galleryId);
        
        // Galeriler modalını kapat
        const galleriesModal = bootstrap.Modal.getInstance(document.getElementById('galleriesModal'));
        if (galleriesModal) {
            galleriesModal.hide();
        }
        
        // Galeri üniteleri modalını aç
        const galleryUnitsModal = new bootstrap.Modal(document.getElementById('galleryUnitsModal'));
        galleryUnitsModal.show();
        
        // Galeri ünitelerini yükle
        await loadGalleryUnitsList(galleryId);
        
    } catch (error) {
        console.error('Galeri üniteleri modalı açılırken hata:', error);
        showError('Galeri üniteleri yüklenirken bir hata oluştu.');
    }
}

// Galeri ünitelerini listele
async function loadGalleryUnitsList(galleryId) {
    try {
        dashboardDebug('Galeri üniteleri listesi yükleniyor...', galleryId);
        
        const galleryUnitsListElement = document.getElementById('galleryUnitsList');
        const galleryUnitsTitleElement = document.getElementById('galleryUnitsTitle');
        
        // Galeriyi al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!galleryDoc.exists) {
            galleryUnitsListElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Galeri bulunamadı!
                </div>
            `;
            return;
        }
        
        const gallery = galleryDoc.data();
        galleryUnitsTitleElement.textContent = `${gallery.name} - Üniteler`;
        
        // Galeri ID'sini sakla
        document.getElementById('galleryUnitsModal').setAttribute('data-gallery-id', galleryId);
        
        // Üniteleri kontrol et
        if (!gallery.units || gallery.units.length === 0) {
            galleryUnitsListElement.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    <strong>Bilgi:</strong> Bu galeride henüz ünite bulunmuyor.
                </div>
            `;
            return;
        }
        
        // Ünite durumlarını hesapla
        const totalUnits = gallery.units.length;
        const workingUnits = gallery.units.filter(unit => unit.status === 'Çalışıyor').length;
        const faultyUnits = gallery.units.filter(unit => unit.status === 'Arızalı').length;
        const maintenanceUnits = gallery.units.filter(unit => unit.status === 'Bakımda').length;
        
        galleryUnitsListElement.innerHTML = `
            <div class="gallery-overview mb-4">
                <div class="row g-3">
                    <div class="col-md-3">
                        <div class="stat-card working">
                            <div class="stat-icon">
                                <i class="bi bi-check-circle-fill"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${workingUnits}</div>
                                <div class="stat-label">Çalışan</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card faulty">
                            <div class="stat-icon">
                                <i class="bi bi-exclamation-triangle-fill"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${faultyUnits}</div>
                                <div class="stat-label">Arızalı</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card maintenance">
                            <div class="stat-icon">
                                <i class="bi bi-tools"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${maintenanceUnits}</div>
                                <div class="stat-label">Bakımda</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card total">
                            <div class="stat-icon">
                                <i class="bi bi-boxes"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${totalUnits}</div>
                                <div class="stat-label">Toplam</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="units-section">
                <div class="section-header">
                    <h6 class="section-title">
                        <i class="bi bi-list-ul me-2"></i>
                        Üniteler
                    </h6>
                    <div class="section-actions">
                        <div class="btn-group me-2" role="group">
                            <button class="btn btn-sm btn-outline-secondary" onclick="filterGalleryUnits('all')">
                                <i class="bi bi-funnel"></i> Tümü
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="filterGalleryUnits('working')">
                                <i class="bi bi-check-circle"></i> Çalışan
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="filterGalleryUnits('faulty')">
                                <i class="bi bi-exclamation-triangle"></i> Arızalı
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="filterGalleryUnits('maintenance')">
                                <i class="bi bi-tools"></i> Bakımda
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover units-table" id="galleryUnitsTable">
                        <thead>
                            <tr>
                                <th>Ünite</th>
                                <th>Durum</th>
                                <th>Son Bakım</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gallery.units.map(unit => {
                                let statusBadge = '';
                                let statusClass = '';
                                switch(unit.status) {
                                    case 'Çalışıyor':
                                        statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Çalışıyor</span>';
                                        statusClass = 'working';
                                        break;
                                    case 'Arızalı':
                                        statusBadge = '<span class="badge bg-danger"><i class="bi bi-exclamation-triangle me-1"></i>Arızalı</span>';
                                        statusClass = 'faulty';
                                        break;
                                    case 'Bakımda':
                                        statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-tools me-1"></i>Bakımda</span>';
                                        statusClass = 'maintenance';
                                        break;
                                    default:
                                        statusBadge = '<span class="badge bg-secondary"><i class="bi bi-question-circle me-1"></i>Bilinmiyor</span>';
                                        statusClass = 'unknown';
                                }
                                
                                return `
                                    <tr class="unit-row ${statusClass}" data-status="${unit.status.toLowerCase()}" data-gallery-id="${galleryId}" data-unit-id="${unit.id}">
                                        <td>
                                            <div class="unit-info">
                                                <i class="bi bi-box text-secondary me-2"></i>
                                                <span class="fw-medium">${unit.name}</span>
                                                ${unit.description ? `<br><small class="text-muted">${unit.description}</small>` : ''}
                                            </div>
                                        </td>
                                        <td>${statusBadge}</td>
                                        <td>
                                            <div class="maintenance-info">
                                                ${unit.maintenanceHistory && unit.maintenanceHistory.length > 0 
                                                    ? `<i class="bi bi-calendar-check text-success me-1"></i>${formatDate(unit.maintenanceHistory[unit.maintenanceHistory.length - 1].date)}`
                                                    : '<i class="bi bi-calendar-x text-muted me-1"></i>Bakım yapılmamış'}
                                            </div>
                                        </td>
                                        <td>
                                            <div class="btn-group" role="group">
                                                <button class="btn btn-sm btn-primary" onclick="openUnitDetails('${galleryId}', '${unit.id}')">
                                                    <i class="bi bi-eye"></i> Görüntüle
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger admin-only" onclick="deleteUnit('${galleryId}', '${unit.id}', '${unit.name}')" title="Ünite Sil" style="display: none;">
                                                    <i class="bi bi-trash3"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="summary-footer">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <small class="text-muted">
                            <i class="bi bi-info-circle me-1"></i>
                            ${gallery.name} galerisinde toplam ${totalUnits} ünite bulundu
                        </small>
                    </div>
                    <div class="col-md-6 text-end">
                        <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>
                            Son güncelleme: ${new Date().toLocaleString('tr-TR')}
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        dashboardDebug('Galeri üniteleri listesi yüklendi:', gallery.units.length);
        
        // Admin butonlarını göster
        showAdminButtons();
        
    } catch (error) {
        console.error('Galeri üniteleri listesi yüklenirken hata:', error);
        const galleryUnitsListElement = document.getElementById('galleryUnitsList');
        galleryUnitsListElement.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Galeri üniteleri yüklenirken bir hata oluştu: ${error.message}
            </div>
        `;
    }
}

// Galeri üniteleri modalından ünite ekleme modalını göster
function showAddUnitModalFromGallery() {
    // Galeri ID'sini al
    const galleryId = document.getElementById('galleryUnitsModal').getAttribute('data-gallery-id');
    
    if (!galleryId) {
        alert('Galeri ID bulunamadı!');
        return;
    }
    
    // Galeri üniteleri modalını kapat
    const galleryUnitsModal = bootstrap.Modal.getInstance(document.getElementById('galleryUnitsModal'));
    if (galleryUnitsModal) {
        galleryUnitsModal.hide();
    }
    
    // Ünite ekleme modalını aç
    const addUnitModal = new bootstrap.Modal(document.getElementById('addUnitModal'));
    addUnitModal.show();
    
    // Galeri ID'sini sakla
    document.getElementById('addUnitModal').setAttribute('data-gallery-id', galleryId);
    
    // Modal'ın nereden açıldığını işaretle
    document.getElementById('addUnitModal').setAttribute('data-opened-from', 'galleryUnits');
    
    // Formu temizle
    const form = document.getElementById('addUnitForm');
    if (form) form.reset();
    
    // Dosya önizlemelerini temizle
    const imagePreview = document.getElementById('selectedImagesPreview');
    const documentPreview = document.getElementById('selectedDocumentsPreview');
    if (imagePreview) imagePreview.innerHTML = '';
    if (documentPreview) documentPreview.innerHTML = '';
    
    // Dosya seçimi event listener'larını ekle
    setupFilePreviewListeners();
}

// Ünite ekleme modalını göster
function showAddUnitModal(galleryId) {
    // Galeriler modalını kapat
    const galleriesModal = bootstrap.Modal.getInstance(document.getElementById('galleriesModal'));
    if (galleriesModal) {
        galleriesModal.hide();
    }
    
    // Galeri üniteler modalını kapat (eğer açıksa)
    const galleryUnitsModal = bootstrap.Modal.getInstance(document.getElementById('galleryUnitsModal'));
    if (galleryUnitsModal) {
        galleryUnitsModal.hide();
    }
    

    
    // Ünite ekleme modalını aç
    const addUnitModal = new bootstrap.Modal(document.getElementById('addUnitModal'));
    addUnitModal.show();
    
    // Galeri ID'sini sakla
    document.getElementById('addUnitModal').setAttribute('data-gallery-id', galleryId);
    
    // Modal'ın nereden açıldığını işaretle
    document.getElementById('addUnitModal').setAttribute('data-opened-from', 'gallery');
    
    // Formu temizle
    const form = document.getElementById('addUnitForm');
    if (form) form.reset();
    
    // Dosya önizlemelerini temizle
    const imagePreview = document.getElementById('selectedImagesPreview');
    const documentPreview = document.getElementById('selectedDocumentsPreview');
    if (imagePreview) imagePreview.innerHTML = '';
    if (documentPreview) documentPreview.innerHTML = '';
    
    // Dosya seçimi event listener'larını ekle
    setupFilePreviewListeners();
}

// Dosya önizleme event listener'larını kur
// Dosyayı Base64 formatına çevir
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

function setupFilePreviewListeners() {
    // Görsel dosyaları önizleme
    const imageInput = document.getElementById('unitImages');
    const imagePreview = document.getElementById('selectedImagesPreview');
    
    if (!imageInput || !imagePreview) {
        console.warn('Görsel input elemanları bulunamadı');
        return;
    }
    
    imageInput.addEventListener('change', function(e) {
        imagePreview.innerHTML = '';
        const files = Array.from(e.target.files);
        
        if (files.length > 0) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'row g-2 mt-1';
            
            files.forEach((file, index) => {
                // Dosya boyutu kontrolü (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert(`${file.name} dosyası çok büyük! Maksimum 5MB olmalıdır.`);
                    return;
                }
                
                // Dosya tipini kontrol et
                if (!file.type.startsWith('image/')) {
                    alert(`${file.name} geçerli bir görsel dosyası değil!`);
                    return;
                }
                
                const col = document.createElement('div');
                col.className = 'col-md-3';
                
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="card-body p-2 text-center">
                        <i class="bi bi-image text-primary" style="font-size: 2rem;"></i>
                        <div class="small text-truncate mt-1" title="${file.name}">${file.name}</div>
                        <div class="small text-muted">${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                `;
                
                col.appendChild(card);
                previewContainer.appendChild(col);
            });
            
            imagePreview.appendChild(previewContainer);
        }
    });
    
    // Doküman dosyaları önizleme
    const documentInput = document.getElementById('unitDocuments');
    const documentPreview = document.getElementById('selectedDocumentsPreview');
    
    if (!documentInput || !documentPreview) {
        console.warn('Doküman input elemanları bulunamadı');
        return;
    }
    
    documentInput.addEventListener('change', function(e) {
        documentPreview.innerHTML = '';
        const files = Array.from(e.target.files);
        
        if (files.length > 0) {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'mt-2';
            
            files.forEach((file, index) => {
                // Dosya boyutu kontrolü (10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert(`${file.name} dosyası çok büyük! Maksimum 10MB olmalıdır.`);
                    return;
                }
                
                // Dosya tipini kontrol et
                const allowedTypes = ['.pdf', '.doc', '.docx'];
                const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
                if (!allowedTypes.includes(fileExtension)) {
                    alert(`${file.name} geçerli bir doküman dosyası değil! Sadece PDF, DOC, DOCX dosyaları kabul edilir.`);
                    return;
                }
                
                const docCard = document.createElement('div');
                docCard.className = 'alert alert-info py-2 mb-2';
                docCard.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-file-text text-info me-2"></i>
                        <div class="flex-grow-1">
                            <div class="small fw-medium">${file.name}</div>
                            <div class="small text-muted">${(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                    </div>
                `;
                
                previewContainer.appendChild(docCard);
            });
            
            documentPreview.appendChild(previewContainer);
        }
    });
}

// Yeni ünite kaydet
async function saveNewUnit() {
    try {
        // Form verilerini güvenli şekilde al
        const unitNameEl = document.getElementById('unitName');
        const unitDescriptionEl = document.getElementById('unitDescription');
        const unitStatusEl = document.getElementById('unitStatus');
        const unitLocationEl = document.getElementById('unitLocation');
        const unitTechnicalDetailsEl = document.getElementById('unitTechnicalDetails');
        
        if (!unitNameEl || !unitStatusEl) {
            throw new Error('Form elemanları bulunamadı!');
        }
        
        const unitName = unitNameEl.value.trim();
        const unitDescription = unitDescriptionEl ? unitDescriptionEl.value.trim() : '';
        const unitStatus = unitStatusEl.value;
        const unitLocation = unitLocationEl ? unitLocationEl.value.trim() : '';
        const unitTechnicalDetails = unitTechnicalDetailsEl ? unitTechnicalDetailsEl.value.trim() : '';
        
        // Dosya inputlarını güvenli şekilde al
        const imageInput = document.getElementById('unitImages');
        const documentInput = document.getElementById('unitDocuments');
        const imageFiles = imageInput ? imageInput.files : [];
        const documentFiles = documentInput ? documentInput.files : [];
        
        // Modal'ın nereden açıldığını kontrol et
        const openedFrom = document.getElementById('addUnitModal').getAttribute('data-opened-from');
        
        // Galeri ID'sini al
        const galleryId = document.getElementById('addUnitModal').getAttribute('data-gallery-id');
        
        // Validasyon
        if (!unitName || !unitStatus || !galleryId) {
            alert('Lütfen tüm zorunlu alanları doldurun!');
            return;
        }
        
        // Buton durumunu değiştir
        const saveButton = document.querySelector('#addUnitModal .btn-success');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Kaydediliyor...';
        saveButton.disabled = true;
        
        // Galeri dokümanını al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!galleryDoc.exists) {
            throw new Error('Galeri bulunamadı!');
        }
        
        const galleryData = galleryDoc.data();
        const existingUnits = galleryData.units || [];
        
        // Otomatik ünite ID oluştur
        const unitId = existingUnits.length > 0 
            ? Math.max(...existingUnits.map(unit => unit.id || 0)) + 1 
            : 1;
        
        // Dosyaları yükle
        const uploadedImages = [];
        const uploadedDocuments = [];
        
        // Dosyaları Base64 formatında Firestore'a kaydet
        console.log('Dosyalar Base64 formatında işleniyor...');
        
        // Görselleri işle
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            
            try {
                // Dosya boyutunu kontrol et (Firestore limiti: ~700KB Base64 için)
                const maxSizeForBase64 = 500 * 1024; // 500KB
                
                if (file.size > maxSizeForBase64) {
                    console.warn(`⚠️ ${file.name} çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB), sadece isim kaydediliyor`);
                    
                    uploadedImages.push({
                        name: file.name,
                        base64Data: '',
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        status: 'too_large',
                        error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB). Firestore limiti: 500KB`
                    });
                    continue;
                }
                
                // Dosyayı Base64'e çevir
                const base64Data = await convertFileToBase64(file);
                
                // Base64 boyutunu kontrol et
                const base64Size = base64Data.length;
                const maxBase64Size = 700 * 1024; // 700KB
                
                if (base64Size > maxBase64Size) {
                    console.warn(`⚠️ ${file.name} Base64 formatında çok büyük (${(base64Size / 1024).toFixed(0)}KB), sadece isim kaydediliyor`);
                    
                    uploadedImages.push({
                        name: file.name,
                        base64Data: '',
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        status: 'too_large',
                        error: `Base64 formatında çok büyük (${(base64Size / 1024).toFixed(0)}KB)`
                    });
                    continue;
                }
                
                uploadedImages.push({
                    name: file.name,
                    base64Data: base64Data,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    status: 'processed'
                });
                console.log(`✅ ${file.name} Base64 formatında hazırlandı (${(base64Size / 1024).toFixed(0)}KB)`);
            } catch (error) {
                console.error(`❌ ${file.name} işleme hatası:`, error);
                
                uploadedImages.push({
                    name: file.name,
                    base64Data: '',
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        // Dokümanları işle
        for (let i = 0; i < documentFiles.length; i++) {
            const file = documentFiles[i];
            
            try {
                // Dosya boyutunu kontrol et (Firestore limiti: ~700KB Base64 için)
                const maxSizeForBase64 = 500 * 1024; // 500KB
                
                if (file.size > maxSizeForBase64) {
                    console.warn(`⚠️ ${file.name} çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB), sadece isim kaydediliyor`);
                    
                    uploadedDocuments.push({
                        name: file.name,
                        base64Data: '',
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        status: 'too_large',
                        error: `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(2)}MB). Firestore limiti: 500KB`
                    });
                    continue;
                }
                
                // Dosyayı Base64'e çevir
                const base64Data = await convertFileToBase64(file);
                
                // Base64 boyutunu kontrol et
                const base64Size = base64Data.length;
                const maxBase64Size = 700 * 1024; // 700KB
                
                if (base64Size > maxBase64Size) {
                    console.warn(`⚠️ ${file.name} Base64 formatında çok büyük (${(base64Size / 1024).toFixed(0)}KB), sadece isim kaydediliyor`);
                    
                    uploadedDocuments.push({
                        name: file.name,
                        base64Data: '',
                        size: file.size,
                        type: file.type,
                        uploadedAt: new Date().toISOString(),
                        status: 'too_large',
                        error: `Base64 formatında çok büyük (${(base64Size / 1024).toFixed(0)}KB)`
                    });
                    continue;
                }
                
                uploadedDocuments.push({
                    name: file.name,
                    base64Data: base64Data,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    status: 'processed'
                });
                console.log(`✅ ${file.name} Base64 formatında hazırlandı (${(base64Size / 1024).toFixed(0)}KB)`);
            } catch (error) {
                console.error(`❌ ${file.name} işleme hatası:`, error);
                
                uploadedDocuments.push({
                    name: file.name,
                    base64Data: '',
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        // Yeni ünite objesi oluştur
        const newUnit = {
            id: unitId,
            name: unitName,
            description: unitDescription || '',
            status: unitStatus,
            location: unitLocation || '',
            technicalDetails: unitTechnicalDetails || '',
            images: uploadedImages,
            documents: uploadedDocuments,
            maintenanceHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Üniteyi galeri dokümanına ekle
        const updatedUnits = [...existingUnits, newUnit];
        
        await window.db.collection('galleries').doc(galleryId).update({
            units: updatedUnits,
            updatedAt: new Date().toISOString()
        });
        
        // Başarı mesajı ve dosya durumu
        const successfulImages = uploadedImages.filter(img => img.status === 'processed').length;
        const failedImages = uploadedImages.filter(img => img.status === 'failed').length;
        const tooLargeImages = uploadedImages.filter(img => img.status === 'too_large').length;
        const successfulDocs = uploadedDocuments.filter(doc => doc.status === 'processed').length;
        const failedDocs = uploadedDocuments.filter(doc => doc.status === 'failed').length;
        const tooLargeDocs = uploadedDocuments.filter(doc => doc.status === 'too_large').length;
        
        let message = 'Ünite başarıyla eklendi!';
        if (failedImages > 0 || failedDocs > 0 || tooLargeImages > 0 || tooLargeDocs > 0) {
            message += `\n\nDosya işleme durumu:`;
            if (successfulImages > 0) message += `\n✅ ${successfulImages} görsel işlendi`;
            if (failedImages > 0) message += `\n❌ ${failedImages} görsel işlenemedi`;
            if (tooLargeImages > 0) message += `\n⚠️ ${tooLargeImages} görsel çok büyük (>500KB)`;
            if (successfulDocs > 0) message += `\n✅ ${successfulDocs} doküman işlendi`;
            if (failedDocs > 0) message += `\n❌ ${failedDocs} doküman işlenemedi`;
            if (tooLargeDocs > 0) message += `\n⚠️ ${tooLargeDocs} doküman çok büyük (>500KB)`;
            message += `\n\n📝 Büyük dosyalar sadece isim olarak kaydedildi`;
            message += `\n💡 Önerilen dosya boyutu: Max 500KB`;
        }
        
        alert(message);
        
        // Modal'ı kapat
        const addUnitModal = bootstrap.Modal.getInstance(document.getElementById('addUnitModal'));
        addUnitModal.hide();
        
        // Nereden açıldığına göre farklı modal aç
        if (openedFrom === 'galleryUnits') {
            // Galeri üniteler listesini yenile
            await loadGalleryUnitsList(galleryId);
            
            // Galeri üniteler modalını tekrar aç
            const galleryUnitsModal = new bootstrap.Modal(document.getElementById('galleryUnitsModal'));
            galleryUnitsModal.show();
        } else {
            // Galeriler listesini yenile
            await loadGalleriesList();
            
            // Galeriler modalını tekrar aç
            const galleriesModal = new bootstrap.Modal(document.getElementById('galleriesModal'));
            galleriesModal.show();
        }
        
        // Dashboard'u yenile
        await loadDashboard();
        
    } catch (error) {
        console.error('Ünite eklenirken hata:', error);
        alert('Ünite eklenirken bir hata oluştu: ' + error.message);
    } finally {
        // Buton durumunu geri al
        const saveButton = document.querySelector('#addUnitModal .btn-success');
        if (saveButton) {
            saveButton.innerHTML = '<i class="bi bi-check-circle"></i> Ünite Ekle';
            saveButton.disabled = false;
        }
    }
}

// Galeri ünitelerini filtrele
function filterGalleryUnits(status) {
    const rows = document.querySelectorAll('#galleryUnitsTable .unit-row');
    const buttons = document.querySelectorAll('#galleryUnitsModal .section-actions .btn');
    
    // Buton stillerini sıfırla
    buttons.forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-secondary', 'btn-outline-success', 'btn-outline-danger', 'btn-outline-warning');
    });
    
    // Tıklanan butonu aktif yap
    const activeButton = event.target.closest('.btn');
    if (activeButton) {
        activeButton.classList.remove('btn-outline-secondary', 'btn-outline-success', 'btn-outline-danger', 'btn-outline-warning');
        activeButton.classList.add('btn-primary');
    }
    
    // Satırları filtrele
    rows.forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
            row.classList.add('fade-in');
        } else {
            row.style.display = 'none';
            row.classList.remove('fade-in');
        }
    });
    
    // Filtreleme animasyonu
    setTimeout(() => {
        const visibleRows = document.querySelectorAll('#galleryUnitsTable .unit-row:not([style*="display: none"])');
        visibleRows.forEach((row, index) => {
            row.style.animationDelay = `${index * 50}ms`;
        });
    }, 100);
}

// Ünite silme fonksiyonu
async function deleteUnit(galleryId, unitId, unitName) {
    try {
        // Onay al
        const confirmDelete = confirm(`"${unitName}" ünitesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve üniteye ait tüm bakım geçmişi de silinecektir.`);
        
        if (!confirmDelete) {
            return;
        }
        
        // Loading göster
        const deleteButton = event.target.closest('button');
        const originalContent = deleteButton.innerHTML;
        deleteButton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        deleteButton.disabled = true;
        
        // Galeri dokümanını al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!galleryDoc.exists) {
            throw new Error('Galeri bulunamadı!');
        }
        
        const gallery = galleryDoc.data();
        
        // Üniteyi listeden çıkar
        const updatedUnits = gallery.units.filter(unit => String(unit.id) !== String(unitId));
        
        // Galeriyi güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: updatedUnits,
            updatedAt: new Date().toISOString()
        });
        
        // Başarı mesajı
        alert(`"${unitName}" ünitesi başarıyla silindi.`);
        
        // Galeri üniteleri listesini yenile
        await loadGalleryUnitsList(galleryId);
        
        // Dashboard'u yenile
        await loadDashboard();
        
    } catch (error) {
        console.error('Ünite silinirken hata:', error);
        alert('Ünite silinirken bir hata oluştu: ' + error.message);
        
        // Buton durumunu geri al
        const deleteButton = event.target.closest('button');
        if (deleteButton) {
            deleteButton.innerHTML = '<i class="bi bi-trash3"></i>';
            deleteButton.disabled = false;
        }
    }
}

// Ünite detaylarını aç
function openUnitDetails(galleryId, unitId) {
    // Modal'ı kapat
    const modal = bootstrap.Modal.getInstance(document.getElementById('galleryUnitsModal'));
    if (modal) {
        modal.hide();
    }
    
    // Ünite detay sayfasına git
    window.location.href = `unit-details.html?galleryId=${galleryId}&unitId=${unitId}`;
}

// Üniteleri filtrele
function filterUnits(status) {
    const rows = document.querySelectorAll('#allUnitsTable .unit-row');
    const buttons = document.querySelectorAll('.section-actions .btn');
    
    // Buton stillerini sıfırla
    buttons.forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-secondary', 'btn-outline-success', 'btn-outline-danger', 'btn-outline-warning');
    });
    
    // Tıklanan butonu aktif yap
    const activeButton = event.target.closest('.btn');
    if (activeButton) {
        activeButton.classList.remove('btn-outline-secondary', 'btn-outline-success', 'btn-outline-danger', 'btn-outline-warning');
        activeButton.classList.add('btn-primary');
    }
    
    // Satırları filtrele
    rows.forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
            row.classList.add('fade-in');
        } else {
            row.style.display = 'none';
            row.classList.remove('fade-in');
        }
    });
    
    // Filtreleme animasyonu
    setTimeout(() => {
        const visibleRows = document.querySelectorAll('#allUnitsTable .unit-row:not([style*="display: none"])');
        visibleRows.forEach((row, index) => {
            row.style.animationDelay = `${index * 50}ms`;
        });
    }, 100);
}

// Çıkış yap
async function logout() {
    try {
        await firebase.auth().signOut();
        sessionStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Çıkış yapılırken hata:', error);
        showError('Çıkış yapılırken bir hata oluştu.');
    }
}

// Admin butonlarını göster (geçici çözüm)
function showAdminButtons() {
    const adminButtons = document.querySelectorAll('.admin-only');
    adminButtons.forEach(button => {
        button.style.display = 'block';
    });
}



// Galeri ekleme modalını göster
function showAddGalleryModal() {
    // Galeriler modalını kapat
    const galleriesModal = bootstrap.Modal.getInstance(document.getElementById('galleriesModal'));
    if (galleriesModal) {
        galleriesModal.hide();
    }
    
    // Galeri ekleme modalını aç
    const addGalleryModal = new bootstrap.Modal(document.getElementById('addGalleryModal'));
    addGalleryModal.show();
    
    // Formu temizle
    document.getElementById('addGalleryForm').reset();
}

// Yeni galeri kaydet
async function saveNewGallery() {
    try {
        // Form verilerini al
        const galleryName = document.getElementById('galleryName').value.trim();
        const galleryDescription = document.getElementById('galleryDescription').value.trim();
        const galleryLocation = document.getElementById('galleryLocation').value.trim();
        const galleryCapacity = parseInt(document.getElementById('galleryCapacity').value) || 0;
        
        // Validasyon
        if (!galleryName) {
            alert('Lütfen galeri adını girin!');
            return;
        }
        
        // Buton durumunu değiştir
        const saveButton = document.querySelector('#addGalleryModal .btn-success');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Kaydediliyor...';
        saveButton.disabled = true;
        
        // Yeni galeri objesi oluştur
        const newGallery = {
            name: galleryName,
            description: galleryDescription || '',
            location: galleryLocation || '',
            capacity: galleryCapacity,
            units: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Firebase'e ekle
        await window.db.collection('galleries').add(newGallery);
        
        // Başarı mesajı
        alert('Galeri başarıyla eklendi!');
        
        // Modal'ı kapat
        const addGalleryModal = bootstrap.Modal.getInstance(document.getElementById('addGalleryModal'));
        addGalleryModal.hide();
        
        // Galeriler listesini yenile
        await loadGalleriesList();
        
        // Galeriler modalını tekrar aç
        const galleriesModal = new bootstrap.Modal(document.getElementById('galleriesModal'));
        galleriesModal.show();
        
        // Dashboard'u yenile
        await loadDashboard();
        
    } catch (error) {
        console.error('Galeri eklenirken hata:', error);
        alert('Galeri eklenirken bir hata oluştu: ' + error.message);
    } finally {
        // Buton durumunu geri al
        const saveButton = document.querySelector('#addGalleryModal .btn-success');
        if (saveButton) {
            saveButton.innerHTML = '<i class="bi bi-check-circle"></i> Galeri Ekle';
            saveButton.disabled = false;
        }
    }
}

// Galeri düzenleme modalını göster
// Galeri silme fonksiyonu
async function deleteGallery(galleryId, galleryName) {
    try {
        // Onay al
        const confirmDelete = confirm(`"${galleryName}" galerisini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve galeri içindeki tüm üniteler de silinecektir.`);
        
        if (!confirmDelete) {
            return;
        }
        
        // Loading göster
        const deleteButton = event.target.closest('button');
        const originalContent = deleteButton.innerHTML;
        deleteButton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        deleteButton.disabled = true;
        
        // Galeriyi sil
        await window.db.collection('galleries').doc(galleryId).delete();
        
        // Başarı mesajı
        alert(`"${galleryName}" galerisi başarıyla silindi.`);
        
        // Galeriler listesini yenile
        await loadGalleriesList();
        
        // Dashboard'u yenile
        await loadDashboard();
        
    } catch (error) {
        console.error('Galeri silinirken hata:', error);
        alert('Galeri silinirken bir hata oluştu: ' + error.message);
        
        // Buton durumunu geri al
        const deleteButton = event.target.closest('button');
        if (deleteButton) {
            deleteButton.innerHTML = '<i class="bi bi-trash3"></i>';
            deleteButton.disabled = false;
        }
    }
}

function showEditGalleryModal(galleryId, galleryName, galleryDescription) {
    // Galeriler modalını kapat
    const galleriesModal = bootstrap.Modal.getInstance(document.getElementById('galleriesModal'));
    if (galleriesModal) {
        galleriesModal.hide();
    }
    
    // Galeri düzenleme modalını aç
    const editGalleryModal = new bootstrap.Modal(document.getElementById('editGalleryModal'));
    editGalleryModal.show();
    
    // Galeri ID'sini sakla
    document.getElementById('editGalleryModal').setAttribute('data-gallery-id', galleryId);
    
    // Form alanlarını doldur
    document.getElementById('editGalleryName').value = galleryName;
    document.getElementById('editGalleryDescription').value = galleryDescription;
}

// Galeri değişikliklerini kaydet
async function saveGalleryChanges() {
    try {
        // Form verilerini al
        const galleryName = document.getElementById('editGalleryName').value.trim();
        const galleryDescription = document.getElementById('editGalleryDescription').value.trim();
        
        // Galeri ID'sini al
        const galleryId = document.getElementById('editGalleryModal').getAttribute('data-gallery-id');
        
        // Validasyon
        if (!galleryName || !galleryId) {
            alert('Lütfen galeri adını girin!');
            return;
        }
        
        // Buton durumunu değiştir
        const saveButton = document.querySelector('#editGalleryModal .btn-warning');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Kaydediliyor...';
        saveButton.disabled = true;
        
        // Firebase'de güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            name: galleryName,
            description: galleryDescription,
            updatedAt: new Date().toISOString()
        });
        
        // Başarı mesajı
        alert('Galeri bilgileri başarıyla güncellendi!');
        
        // Modal'ı kapat
        const editGalleryModal = bootstrap.Modal.getInstance(document.getElementById('editGalleryModal'));
        editGalleryModal.hide();
        
        // Galeriler listesini yenile
        await loadGalleriesList();
        
        // Galeriler modalını tekrar aç
        const galleriesModal = new bootstrap.Modal(document.getElementById('galleriesModal'));
        galleriesModal.show();
        
        // Dashboard'u yenile
        await loadDashboard();
        
    } catch (error) {
        console.error('Galeri güncellenirken hata:', error);
        alert('Galeri güncellenirken bir hata oluştu: ' + error.message);
    } finally {
        // Buton durumunu geri al
        const saveButton = document.querySelector('#editGalleryModal .btn-warning');
        if (saveButton) {
            saveButton.innerHTML = '<i class="bi bi-check-circle"></i> Kaydet';
            saveButton.disabled = false;
        }
    }
}

// Galeri üniteler modalından galeriler modalına geri dön
function goBackToGalleries() {
    // Galeri üniteler modalını kapat
    const galleryUnitsModal = bootstrap.Modal.getInstance(document.getElementById('galleryUnitsModal'));
    if (galleryUnitsModal) {
        galleryUnitsModal.hide();
    }
    
    // Galeriler modalını aç
    setTimeout(() => {
        const galleriesModal = new bootstrap.Modal(document.getElementById('galleriesModal'));
        galleriesModal.show();
    }, 300); // Modal kapanma animasyonu için kısa bekleme
}