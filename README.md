# Bilim Merkezi Bakım Takip Sistemi

Bu proje, bilim merkezi sergi galerilerindeki ünitelerin bakım ve onarım süreçlerini takip etmek için geliştirilmiş bir web uygulamasıdır.

## Test Push

Bu satır GitHub push işlemini test etmek için eklenmiştir.

## Özellikler

- Galeri ve ünite yönetimi
- Bakım/onarım kayıtları
- Teknik doküman yönetimi
- Arıza takibi
- Yönetici paneli
- Gerçek zamanlı veri senkronizasyonu

## Teknolojiler

- HTML5
- CSS3 (Bootstrap 5)
- JavaScript (ES6+)
- Firebase (Firestore)
- Bootstrap Icons

## Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/your-username/science-center-maintenance.git
cd science-center-maintenance
```

2. Firebase yapılandırması:
   - Firebase Console'dan yeni bir proje oluşturun
   - Web uygulaması ekleyin
   - Firestore veritabanını etkinleştirin
   - `firebase-config.example.js` dosyasını `firebase-config.js` olarak kopyalayın
   - Firebase yapılandırma bilgilerinizi `firebase-config.js` dosyasına ekleyin

3. Uygulamayı başlatın:
   - Dosyaları bir web sunucusuna yükleyin veya yerel bir sunucu kullanın
   - `index.html` dosyasını açın

## Kullanım

1. Yönetici olarak giriş yapın
2. Galerileri ve üniteleri yönetin
3. Bakım kayıtları ekleyin
4. Teknik dokümanları yükleyin
5. Arıza durumlarını takip edin

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın. 