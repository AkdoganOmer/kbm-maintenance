// Offline test verisi
const offlineData = {
    galleries: [
        {
            id: 'gallery1',
            name: 'Matematik Galerisi',
            description: 'Matematik konularını içeren interaktif sergiler',
            location: 'Zemin Kat',
            capacity: 20,
            units: [
                {
                    id: 1,
                    name: 'Geometri Üniteleri',
                    description: 'Geometrik şekilleri öğreten interaktif ünite',
                    status: 'Çalışıyor',
                    location: 'Matematik Galerisi - Sol Köşe',
                    technicalDetails: 'LED ekran, dokunmatik sensörler',
                    images: [],
                    documents: [],
                    maintenanceHistory: []
                },
                {
                    id: 2,
                    name: 'Sayılar Üniteleri',
                    description: 'Sayı sistemlerini öğreten ünite',
                    status: 'Bakımda',
                    location: 'Matematik Galerisi - Orta',
                    technicalDetails: 'Projeksiyon sistemi, ses sistemi',
                    images: [],
                    documents: [],
                    maintenanceHistory: []
                }
            ]
        },
        {
            id: 'gallery2',
            name: 'Fizik Galerisi',
            description: 'Fizik deneylerini içeren sergiler',
            location: 'Birinci Kat',
            capacity: 15,
            units: [
                {
                    id: 3,
                    name: 'Elektrik Deneyleri',
                    description: 'Elektrik akımını gösteren deneyler',
                    status: 'Arızalı',
                    location: 'Fizik Galerisi - Giriş',
                    technicalDetails: 'Güç kaynağı, LED göstergeler',
                    images: [],
                    documents: [],
                    maintenanceHistory: []
                }
            ]
        }
    ]
};

// Offline modu için mock Firebase fonksiyonları
const mockFirebase = {
    firestore: () => ({
        collection: (name) => ({
            get: () => Promise.resolve({
                docs: offlineData.galleries.map(gallery => ({
                    id: gallery.id,
                    data: () => gallery,
                    exists: true
                }))
            }),
            doc: (id) => ({
                get: () => {
                    const gallery = offlineData.galleries.find(g => g.id === id);
                    return Promise.resolve({
                        exists: !!gallery,
                        data: () => gallery
                    });
                },
                update: (data) => {
                    console.log('Mock update:', id, data);
                    return Promise.resolve();
                },
                add: (data) => {
                    console.log('Mock add:', data);
                    return Promise.resolve({ id: 'mock-id-' + Date.now() });
                }
            })
        })
    }),
    auth: () => ({
        onAuthStateChanged: (callback) => {
            // Mock kullanıcı
            setTimeout(() => callback({ email: 'admin@test.com' }), 100);
        },
        signInWithEmailAndPassword: () => Promise.resolve({ user: { email: 'admin@test.com' } }),
        signOut: () => Promise.resolve()
    }),
    storage: () => ({
        ref: () => ({
            put: () => Promise.resolve({
                ref: {
                    getDownloadURL: () => Promise.resolve('mock-url')
                }
            })
        })
    })
};

// Offline mode aktif mi?
window.isOfflineMode = false;

// Offline modu etkinleştir
window.enableOfflineMode = function() {
    window.isOfflineMode = true;
    window.firebase = mockFirebase;
    window.db = mockFirebase.firestore();
    window.auth = mockFirebase.auth();
    window.storage = mockFirebase.storage();
    console.log('Offline mode etkinleştirildi');
}; 