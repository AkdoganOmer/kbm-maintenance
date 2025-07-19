// Debug fonksiyonu
function loginDebug(message, data = null) {
    if (window.debug) {
        const prefix = '[Login]';
        if (data) {
            window.debug(prefix + ' ' + message, data);
        } else {
            window.debug(prefix + ' ' + message);
        }
    }
}

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loginDebug('Login sayfası yüklendi');
    
    // Firebase başlatma kontrolü
    if (!window.checkFirebaseStatus()) {
        showError('Firebase başlatılamadı. Lütfen daha sonra tekrar deneyin.');
        return;
    }

    // Firebase Auth listener kaldırıldı - manual authentication kullanıyoruz
    
    // Form elemanlarını al
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const loading = document.getElementById('loading');
    
    // Form gönderildiğinde
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Giriş butonunu devre dışı bırak ve yükleniyor göster
        loginButton.disabled = true;
        loading.style.display = 'block';
        hideError();

        try {
            loginDebug('Giriş denemesi başlatıldı:', { username });

            // Firebase bağlantısı kontrol et
            if (!window.db) {
                throw new Error('Firebase bağlantısı kurulamadı. Lütfen sistem yöneticisine başvurun.');
            }

            // Personel koleksiyonundan kullanıcıyı bul
            const personnelQuery = await window.db.collection('personnel')
                .where('username', '==', username)
                .where('isActive', '==', true)
                .get();

            if (personnelQuery.empty) {
                throw new Error('Bu kullanıcı adı ile kayıtlı aktif bir personel bulunamadı.');
            }

            // Personel bilgilerini al
            const personnelDoc = personnelQuery.docs[0];
            const personnelData = personnelDoc.data();

            // Şifre kontrolü (gerçek uygulamada hash karşılaştırması yapılmalı)
            if (personnelData.password !== password) {
                throw new Error('Hatalı şifre.');
            }

            loginDebug('Personel doğrulandı:', personnelData);

            // Giriş bilgilerini session'a kaydet
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('userId', personnelDoc.id);
            sessionStorage.setItem('userUsername', personnelData.username);
            sessionStorage.setItem('userName', personnelData.name);
            sessionStorage.setItem('userRole', personnelData.role);
            sessionStorage.setItem('userDepartment', personnelData.department || '');
            
            // currentUser objesini de kaydet
            const currentUser = {
                id: personnelDoc.id,
                name: personnelData.name,
                username: personnelData.username,
                role: personnelData.role,
                department: personnelData.department || '',
                password: personnelData.password
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

            loginDebug('Giriş başarılı, session bilgileri kaydedildi');

            // Ana sayfaya yönlendir
            window.location.href = 'index.html';

        } catch (error) {
            loginDebug('Giriş hatası:', error);
            
            // Hata mesajını göster
            showError(error.message || 'Giriş yapılırken bir hata oluştu.');
        } finally {
            // Giriş butonunu tekrar aktif et ve yükleniyor gizle
            loginButton.disabled = false;
            loading.style.display = 'none';
        }
    });
});

// Hata mesajını göster
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Hata mesajını gizle
function hideError() {
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.add('d-none');
}

// Bu kod gereksiz, auth.js zaten kontrol ediyor 