// Firebase referansı
const db = firebase.firestore();

// Sayfa yüklendiğinde çalışacak
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase'in yüklenmesini bekle
        await new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                console.log('Firebase zaten yüklü');
                resolve();
                return;
            }

            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    console.log('Firebase yüklendi');
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        });

        // Sayfayı başlat
        await loadGalleryDetails();
    } catch (error) {
        console.error('Sayfa başlatılırken hata:', error);
        alert('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
});

async function loadGalleryDetails() {
    const galleryId = localStorage.getItem('selectedGalleryId');
    if (!galleryId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const docRef = await db.collection('galleries').doc(galleryId).get();
        
        if (!docRef.exists) {
            alert('Galeri bulunamadı!');
            window.location.href = 'index.html';
            return;
        }

        const gallery = docRef.data();
        
        // Update page title
        document.getElementById('galleryTitle').textContent = gallery.name;

        // Get units for the selected gallery
        const units = gallery.units || [];
        const tableBody = document.getElementById('unitsTable');
        tableBody.innerHTML = '';

        if (units.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        Bu galeride henüz ünite bulunmamaktadır.
                    </td>
                </tr>
            `;
            return;
        }

        units.forEach(unit => {
            const row = document.createElement('tr');
            row.className = unit.status === 'Arızalı' ? 'table-danger' : '';
            row.style.cursor = 'pointer';
            row.onclick = () => showUnitDetails(unit.id);
            row.innerHTML = `
                <td>${unit.name}</td>
                <td>
                    <span class="badge ${unit.status === 'Arızalı' ? 'bg-danger' : 'bg-success'}">
                        ${unit.status || 'Çalışıyor'}
                    </span>
                </td>
                <td>${formatDate(unit.lastMaintenance)}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Galeri detayları yüklenirken hata:', error);
        alert('Galeri detayları yüklenirken bir hata oluştu.');
    }
}

// Function to show unit details
function showUnitDetails(unitId) {
    localStorage.setItem('selectedUnitId', String(unitId));
    window.location.href = 'unit-details.html';
}

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
} 