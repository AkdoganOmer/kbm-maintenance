// Login form submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Firebase ile giriş yap
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Kullanıcı bilgilerini kontrol et
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('Kullanıcı bilgileri bulunamadı!');
        }

        // Ana sayfaya yönlendir
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Giriş yapılırken hata:', error);
        alert('Giriş yapılamadı: ' + error.message);
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'index.html';
    }
}); 