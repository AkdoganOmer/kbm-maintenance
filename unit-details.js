// Debug fonksiyonu
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] UNIT-DETAILS: ${message}`);
    if (data) {
        console.log('Data:', data);
    }
}

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Sayfa yükleniyor...');
    
    try {
        // URL parametrelerini kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        debugLog('URL parametreleri:', { galleryId, unitId });

        if (!galleryId || !unitId) {
            throw new Error('Galeri veya ünite bilgisi eksik! Lütfen galeriler sayfasından bir ünite seçin.');
        }

        // Firebase'in yüklenmesini bekle
        await new Promise((resolve, reject) => {
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && window.db) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);

            // 10 saniye sonra timeout
            setTimeout(() => {
                clearInterval(checkFirebase);
                reject(new Error('Firebase yüklenirken zaman aşımı'));
            }, 10000);
        });

        debugLog('Firebase yüklendi');

        // Auth durumunu kontrol et
        await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                if (!user) {
                    debugLog('Kullanıcı oturum açmamış');
                    window.location.href = 'login.html';
                    return;
                }
                debugLog('Kullanıcı oturum açmış:', user.email);
                resolve();
            });
        });

        // Event listener'ları ayarla
        setupEventListeners();

        // Admin UI'ı güncelle
        if (typeof checkAuth === 'function') {
            checkAuth();
        }
        if (typeof updateAdminUI === 'function') {
            updateAdminUI();
        }

        // Sayfayı başlat
        await loadUnitDetails();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        debugLog('Sayfa başlatılırken hata:', error);
        alert(error.message || 'Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        window.location.href = 'index.html';
    }
});

// Event listener'ları ayarla
function setupEventListeners() {
    debugLog('Event listener\'lar ayarlanıyor...');

    // Edit Unit Status Change Event
    const editUnitStatus = document.getElementById('editUnitStatus');
    if (editUnitStatus) {
        debugLog('editUnitStatus elementi bulundu');
        editUnitStatus.addEventListener('change', function() {
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
    } else {
        debugLog('UYARI: editUnitStatus elementi bulunamadı');
    }

    // Edit Unit Form Submit Event
    const editUnitForm = document.getElementById('editUnitForm');
    if (editUnitForm) {
        debugLog('editUnitForm elementi bulundu');
        editUnitForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveUnitDetails();
        });
    } else {
        debugLog('UYARI: editUnitForm elementi bulunamadı');
    }
}

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
    debugLog('loadUnitDetails başladı');
    
    try {
        // Show loading state
        showLoadingState();
        
        // URL'den parametreleri al
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');
        
        debugLog('Galeri ve ünite ID\'leri:', { galleryId, unitId });

        if (!galleryId || !unitId) {
            throw new Error('Galeri veya ünite bilgisi eksik! Lütfen ana sayfadan bir ünite seçin.');
        }

        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            throw new Error('Galeri bulunamadı!');
        }

        const gallery = docRef.data();
        debugLog('Galeri verisi alındı:', gallery);

        const unit = gallery.units.find(u => String(u.id) === String(unitId));

        if (!unit) {
            throw new Error('Ünite bulunamadı!');
        }

        debugLog('Ünite bulundu:', unit);

        // Update page title
        const titleElement = document.getElementById('unitTitle');
        if (titleElement) {
            titleElement.textContent = unit.name;
        }

        // Fill unit information
        updateUnitInformation(unit, gallery);

        // Display maintenance history
        displayMaintenanceHistory(unit.maintenanceHistory || []);

        // Hide loading state
        hideLoadingState();

        debugLog('Ünite detayları başarıyla yüklendi');
    } catch (error) {
        console.error('Ünite detayları yüklenirken hata:', error);
        debugLog('Ünite detayları yüklenirken hata:', error);
        hideLoadingState();
        alert(error.message || 'Ünite detayları yüklenirken bir hata oluştu.');
        window.location.href = 'index.html';
    }
}

// Show loading state
function showLoadingState() {
    const elements = [
        'unitName', 'galleryNameInfo', 'lastMaintenance', 
        'unitImages', 'technicalDetails', 'technicalDocuments'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `
                <div class="loading-placeholder">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
            `;
        }
    });
}

// Hide loading state
function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Update unit information in the UI
function updateUnitInformation(unit, gallery) {
    debugLog('Ünite bilgileri güncelleniyor');

    // Basic information
    setElementText('unitName', unit.name);
    setElementText('galleryName', gallery.name);
    setElementText('galleryNameInfo', gallery.name);
    // Update status in unit info
    const statusElement = document.getElementById('unitStatus');
    if (statusElement) {
        let statusText = unit.status || 'Çalışıyor';
        let statusColor = 'text-success';
        let statusIcon = 'bi-check-circle';
        
        if (unit.status === 'Arızalı') {
            statusColor = 'text-danger';
            statusIcon = 'bi-exclamation-triangle';
        } else if (unit.status === 'Bakımda') {
            statusColor = 'text-warning';
            statusIcon = 'bi-tools';
        }
        
        statusElement.innerHTML = `
            <span class="${statusColor} fw-bold">
                <i class="${statusIcon} me-1"></i>
                ${statusText}
            </span>
        `;
    }
    setElementText('lastMaintenance', formatDate(unit.lastMaintenance));

    // Faulty details
    const faultyDetailsRow = document.getElementById('faultyDetailsRow');
    const maintenanceDetailsRow = document.getElementById('maintenanceDetailsRow');
    if (unit.status === 'Arızalı') {
        if (faultyDetailsRow) faultyDetailsRow.style.display = 'block';
        if (maintenanceDetailsRow) maintenanceDetailsRow.style.display = 'none';
        setElementText('faultyReason', truncateText(unit.faultyReason || 'Belirtilmemiş', 150));
    } else if (unit.status === 'Bakımda') {
        if (faultyDetailsRow) faultyDetailsRow.style.display = 'none';
        if (maintenanceDetailsRow) maintenanceDetailsRow.style.display = 'block';
        setElementText('maintenanceTasks', truncateText(unit.maintenanceTasks || 'Belirtilmemiş', 150));
    } else {
        if (faultyDetailsRow) faultyDetailsRow.style.display = 'none';
        if (maintenanceDetailsRow) maintenanceDetailsRow.style.display = 'none';
    }
    
    // Admin UI elementlerini güncelle
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    if (typeof updateAdminUI === 'function') {
        updateAdminUI();
    }
    
    // Bakım durumuna göre buton görünürlüğünü ayarla
    const newMaintenanceBtn = document.querySelector('.admin-only');
    if (newMaintenanceBtn) {
        if (unit.status === 'Bakımda') {
            newMaintenanceBtn.style.display = 'none';
        } else {
            newMaintenanceBtn.style.display = 'block';
        }
    }

    // Technical details
    updateTechnicalDetails(unit);

    // Images and documents
    updateImagesAndDocuments(unit);

    debugLog('Ünite bilgileri başarıyla güncellendi');
}

// Helper function to safely set element text content
function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    } else {
        debugLog(`UYARI: ${elementId} ID'li element bulunamadı`);
    }
}

