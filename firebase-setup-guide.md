# Firebase Proje Kurulum Rehberi

## 1. Yeni Firebase Projesi Oluşturma

1. https://console.firebase.google.com/ adresine gidin
2. "Add project" (Proje Ekle) butonuna tıklayın
3. Proje adı: `kbm-maintenance` (veya istediğiniz isim)
4. Google Analytics'i etkinleştirin (opsiyonel)
5. Projeyi oluşturun

## 2. Web App Ekleme

1. Firebase Console'da projenizi açın
2. "Web" ikonuna (</>) tıklayın
3. App nickname: `KBM Maintenance Web`
4. Firebase Hosting'i etkinleştirin (opsiyonel)
5. "Register app" butonuna tıklayın

## 3. Yapılandırma Bilgilerini Kopyalama

Firebase size şuna benzer bir kod verecek:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Bu bilgileri `firebase-config.js` dosyasına yapıştırın.

## 4. Firestore Database Kurulumu

1. Firebase Console'da "Firestore Database" sekmesine gidin
2. "Create database" butonuna tıklayın
3. "Start in test mode" seçin (geliştirme için)
4. Location seçin (Europe-west3 önerilir)

## 5. Authentication Kurulumu

1. Firebase Console'da "Authentication" sekmesine gidin
2. "Get started" butonuna tıklayın
3. "Sign-in method" sekmesine gidin
4. "Email/Password" metodunu etkinleştirin

## 6. Storage Kurulumu

1. Firebase Console'da "Storage" sekmesine gidin
2. "Get started" butonuna tıklayın
3. "Start in test mode" seçin
4. Location seçin (Firestore ile aynı)

## 7. Security Rules

### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 8. Test Kullanıcısı Oluşturma

Firebase Console'da Authentication > Users sekmesinde:
- Email: admin@kbm.com
- Password: admin123456

## 9. Örnek Veri Ekleme

Firestore'da `galleries` koleksiyonu oluşturun ve örnek galeri ekleyin. 