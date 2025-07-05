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
    'unit-details.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'galleries.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'gallery-details.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.STAFF],
    'galleries-admin.html': [USER_ROLES.ADMIN, USER_ROLES.MANAGER]
};

// Mevcut kullanıcı
let currentUser = null;

// Çıkış yap
async function logout() {
    try {
        debugLog('Çıkış işlemi başlatılıyor...');
        
        // Session storage'ı temizle
        sessionStorage.clear();
        
        // Kullanıcı değişkenini sıfırla
        currentUser = null;
        
        // Login sayfasına yönlendir
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Çıkış yaparken hata:', error);
    }
}

// Kullanıcı rolünü al
function getUserRole() {
    return sessionStorage.getItem('userRole') || null;
}

// Admin kontrolü
function isAdmin() {
    return getUserRole() === USER_ROLES.ADMIN;
}

// Manager kontrolü
function isManager() {
    const role = getUserRole();
    return role === USER_ROLES.MANAGER || role === USER_ROLES.ADMIN;
}

// Teknisyen kontrolü
function isTechnician() {
    const role = getUserRole();
    return role === USER_ROLES.TECHNICIAN || role === USER_ROLES.MANAGER || role === USER_ROLES.ADMIN;
}

// Admin UI'yi güncelle
function updateAdminUI() {
    const userRole = getUserRole();
    debugLog('[Admin UI] Kullanıcı rolü:', userRole);
    
    // Admin butonları
    const adminButtons = document.querySelectorAll('.admin-only, .admin-btn');
    const managerButtons = document.querySelectorAll('.manager-only, .manager-btn');
    const techButtons = document.querySelectorAll('.tech-only, .tech-btn');
    
    // Tüm admin butonları gizle
    adminButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Tüm manager butonları gizle
    managerButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Tüm tech butonları gizle
    techButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Kullanıcı rolüne göre butonları göster
    if (userRole === USER_ROLES.ADMIN) {
        adminButtons.forEach(btn => {
            // Buton tipine göre display değeri ayarla
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
        managerButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
        techButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
    } else if (userRole === USER_ROLES.MANAGER) {
        managerButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
        techButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
    } else if (userRole === USER_ROLES.TECHNICIAN) {
        techButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' || btn.classList.contains('btn')) {
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'block';
            }
        });
    }
    
    debugLog('[Admin UI] Butonlar güncellendi:', {
        adminButtons: adminButtons.length,
        managerButtons: managerButtons.length,
        techButtons: techButtons.length
    });
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo() {
    const userName = sessionStorage.getItem('userName') || 'Kullanıcı';
    const userRole = getUserRole();
    
    // Kullanıcı adı gösterimi
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(element => {
        element.textContent = userName;
    });
    
    // Kullanıcı rolü gösterimi
    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(element => {
        let roleText = '';
        switch(userRole) {
            case USER_ROLES.ADMIN:
                roleText = 'Sistem Yöneticisi';
                break;
            case USER_ROLES.MANAGER:
                roleText = 'Yönetici';
                break;
            case USER_ROLES.TECHNICIAN:
                roleText = 'Teknisyen';
                break;
            case USER_ROLES.STAFF:
                roleText = 'Personel';
                break;
            default:
                roleText = 'Bilinmeyen';
        }
        element.textContent = roleText;
    });
}

// Kimlik doğrulama kontrolü
function checkAuth() {
    // Yönlendirme kilidi kontrolü
    if (window.redirecting) {
        debugLog('Yönlendirme zaten yapılıyor, checkAuth iptal edildi');
        return false;
    }
    
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    debugLog('Kimlik doğrulama kontrolü:', {
        isAuthenticated,
        currentPath,
        userRole: getUserRole()
    });
    
    // Login sayfasında değilse ve giriş yapmamışsa login sayfasına yönlendir
    if (!isAuthenticated && currentPath !== 'login.html') {
        debugLog('Kullanıcı giriş yapmamış, login sayfasına yönlendiriliyor');
        window.redirecting = true;
        window.location.href = 'login.html';
        return false;
    }
    
    // Login sayfasında ve giriş yapmışsa ana sayfaya yönlendir
    if (isAuthenticated && currentPath === 'login.html') {
        debugLog('Kullanıcı zaten giriş yapmış, ana sayfaya yönlendiriliyor');
        window.redirecting = true;
        window.location.href = 'index.html';
        return false;
    }
    
    // Kullanıcı bilgilerini session'dan yükle
    if (isAuthenticated) {
        currentUser = {
            id: sessionStorage.getItem('userId'),
            email: sessionStorage.getItem('userEmail'),
            role: sessionStorage.getItem('userRole'),
            name: sessionStorage.getItem('userName')
        };
        
        debugLog('Kullanıcı bilgileri yüklendi:', currentUser);
        
        // UI'yi güncelle
        updateUserInfo();
        updateAdminUI();
        
        return true;
    }
    
    return false;
}

// Debug fonksiyonu
function authDebug(message, data = null) {
    if (window.debug) {
        const prefix = '[Auth]';
        if (data) {
            window.debug(prefix + ' ' + message, data);
        } else {
            window.debug(prefix + ' ' + message);
        }
    }
}

// Mevcut sayfa bilgisi
function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
}

// Kullanıcı izin kontrolü
function checkUserPermission(userRole, pagePath) {
    const allowedRoles = PAGE_RULES[pagePath];
    return allowedRoles ? allowedRoles.includes(userRole) : false;
}

// Sayfa izin kontrolü
function checkPagePermission() {
    // Yönlendirme kilidi kontrolü
    if (window.redirecting) {
        debugLog('Yönlendirme zaten yapılıyor, checkPagePermission iptal edildi');
        return false;
    }
    
    const currentPath = getCurrentPage();
    const userRole = getUserRole();
    
    debugLog('Sayfa izin kontrolü:', {
        currentPath,
        userRole,
        allowedRoles: PAGE_RULES[currentPath]
    });
    
    // Login sayfası herkese açık
    if (currentPath === 'login.html') {
        return true;
    }
    
    // Kullanıcı giriş yapmamışsa (bu kontrol zaten checkAuth'da yapıldı)
    if (!userRole) {
        debugLog('Kullanıcı rolü bulunamadı');
        return false;
    }
    
    // Sayfa izin kontrolü
    if (!checkUserPermission(userRole, currentPath)) {
        debugLog('Kullanıcının bu sayfaya erişim izni yok');
        showError('Bu sayfaya erişim izniniz bulunmuyor.');
        // Ana sayfaya yönlendir (login değil)
        window.redirecting = true;
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Hata mesajı göster
function showError(message) {
    // Bootstrap toast veya alert ile hata göster
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Sayfa yüklendiğinde çalışacak fonksiyon
document.addEventListener('DOMContentLoaded', () => {
    debugLog('Auth.js yüklendi');
    
    // Yönlendirme kilidi - aynı anda birden fazla yönlendirme önlenir
    if (window.redirecting) {
        debugLog('Zaten yönlendirme yapılıyor, işlem iptal edildi');
        return;
    }
    
    // Kimlik doğrulama kontrolü yap
    const authResult = checkAuth();
    
    // Eğer kimlik doğrulama başarılı ise sayfa izin kontrolü yap
    if (authResult) {
        checkPagePermission();
    }
}); 