// Helper function to safely set element HTML
function setElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = html;
    } else {
        debugLog(`UYARI: ${elementId} ID'li element bulunamadı`);
    }
}

// Update technical details section
function updateTechnicalDetails(unit) {
    const technicalDetails = document.getElementById('technicalDetails');
    if (technicalDetails) {
        if (unit.technicalDetails || unit.maintenanceInstructions) {
            technicalDetails.innerHTML = `
                <div class="technical-details">
                    <div class="row">
                        ${unit.technicalDetails ? `
                        <div class="col-md-6">
                            <div class="detail-section mb-4">
                                <h6 class="detail-title">
                                    <i class="bi bi-gear text-primary me-2"></i>
                                    Teknik Özellikler
                                </h6>
                                <div class="detail-content">${truncateText(unit.technicalDetails, 300)}</div>
                            </div>
                        </div>
                        ` : ''}
                        ${unit.maintenanceInstructions ? `
                        <div class="col-md-6">
                            <div class="detail-section">
                                <h6 class="detail-title">
                                    <i class="bi bi-tools text-warning me-2"></i>
                                    Bakım Talimatları
                                </h6>
                                <div class="detail-content">${truncateText(unit.maintenanceInstructions, 300)}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else {
            technicalDetails.innerHTML = `
                <div class="no-content-placeholder">
                    <i class="bi bi-gear text-muted"></i>
                    <p class="text-muted mt-2">Henüz teknik detay eklenmemiş</p>
                </div>
            `;
        }
    }
}

// Helper function to truncate long text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

// Update images and documents sections
function updateImagesAndDocuments(unit) {
    // Update images
    const unitImages = document.getElementById('unitImages');
    if (unitImages) {
        if (unit.images && unit.images.length > 0) {
            unitImages.innerHTML = unit.images.map(image => {
                // Base64 formatında mı yoksa URL mi kontrol et
                const imageSource = image.base64Data || image.url || image;
                const imageName = image.name || 'Görsel';
                
                return `
                    <div class="unit-image mb-3">
                        <img src="${imageSource}" class="img-fluid rounded" alt="${imageName}" 
                             style="max-height: 300px; object-fit: cover; cursor: pointer;" 
                             onclick="showImageModal('${imageSource}', '${imageName}')">
                    </div>
                `;
            }).join('');
        } else {
            unitImages.innerHTML = `
                <div class="no-images-placeholder">
                    <i class="bi bi-images text-muted"></i>
                    <p class="text-muted mt-2">Henüz görsel eklenmemiş</p>
                    <small class="text-muted">Görseller admin panelinden eklenebilir.</small>
                </div>
            `;
        }
    }

    // Update documents
    const technicalDocuments = document.getElementById('technicalDocuments');
    if (technicalDocuments) {
        if (unit.documents && unit.documents.length > 0) {
            technicalDocuments.innerHTML = `
                <div class="documents-grid">
                    ${unit.documents.map(doc => {
                        const isPDF = doc.name.toLowerCase().endsWith('.pdf');
                        const iconClass = isPDF ? 'bi-file-earmark-pdf text-danger' : 'bi-file-earmark-text text-primary';
                        
                        // Base64 formatında mı yoksa URL mi kontrol et
                        const documentSource = doc.base64Data || doc.url || doc;
                        const documentName = doc.name || 'Doküman';
                        const documentSize = doc.size || 0;
                        
                        return `
                            <div class="document-item d-flex align-items-center p-3 mb-3 bg-light rounded">
                                <i class="bi ${iconClass} me-3 fs-4"></i>
                                <div class="flex-grow-1">
                                    <div class="fw-bold">${documentName}</div>
                                    <div class="text-muted small">${formatFileSize(documentSize)}</div>
                                    ${doc.status === 'failed' ? '<div class="text-danger small">❌ Yükleme başarısız</div>' : ''}
                                    ${doc.status === 'processed' ? '<div class="text-success small">✅ Base64 formatında</div>' : ''}
                                    ${doc.status === 'too_large' ? '<div class="text-warning small">⚠️ Dosya çok büyük (sadece isim)</div>' : ''}
                                </div>
                                <div class="btn-group" role="group">
                                    ${doc.status === 'too_large' ? 
                                        `<button class="btn btn-sm btn-secondary" disabled title="Dosya çok büyük - görüntülenemez">
                                            <i class="bi bi-eye-slash"></i>
                                        </button>
                                        <button class="btn btn-sm btn-secondary" disabled title="Dosya çok büyük - indirilemez">
                                            <i class="bi bi-download"></i>
                                        </button>` :
                                        `${isPDF ? 
                                            `<button class="btn btn-sm btn-primary" onclick="showPdfViewer('${documentSource}', '${documentName}')" title="PDF Görüntüle">
                                                <i class="bi bi-eye"></i>
                                            </button>` : 
                                            `<button class="btn btn-sm btn-outline-primary" onclick="window.open('${documentSource}', '_blank')" title="Görüntüle">
                                                <i class="bi bi-eye"></i>
                                            </button>`
                                        }
                                        <button class="btn btn-sm btn-success" onclick="downloadDocument('${documentSource}', '${documentName}')" title="İndir">
                                            <i class="bi bi-download"></i>
                                        </button>`
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            technicalDocuments.innerHTML = `
                <div class="no-content-placeholder">
                    <i class="bi bi-file-earmark-text text-muted"></i>
                    <p class="text-muted mt-2">Henüz teknik doküman eklenmemiş</p>
                    <small class="text-muted">Teknik dokümanlar admin panelinden eklenebilir.</small>
                </div>
            `;
        }
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
    const modalElement = document.getElementById('maintenanceModal');
    if (!modalElement) {
        console.error('Maintenance modal bulunamadı!');
        alert('Modal bulunamadı!');
        return;
    }
    
    // Bootstrap varsa kullan, yoksa manuel aç
    if (typeof bootstrap !== 'undefined') {
        try {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } catch (error) {
            console.error('Bootstrap modal hatası:', error);
            // Manuel açma yöntemine geç
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
            
            // Backdrop ekle
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
        }
    } else {
        // Manuel modal açma
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Backdrop ekle
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        
        console.log('Bootstrap bulunamadı, manuel modal açıldı');
    }
}

// Save maintenance
async function saveMaintenance() {
    if (!window.db) {
        console.error('Firebase henüz başlatılmadı');
        return;
    }

    // URL'den parametreleri al
    const urlParams = new URLSearchParams(window.location.search);
    const galleryId = urlParams.get('galleryId');
    const unitId = urlParams.get('unitId');
    
    if (!galleryId || !unitId) {
        alert('Galeri veya ünite bilgisi bulunamadı!');
        return;
    }

    const type = document.getElementById('maintenanceType').value;
    const priority = document.getElementById('maintenancePriority').value;
    const actions = document.getElementById('maintenanceActions').value;
    const status = document.getElementById('maintenanceStatus').value;
    const estimatedDuration = document.getElementById('estimatedDuration').value;
    const notes = document.getElementById('maintenanceNotes').value;

    if (!type || !actions || !status) {
        alert('Bakım türü, yapılacak işlemler ve durum alanları zorunludur!');
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
        const unitIndex = units.findIndex(u => String(u.id) === String(unitId));
        
        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Yeni bakım kaydı
        const maintenanceRecord = {
            id: Date.now().toString(), // Benzersiz ID
            date: new Date().toISOString(),
            type: type,
            priority: priority,
            actions: actions,
            status: status,
            estimatedDuration: estimatedDuration,
            notes: notes,
            technician: firebase.auth().currentUser?.email || 'Bilinmeyen Kullanıcı',
            startDate: status === 'Başlatıldı' || status === 'Devam Ediyor' ? new Date().toISOString() : null
        };

        // Bakım geçmişini güncelle
        units[unitIndex].maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        units[unitIndex].maintenanceHistory.push(maintenanceRecord);

        // Ünite durumunu güncelle
        if (status === 'Başlatıldı' || status === 'Devam Ediyor') {
            units[unitIndex].status = 'Bakımda';
            units[unitIndex].maintenanceTasks = actions;
        } else if (status === 'Tamamlandı') {
            units[unitIndex].status = 'Çalışıyor';
            units[unitIndex].maintenanceTasks = '';
        }

        // Son bakım tarihini güncelle
        units[unitIndex].lastMaintenance = maintenanceRecord.date;

        // Firestore'u güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: units,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Modal'ı kapat
        const modalElement = document.getElementById('maintenanceModal');
        if (typeof bootstrap !== 'undefined') {
            try {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            } catch (error) {
                console.error('Modal kapatma hatası:', error);
                // Manuel kapatma
                modalElement.style.display = 'none';
                modalElement.classList.remove('show');
                document.body.classList.remove('modal-open');
                
                // Backdrop'ı kaldır
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }
        } else {
            // Manuel kapatma
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            // Backdrop'ı kaldır
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }

        // Formu temizle
        document.getElementById('maintenanceForm').reset();

        // Sayfayı yenile
        await loadUnitDetails();

        // Başarı mesajı göster
        const successMessage = status === 'Başlatıldı' ? 
            'Bakım başarıyla başlatıldı! Ünite bakım durumuna alındı.' : 
            'Bakım kaydı başarıyla eklendi.';
        alert(successMessage);
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
                <td colspan="7" class="text-center">
                    <div class="no-content-placeholder">
                        <i class="bi bi-clock-history text-muted"></i>
                        <p class="text-muted mt-2">Henüz bakım kaydı bulunmuyor</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    maintenanceTable.innerHTML = maintenanceHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => {
            let statusClass = 'bg-success';
            let statusIcon = 'bi-check-circle';
            
            if (record.status === 'Devam Ediyor') {
                statusClass = 'bg-warning';
                statusIcon = 'bi-clock';
            } else if (record.status === 'Beklemede') {
                statusClass = 'bg-info';
                statusIcon = 'bi-pause-circle';
            } else if (record.status === 'Başlatıldı') {
                statusClass = 'bg-primary';
                statusIcon = 'bi-play-circle';
            }
            
            let priorityClass = 'text-success';
            if (record.priority === 'Yüksek') {
                priorityClass = 'text-warning';
            } else if (record.priority === 'Acil') {
                priorityClass = 'text-danger';
            }
            
            return `
                <tr class="maintenance-row">
                    <td>
                        <i class="bi bi-calendar me-1"></i>
                        ${formatDate(record.date)}
                    </td>
                    <td>
                        <i class="bi bi-tools me-1"></i>
                        ${record.type}
                        ${record.priority ? `<br><small class="${priorityClass}"><i class="bi bi-flag me-1"></i>${record.priority}</small>` : ''}
                    </td>
                    <td>
                        <div class="maintenance-actions">
                            ${record.actions}
                            ${record.estimatedDuration ? `<br><small class="text-muted"><i class="bi bi-clock me-1"></i>${record.estimatedDuration}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="badge ${statusClass}">
                            <i class="${statusIcon} me-1"></i>
                            ${record.status}
                        </span>
                    </td>
                    <td>
                        <i class="bi bi-person me-1"></i>
                        ${record.technician}
                    </td>
                    <td>
                        ${record.notes ? `<small class="text-muted">${record.notes}</small>` : '-'}
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            ${record.status === 'Devam Ediyor' || record.status === 'Başlatıldı' ? 
                                `<button class="btn btn-sm btn-success" onclick="completeMaintenance('${record.id}')" title="Tamamla">
                                    <i class="bi bi-check-circle"></i>
                                </button>` : 
                                ''
                            }
                            <button class="btn btn-sm btn-primary" onclick="editMaintenance('${record.id}')" title="Düzenle">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
}

// Geri dön fonksiyonu
function goBack() {
    // Ana sayfaya dön ve galeri üniteler modalını aç
    const urlParams = new URLSearchParams(window.location.search);
    const galleryId = urlParams.get('galleryId');
    
    if (galleryId) {
        // Ana sayfaya dön ve galeri modalını aç
        window.location.href = `index.html?openGallery=${galleryId}`;
    } else {
        // Galeri ID yoksa direkt ana sayfaya dön
        window.location.href = 'index.html';
    }
}

// Mevcut üniteyi sil
async function deleteCurrentUnit() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');
        
        if (!galleryId || !unitId) {
            alert('Galeri veya ünite bilgisi eksik!');
            return;
        }
        
        // Galeri dokümanını al
        const galleryDoc = await window.db.collection('galleries').doc(galleryId).get();
        
        if (!galleryDoc.exists) {
            alert('Galeri bulunamadı!');
            return;
        }
        
        const gallery = galleryDoc.data();
        const unit = gallery.units.find(u => String(u.id) === String(unitId));
        
        if (!unit) {
            alert('Ünite bulunamadı!');
            return;
        }
        
        // Onay al
        const confirmDelete = confirm(`"${unit.name}" ünitesini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve üniteye ait tüm bakım geçmişi de silinecektir.`);
        
        if (!confirmDelete) {
            return;
        }
        
        // Loading göster
        const deleteButton = event.target.closest('button');
        const originalContent = deleteButton.innerHTML;
        deleteButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Siliniyor...';
        deleteButton.disabled = true;
        
        // Üniteyi listeden çıkar
        const updatedUnits = gallery.units.filter(u => String(u.id) !== String(unitId));
        
        // Galeriyi güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: updatedUnits,
            updatedAt: new Date().toISOString()
        });
        
        // Başarı mesajı ve yönlendirme
        alert(`"${unit.name}" ünitesi başarıyla silindi.`);
        
        // Ana sayfaya yönlendir
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Ünite silinirken hata:', error);
        alert('Ünite silinirken bir hata oluştu: ' + error.message);
        
        // Buton durumunu geri al
        const deleteButton = event.target.closest('button');
        if (deleteButton) {
            deleteButton.innerHTML = '<i class="bi bi-trash3"></i> Ünite Sil';
            deleteButton.disabled = false;
        }
    }
}

// Complete maintenance
async function completeMaintenance(maintenanceId) {
    if (!confirm('Bu bakım işlemini tamamlamak istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => String(u.id) === String(unitId));

        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Bakım kaydını bul ve güncelle
        const maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        const maintenanceIndex = maintenanceHistory.findIndex(m => m.id === maintenanceId);

        if (maintenanceIndex === -1) {
            alert('Bakım kaydı bulunamadı!');
            return;
        }

        // Bakım durumunu güncelle
        maintenanceHistory[maintenanceIndex].status = 'Tamamlandı';
        maintenanceHistory[maintenanceIndex].endDate = new Date().toISOString();

        // Ünite durumunu güncelle
        units[unitIndex].status = 'Çalışıyor';
        units[unitIndex].maintenanceTasks = '';

        // Firestore'u güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: units,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Sayfayı yenile
        await loadUnitDetails();

        alert('Bakım başarıyla tamamlandı! Ünite tekrar çalışır duruma alındı.');
    } catch (error) {
        console.error('Bakım tamamlanırken hata:', error);
        alert('Bakım tamamlanırken bir hata oluştu: ' + error.message);
    }
}

// Edit maintenance
async function editMaintenance(maintenanceId) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => String(u.id) === String(unitId));

        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Bakım kaydını bul
        const maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        const maintenanceRecord = maintenanceHistory.find(m => m.id === maintenanceId);

        if (!maintenanceRecord) {
            alert('Bakım kaydı bulunamadı!');
            return;
        }

        // Modal'ı doldur
        document.getElementById('editMaintenanceId').value = maintenanceId;
        document.getElementById('editMaintenanceType').value = maintenanceRecord.type || '';
        document.getElementById('editMaintenancePriority').value = maintenanceRecord.priority || 'Normal';
        document.getElementById('editMaintenanceActions').value = maintenanceRecord.actions || '';
        document.getElementById('editMaintenanceStatus').value = maintenanceRecord.status || '';
        document.getElementById('editEstimatedDuration').value = maintenanceRecord.estimatedDuration || '';
        document.getElementById('editMaintenanceNotes').value = maintenanceRecord.notes || '';

        // Modal'ı aç
        const modalElement = document.getElementById('editMaintenanceModal');
        if (typeof bootstrap !== 'undefined') {
            try {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } catch (error) {
                console.error('Modal açma hatası:', error);
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                document.body.classList.add('modal-open');
            }
        } else {
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
        }
    } catch (error) {
        console.error('Bakım düzenleme modalı açılırken hata:', error);
        alert('Bakım düzenleme modalı açılırken bir hata oluştu: ' + error.message);
    }
}

