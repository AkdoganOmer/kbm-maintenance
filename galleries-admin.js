// Firebase referansı
let unsubscribeGalleries; // Dinleyiciyi temizlemek için

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklenmesini bekle
        await new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                resolve();
                return;
            }

            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        });

        // Galerileri başlat
        initializeGalleries();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        alert('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

// Firebase'i başlat
function initializeGalleries() {
    try {
        console.log('Galeriler başlatılıyor...');
        
        // URL parametrelerini kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const showUnitsForGallery = urlParams.get('showUnits');

        // Oturum durumunu kontrol et
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Oturum açık:', user.email);
                
                // Kullanıcı rolünü kontrol et
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                if (!currentUser || !['admin', 'manager', 'technician'].includes(currentUser.role)) {
                    console.log('Yetkisiz erişim');
                    alert('Bu sayfaya erişim yetkiniz yok!');
                    window.location.href = 'index.html';
                    return;
                }

                // Galeriler koleksiyonunu dinle
                listenToGalleries(showUnitsForGallery);
            } else {
                console.log('Oturum kapalı');
                // Dinleyiciyi temizle
                if (unsubscribeGalleries) {
                    unsubscribeGalleries();
                }
                window.location.href = 'login.html';
            }
        });
    } catch (error) {
        console.error('Firebase başlatılırken hata:', error);
        alert('Firebase başlatılırken bir hata oluştu: ' + error.message);
    }
}

// Galeriler koleksiyonunu dinle
function listenToGalleries(showUnitsForGallery = null) {
    try {
        // Önceki dinleyiciyi temizle
        if (unsubscribeGalleries) {
            unsubscribeGalleries();
        }

        // Yeni dinleyici ekle
        unsubscribeGalleries = firebase.firestore().collection('galleries')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                console.log('Galeriler güncellendi');
                const galleries = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    galleries.push({
                        id: doc.id,
                        name: data.name,
                        description: data.description,
                        totalUnits: data.totalUnits || 0,
                        faultyUnits: data.faultyUnits || 0,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                        units: data.units || []
                    });
                });

                // Tabloyu güncelle
                updateGalleriesTable(galleries);

                // Eğer belirli bir galerinin üniteleri gösterilecekse
                if (showUnitsForGallery) {
                    const gallery = galleries.find(g => g.id === showUnitsForGallery);
                    if (gallery) {
                        window.location.href = `gallery-details.html?id=${gallery.id}`;
                    }
                }
            }, (error) => {
                console.error('Galeriler dinlenirken hata:', error);
            });
    } catch (error) {
        console.error('Galeri dinleyicisi eklenirken hata:', error);
    }
}

