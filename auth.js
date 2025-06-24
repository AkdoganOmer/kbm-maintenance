// Kullanıcı rolleri
const USER_ROLES = {
    ADMIN: 'admin',           // Sistem yöneticisi
    MANAGER: 'manager',       // Sergi birimi yöneticisi
    TECHNICIAN: 'technician', // Bakım teknisyeni
    STAFF: 'staff'           // Sergi birimi personeli
};

// Test kullanıcıları
const TEST_USERS = {
    'admin@kbm.org.tr': {
        password: 'Admin123!',
        role: USER_ROLES.ADMIN,
        displayName: 'Admin Kullanıcı'
    },
    'manager@kbm.org.tr': {
        password: 'Manager123!',
        role: USER_ROLES.MANAGER,
        displayName: 'Sergi Yöneticisi'
    },
    'tech@kbm.org.tr': {
        password: 'Tech123!',
        role: USER_ROLES.TECHNICIAN,
        displayName: 'Bakım Teknisyeni'
    },
    'staff@kbm.org.tr': {
        password: 'Staff123!',
        role: USER_ROLES.STAFF,
        displayName: 'Sergi Personeli'
    }
};

// Mevcut kullanıcı bilgisi
let currentUser = null;

// Firebase başlatma kontrolü
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                resolve();
            } else {
                attempts++;
                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase yüklenemedi'));
                } else {
                    setTimeout(checkFirebase, 500);
                }
            }
        };
        
        checkFirebase();
    });
}

// Giriş yap
async function login(email, password) {
    try {
        await waitForFirebase();

        // E-posta formatını kontrol et
        if (!email.endsWith('@kbm.org.tr')) {
            throw new Error('Sadece Konya Bilim Merkezi personeli giriş yapabilir.');
        }

        // Test kullanıcı bilgilerini al
        const testUser = TEST_USERS[email];
        if (!testUser) {
            throw new Error('Kullanıcı bulunamadı.');
        }

        // Firebase ile giriş yap
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Kullanıcı bilgilerini sakla
        currentUser = {
            email: email,
            role: testUser.role,
            displayName: testUser.displayName,
            uid: user.uid
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Ana sayfaya yönlendir
        window.location.href = 'index.html';

        return currentUser;
    } catch (error) {
        console.error('Giriş hatası:', error);
        console.error('Hata detayları:', {
            code: error.code,
            message: error.message,
            fullError: error
        });
        
        // Firebase hata mesajlarını Türkçeleştir
        if (error.code === 'auth/wrong-password') {
            throw new Error('Hatalı şifre.');
        } else if (error.code === 'auth/user-not-found') {
            throw new Error('Kullanıcı bulunamadı.');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Geçersiz e-posta adresi.');
        } else if (error.code === 'auth/user-disabled') {
            throw new Error('Bu hesap devre dışı bırakılmış.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.');
        } else if (error.code === 'auth/network-request-failed') {
            throw new Error('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.');
        } else if (error.code === 'auth/invalid-api-key') {
            throw new Error('Firebase yapılandırması hatalı. Lütfen yöneticinize bildirin.');
        } else {
            throw error;
        }
    }
}

// Çıkış yap
async function logout() {
    try {
        await waitForFirebase();
        await firebase.auth().signOut();
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Çıkış hatası:', error);
        throw error;
    }
}

// Kullanıcı rolünü kontrol et
function getUserRole() {
    return currentUser ? currentUser.role : null;
}

// Admin kontrolü
function isAdmin() {
    return currentUser && currentUser.role === USER_ROLES.ADMIN;
}

// Yönetici kontrolü
function isManager() {
    return currentUser && (currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.ADMIN);
}

// Teknisyen kontrolü
function isTechnician() {
    return currentUser && (currentUser.role === USER_ROLES.TECHNICIAN || currentUser.role === USER_ROLES.ADMIN);
}

// Admin UI elementlerini göster/gizle
function updateAdminUI() {
    const adminElements = document.querySelectorAll('.admin-only');
    const managerElements = document.querySelectorAll('.manager-only');
    const technicianElements = document.querySelectorAll('.technician-only');

    adminElements.forEach(element => {
        element.style.display = isAdmin() ? '' : 'none';
    });

    managerElements.forEach(element => {
        element.style.display = isManager() ? '' : 'none';
    });

    technicianElements.forEach(element => {
        element.style.display = isTechnician() ? '' : 'none';
    });
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (!userInfoElement || !currentUser) return;

    let roleIcon = '';
    switch (currentUser.role) {
        case USER_ROLES.ADMIN:
            roleIcon = '👑'; // Admin
            break;
        case USER_ROLES.MANAGER:
            roleIcon = '🔰'; // Yönetici
            break;
        case USER_ROLES.TECHNICIAN:
            roleIcon = '🔧'; // Teknisyen
            break;
        case USER_ROLES.STAFF:
            roleIcon = '👤'; // Personel
            break;
    }

    userInfoElement.textContent = `${roleIcon} ${currentUser.displayName}`;
}

// Oturum durumunu kontrol et
function checkAuth() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        return true;
    }
    return false;
}

// Firebase Auth durumunu izle
function initAuth() {
    console.log('Auth durumu dinleyicisi başlatılıyor...');
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth durumu değişti:', user ? user.email : 'Oturum kapalı');
        
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html');
        console.log('Mevcut sayfa:', { path: currentPath, isLoginPage });

        if (user) {
            // Kullanıcı oturum açmışsa
            if (checkAuth()) {
                console.log('Oturum bilgisi doğrulandı:', currentUser);
                if (isLoginPage) {
                    console.log('Giriş sayfasından ana sayfaya yönlendiriliyor...');
                    window.location.href = 'index.html';
                } else {
                    console.log('UI güncelleniyor...');
                    updateUserInfo();
                    updateAdminUI();
                }
            } else if (!isLoginPage) {
                // Session bilgisi yoksa çıkış yap
                console.log('Oturum bilgisi bulunamadı, çıkış yapılıyor...');
                logout();
            }
        } else {
            // Kullanıcı oturum açmamışsa ve giriş sayfasında değilse
            if (!isLoginPage) {
                console.log('Oturum kapalı, giriş sayfasına yönlendiriliyor...');
                window.location.href = 'login.html';
            }
        }
    });
}

// Firebase yüklendikten sonra Auth'u başlat
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
    initAuth();
} else {
    // Firebase yüklenmesini bekle
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            clearInterval(checkFirebase);
            initAuth();
        }
    }, 100);
} 