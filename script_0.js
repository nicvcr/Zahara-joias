
    const firebaseConfig = {
      apiKey: "AIzaSyBXbqnMf6skb1C7uZMl7ic_jsKF0vOX4xU",
      authDomain: "catalogojoias.firebaseapp.com",
      projectId: "catalogojoias",
      storageBucket: "catalogojoias.firebasestorage.app",
      messagingSenderId: "605499106915",
      appId: "1:605499106915:web:f482bd457a7ac188dafa56"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    let currentCategory = "Todas";
    let allCategories = [];
    let allProducts = [];
    let allClients = [];
    let clientSelectedProducts = [];
    let photosB64 = [];
    let editingProductId = null;
    let isAdminMode = false;

    const ADMIN_USER = "admin";
    const ADMIN_PASS = "admin123";
    
    // Dark Mode Initialization
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Update automatically if system settings change and user hasn't forced a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        const isDark = e.matches;
        if (isDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.getElementById('darkModeBtn').innerText = '☀️';
        } else {
          document.documentElement.removeAttribute('data-theme');
          document.getElementById('darkModeBtn').innerText = '🌙';
        }
      }
    });

    function toggleDarkMode() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('darkModeBtn').innerText = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('darkModeBtn').innerText = '☀️';
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
       if (document.documentElement.getAttribute('data-theme') === 'dark') {
           const btn = document.getElementById('darkModeBtn');
           if(btn) btn.innerText = '☀️';
       }
    });
  