// Update maintenance
async function updateMaintenance() {
    try {
        const maintenanceId = document.getElementById('editMaintenanceId').value;
        const type = document.getElementById('editMaintenanceType').value;
        const priority = document.getElementById('editMaintenancePriority').value;
        const actions = document.getElementById('editMaintenanceActions').value;
        const status = document.getElementById('editMaintenanceStatus').value;
        const estimatedDuration = document.getElementById('editEstimatedDuration').value;
        const notes = document.getElementById('editMaintenanceNotes').value;

        if (!type || !actions || !status) {
            alert('Bakım türü, yapılacak işlemler ve durum alanları zorunludur!');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => String(u.id) === String(unitId));

        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Bakım kaydını bul ve güncelle
        const maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        const maintenanceIndex = maintenanceHistory.findIndex(m => m.id === maintenanceId);

        if (maintenanceIndex === -1) {
            alert('Bakım kaydı bulunamadı!');
            return;
        }

        // Bakım kaydını güncelle
        maintenanceHistory[maintenanceIndex] = {
            ...maintenanceHistory[maintenanceIndex],
            type: type,
            priority: priority,
            actions: actions,
            status: status,
            estimatedDuration: estimatedDuration,
            notes: notes,
            updatedAt: new Date().toISOString()
        };

        // Ünite durumunu güncelle
        if (status === 'Başlatıldı' || status === 'Devam Ediyor') {
            units[unitIndex].status = 'Bakımda';
            units[unitIndex].maintenanceTasks = actions;
        } else if (status === 'Tamamlandı') {
            units[unitIndex].status = 'Çalışıyor';
            units[unitIndex].maintenanceTasks = '';
        }

        // Firestore'u güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: units,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Modal'ı kapat
        const modalElement = document.getElementById('editMaintenanceModal');
        if (typeof bootstrap !== 'undefined') {
            try {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            } catch (error) {
                modalElement.style.display = 'none';
                modalElement.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        } else {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            document.body.classList.remove('modal-open');
        }

        // Sayfayı yenile
        await loadUnitDetails();

        alert('Bakım kaydı başarıyla güncellendi!');
    } catch (error) {
        console.error('Bakım güncellenirken hata:', error);
        alert('Bakım güncellenirken bir hata oluştu: ' + error.message);
    }
}

// Delete maintenance
async function deleteMaintenance() {
    const maintenanceId = document.getElementById('editMaintenanceId').value;
    
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const galleryId = urlParams.get('galleryId');
        const unitId = urlParams.get('unitId');

        const docRef = await window.db.collection('galleries').doc(galleryId).get();
        const gallery = docRef.data();
        const units = gallery.units || [];
        const unitIndex = units.findIndex(u => String(u.id) === String(unitId));

        if (unitIndex === -1) {
            alert('Ünite bulunamadı!');
            return;
        }

        // Bakım kaydını bul ve sil
        const maintenanceHistory = units[unitIndex].maintenanceHistory || [];
        const maintenanceIndex = maintenanceHistory.findIndex(m => m.id === maintenanceId);

        if (maintenanceIndex === -1) {
            alert('Bakım kaydı bulunamadı!');
            return;
        }

        // Bakım kaydını sil
        maintenanceHistory.splice(maintenanceIndex, 1);

        // Eğer silinen bakım aktifse, ünite durumunu güncelle
        const deletedMaintenance = maintenanceHistory[maintenanceIndex];
        if (deletedMaintenance && (deletedMaintenance.status === 'Başlatıldı' || deletedMaintenance.status === 'Devam Ediyor')) {
            // Başka aktif bakım var mı kontrol et
            const hasActiveMaintenance = maintenanceHistory.some(m => 
                m.status === 'Başlatıldı' || m.status === 'Devam Ediyor'
            );
            
            if (!hasActiveMaintenance) {
                units[unitIndex].status = 'Çalışıyor';
                units[unitIndex].maintenanceTasks = '';
            }
        }

        // Firestore'u güncelle
        await window.db.collection('galleries').doc(galleryId).update({
            units: units,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Modal'ı kapat
        const modalElement = document.getElementById('editMaintenanceModal');
        if (typeof bootstrap !== 'undefined') {
            try {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            } catch (error) {
                modalElement.style.display = 'none';
                modalElement.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        } else {
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            document.body.classList.remove('modal-open');
        }

        // Sayfayı yenile
        await loadUnitDetails();

        alert('Bakım kaydı başarıyla silindi!');
    } catch (error) {
        console.error('Bakım silinirken hata:', error);
        alert('Bakım silinirken bir hata oluştu: ' + error.message);
    }
}

// PDF Viewer Variables
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
let currentPdfUrl = '';

// Show PDF Viewer
async function showPdfViewer(pdfUrl, fileName) {
    try {
        currentPdfUrl = pdfUrl;
        document.getElementById('pdfFileName').textContent = fileName || 'PDF Dosyası';
        
        // Modal'ı aç
        const modalElement = document.getElementById('pdfViewerModal');
        if (typeof bootstrap !== 'undefined') {
            try {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } catch (error) {
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                document.body.classList.add('modal-open');
            }
        } else {
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
        }

        // PDF'i yükle
        await loadPDF(pdfUrl);
    } catch (error) {
        console.error('PDF görüntüleyici açılırken hata:', error);
        alert('PDF dosyası yüklenirken bir hata oluştu: ' + error.message);
    }
}

// Load PDF
async function loadPDF(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        
        document.getElementById('pageCount').textContent = pdfDoc.numPages;
        pageNum = 1;
        scale = 1.0;
        
        renderPage(pageNum);
    } catch (error) {
        console.error('PDF yüklenirken hata:', error);
        alert('PDF dosyası yüklenirken bir hata oluştu: ' + error.message);
    }
}

// Render PDF page
async function renderPage(num) {
    pageRendering = true;
    
    try {
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        pageNum = num;
        document.getElementById('pageNum').textContent = num;
        document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
        
        // Buton durumlarını güncelle
        document.getElementById('prevPageBtn').disabled = num <= 1;
        document.getElementById('nextPageBtn').disabled = num >= pdfDoc.numPages;
        
        pageRendering = false;
        
        if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
        }
    } catch (error) {
        console.error('Sayfa render edilirken hata:', error);
        pageRendering = false;
    }
}

// Queue rendering of the next page
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Previous page
function previousPage() {
    if (pageNum <= 1) {
        return;
    }
    queueRenderPage(pageNum - 1);
}

// Next page
function nextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    queueRenderPage(pageNum + 1);
}

