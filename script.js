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

        // Dashboard verilerini yükle
        await loadDashboard();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        alert('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

// Dashboard verilerini yükle
async function loadDashboard() {
    try {
        // Tüm galerileri al
        const snapshot = await firebase.firestore().collection('galleries').get();
        const galleries = [];
        snapshot.forEach(doc => {
            galleries.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // İstatistikleri göster
        displayStats(galleries);

        // Arızalı üniteleri göster
        displayFaultyUnits(galleries);

        // Son bakımları göster
        displayRecentMaintenance(galleries);

        // Kullanıcı bilgisini göster
        const user = firebase.auth().currentUser;
        if (user) {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            if (currentUser && currentUser.displayName) {
                document.getElementById('userInfo').textContent = currentUser.displayName;
            } else {
                document.getElementById('userInfo').textContent = user.email.split('@')[0];
            }
        }
    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
        alert('Veriler yüklenirken bir hata oluştu.');
    }
}

// İstatistikleri göster
function displayStats(galleries) {
    // Toplam galeri sayısı
    document.getElementById('totalGalleries').textContent = galleries.length;

    let totalUnits = 0;
    let faultyUnits = 0;
    let monthlyMaintenance = 0;
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    galleries.forEach(gallery => {
        if (gallery.units) {
            // Toplam ünite sayısı
            totalUnits += gallery.units.length;

            // Arızalı ünite sayısı
            faultyUnits += gallery.units.filter(unit => unit.status === 'Arızalı').length;

            // Bu ayki bakım sayısı
            gallery.units.forEach(unit => {
                if (unit.maintenanceHistory) {
                    monthlyMaintenance += unit.maintenanceHistory.filter(record => {
                        const maintenanceDate = new Date(record.date);
                        return maintenanceDate >= firstDayOfMonth;
                    }).length;
                }
            });
        }
    });

    document.getElementById('totalUnits').textContent = totalUnits;
    document.getElementById('faultyUnitsCount').textContent = faultyUnits;
    document.getElementById('maintenanceCount').textContent = monthlyMaintenance;
}

// Arızalı üniteleri göster
function displayFaultyUnits(galleries) {
    const faultyUnitsDiv = document.getElementById('faultyUnits');
    const faultyUnits = [];

    // Tüm galerilerdeki arızalı üniteleri topla
    galleries.forEach(gallery => {
        if (gallery.units) {
            const faulty = gallery.units.filter(unit => unit.status === 'Arızalı');
            faultyUnits.push(...faulty.map(unit => ({
                ...unit,
                galleryName: gallery.name,
                galleryId: gallery.id
            })));
        }
    });

    if (faultyUnits.length === 0) {
        faultyUnitsDiv.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> Arızalı ünite bulunmuyor.</div>';
        return;
    }

    faultyUnitsDiv.innerHTML = `
        <div class="list-group">
            ${faultyUnits.map(unit => `
                <a href="unit-details.html?galleryId=${unit.galleryId}&unitId=${unit.id}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${unit.name}</h6>
                        <small class="text-danger"><i class="bi bi-exclamation-circle"></i> Arızalı</small>
                    </div>
                    <p class="mb-1">${unit.faultyReason || 'Arıza sebebi belirtilmemiş'}</p>
                    <small class="text-muted"><i class="bi bi-grid"></i> ${unit.galleryName}</small>
                </a>
            `).join('')}
        </div>
    `;
}

// Son bakımları göster
function displayRecentMaintenance(galleries) {
    const recentMaintenanceDiv = document.getElementById('recentMaintenance');
    const allMaintenance = [];

    // Tüm galerilerdeki bakım kayıtlarını topla
    galleries.forEach(gallery => {
        if (gallery.units) {
            gallery.units.forEach(unit => {
                if (unit.maintenanceHistory) {
                    allMaintenance.push(...unit.maintenanceHistory.map(record => ({
                        ...record,
                        unitName: unit.name,
                        galleryName: gallery.name,
                        unitId: unit.id,
                        galleryId: gallery.id
                    })));
                }
            });
        }
    });

    if (allMaintenance.length === 0) {
        recentMaintenanceDiv.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> Henüz bakım kaydı bulunmuyor.</div>';
        return;
    }

    // Son 5 bakım kaydını göster
    const recentMaintenance = allMaintenance
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    recentMaintenanceDiv.innerHTML = `
        <div class="list-group">
            ${recentMaintenance.map(record => `
                <a href="unit-details.html?galleryId=${record.galleryId}&unitId=${record.unitId}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${record.unitName}</h6>
                        <small>${formatDate(record.date)}</small>
                    </div>
                    <p class="mb-1">${record.actions}</p>
                    <small class="text-muted">
                        <i class="bi bi-grid"></i> ${record.galleryName} - 
                        <i class="bi bi-tools"></i> ${record.type}
                    </small>
                </a>
            `).join('')}
        </div>
    `;
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