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
                        <a href="galleries.html?showUnits=${record.galleryId}" class="text-decoration-none">
                            ${record.galleryName}
                        </a>
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
                                        <a href="galleries.html?showUnits=${unit.galleryId}" class="text-decoration-none">
                                            ${unit.galleryName}
                                        </a>
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
                                        <a href="galleries.html?showUnits=${unit.galleryId}" class="text-decoration-none">
                                            ${unit.galleryName}
                                        </a>
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
                                                    <a href="galleries.html?showUnits=${unit.galleryId}" class="text-decoration-none">
                                                        ${unit.galleryName}
                                                    </a>
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
                                        <h6 class="card-title text-primary mb-3">
                                            <i class="bi bi-collection me-2"></i>
                                            ${gallery.name}
                                        </h6>
                                        <div class="row text-center mb-3">
                                            <div class="col-3">
                                                <div class="text-success">
                                                    <strong>${workingUnits}</strong>
                                                    <br><small>Çalışan</small>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="text-danger">
                                                    <strong>${faultyUnits}</strong>
                                                    <br><small>Arızalı</small>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="text-warning">
                                                    <strong>${maintenanceUnits}</strong>
                                                    <br><small>Bakımda</small>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="text-info">
                                                    <strong>${totalUnits}</strong>
                                                    <br><small>Toplam</small>
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
                                            <button class="btn btn-sm btn-primary" onclick="openUnitDetails('${galleryId}', '${unit.id}')">
                                                <i class="bi bi-eye"></i> Görüntüle
                                            </button>
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