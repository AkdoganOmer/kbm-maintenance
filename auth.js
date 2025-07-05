// Kullanıcı rolleri
const USER_ROLES = {
    ADMIN: 'admin',           // Sistem yöneticisi
    MANAGER: 'manager',       // Sergi birimi yöneticisi
    TECHNICIAN: 'technician', // Bakım teknisyeni
    STAFF: 'staff'           // Sergi birimi personeli
};

// Debug fonksiyonu
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] AUTH: ${message}`);
    if (data) {
        console.log('Data:', data);
    }
}

// Sayfa yetkilendirme kuralları
const PAGE_RULES = {
    'index.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'galleries.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'gallery-details.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'unit-details.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF]
};

// Test kullanıcıları
const TEST_USERS = {
    'admin@kbm.org.tr': {
        password: 'Admin123!',
        role: USER_ROLES.ADMIN,
        displayName: 'Ahmet Yılmaz',
        name: 'Ahmet Yılmaz'
    },
    'manager@kbm.org.tr': {
        password: 'Manager123!',
        role: USER_ROLES.MANAGER,
        displayName: 'Fatma Demir',
        name: 'Fatma Demir'
    },
    'tech@kbm.org.tr': {
        password: 'Tech123!',
        role: USER_ROLES.TECHNICIAN,
        displayName: 'Mehmet Kaya',
        name: 'Mehmet Kaya'
    },
    'staff@kbm.org.tr': {
        password: 'Staff123!',
        role: USER_ROLES.STAFF,
        displayName: 'Ayşe Özkan',
        name: 'Ayşe Özkan'
    }
};

// Mevcut kullanıcı bilgisi
let currentUser = null;

// Firebase başlatma kontrolü
function waitForFirebase() {
    debugLog('Firebase başlatma kontrolü başladı');
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                debugLog('Firebase başarıyla başlatıldı');
                resolve();
            } else {
                attempts++;
                debugLog(`Firebase başlatma denemesi: ${attempts}/${maxAttempts}`);
                if (attempts >= maxAttempts) {
                    // Yerel geliştirme ortamında isek, test kullanıcısını otomatik ayarla
                    if (window.location.protocol === 'file:') {
                        debugLog('Yerel geliştirme ortamı tespit edildi');
                        currentUser = {
                            email: 'admin@kbm.org.tr',
                            role: USER_ROLES.ADMIN,
                            displayName: 'Admin Kullanıcı (Yerel)',
                            uid: 'local-dev'
                        };
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                        debugLog('Test kullanıcısı ayarlandı', currentUser);
                        resolve();
                        return;
                    }
                    debugLog('Firebase başlatılamadı');
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
        // Yerel geliştirme ortamı kontrolü
        if (window.location.protocol === 'file:') {
            const testUser = TEST_USERS[email];
            if (!testUser || testUser.password !== password) {
                throw new Error('Hatalı kullanıcı adı veya şifre.');
            }
            
            currentUser = {
                email: email,
                role: testUser.role,
                displayName: testUser.displayName,
                uid: 'local-dev'
            };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'index.html';
            return currentUser;
        }

        // Firebase ortamı için normal giriş işlemi
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
        
        if (error.code) {
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
            }
        }
        throw error;
    }
}

// Çıkış yap
async function logout() {
    try {
        await firebase.auth().signOut();
        sessionStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Çıkış yapılırken hata:', error);
        showError('Çıkış yapılırken bir hata oluştu.');
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
    debugLog('updateAdminUI çağrıldı, currentUser:', currentUser);
    
    const adminElements = document.querySelectorAll('.admin-only');
    const managerElements = document.querySelectorAll('.manager-only');
    const technicianElements = document.querySelectorAll('.technician-only');

    const isAdminUser = isAdmin();
    const isManagerUser = isManager();
    const isTechnicianUser = isTechnician();

    debugLog('Kullanıcı yetkileri:', {
        isAdmin: isAdminUser,
        isManager: isManagerUser,
        isTechnician: isTechnicianUser
    });

    adminElements.forEach(element => {
        const shouldShow = isAdminUser;
        element.style.display = shouldShow ? '' : 'none';
        debugLog(`Admin element ${element.className}: ${shouldShow ? 'gösteriliyor' : 'gizleniyor'}`);
    });

    managerElements.forEach(element => {
        const shouldShow = isManagerUser;
        element.style.display = shouldShow ? '' : 'none';
    });

    technicianElements.forEach(element => {
        const shouldShow = isTechnicianUser;
        element.style.display = shouldShow ? '' : 'none';
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
        debugLog('Kullanıcı oturumu yüklendi:', currentUser);
        return true;
    }
    
    // Session storage'da yoksa, diğer bilgilerden oluştur
    const userId = sessionStorage.getItem('userId');
    const userEmail = sessionStorage.getItem('userEmail');
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName');
    
    if (userId && userEmail && userRole) {
        currentUser = {
            uid: userId,
            email: userEmail,
            role: userRole,
            displayName: userName || userEmail.split('@')[0]
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        debugLog('Kullanıcı bilgileri yeniden oluşturuldu:', currentUser);
        return true;
    }
    
    debugLog('Kullanıcı oturumu bulunamadı');
    return false;
}

// Debug fonksiyonu
function authDebug(message, data = null) {
    if (window.debug) {
        const prefix = '[Auth Debug]';
        if (data) {
            window.debug(prefix + ' ' + message, data);
        } else {
            window.debug(prefix + ' ' + message);
        }
    }
}

// Mevcut sayfayı kontrol et
function getCurrentPage() {
    const path = window.location.pathname;
    const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    const isLoginPage = pageName === 'login.html';
    return { path: pageName, isLoginPage };
}

// Kullanıcı yetkisini kontrol et
function checkUserPermission(userRole, pagePath) {
    if (!PAGE_RULES[pagePath]) return true;
    return PAGE_RULES[pagePath].includes(userRole);
}

// UI'ı güncelle
function updateUI(user) {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const logoutButton = document.getElementById('logoutButton');
    
    if (userNameElement && user) {
        userNameElement.textContent = user.displayName || user.email;
    }
    
    if (userRoleElement && user && user.role) {
        let roleText = '';
        switch (user.role) {
            case USER_ROLES.ADMIN:
                roleText = 'Yönetici';
                break;
            case USER_ROLES.MANAGER:
                roleText = 'Sorumlu';
                break;
            case USER_ROLES.TECHNICIAN:
                roleText = 'Teknisyen';
                break;
            case USER_ROLES.STAFF:
                roleText = 'Personel';
                break;
            default:
                roleText = user.role;
        }
        userRoleElement.textContent = roleText;
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Çıkış yapılırken hata:', error);
            });
        });
    }
}

// Auth durumunu dinle
let authInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    authDebug('Auth durumu dinleyicisi başlatılıyor...');
    
    // Firebase'in yüklenmesini bekle
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebase);
            
            firebase.auth().onAuthStateChanged(async (user) => {
                const currentPage = getCurrentPage();
                
                if (user) {
                    authDebug('Auth durumu değişti:', user.email);
                    authDebug('Mevcut sayfa:', currentPage);
                    
                    // Sadece login sayfasında değilse kullanıcı bilgilerini güncelle
                    if (!currentPage.isLoginPage) {
                        try {
                            // Kullanıcı bilgilerini Firestore'dan al
                            const userDoc = await window.db.collection('users').doc(user.uid).get();
                            
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                
                                // Session storage'a kullanıcı bilgilerini kaydet
                                sessionStorage.setItem('userId', user.uid);
                                sessionStorage.setItem('userEmail', user.email);
                                sessionStorage.setItem('userRole', userData.role || 'staff');
                                sessionStorage.setItem('userName', userData.name || user.email.split('@')[0]);

                                // Kullanıcı bilgilerini göster
                                const userInfoElement = document.getElementById('userInfo');
                                if (userInfoElement) {
                                    userInfoElement.innerHTML = `
                                        <span class="me-2"><i class="bi bi-person-circle"></i> ${userData.name || user.email.split('@')[0]}</span>
                                    `;
                                }
                            } else {
                                // Kullanıcı dokümanı yoksa oluştur
                                const defaultUserData = {
                                    email: user.email,
                                    name: user.email.split('@')[0],
                                    role: 'staff',
                                    createdAt: new Date().toISOString()
                                };
                                
                                await window.db.collection('users').doc(user.uid).set(defaultUserData);
                                
                                // Session storage'a varsayılan bilgileri kaydet
                                sessionStorage.setItem('userId', user.uid);
                                sessionStorage.setItem('userEmail', user.email);
                                sessionStorage.setItem('userRole', 'staff');
                                sessionStorage.setItem('userName', user.email.split('@')[0]);
                            }
                        } catch (error) {
                            authDebug('Kullanıcı bilgileri alınırken hata:', error);
                            // Hata durumunda varsayılan değerleri kullan
                            sessionStorage.setItem('userId', user.uid);
                            sessionStorage.setItem('userEmail', user.email);
                            sessionStorage.setItem('userRole', 'staff');
                            sessionStorage.setItem('userName', user.email.split('@')[0]);
                        }
                    }
                } else {
                    // Kullanıcı oturum açmamışsa login sayfasına yönlendir
                    const currentPage = getCurrentPage();
                    if (!currentPage.isLoginPage) {
                        window.location.href = 'login.html';
                    }
                }
                
                // Auth başlatıldı
                authInitialized = true;
            });
        }
    }, 100);
    
    // 10 saniye sonra timeout
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!authInitialized) {
            authDebug('Firebase yüklenirken zaman aşımı');
            if (!getCurrentPage().isLoginPage) {
                window.location.href = 'login.html';
            }
        }
    }, 10000);
});

// Sayfa yetki kontrolü
function checkPagePermission() {
    const userRole = sessionStorage.getItem('userRole');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    window.debug('[Auth] Sayfa yetki kontrolü:', { userRole, currentPath });

    // Yetki gerektirmeyen sayfalar
    const publicPages = ['login.html'];
    if (publicPages.includes(currentPath)) {
        window.debug('[Auth] Yetki gerektirmeyen sayfa');
        return true;
    }

    // Kullanıcı girişi yapılmamışsa
    if (!userRole) {
        window.debug('[Auth] Kullanıcı girişi yapılmamış');
        window.location.href = 'login.html';
        return false;
    }

    // Sayfa bazlı yetki kontrolü
    if (!PAGE_RULES[currentPath]) {
        window.debug('[Auth] Sayfa kuralı bulunamadı, erişime izin veriliyor');
        return true;
    }

    // Sayfaya erişim yetkisi kontrolü
    if (!PAGE_RULES[currentPath].includes(userRole)) {
        window.debug('[Auth] Sayfa yetkisi reddedildi:', { userRole, requiredRoles: PAGE_RULES[currentPath] });
        showError('Bu sayfaya erişim yetkiniz yok!');
        window.location.href = 'index.html';
        return false;
    }

    window.debug('[Auth] Sayfa yetkisi onaylandı');
    return true;
}

// Oturum durumunu kontrol et
firebase.auth().onAuthStateChanged(async (user) => {
    window.debug('[Auth] Oturum durumu değişti:', user ? user.email : 'oturum kapalı');

    if (!user) {
        // Kullanıcı oturum açmamışsa login sayfasına yönlendir
        const currentPath = window.location.pathname.split('/').pop();
        if (currentPath !== 'login.html') {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        // Kullanıcı bilgilerini Firestore'dan al
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Session storage'a kullanıcı bilgilerini kaydet
            sessionStorage.setItem('userId', user.uid);
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('userRole', userData.role || 'staff');
            sessionStorage.setItem('userName', userData.name || user.email.split('@')[0]);

            // Kullanıcı bilgilerini göster
            const userInfoElement = document.getElementById('userInfo');
            if (userInfoElement) {
                userInfoElement.innerHTML = `
                    <span class="me-2">${userData.name || user.email.split('@')[0]}</span>
                    <span class="badge bg-primary">${userData.role || 'staff'}</span>
                `;
            }

            // Sayfa yetkisini kontrol et
            if (!checkPagePermission()) {
                window.debug('[Auth] Sayfa yetkisi reddedildi');
                return;
            }

            window.debug('[Auth] Kullanıcı bilgileri güncellendi:', {
                role: userData.role,
                name: userData.name
            });

        } else {
            // Kullanıcı dokümanı yoksa oluştur
            const defaultUserData = {
                email: user.email,
                name: user.email.split('@')[0],
                role: 'staff',
                createdAt: new Date().toISOString()
            };
            
            await db.collection('users').doc(user.uid).set(defaultUserData);
            
            // Session storage'a varsayılan bilgileri kaydet
            sessionStorage.setItem('userId', user.uid);
            sessionStorage.setItem('userEmail', user.email);
            sessionStorage.setItem('userRole', 'staff');
            sessionStorage.setItem('userName', user.email.split('@')[0]);

            // Sayfa yetkisini kontrol et
            if (!checkPagePermission()) {
                window.debug('[Auth] Sayfa yetkisi reddedildi (yeni kullanıcı)');
                return;
            }

            window.debug('[Auth] Yeni kullanıcı oluşturuldu:', defaultUserData);
        }
    } catch (error) {
        console.error('Kullanıcı bilgileri alınırken hata:', error);
        window.debug('[Auth] Kullanıcı bilgileri alınırken hata:', error);

        // Hata durumunda varsayılan değerleri kullan
        sessionStorage.setItem('userId', user.uid);
        sessionStorage.setItem('userEmail', user.email);
        sessionStorage.setItem('userRole', 'staff');
        sessionStorage.setItem('userName', user.email.split('@')[0]);

        // Sayfa yetkisini kontrol et
        if (!checkPagePermission()) {
            window.debug('[Auth] Sayfa yetkisi reddedildi (hata durumu)');
            return;
        }
    }
});

// Hata mesajı göster
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
} 