// Galeri tablosunu güncelle
function updateGalleriesTable(galleries) {
    const tableBody = document.getElementById('galleriesTable');
    
    if (!tableBody) {
        console.error('Galeri tablosu bulunamadı');
        return;
    }

    // Tabloyu temizle
    tableBody.innerHTML = '';

    if (galleries.length === 0) {
        // Galeri yoksa mesaj göster
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" class="text-center">
                Henüz galeri eklenmemiş
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    // Galerileri tabloya ekle
    galleries.forEach(gallery => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        
        // Satıra tıklama olayı ekle
        row.onclick = (e) => {
            if (!e.target.closest('.action-buttons')) {
                window.location.href = `gallery-details.html?id=${gallery.id}`;
            }
        };
        
        // Satır içeriğini oluştur
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi bi-grid-3x3-gap me-2"></i>
                    <div>
                        <div class="fw-bold">${gallery.name}</div>
                        <div class="small text-muted">${gallery.description || ''}</div>
                    </div>
                </div>
            </td>
            <td class="text-center">
                <span class="badge bg-primary">${gallery.totalUnits || 0}</span>
            </td>
            <td class="text-center">
                <span class="badge ${gallery.faultyUnits > 0 ? 'bg-danger' : 'bg-success'}">
                    ${gallery.faultyUnits || 0}
                </span>
            </td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary me-2" onclick="editGallery('${gallery.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteGallery('${gallery.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Check if user has required role
function checkUserAccess() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || !['admin', 'manager', 'technician'].includes(currentUser.role)) {
        alert('Bu sayfaya erişim yetkiniz yok!');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Get galleries from Firestore
async function getGalleries() {
    const galleries = [];
    try {
        // Galeriler koleksiyonunu çek
        const snapshot = await firebase.firestore().collection('galleries')
            .orderBy('createdAt', 'desc')
            .get();

        // Her bir galeriyi diziye ekle
        snapshot.forEach(doc => {
            const data = doc.data();
            galleries.push({
                id: doc.id,
                name: data.name,
                description: data.description,
                totalUnits: data.totalUnits || 0,
                faultyUnits: data.faultyUnits || 0,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                units: data.units || []
            });
        });
    } catch (error) {
        console.error('Galeriler alınırken hata:', error);
    }
    return galleries;
}

// Save gallery to Firestore
async function saveGallery(gallery) {
    try {
        if (gallery.id) {
            // Update existing gallery
            await firebase.firestore().collection('galleries').doc(gallery.id.toString()).set(gallery);
        } else {
            // Add new gallery
            await firebase.firestore().collection('galleries').add(gallery);
        }
    } catch (error) {
        console.error('Galeri kaydedilirken hata:', error);
        throw error;
    }
}

// Display galleries in table
async function displayGalleries() {
    try {
        const galleries = await getGalleries();
        const tableBody = document.getElementById('galleriesTable');
        
        if (!tableBody) {
            console.error('Galeri tablosu bulunamadı');
            return;
        }

        // Tabloyu temizle
        tableBody.innerHTML = '';

        if (galleries.length === 0) {
            // Galeri yoksa mesaj göster
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="4" class="text-center">
                    Henüz galeri eklenmemiş
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        // Galerileri tabloya ekle
        galleries.forEach(gallery => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            
            // Satıra tıklama olayı ekle
            row.onclick = (e) => {
                if (!e.target.closest('.action-buttons')) {
                    window.location.href = `gallery-details.html?id=${gallery.id}`;
                }
            };
            
            // Satır içeriğini oluştur
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-grid-3x3-gap me-2"></i>
                        <div>
                            <div class="fw-bold">${gallery.name}</div>
                            <div class="small text-muted">${gallery.description || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge bg-primary">${gallery.totalUnits || 0}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${gallery.faultyUnits > 0 ? 'bg-danger' : 'bg-success'}">
                        ${gallery.faultyUnits || 0}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-primary me-2" onclick="editGallery('${gallery.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteGallery('${gallery.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Galeriler görüntülenirken hata:', error);
        alert('Galeriler görüntülenirken bir hata oluştu');
    }
}

// Add new gallery
async function addGallery() {
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.error('Firebase henüz başlatılmadı');
        alert('Sistem hazır değil, lütfen sayfayı yenileyin');
        return;
    }

    const name = document.getElementById('galleryName').value;
    const description = document.getElementById('galleryDescription').value;
    
    if (!name) {
        alert('Galeri adı zorunludur!');
        return;
    }

    try {
        const newGallery = {
            name: name,
            description: description,
            totalUnits: 0,
            faultyUnits: 0,
            units: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await firebase.firestore().collection('galleries').add(newGallery);
        console.log('Yeni galeri eklendi. ID:', docRef.id);
        await displayGalleries();

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addGalleryModal'));
        modal.hide();
        document.getElementById('addGalleryForm').reset();
    } catch (error) {
        console.error('Galeri eklenirken hata:', error);
        alert('Galeri eklenirken bir hata oluştu: ' + error.message);
    }
}

// Load gallery data for editing
async function editGallery(id) {
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    try {
        const doc = await firebase.firestore().collection('galleries').doc(id).get();
        if (doc.exists) {
            const gallery = { id: doc.id, ...doc.data() };
            document.getElementById('editGalleryId').value = gallery.id;
            document.getElementById('editGalleryName').value = gallery.name;
            document.getElementById('editGalleryDescription').value = gallery.description || '';
            
            const modal = new bootstrap.Modal(document.getElementById('editGalleryModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Galeri bilgileri alınırken hata:', error);
        alert('Galeri bilgileri alınırken bir hata oluştu');
    }
}

// Update gallery
async function updateGallery() {
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    const id = document.getElementById('editGalleryId').value;
    const name = document.getElementById('editGalleryName').value;
    const description = document.getElementById('editGalleryDescription').value;

    if (!name) {
        alert('Galeri adı zorunludur!');
        return;
    }

    try {
        const docRef = firebase.firestore().collection('galleries').doc(id);
        await docRef.update({
            name: name,
            description: description,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await displayGalleries();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editGalleryModal'));
        modal.hide();
    } catch (error) {
        console.error('Galeri güncellenirken hata:', error);
        alert('Galeri güncellenirken bir hata oluştu');
    }
}

// Delete gallery
async function deleteGallery(id) {
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    if (confirm('Bu galeriyi silmek istediğinizden emin misiniz?')) {
        try {
            await firebase.firestore().collection('galleries').doc(id).delete();
            await displayGalleries();
        } catch (error) {
            console.error('Galeri silinirken hata:', error);
            alert('Galeri silinirken bir hata oluştu');
        }
    }
}

// Show gallery units
async function showGalleryUnits(galleryId) {
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    try {
        const doc = await firebase.firestore().collection('galleries').doc(galleryId).get();
        if (doc.exists) {
            const gallery = { id: doc.id, ...doc.data() };
            
            // Update UI
            document.getElementById('gallerySection').style.display = 'none';
            document.getElementById('unitsSection').style.display = 'block';
            document.getElementById('selectedGalleryName').textContent = `${gallery.name} - Üniteler`;
            
            // Store selected gallery ID
            localStorage.setItem('selectedGalleryId', galleryId);
            
            // Display units
            displayUnits(gallery.units || []);
        }
    } catch (error) {
        console.error('Galeri detayları alınırken hata:', error);
        alert('Galeri detayları alınırken bir hata oluştu');
    }
}

// Show gallery section
function showGallerySection() {
    document.getElementById('gallerySection').style.display = 'block';
    document.getElementById('unitsSection').style.display = 'none';
    localStorage.removeItem('selectedGalleryId');
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
                <div class="d-flex align-items-center">
                    <i class="bi bi-box me-2"></i>
                    <div>
                        <div class="fw-bold">${unit.name}</div>
                        <div class="small text-muted">${unit.description || ''}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${unit.status === 'Arızalı' ? 'bg-danger' : 'bg-success'}">
                    ${unit.status}
                </span>
            </td>
            <td>${formatDate(unit.lastMaintenance)}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary me-2" onclick="editUnit(${unit.id})">
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
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
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
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
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
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
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
    if (!typeof firebase !== 'undefined' && firebase.apps.length > 0) {
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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkUserAccess();
    initializeGalleries();
}); 