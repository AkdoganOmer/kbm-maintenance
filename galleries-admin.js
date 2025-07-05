// Firebase referansı
let unsubscribeGalleries; // Dinleyiciyi temizlemek için

// Debug fonksiyonu
function galleryDebug(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GALLERIES-ADMIN: ${message}`);
    if (data) {
        console.log('Data:', data);
    }
}

// Kullanıcı yetkilerini kontrol et
function checkUserAccess() {
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName');
    const userEmail = sessionStorage.getItem('userEmail');

    galleryDebug('Kullanıcı yetkileri kontrol ediliyor:', { userRole, userName, userEmail });

    if (!userRole || !userName || !userEmail) {
        galleryDebug('Kullanıcı bilgileri eksik');
        return false;
    }

    // Admin ve supervisor rollerinin galeri düzenleme yetkisi var
    return ['admin', 'supervisor'].includes(userRole.toLowerCase());
}

// Galeri düzenleme yetkisini kontrol et
function canEditGallery() {
    return checkUserAccess();
}

// Galeri silme yetkisi kontrolü
function canDeleteGallery() {
    const userRole = sessionStorage.getItem('userRole');
    galleryDebug('Galeri silme yetkisi kontrolü:', { userRole });
    return userRole === 'admin';
}

// Alert göster
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // 5 saniye sonra alert'i kaldır
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Kullanıcı bilgilerini göster
function updateUserInfo(userName, userRole) {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        // Rol rengini belirle
        let roleClass = 'bg-secondary'; // Varsayılan renk
        switch(userRole.toLowerCase()) {
            case 'admin':
                roleClass = 'bg-danger';
                break;
            case 'supervisor':
                roleClass = 'bg-warning text-dark';
                break;
            case 'staff':
                roleClass = 'bg-info';
                break;
        }

        // Türkçe rol adını belirle
        let roleName = 'Personel';
        switch(userRole.toLowerCase()) {
            case 'admin':
                roleName = 'Yönetici';
                break;
            case 'supervisor':
                roleName = 'Süpervizör';
                break;
            case 'staff':
                roleName = 'Personel';
                break;
        }

        userInfo.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-person-circle me-2"></i>
                <span class="me-2">${userName}</span>
            </div>
        `;
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
    try {
        galleryDebug('Sayfa yükleniyor...');

        // Firebase başlatma kontrolü
        if (!window.checkFirebaseStatus()) {
            throw new Error('Firebase başlatılamadı');
        }

        // Auth state değişikliklerini dinle
        window.auth.onAuthStateChanged(async (user) => {
            galleryDebug('Auth state değişti:', user ? user.email : 'oturum kapalı');

            if (!user) {
                galleryDebug('Kullanıcı oturum açmamış');
                window.location.href = 'login.html';
                return;
            }

            // Kullanıcı bilgilerini kontrol et
            let userRole = sessionStorage.getItem('userRole');
            let userName = sessionStorage.getItem('userName');

            if (!userRole || !userName) {
                try {
                    // Kullanıcı bilgilerini Firestore'dan al
                    const userDoc = await window.db.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        userRole = userData.role || 'staff';
                        userName = userData.name || user.email.split('@')[0];
                        
                        sessionStorage.setItem('userRole', userRole);
                        sessionStorage.setItem('userName', userName);
                        sessionStorage.setItem('userEmail', user.email);
                        galleryDebug('Kullanıcı bilgileri Firestore\'dan alındı:', userData);
                    } else {
                        // Kullanıcı dokümanı yoksa varsayılan değerler ata
                        userRole = 'staff';
                        userName = user.email.split('@')[0];
                        
                        sessionStorage.setItem('userRole', userRole);
                        sessionStorage.setItem('userName', userName);
                        sessionStorage.setItem('userEmail', user.email);
                        galleryDebug('Varsayılan kullanıcı bilgileri atandı');
                    }
                } catch (error) {
                    console.error('Kullanıcı bilgileri alınırken hata:', error);
                    galleryDebug('Kullanıcı bilgileri alınırken hata:', error);
                }
            }

            // Kullanıcı bilgilerini göster
            updateUserInfo(userName, userRole);

            // Galerileri yükle
            await loadGalleries();

            // Admin değilse form alanını gizle
            const formSection = document.getElementById('formSection');
            if (formSection && !canEditGallery()) {
                formSection.style.display = 'none';
            }
        });

        // Yeni galeri ekleme formunu dinle
        const addGalleryForm = document.getElementById('addGalleryForm');
        if (addGalleryForm) {
            addGalleryForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                if (!canEditGallery()) {
                    showAlert('Galeri ekleme yetkiniz yok.', 'danger');
                    return;
                }

                const galleryName = document.getElementById('galleryName').value.trim();
                const galleryDescription = document.getElementById('galleryDescription').value.trim();

                if (!galleryName) {
                    showAlert('Galeri adı boş olamaz!', 'danger');
                    return;
                }

                try {
                    galleryDebug('Yeni galeri ekleniyor:', { galleryName, galleryDescription });

                    // Yeni galeri verisi oluştur
                    const galleryData = {
                        name: galleryName,
                        description: galleryDescription,
                        units: [], // Boş ünite dizisi
                        totalUnits: 0, // Toplam ünite sayısı
                        faultyUnits: 0, // Arızalı ünite sayısı
                        createdAt: new Date().toISOString(),
                        createdBy: sessionStorage.getItem('userEmail') || 'unknown',
                        updatedAt: new Date().toISOString()
                    };

                    // Galeriyi Firestore'a ekle
                    const docRef = await window.db.collection('galleries').add(galleryData);
                    galleryDebug('Yeni galeri oluşturuldu:', { id: docRef.id, ...galleryData });

                    // Formu temizle ve modal'ı kapat
                    this.reset();
                    bootstrap.Modal.getInstance(document.getElementById('addGalleryModal')).hide();
                    
                    // Başarı mesajı göster
                    showAlert('Galeri başarıyla eklendi.', 'success');
                    
                    // Sayfayı yenile
                    setTimeout(() => location.reload(), 1500);
                } catch (error) {
                    console.error('Galeri eklenirken hata:', error);
                    galleryDebug('Galeri eklenirken hata:', error);
                    showAlert('Galeri eklenirken bir hata oluştu: ' + error.message, 'danger');
                }
            });
        }

    } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        galleryDebug('Sayfa yüklenirken hata:', error);
        showAlert('Sayfa yüklenirken bir hata oluştu: ' + error.message, 'danger');
    }
});

