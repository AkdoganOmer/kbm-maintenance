// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklenmesini bekle
        await new Promise((resolve) => {
            if (window.db) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'firebase-config.js';
            script.onload = () => {
                const checkFirebase = setInterval(() => {
                    if (window.db) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            };
            document.head.appendChild(script);
        });

        // Auth durumunu kontrol et
        await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                resolve();
            });
        });

        // Sayfayı başlat
        await loadUnitDetails();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        alert('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

// Get galleries from localStorage
function getGalleries() {
    const galleries = localStorage.getItem('galleries');
    return galleries ? JSON.parse(galleries) : [];
}

// Save galleries to localStorage
function saveGalleries(galleries) {
    localStorage.setItem('galleries', JSON.stringify(galleries));
}

// Find unit by ID
function findUnit(unitId) {
    const galleries = getGalleries();
    for (const gallery of galleries) {
        const unit = gallery.units.find(u => u.id === unitId);
        if (unit) {
            return { unit, gallery };
        }
    }
    return null;
}

// Load unit details
async function loadUnitDetails() {
    // URL'den parametreleri al
    const urlParams = new URLSearchParams(window.location.search);
    const galleryId = urlParams.get('galleryId');
    const unitId = urlParams.get('unitId');
    
    if (!galleryId || !unitId) {
        alert('Galeri veya ünite bilgisi eksik!');
        window.location.href = 'galleries.html';
        return;
    }

    try {
        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            window.location.href = 'galleries.html';
            return;
        }

        const gallery = docRef.data();
        const unit = gallery.units.find(u => String(u.id) === String(unitId));

        if (!unit) {
            alert('Ünite bulunamadı!');
            window.location.href = 'galleries.html';
            return;
        }

        // Update page title
        document.getElementById('unitTitle').textContent = unit.name;

        // Fill unit information
        document.getElementById('unitName').textContent = unit.name;
        document.getElementById('galleryName').textContent = gallery.name;
        document.getElementById('unitStatus').innerHTML = `
            <span class="badge ${unit.status === 'Arızalı' ? 'bg-danger' : 'bg-success'}">
                ${unit.status || 'Çalışıyor'}
            </span>
        `;

        // Arıza detaylarını göster/gizle
        const faultyDetailsRow = document.getElementById('faultyDetailsRow');
        const maintenanceDetailsRow = document.getElementById('maintenanceDetailsRow');
        if (unit.status === 'Arızalı') {
            faultyDetailsRow.style.display = '';
            maintenanceDetailsRow.style.display = '';
            document.getElementById('faultyReason').textContent = unit.faultyReason || 'Belirtilmemiş';
            document.getElementById('maintenanceTasks').textContent = unit.maintenanceTasks || 'Belirtilmemiş';
        } else {
            faultyDetailsRow.style.display = 'none';
            maintenanceDetailsRow.style.display = 'none';
        }

        document.getElementById('lastMaintenance').textContent = formatDate(unit.lastMaintenance);

        // Fill technical details
        const technicalDetails = document.getElementById('technicalDetails');
        if (unit.technicalDetails) {
            technicalDetails.innerHTML = `
                <div class="technical-details">
                    <h6 class="mb-3">Teknik Özellikler</h6>
                    <div class="mb-4">${unit.technicalDetails}</div>
                    
                    <h6 class="mb-3">Bakım Talimatları</h6>
                    <div class="maintenance-instructions">
                        ${unit.maintenanceInstructions || 'Henüz bakım talimatı eklenmemiş'}
                    </div>
                </div>
            `;
        } else {
            technicalDetails.innerHTML = `
                <div class="text-muted">
                    <p>Henüz teknik detay eklenmemiş</p>
                    <small>Teknik detaylar ve bakım talimatları admin panelinden eklenebilir.</small>
                </div>
            `;
        }

        // Display technical documents
        const technicalDocuments = document.getElementById('technicalDocuments');
        if (unit.documents && unit.documents.length > 0) {
            technicalDocuments.innerHTML = unit.documents.map(doc => `
                <div class="document-item d-flex align-items-center mb-2">
                    <i class="bi bi-file-pdf text-danger me-2"></i>
                    <a href="${doc.data}" download="${doc.name}" class="text-decoration-none">
                        ${doc.name}
                    </a>
                    <small class="text-muted ms-2">(${formatFileSize(doc.size)})</small>
                </div>
            `).join('');
        } else {
            technicalDocuments.innerHTML = `
                <div class="text-muted">
                    <p>Henüz teknik doküman eklenmemiş</p>
                    <small>Teknik dokümanlar admin panelinden eklenebilir.</small>
                </div>
            `;
        }

        // Display images
        const unitImages = document.getElementById('unitImages');
        if (unit.images && unit.images.length > 0) {
            unitImages.innerHTML = unit.images.map(image => `
                <div class="unit-image mb-3">
                    <img src="${image}" class="img-fluid" alt="${unit.name}">
                </div>
            `).join('');
        } else {
            unitImages.innerHTML = `
                <div class="text-muted">
                    <p>Henüz görsel eklenmemiş</p>
                    <small>Görseller admin panelinden eklenebilir.</small>
                </div>
            `;
        }

        // Display maintenance history
        displayMaintenanceHistory(unit.maintenanceHistory || []);

        // Show edit button and maintenance button for admin
        if (isAdmin()) {
            document.querySelector('.admin-only').style.display = 'block';
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
            
            // Fill edit form
            document.getElementById('editUnitName').value = unit.name;
            document.getElementById('editUnitStatus').value = unit.status || 'Çalışıyor';
            document.getElementById('editTechnicalDetails').value = unit.technicalDetails || '';
            document.getElementById('editMaintenanceInstructions').value = unit.maintenanceInstructions || '';
            document.getElementById('editFaultyReason').value = unit.faultyReason || '';
            document.getElementById('editMaintenanceTasks').value = unit.maintenanceTasks || '';

            // Durum değiştiğinde alanları göster/gizle
            const faultyDetailsGroup = document.getElementById('faultyDetailsGroup');
            const maintenanceDetailsGroup = document.getElementById('maintenanceDetailsGroup');
            if (unit.status === 'Arızalı') {
                faultyDetailsGroup.style.display = '';
                maintenanceDetailsGroup.style.display = '';
            } else {
                faultyDetailsGroup.style.display = 'none';
                maintenanceDetailsGroup.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Ünite detayları yüklenirken hata:', error);
        alert('Ünite detayları yüklenirken bir hata oluştu.');
    }
}

// Toggle edit mode
function toggleEditMode() {
    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');
    
    if (viewMode.style.display !== 'none') {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
    } else {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    }
}

// Durum değiştiğinde alanları göster/gizle
document.getElementById('editUnitStatus').addEventListener('change', function() {
    const faultyDetailsGroup = document.getElementById('faultyDetailsGroup');
    const maintenanceDetailsGroup = document.getElementById('maintenanceDetailsGroup');
    const faultyReason = document.getElementById('editFaultyReason');
    const maintenanceTasks = document.getElementById('editMaintenanceTasks');
    
    if (this.value === 'Arızalı') {
        faultyDetailsGroup.style.display = '';
        maintenanceDetailsGroup.style.display = '';
        faultyReason.setAttribute('required', '');
        maintenanceTasks.setAttribute('required', '');
    } else {
        faultyDetailsGroup.style.display = 'none';
        maintenanceDetailsGroup.style.display = 'none';
        faultyReason.removeAttribute('required');
        maintenanceTasks.removeAttribute('required');
        // Diğer durumlarda alanları temizle
        faultyReason.value = '';
        maintenanceTasks.value = '';
    }
});

// Handle image upload
async function uploadImages() {
    const fileInput = document.getElementById('imageUpload');
    const files = fileInput.files;
    
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png'];
    const invalidFiles = Array.from(files).filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
        alert('Sadece JPG ve PNG formatında görseller kabul edilmektedir.');
        return;
    }

    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><div>Yükleniyor...</div></div>';

    try {
        const imageUrls = [];

        for (const file of files) {
            try {
                // Create an image element for resizing
                const img = document.createElement('img');
                const reader = new FileReader();
                
                // Convert file to data URL
                await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                // Load image for resizing
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = reader.result;
                });

                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 800px width/height)
                let width = img.width;
                let height = img.height;
                const maxSize = 800;
                
                if (width > height && width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
                
                // Set canvas size and draw resized image
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with reduced quality
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                // Add to image URLs array
                imageUrls.push(resizedDataUrl);
                
                console.log('Görsel başarıyla yüklendi ve yeniden boyutlandırıldı');
            } catch (uploadError) {
                console.error('Görsel yükleme hatası:', uploadError);
                throw uploadError;
            }
        }

        // Show preview
        preview.innerHTML = imageUrls.map(url => `
            <div class="unit-image mb-3">
                <img src="${url}" class="img-fluid" alt="Preview">
            </div>
        `).join('');

        // Store image URLs temporarily
        preview.dataset.images = JSON.stringify(imageUrls);

        return imageUrls;

    } catch (error) {
        console.error('Görsel yüklenirken hata:', error);
        alert('Görseller yüklenirken bir hata oluştu: ' + error.message);
        preview.innerHTML = '';
        throw error;
    }
}