// Zoom in
function zoomIn() {
    scale *= 1.2;
    renderPage(pageNum);
}

// Zoom out
function zoomOut() {
    scale /= 1.2;
    renderPage(pageNum);
}

// Download PDF
function downloadPDF() {
    if (currentPdfUrl) {
        const link = document.createElement('a');
        link.href = currentPdfUrl;
        link.download = document.getElementById('pdfFileName').textContent + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Görsel modalını göster
function showImageModal(imageSource, imageName) {
    // Modal HTML'ini oluştur
    const modalHTML = `
        <div class="modal fade" id="imageModal" tabindex="-1" aria-labelledby="imageModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="imageModalLabel">
                            <i class="bi bi-image me-2"></i>
                            ${imageName}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center p-0">
                        <img src="${imageSource}" class="img-fluid" alt="${imageName}" style="max-width: 100%; height: auto;">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Kapat
                        </button>
                        <button type="button" class="btn btn-primary" onclick="downloadImage('${imageSource}', '${imageName}')">
                            <i class="bi bi-download"></i> İndir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Mevcut modal'ı kaldır (varsa)
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Modal'ı body'ye ekle
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Modal'ı göster
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
    
    // Modal kapandığında DOM'dan kaldır
    document.getElementById('imageModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// Görsel indirme fonksiyonu
function downloadImage(imageSource, imageName) {
    try {
        const link = document.createElement('a');
        link.href = imageSource;
        link.download = imageName || 'image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Görsel indirme hatası:', error);
        alert('Görsel indirilemedi: ' + error.message);
    }
}

// Download Document
function downloadDocument(url, fileName) {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Doküman indirme hatası:', error);
        alert('Doküman indirilemedi: ' + error.message);
    }
}

// Modal Functions
function showImageUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById('imageUploadModal'));
    modal.show();
    
    // Reset form
    document.getElementById('imageUploadForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
}

function showTechnicalDetailsModal() {
    const modal = new bootstrap.Modal(document.getElementById('technicalDetailsModal'));
    modal.show();
    
    // Load current data if exists
    const currentUnit = getCurrentUnit();
    if (currentUnit) {
        document.getElementById('technicalDetailsInput').value = currentUnit.technicalDetails || '';
        document.getElementById('maintenanceInstructionsInput').value = currentUnit.maintenanceInstructions || '';
    }
}

function showDocumentUploadModal() {
    const modal = new bootstrap.Modal(document.getElementById('documentUploadModal'));
    modal.show();
    
    // Reset form
    document.getElementById('documentUploadForm').reset();
    document.getElementById('documentPreview').innerHTML = '';
}

// Save Functions
async function saveImages() {
    const fileInput = document.getElementById('imageUploadInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Lütfen en az bir görsel seçin.');
        return;
    }

    try {
        const imageUrls = await uploadImages(files);
        const currentUnit = getCurrentUnit();
        
        if (currentUnit) {
            // Add new images to existing ones
            const updatedImages = [...(currentUnit.images || []), ...imageUrls];
            
            // Update unit in Firebase
            const unitId = getCurrentUnitId();
            const galleryId = getCurrentGalleryId();
            
            await updateDoc(doc(db, 'galleries', galleryId, 'units', unitId), {
                images: updatedImages
            });
            
            // Refresh the page
            location.reload();
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('imageUploadModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Görsel kaydetme hatası:', error);
        alert('Görseller kaydedilirken bir hata oluştu: ' + error.message);
    }
}

async function saveTechnicalDetails() {
    const technicalDetails = document.getElementById('technicalDetailsInput').value.trim();
    const maintenanceInstructions = document.getElementById('maintenanceInstructionsInput').value.trim();
    
    if (!technicalDetails && !maintenanceInstructions) {
        alert('Lütfen en az bir alan doldurun.');
        return;
    }

    try {
        const currentUnit = getCurrentUnit();
        if (currentUnit) {
            const unitId = getCurrentUnitId();
            const galleryId = getCurrentGalleryId();
            
            const updateData = {};
            if (technicalDetails) updateData.technicalDetails = technicalDetails;
            if (maintenanceInstructions) updateData.maintenanceInstructions = maintenanceInstructions;
            
            await updateDoc(doc(db, 'galleries', galleryId, 'units', unitId), updateData);
            
            // Refresh the page
            location.reload();
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('technicalDetailsModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Teknik detay kaydetme hatası:', error);
        alert('Teknik detaylar kaydedilirken bir hata oluştu: ' + error.message);
    }
}

async function saveDocuments() {
    const fileInput = document.getElementById('documentUploadInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Lütfen en az bir doküman seçin.');
        return;
    }

    try {
        const documents = await uploadDocuments(files);
        const currentUnit = getCurrentUnit();
        
        if (currentUnit) {
            // Add new documents to existing ones
            const updatedDocuments = [...(currentUnit.documents || []), ...documents];
            
            // Update unit in Firebase
            const unitId = getCurrentUnitId();
            const galleryId = getCurrentGalleryId();
            
            await updateDoc(doc(db, 'galleries', galleryId, 'units', unitId), {
                documents: updatedDocuments
            });
            
            // Refresh the page
            location.reload();
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('documentUploadModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Doküman kaydetme hatası:', error);
        alert('Dokümanlar kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Helper Functions
function getCurrentUnit() {
    const unitId = getCurrentUnitId();
    const galleries = getGalleries();
    
    for (const gallery of galleries) {
        const unit = gallery.units.find(u => u.id === unitId);
        if (unit) return unit;
    }
    return null;
}

function getCurrentUnitId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('unitId');
}

function getCurrentGalleryId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('galleryId');
}

// Enhanced upload functions for modals
async function uploadImages(files) {
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
            
        } catch (uploadError) {
            console.error('Görsel yükleme hatası:', uploadError);
            throw uploadError;
        }
    }
    
    return imageUrls;
}

async function uploadDocuments(files) {
    const documentPromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    type: file.type
                });
            };
            reader.readAsDataURL(file);
        });
    });

    return Promise.all(documentPromises);
} 