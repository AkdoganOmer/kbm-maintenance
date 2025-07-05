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

    // Auth state değişikliklerini dinle - sadece login sayfasında
    window.auth.onAuthStateChanged((user) => {
        loginDebug('Auth state değişti:', user ? user.email : 'oturum kapalı');
        
        // Sadece kullanıcı giriş yapmışsa ve login sayfasındaysa yönlendir
        if (user && sessionStorage.getItem('userRole') && window.location.pathname.includes('login.html')) {
            loginDebug('Kullanıcı zaten giriş yapmış, yönlendiriliyor');
            window.location.href = 'index.html';
        }
    });
    
    // Form elemanlarını al
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const loading = document.getElementById('loading');
    
    // Form gönderildiğinde
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Giriş butonunu devre dışı bırak ve yükleniyor göster
        loginButton.disabled = true;
        loading.style.display = 'block';
        hideError();

        try {
            loginDebug('Giriş denemesi başlatıldı:', { email });

            // Firebase ile giriş yap
            const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
            loginDebug('Giriş başarılı:', userCredential);

            // Kullanıcı bilgilerini sessionStorage'a kaydet
            const user = userCredential.user;
            sessionStorage.setItem('userId', user.uid);
            sessionStorage.setItem('userEmail', user.email);

            try {
                // Kullanıcı rolünü Firestore'dan al
                const userDoc = await window.db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    sessionStorage.setItem('userRole', userData.role || 'staff');
                    sessionStorage.setItem('userName', userData.name || user.email.split('@')[0]);
                    loginDebug('Kullanıcı bilgileri kaydedildi:', userData);
                } else {
                    // Kullanıcı dokümanı yoksa varsayılan değerler ata
                    loginDebug('Kullanıcı dokümanı bulunamadı, varsayılan değerler atanıyor');
                    sessionStorage.setItem('userRole', 'staff');
                    sessionStorage.setItem('userName', user.email.split('@')[0]);
                    
                    // Kullanıcı dokümanını oluştur
                    await window.db.collection('users').doc(user.uid).set({
                        email: user.email,
                        name: user.email.split('@')[0],
                        role: 'staff',
                        createdAt: new Date().toISOString()
                    });
                }

                // Ana sayfaya yönlendir
                window.location.href = 'index.html';
            } catch (firestoreError) {
                loginDebug('Firestore hatası:', firestoreError);
                // Firestore hatası olsa bile kullanıcıyı varsayılan rolle giriş yaptır
                sessionStorage.setItem('userRole', 'staff');
                sessionStorage.setItem('userName', user.email.split('@')[0]);
                window.location.href = 'index.html';
            }

        } catch (error) {
            loginDebug('Giriş hatası:', error);
            
            // Hata mesajlarını Türkçeleştir
            let errorMessage = 'Giriş yapılırken bir hata oluştu.';
            
            switch(error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Geçersiz e-posta adresi.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Bu hesap devre dışı bırakılmış.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Hatalı şifre.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showError(errorMessage);
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