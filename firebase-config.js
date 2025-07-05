/*
Firebase Console'dan (https://console.firebase.google.com/) aldığınız yapılandırma bilgilerini
aşağıdaki firebaseConfig objesine yapıştırın. Yapılandırma bilgileri şuna benzer olacak:

const firebaseConfig = {
  apiKey: "AIzaSyA1234567890-AbCdEfGhIjKlMnOpQrStUv",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
*/

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyC-q-7B2IVQDRdNmUJ5K_UT-Tp2j1gZHIk",
    authDomain: "sergi-bakim-onarim.firebaseapp.com",
    projectId: "sergi-bakim-onarim",
    storageBucket: "sergi-bakim-onarim.appspot.com",
    messagingSenderId: "998277420747",
    appId: "1:998277420747:web:663a465d9e198a2fadad4e",
    measurementId: "G-7D0P08YB4W"
};

// Debug modu
window.isDebug = true;

// Debug fonksiyonu
window.debug = function(message, data = null) {
    if (window.isDebug) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}]`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
}

// Firebase'i başlat
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.debug('Firebase başlatıldı', firebaseConfig);
    }

    // Firestore referansı
    window.db = firebase.firestore();
    window.debug('Firestore referansı oluşturuldu');

    // Auth referansı
    window.auth = firebase.auth();
    window.debug('Auth referansı oluşturuldu');

    // Firebase durumunu kontrol et
    window.checkFirebaseStatus = function() {
        try {
            if (firebase.apps.length) {
                window.debug('Firebase durumu: Aktif');
                if (window.db) {
                    window.debug('Firestore durumu: Hazır');
                }
                if (window.auth) {
                    window.debug('Auth durumu: Hazır');
                }
                return true;
            }
            window.debug('Firebase durumu: Başlatılmadı');
            return false;
        } catch (error) {
            window.debug('Firebase durum kontrolünde hata:', error);
            return false;
        }
    }

    // İlk durum kontrolü
    window.checkFirebaseStatus();

} catch (error) {
    console.error('Firebase başlatma hatası:', error);
    window.debug('Firebase başlatma hatası:', error);
}

// Storage referansı - sadece gerekirse
try {
    window.storage = firebase.storage();
    window.debug('Storage referansı oluşturuldu');
} catch (error) {
    window.debug('Storage referansı oluşturulamadı:', error);
    // Storage gerekli değilse hata verme
}

// Firebase hazır olduğunda
document.addEventListener('DOMContentLoaded', () => {
    debug('DOM yüklendi, Firebase durumu kontrol ediliyor...');
    checkFirebaseStatus();
});

// Auth durumu değişikliğini dinle
firebase.auth().onAuthStateChanged(async (user) => {
    window.debug('[Auth Debug] Auth durumu dinleyicisi başlatılıyor...');

    if (user) {
        window.debug('[Auth Debug] Auth durumu değişti:', user.email);

        // Mevcut sayfayı kontrol et
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const currentPage = {
            path: currentPath,
            isLoginPage: currentPath === 'login.html'
        };
        window.debug('[Auth Debug] Mevcut sayfa:', currentPage);

        // Login sayfasındaysa ana sayfaya yönlendir
        if (currentPage.isLoginPage) {
            window.location.href = 'index.html';
        }
    } else {
        window.debug('[Auth Debug] Kullanıcı oturumu kapalı');
        
        // Login sayfasında değilse login sayfasına yönlendir
        const currentPath = window.location.pathname.split('/').pop();
        if (currentPath !== 'login.html') {
            window.location.href = 'login.html';
        }
    }
});




