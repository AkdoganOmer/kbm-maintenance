// Test admin kullanıcısı ekleme scripti
// Bu dosyayı sadece test için kullanın

async function createTestAdmin() {
    try {
        console.log('Test admin kullanıcısı ekleniyor...');
        
        // Firebase'i başlat
        if (!firebase.apps.length) {
            console.error('Firebase başlatılmamış!');
            return;
        }
        
        const db = firebase.firestore();
        
        // Test admin kullanıcısı
        const testAdmin = {
            name: 'Admin Kullanıcı',
            username: 'admin',
            password: 'Admin123!', // Gerçek uygulamada hash'lenmeli
            role: 'admin',
            department: 'Sistem Yönetimi',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };
        
        // Admin kullanıcısını ekle
        const docRef = await db.collection('personnel').add(testAdmin);
        
        console.log('Test admin kullanıcısı başarıyla eklendi:', docRef.id);
        console.log('Giriş bilgileri:');
        console.log('Kullanıcı adı: admin');
        console.log('Şifre: Admin123!');
        
        return docRef.id;
        
    } catch (error) {
        console.error('Test admin kullanıcısı eklenirken hata:', error);
        throw error;
    }
}

// Mevcut admin hesabını güncelle (username ekle)
async function updateExistingAdmin() {
    try {
        console.log('Mevcut admin hesabı güncelleniyor...');
        
        if (!firebase.apps.length) {
            console.error('Firebase başlatılmamış!');
            return;
        }
        
        const db = firebase.firestore();
        
        // Mevcut admin hesabını bul
        const adminQuery = await db.collection('personnel')
            .where('email', '==', 'admin@kbm.org.tr')
            .get();
        
        if (adminQuery.empty) {
            console.log('Admin hesabı bulunamadı, yeni hesap oluşturuluyor...');
            return await createTestAdmin();
        }
        
        // Admin hesabını güncelle
        const adminDoc = adminQuery.docs[0];
        const adminData = adminDoc.data();
        
        // Eğer username yoksa ekle
        if (!adminData.username) {
            await adminDoc.ref.update({
                username: 'admin',
                updatedAt: new Date().toISOString()
            });
            console.log('Admin hesabı username ile güncellendi!');
        } else {
            console.log('Admin hesabı zaten username içeriyor:', adminData.username);
        }
        
        console.log('Giriş bilgileri:');
        console.log('Kullanıcı adı: admin');
        console.log('Şifre: Admin123!');
        
        return adminDoc.id;
        
    } catch (error) {
        console.error('Admin hesabı güncellenirken hata:', error);
        throw error;
    }
}

// Tarayıcı konsolunda çalıştırmak için
window.createTestAdmin = createTestAdmin;
window.updateExistingAdmin = updateExistingAdmin;

// Sayfa yüklendiğinde otomatik çalıştır (isteğe bağlı)
// document.addEventListener('DOMContentLoaded', createTestAdmin);

console.log('Test admin scripti yüklendi. Tarayıcı konsolunda "createTestAdmin()" veya "updateExistingAdmin()" komutunu çalıştırabilirsiniz.'); 