// Handle document upload
function uploadDocuments() {
    const fileInput = document.getElementById('documentUpload');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) return;

    // Validate file types
    const invalidFiles = files.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
        alert('Sadece PDF formatında dokümanlar kabul edilmektedir.');
        return;
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
        alert('Her bir PDF dosyası en fazla 5MB boyutunda olabilir.');
        return;
    }

    const documentPromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Ensure we're creating a proper data URL
                const base64Data = e.target.result;
                console.log('Uploaded PDF data:', {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataPrefix: base64Data.substring(0, 50) + '...' // Log first 50 chars for debugging
                });
                
                resolve({
                    name: file.name,
                    data: base64Data,
                    size: file.size,
                    type: file.type
                });
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(documentPromises).then(documents => {
        const documentList = document.getElementById('documentList');
        documentList.innerHTML = documents.map(doc => `
            <div class="document-item d-flex align-items-center mb-2">
                <i class="bi bi-file-pdf text-danger me-2"></i>
                <span>${doc.name}</span>
                <small class="text-muted ms-2">(${formatFileSize(doc.size)})</small>
            </div>
        `).join('');

        // Store documents temporarily
        documentList.dataset.documents = JSON.stringify(documents);
        
        // Log stored documents for debugging
        console.log('Stored documents:', JSON.parse(documentList.dataset.documents).map(doc => ({
            name: doc.name,
            size: doc.size,
            type: doc.type,
            dataPrefix: doc.data.substring(0, 50) + '...' // Log first 50 chars for debugging
        })));
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Save unit details
async function saveUnitDetails() {
    try {
        // URL'den parametreleri al
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        // Form verilerini al
        const name = document.getElementById('editUnitName').value;
        const status = document.getElementById('editUnitStatus').value;
        const technicalDetails = document.getElementById('editTechnicalDetails').value;
        const maintenanceInstructions = document.getElementById('editMaintenanceInstructions').value;
        const faultyReason = document.getElementById('editFaultyReason').value;
        const maintenanceTasks = document.getElementById('editMaintenanceTasks').value;

        // Galeriyi getir
        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        if (!docRef.exists) {
            throw new Error('Galeri bulunamadı!');
        }

        const gallery = docRef.data();
        const unitIndex = gallery.units.findIndex(u => String(u.id) === String(unitId));

        if (unitIndex === -1) {
            throw new Error('Ünite bulunamadı!');
        }

        // Üniteyi güncelle
        gallery.units[unitIndex] = {
            ...gallery.units[unitIndex],
            name,
            status,
            technicalDetails,
            maintenanceInstructions,
            faultyReason: status === 'Arızalı' ? faultyReason : '',
            maintenanceTasks: status === 'Arızalı' ? maintenanceTasks : '',
            lastUpdated: new Date().toISOString()
        };

        // Yeni görselleri yükle
        const imageInput = document.getElementById('imageInput');
        if (imageInput.files.length > 0) {
            const imageUrls = await uploadImages();
            gallery.units[unitIndex].images = [
                ...(gallery.units[unitIndex].images || []),
                ...imageUrls
            ];
        }

        // Yeni dokümanları yükle
        const documentInput = document.getElementById('documentInput');
        if (documentInput.files.length > 0) {
            const documents = await uploadDocuments();
            gallery.units[unitIndex].documents = [
                ...(gallery.units[unitIndex].documents || []),
                ...documents
            ];
        }

        // Galeriyi güncelle
        await window.db.collection('galleries').doc(galleryId).update(gallery);

        alert('Ünite başarıyla güncellendi!');
        toggleEditMode();
        loadUnitDetails();
    } catch (error) {
        console.error('Ünite güncellenirken hata:', error);
        alert('Ünite güncellenirken bir hata oluştu: ' + error.message);
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Belirtilmemiş';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// Show maintenance modal
function showMaintenanceModal() {
    const modal = new bootstrap.Modal(document.getElementById('maintenanceModal'));
    modal.show();
}

// Save maintenance
async function saveMaintenance() {
    if (!window.db) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    const galleryId = localStorage.getItem('selectedGalleryId');
    const unitId = localStorage.getItem('selectedUnitId');
    
    if (!galleryId || !unitId) {
        alert('Galeri veya ünite bilgisi bulunamadı!');
        return;
    }

    const type = document.getElementById('maintenanceType').value;
    const actions = document.getElementById('maintenanceActions').value;
    const status = document.getElementById('maintenanceStatus').value;

    if (!actions) {
        alert('Yapılan işlemler zorunludur!');
        return;
    }

    try {
        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            return;
        }

        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => String(u.id) === unitId);
        
        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Yeni bakım kaydı
        const maintenanceRecord = {
            date: new Date().toISOString(),
            type: type,
            actions: actions,
            status: status,
            technician: firebase.auth().currentUser?.email || 'Bilinmeyen Kullanıcı'
        };

        // Bakım geçmişini güncelle
        units[unitIndex].maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        units[unitIndex].maintenanceHistory.push(maintenanceRecord);

        // Son bakım tarihini güncelle
        units[unitIndex].lastMaintenance = maintenanceRecord.date;

        // Firestore'u güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: units,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Modal'ı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('maintenanceModal'));
        modal.hide();

        // Formu temizle
        document.getElementById('maintenanceForm').reset();

        // Sayfayı yenile
        await loadUnitDetails();

        // Başarı mesajı göster
        alert('Bakım kaydı başarıyla eklendi.');
    } catch (error) {
        console.error('Bakım kaydı eklenirken hata:', error);
        alert('Bakım kaydı eklenirken bir hata oluştu: ' + error.message);
    }
}

// Display maintenance history
function displayMaintenanceHistory(maintenanceHistory) {
    const maintenanceTable = document.getElementById('maintenanceTable');
    if (!maintenanceHistory || maintenanceHistory.length === 0) {
        maintenanceTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Henüz bakım kaydı bulunmuyor</td>
            </tr>
        `;
        return;
    }

    maintenanceTable.innerHTML = maintenanceHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td>${record.type}</td>
                <td>${record.actions}</td>
                <td>
                    <span class="badge ${record.status === 'Tamamlandı' ? 'bg-success' : 'bg-warning'}">
                        ${record.status}
                    </span>
                </td>
                <td>${record.technician}</td>
            </tr>
        `).join('');
}

// Geri dön fonksiyonu
function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const galleryId = urlParams.get('galleryId');
    
    // Eğer galeri ID'si varsa, o galerinin üniteler listesine dön
    if (galleryId) {
        window.location.href = `galleries.html?showUnits=${galleryId}`;
    } else {
        // Galeri ID'si yoksa bir önceki sayfaya dön
        history.back();
    }
}

// Form submit olayını dinle
document.getElementById('editUnitForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveUnitDetails();
}); 