// Galerileri listele
function displayGalleries(galleries) {
    const container = document.getElementById('galleriesList');
    if (!container) {
        galleryDebug('galleriesList elementi bulunamadı');
        return;
    }

    container.innerHTML = '';

    if (galleries.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    Henüz galeri bulunmuyor.
                </div>
            </div>
        `;
        return;
    }

    galleries.forEach(gallery => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${gallery.name}</h5>
                    <p class="card-text">${gallery.description || 'Açıklama yok'}</p>
                    <div class="mb-3">
                        <small class="text-muted">
                            <i class="bi bi-box"></i> ${gallery.totalUnits || 0} Ünite
                            ${gallery.faultyUnits > 0 ? `<span class="text-danger">(${gallery.faultyUnits} Arızalı)</span>` : ''}
                        </small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-primary" onclick="showGalleryUnits('${gallery.id}')">
                            <i class="bi bi-eye"></i> Üniteleri Görüntüle
                        </button>
                        <div>
                            ${canEditGallery() ? `
                                <button class="btn btn-warning btn-sm me-1" onclick="editGallery('${gallery.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            ` : ''}
                            ${canDeleteGallery() ? `
                                <button class="btn btn-danger btn-sm" onclick="deleteGallery('${gallery.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Galeri silme fonksiyonu
async function deleteGallery(galleryId) {
    if (!canDeleteGallery()) {
        showAlert('Galeri silme yetkiniz yok.', 'danger');
        return;
    }

    if (!confirm('Bu galeriyi silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        galleryDebug('Galeri siliniyor:', galleryId);
        await window.db.collection('galleries').doc(galleryId).delete();
        showAlert('Galeri başarıyla silindi.', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        console.error('Galeri silinirken hata:', error);
        galleryDebug('Galeri silinirken hata:', error);
        showAlert('Galeri silinirken bir hata oluştu.', 'danger');
    }
}

// Galeri ünitelerini göster
async function showGalleryUnits(galleryId) {
    try {
        galleryDebug('Galeri üniteleri gösteriliyor:', galleryId);
        
        // Galeri ID'sini localStorage'a kaydet
        localStorage.setItem('selectedGalleryId', galleryId);
        
        // Galeri bilgilerini al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!galleryDoc.exists) {
            console.error('Galeri bulunamadı');
            return;
        }
        
        const gallery = galleryDoc.data();
        
        // Galeri adını güncelle
        document.getElementById('selectedGalleryName').textContent = gallery.name;
        
        // Üniteleri göster
        const units = gallery.units || [];
        displayUnits(units);
        
        // Galeri bölümünü gizle, üniteler bölümünü göster
        document.getElementById('gallerySection').style.display = 'none';
        document.getElementById('unitsSection').style.display = 'block';
        
    } catch (error) {
        console.error('Üniteler gösterilirken hata:', error);
        alert('Üniteler yüklenirken bir hata oluştu: ' + error.message);
    }
}

// Show gallery section
function showGallerySection() {
    // Direkt ana sayfaya dön
    window.location.href = 'index.html';
}

// Display units in table
function displayUnits(units) {
    const tableBody = document.getElementById('unitsTable');
    tableBody.innerHTML = '';

    units.forEach(unit => {
        const row = document.createElement('tr');
        row.className = unit.status === 'Arızalı' ? 'table-danger' : '';
        row.style.cursor = 'pointer';
        
        // Satıra tıklama olayı ekle
        row.onclick = (e) => {
            if (!e.target.closest('.action-buttons')) {
                const galleryId = localStorage.getItem('selectedGalleryId');
                window.location.href = `unit-details.html?galleryId=${galleryId}&unitId=${unit.id}`;
            }
        };
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center unit-name-cell">
                    <i class="bi bi-box me-2"></i>
                    <div class="overflow-hidden">
                        <div class="fw-bold">${unit.name}</div>
                        <div class="small text-muted">${unit.description || ''}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${unit.status === 'Arızalı' ? 'bg-danger' : 'bg-success'}">
                    ${unit.status || 'Çalışıyor'}
                </span>
            </td>
            <td>${formatDate(unit.lastMaintenance)}</td>
            <td class="action-buttons text-end">
                <button class="btn btn-sm btn-primary me-1" onclick="editUnit(${unit.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUnit(${unit.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Add new unit
async function addUnit() {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    const name = document.getElementById('unitName').value;
    const description = document.getElementById('unitDescription').value;
    
    if (!name) {
        alert('Ünite adı zorunludur!');
        return;
    }

    try {
        const galleryId = localStorage.getItem('selectedGalleryId');
        const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            return;
        }

        const gallery = docRef.data();
        const units = gallery.units || [];
        
        // Yeni ünite ID'si oluştur
        const newId = units.length > 0 ? 
            Math.max(...units.map(u => parseInt(u.id))) + 1 : 1;

        const newUnit = {
            id: newId,
            name: name,
            description: description,
            status: "Çalışıyor",
            lastMaintenance: new Date().toISOString().split('T')[0]
        };

        // Üniteyi ekle ve sayıları güncelle
        units.push(newUnit);
        const totalUnits = units.length;
        const faultyUnits = units.filter(u => u.status === 'Arızalı').length;

        // Firestore'u güncelle
        await firebase.firestore().collection('galleries').doc(galleryId).update({
            units: units,
            totalUnits: totalUnits,
            faultyUnits: faultyUnits,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // UI'ı güncelle
        displayUnits(units);

        // Modal'ı kapat ve formu temizle
        const modal = bootstrap.Modal.getInstance(document.getElementById('addUnitModal'));
        modal.hide();
        document.getElementById('addUnitForm').reset();

        console.log('Yeni ünite başarıyla eklendi:', newUnit);
    } catch (error) {
        console.error('Ünite eklenirken hata:', error);
        alert('Ünite eklenirken bir hata oluştu');
    }
}

// Edit unit
async function editUnit(unitId) {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    try {
        const galleryId = localStorage.getItem('selectedGalleryId');
        const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            return;
        }

        const gallery = docRef.data();
        const unit = gallery.units.find(u => u.id === unitId);
        
        if (unit) {
            document.getElementById('editUnitId').value = unit.id;
            document.getElementById('editUnitName').value = unit.name;
            document.getElementById('editUnitDescription').value = unit.description || '';
            document.getElementById('editUnitStatus').value = unit.status || 'Çalışıyor';
            
            const modal = new bootstrap.Modal(document.getElementById('editUnitModal'));
            modal.show();
        } else {
            alert('Ünite bulunamadı!');
        }
    } catch (error) {
        console.error('Ünite bilgileri alınırken hata:', error);
        alert('Ünite bilgileri alınırken bir hata oluştu');
    }
}

// Update unit
async function updateUnit() {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    const unitId = parseInt(document.getElementById('editUnitId').value);
    const name = document.getElementById('editUnitName').value;
    const description = document.getElementById('editUnitDescription').value;
    const status = document.getElementById('editUnitStatus').value;

    if (!name) {
        alert('Ünite adı zorunludur!');
        return;
    }

    try {
        const galleryId = localStorage.getItem('selectedGalleryId');
        const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            return;
        }

        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => u.id === unitId);
        
        if (unitIndex !== -1) {
            // Üniteyi güncelle
            units[unitIndex] = {
                ...units[unitIndex],
                name: name,
                description: description,
                status: status,
                lastMaintenance: new Date().toISOString().split('T')[0]
            };

            // Arızalı ünite sayısını güncelle
            const faultyUnits = units.filter(u => u.status === 'Arızalı').length;
            
            // Firestore'u güncelle
            await firebase.firestore().collection('galleries').doc(galleryId).update({
                units: units,
                faultyUnits: faultyUnits,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // UI'ı güncelle
            displayUnits(units);

            // Modal'ı kapat
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUnitModal'));
            modal.hide();

            console.log('Ünite başarıyla güncellendi:', units[unitIndex]);
        } else {
            alert('Ünite bulunamadı!');
        }
    } catch (error) {
        console.error('Ünite güncellenirken hata:', error);
        alert('Ünite güncellenirken bir hata oluştu');
    }
}

// Delete unit
async function deleteUnit(unitId) {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    if (confirm('Bu üniteyi silmek istediğinizden emin misiniz?')) {
        try {
            const galleryId = localStorage.getItem('selectedGalleryId');
            const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
            
            if (!docRef.exists) {
                alert('Galeri bulunamadı!');
                return;
            }

            const gallery = docRef.data();
            const units = gallery.units.filter(u => u.id !== unitId);
            
            // Firestore'u güncelle
            await firebase.firestore().collection('galleries').doc(galleryId).update({
                units: units,
                totalUnits: units.length,
                faultyUnits: units.filter(u => u.status === 'Arızalı').length,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // UI'ı güncelle
            displayUnits(units);

            console.log('Ünite başarıyla silindi');
        } catch (error) {
            console.error('Ünite silinirken hata:', error);
            alert('Ünite silinirken bir hata oluştu');
        }
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Galerileri yükle
async function loadGalleries() {
    try {
        galleryDebug('Galeriler yükleniyor...');
        
        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
            galleryDebug('Firebase henüz başlatılmadı, bekleniyor...');
            setTimeout(loadGalleries, 1000);
            return;
        }
        
        // Firestore referansını kontrol et
        if (!window.db) {
            galleryDebug('Firestore referansı bulunamadı');
            showAlert('Veritabanı bağlantısı kurulamadı', 'danger');
            return;
        }
        
        const snapshot = await window.db.collection('galleries').get();
        const galleries = [];
        
        snapshot.forEach(doc => {
            const galleryData = doc.data();
            // Eksik alanları tamamla
            if (!galleryData.units) {
                galleryData.units = [];
            }
            if (!galleryData.totalUnits) {
                galleryData.totalUnits = 0;
            }
            if (!galleryData.faultyUnits) {
                galleryData.faultyUnits = 0;
            }
            
            galleries.push({
                id: doc.id,
                ...galleryData
            });
        });
        
        galleryDebug('Galeriler yüklendi:', galleries.length);
        displayGalleries(galleries);
        
    } catch (error) {
        console.error('Galeriler yüklenirken hata:', error);
        showAlert('Galeriler yüklenirken bir hata oluştu: ' + error.message, 'danger');
    }
}

// Galeri ekle
async function addGallery() {
    try {
        const name = document.getElementById('galleryName').value;
        const description = document.getElementById('galleryDescription').value;

        if (!name) {
            showAlert('Galeri adı zorunludur!', 'warning');
            return;
        }

        const galleryData = {
            name: name,
            description: description,
            totalUnits: 0,
            faultyUnits: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection('galleries').add(galleryData);
        
        showAlert('Galeri başarıyla eklendi!', 'success');
        
        // Formu temizle ve modal'ı kapat
        document.getElementById('addGalleryForm').reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addGalleryModal'));
        modal.hide();
        
        // Galerileri yeniden yükle
        await loadGalleries();
        
    } catch (error) {
        console.error('Galeri eklenirken hata:', error);
        showAlert('Galeri eklenirken bir hata oluştu', 'danger');
    }
}

// Galeri düzenleme modal'ını aç
async function editGallery(galleryId) {
    try {
        const docRef = await firebase.firestore().collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            showAlert('Galeri bulunamadı!', 'warning');
            return;
        }

        const gallery = docRef.data();
        
        document.getElementById('editGalleryId').value = galleryId;
        document.getElementById('editGalleryName').value = gallery.name;
        document.getElementById('editGalleryDescription').value = gallery.description || '';
        
        const modal = new bootstrap.Modal(document.getElementById('editGalleryModal'));
        modal.show();
        
    } catch (error) {
        console.error('Galeri bilgileri alınırken hata:', error);
        showAlert('Galeri bilgileri alınırken bir hata oluştu', 'danger');
    }
}

// Galeri güncelle
async function updateGallery() {
    try {
        const galleryId = document.getElementById('editGalleryId').value;
        const name = document.getElementById('editGalleryName').value;
        const description = document.getElementById('editGalleryDescription').value;

        if (!name) {
            showAlert('Galeri adı zorunludur!', 'warning');
            return;
        }

        await firebase.firestore().collection('galleries').doc(galleryId).update({
            name: name,
            description: description,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Galeri başarıyla güncellendi!', 'success');
        
        // Modal'ı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('editGalleryModal'));
        modal.hide();
        
        // Galerileri yeniden yükle
        await loadGalleries();
        
    } catch (error) {
        console.error('Galeri güncellenirken hata:', error);
        showAlert('Galeri güncellenirken bir hata oluştu', 'danger');
    }
}

// Galerileri başlat
async function initializeGalleries() {
    try {
        galleryDebug('Galeriler başlatılıyor...');
        
        // Firebase'in hazır olmasını bekle
        if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
            galleryDebug('Firebase henüz başlatılmadı, bekleniyor...');
            setTimeout(initializeGalleries, 1000);
            return;
        }

        // Galerileri yükle
        await loadGalleries();
        
    } catch (error) {
        console.error('Galeriler başlatılırken hata:', error);
        showAlert('Galeriler yüklenirken bir hata oluştu', 'danger');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkUserAccess();
    initializeGalleries();
}); 