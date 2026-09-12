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
  </script>
  <script>
    function compressImage(dataUrl, callback) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;
        const MAX_W = 800;
        const MAX_H = 800;
        if (width > height) {
          if (width > MAX_W) { height = Math.round(height * (MAX_W / width)); width = MAX_W; }
        } else {
          if (height > MAX_H) { width = Math.round(width * (MAX_H / height)); height = MAX_H; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    }

    document.addEventListener('paste', function (e) {
      if (!isAdminMode) return;
      if (photosB64.length >= 5) { alert('Máximo de 5 fotos atingido.'); return; }
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = function (event) {
            compressImage(event.target.result, (compressedB64) => {
              photosB64.push(compressedB64);
              renderPhotosPreview();
            });
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          return;
        }
      }
    });

    function openLoginModal() { document.getElementById('loginModal').style.display = 'block'; }
    function closeLoginModal() { document.getElementById('loginModal').style.display = 'none'; document.getElementById('loginError').style.display = 'none'; }
    function doLogin() {
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      if (u === ADMIN_USER && p === ADMIN_PASS) {
        isAdminMode = true; closeLoginModal();
        document.getElementById('mainContent').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadCategories(); loadProducts(); loadClients();
      } else { document.getElementById('loginError').style.display = 'block'; }
    }
    function logout() {
      isAdminMode = false;
      document.getElementById('adminPanel').style.display = 'none';
      document.getElementById('mainContent').style.display = 'block';
      document.querySelector('footer').style.display = 'block';
    }
    function switchTab(name) {
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); if (b.dataset.tab === name) b.classList.add('active'); });
      document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); if (c.id === 'tab-' + name) c.classList.add('active'); });
    }

    async function loadCategories() {
      try {
        const snap = await db.collection('categorias').get();
        allCategories = []; snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));
        renderCategoryFilters(); updateCategorySelect(); renderCategoriesList();
      } catch (e) {
        console.error('Categorias:', e);
        document.getElementById('categoryFilters').innerHTML = '<div style="color:red;padding:20px;">Erro: ' + e.message + '</div>';
      }
    }
    function renderCategoryFilters() {
      const c = document.getElementById('categoryFilters');
      let h = `<button class="category-btn active" onclick="filterByCategory('Todas')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:var(--accent-soft);color:var(--accent);cursor:pointer;">Todas</button>`;
      allCategories.forEach(x => h += `<button class="category-btn" onclick="filterByCategory('${x.nome}')" style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);cursor:pointer;">${x.nome}</button>`);
      c.innerHTML = h;
    }
    function updateCategorySelect() {
      const s = document.getElementById('prodCategory');
      s.innerHTML = '<option value="">Selecione...</option>';
      allCategories.forEach(x => s.innerHTML += `<option value="${x.nome}">${x.nome}</option>`);
    }
    async function addCategory() {
      const n = document.getElementById('newCategory').value.trim();
      if (!n) return alert('Digite o nome da categoria');
      await db.collection('categorias').add({ nome: n });
      document.getElementById('newCategory').value = ''; loadCategories();
    }
    function renderCategoriesList() {
      const c = document.getElementById('categoriesList');
      if (!allCategories.length) return c.innerHTML = '<p style="color:var(--muted);">Nenhuma categoria cadastrada.</p>';
      c.innerHTML = allCategories.map(x => `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><span>${x.nome}</span><button onclick="deleteCategory('${x.id}')" class="danger-btn" style="padding:6px 12px;border-radius:6px;cursor:pointer;">Excluir</button></div>`).join('');
    }
    async function deleteCategory(id) { if (!confirm('Excluir?')) return; await db.collection('categorias').doc(id).delete(); loadCategories(); }
    function filterByCategory(name) {
      currentCategory = name;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      renderProductsGrid();
    }

    async function loadProducts() {
      try {
        const snap = await db.collection('produtos').get();
        allProducts = []; snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));
        renderProductsGrid(); renderAdminProductsList();
      } catch (e) {
        console.error('Produtos:', e);
        document.getElementById('productsGrid').innerHTML = '<div style="color:red;text-align:center;padding:40px;">Erro: ' + e.message + '</div>';
      }
    }

    // ✅ DESCRIÇÃO AGORA APARECE PARA O CLIENTE
    function renderProductsGrid() {
      const g = document.getElementById('productsGrid');
      const empty = document.getElementById('emptyState');
      let filtered = allProducts.filter(p => !p.vendido);
      if (currentCategory !== 'Todas') filtered = filtered.filter(p => p.categoria === currentCategory);
      if (!filtered.length) { g.innerHTML = ''; empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      g.innerHTML = filtered.map(p => {
        const fotos = p.fotosBase64 && p.fotosBase64.length > 0 ? p.fotosBase64 : (p.fotoBase64 ? [p.fotoBase64] : []);
        const clickEvent = fotos.length > 1 ? `onclick="openGallery('${p.id}')" style="cursor:pointer;"` : '';
        const multImgBadge = fotos.length > 1 ? `<div style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px;padding:4px 8px;border-radius:12px;">+${fotos.length - 1} fotos (clique)</div>` : '';
        return `<div class="product-card reveal" style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
    <div>
      <div class="product-image-container" ${clickEvent} style="position:relative;">
        ${fotos.length > 0 ? `<img src="${fotos[0]}" alt="${p.nome}">` : '<span style="color:var(--muted);">Sem foto</span>'}
        ${multImgBadge}
      </div>
      <div style="padding:16px;">
        <h4 style="font-weight:600;font-size:16px;margin-bottom:4px;">${p.nome}</h4>
        ${p.codigoBarras ? `<p class="barcode-text">📶 ${p.codigoBarras}</p>` : ''}
        <p style="color:var(--muted);font-size:13px;margin:6px 0;">${p.categoria || ''}</p>
        ${p.descricao ? `<p class="product-description">${p.descricao}</p>` : ''}
        <p style="font-size:18px;font-weight:700;color:var(--accent2);margin-top:8px;">R$ ${Number(p.preco || 0).toFixed(2).replace('.', ',')}</p>
      </div>
    </div>
    <div style="padding:0 16px 16px;">
      <button onclick="openWhatsAppModal('${p.id}')" class="whatsapp-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
        Pedir no WhatsApp
      </button>
    </div>
  </div>`;
      }).join('');
    }

    function renderAdminProductsList() {
      const c = document.getElementById('adminProductsList');
      const showSold = document.getElementById('showSold')?.checked || false;
      const searchStr = (document.getElementById('adminSearchFilter')?.value || '').toLowerCase();
      const sortOrder = document.getElementById('adminSortOrder')?.value || 'recentes';

      let list = showSold ? allProducts : allProducts.filter(p => !p.vendido);
      
      if (searchStr) {
        list = list.filter(p => (p.nome || '').toLowerCase().includes(searchStr) || (p.codigoBarras || '').toLowerCase().includes(searchStr));
      }

      list = [...list];
      if (sortOrder === 'az') list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      else if (sortOrder === 'za') list.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
      else if (sortOrder === 'menorPreco') list.sort((a, b) => (Number(a.preco) || 0) - (Number(b.preco) || 0));
      else if (sortOrder === 'maiorPreco') list.sort((a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0));

      if (!list.length) return c.innerHTML = '<p style="color:var(--muted);">Nenhum produto encontrado.</p>';
      c.innerHTML = list.map(p => {
        const firstImage = p.fotosBase64 && p.fotosBase64.length > 0 ? p.fotosBase64[0] : p.fotoBase64;
        return `<div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;${p.vendido ? 'opacity:0.7;' : ''}">
    <div style="display:flex;align-items:center;gap:12px;">
      ${firstImage ? `<img src="${firstImage}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);">` : `<div style="width:40px;height:40px;border-radius:6px;background:var(--bg);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted);text-align:center;">Sem foto</div>`}
      <div>
        <strong>${p.nome}</strong> 
        ${p.codigoBarras ? '| ' + p.codigoBarras : ''} 
        ${p.fornecedor ? '| 🏷️ ' + p.fornecedor : ''} 
        <br>
        <span style="font-size:13px;color:var(--muted);">${p.categoria || 'Sem categoria'} — R$ ${Number(p.preco || 0).toFixed(2).replace('.', ',')}</span>
        ${p.vendido ? '<span style="color:var(--sold);font-weight:bold;margin-left:8px;">✅ VENDIDO</span>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button onclick="editProduct('${p.id}')" class="edit-btn" style="padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">✏️ Editar</button>
      <button onclick="toggleSold('${p.id}', ${p.vendido})" class="${p.vendido ? 'ghost-btn' : 'sold-btn'}" style="padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">${p.vendido ? '↩️ Reativar' : '✅ Vendido'}</button>
      <button onclick="deleteProduct('${p.id}')" class="danger-btn" style="padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">Excluir</button>
    </div>
  </div>`).join('');
    }

    function editProduct(productId) {
      const prod = allProducts.find(p => p.id === productId);
      if (!prod) return;
      editingProductId = productId;
      document.getElementById('prodName').value = prod.nome || '';
      document.getElementById('prodBarcode').value = prod.codigoBarras || '';
      document.getElementById('prodPrice').value = prod.preco || '';
      document.getElementById('prodCategory').value = prod.categoria || '';
      document.getElementById('prodSupplier').value = prod.fornecedor || '';
      document.getElementById('prodDescription').value = prod.descricao || '';
      
      photosB64 = prod.fotosBase64 || (prod.fotoBase64 ? [prod.fotoBase64] : []);
      renderPhotosPreview();
      
      document.getElementById('productFormTitle').innerHTML = '✏️ <span class="editing-title">Editando Produto:</span> ' + prod.nome;
      document.getElementById('saveBtn').innerText = 'Atualizar Produto';
      document.getElementById('cancelEditBtn').style.display = 'inline-block';
      document.getElementById('productFormTitle').scrollIntoView({ behavior: 'smooth' });
    }

    function cancelEdit() {
      editingProductId = null;
      photosB64 = [];
      document.getElementById('productFormTitle').innerHTML = '+ Cadastrar Novo Produto';
      document.getElementById('saveBtn').innerText = 'Salvar Produto';
      document.getElementById('cancelEditBtn').style.display = 'none';
      clearProductForm();
    }

    async function toggleSold(id, atualVendido) {
      await db.collection('produtos').doc(id).update({ vendido: !atualVendido });
      loadProducts();
    }

    function handlePhoto(e) {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      
      let maxAllowed = 4 - photosB64.length;
      if (maxAllowed <= 0) {
        alert("O limite máximo é de 4 fotos por produto.");
        document.getElementById('hiddenFileInput').value = '';
        return;
      }
      
      const filesToProcess = files.slice(0, maxAllowed);
      
      filesToProcess.forEach(f => {
        const r = new FileReader(); 
        r.onload = x => { 
          compressImage(x.target.result, (compressed) => {
            photosB64.push(compressed);
            renderPhotosPreview();
          });
        }; 
        r.readAsDataURL(f);
      });
      document.getElementById('hiddenFileInput').value = '';
    }
    
    function removePhoto(index) {
      photosB64.splice(index, 1);
      renderPhotosPreview();
    }
    
    function renderPhotosPreview() {
      const container = document.getElementById('previewContainer');
      container.innerHTML = '';
      photosB64.forEach((b64, idx) => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '100px';
        div.style.height = '100px';
        div.innerHTML = `
          <img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid var(--border);">
          <button onclick="removePhoto(${idx})" class="danger-btn" style="position:absolute;top:-5px;right:-5px;width:24px;height:24px;border-radius:50%;padding:0;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;">&times;</button>
        `;
        container.appendChild(div);
      });
    }

    async function saveProduct() {
      const nome = document.getElementById('prodName').value.trim();
      const codigoBarras = document.getElementById('prodBarcode').value.trim();
      const fornecedor = document.getElementById('prodSupplier').value.trim();
      const preco = parseFloat(document.getElementById('prodPrice').value || 0);
      const categoria = document.getElementById('prodCategory').value;
      const descricao = document.getElementById('prodDescription').value.trim();
      if (!nome || !preco) return alert('Preencha nome e preço');
      
      const saveBtn = document.getElementById('saveBtn');
      const originalText = saveBtn.innerText;
      saveBtn.innerText = 'Salvando...';
      saveBtn.disabled = true;

      try {
        const dadosProduto = { nome, codigoBarras, fornecedor, preco, categoria, descricao, fotosBase64: photosB64 };
        if (editingProductId) {
          await db.collection('produtos').doc(editingProductId).update({
            ...dadosProduto,
            fotoBase64: firebase.firestore.FieldValue.delete()
          });
          alert('✅ Produto atualizado com sucesso!');
        } else {
          dadosProduto.vendido = false;
          await db.collection('produtos').add(dadosProduto);
          alert('✅ Produto cadastrado com sucesso!');
        }
        cancelEdit(); 
        loadProducts();
      } catch (err) {
        console.error("Erro ao salvar produto:", err);
        alert('❌ Erro ao salvar: O arquivo de imagem pode ser muito grande, ou houve um erro de conexão. Tente uma imagem menor. Detalhe: ' + err.message);
      } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
      }
    }

    function clearProductForm() {
      document.getElementById('prodName').value = '';
      document.getElementById('prodBarcode').value = '';
      document.getElementById('prodSupplier').value = '';
      document.getElementById('prodPrice').value = '';
      document.getElementById('prodCategory').value = '';
      document.getElementById('prodDescription').value = '';
      document.getElementById('hiddenFileInput').value = '';
      photosB64 = [];
      renderPhotosPreview();
    }
    async function deleteProduct(id) { if (!confirm('Excluir produto?')) return; await db.collection('produtos').doc(id).delete(); loadProducts(); }

    async function loadClients() {
      try {
        const snap = await db.collection('clientes').get();
        allClients = []; snap.forEach(d => allClients.push({ id: d.id, ...d.data() }));
        renderClientsList();
      } catch (e) {
        console.error('Clientes:', e);
        document.getElementById('clientsList').innerHTML = '<div style="color:red;padding:20px;">Erro: ' + e.message + '</div>';
      }
    }
    async function saveClient() {
      const nome = document.getElementById('clientName').value.trim();
      const telefone = document.getElementById('clientPhone').value.trim();
      const total = parseFloat(document.getElementById('clientTotal').value || 0);
      const pago = parseFloat(document.getElementById('clientPaid').value || 0);
      if (!nome || !total) return alert('Preencha nome e valor total');
      if (clientSelectedProducts.length === 0) return alert('Adicione pelo menos um produto na venda.');

      const produtosComprados = clientSelectedProducts.map(p => ({ id: p.id, nome: p.nome, preco: p.preco }));
      const descProdutos = produtosComprados.map(p => p.nome).join(', ');

      const saveBtn = event.target;
      const originalText = saveBtn.innerText;
      saveBtn.innerText = 'Salvando...';
      saveBtn.disabled = true;

      try {
        await db.collection('clientes').add({ 
          nome, 
          telefone, 
          produto: descProdutos, 
          produtos: produtosComprados,
          valorTotal: total, 
          valorPago: pago, 
          dataCadastro: new Date() 
        });

        // Atualizar o status dos produtos no estoque
        for (const prod of clientSelectedProducts) {
          await db.collection('produtos').doc(prod.id).update({ vendido: true });
        }

        clearClientForm(); 
        loadClients();
        loadProducts(); // Refresh products so they show as sold
        alert('Venda registrada e produtos baixados do estoque com sucesso!');
      } catch (err) {
        console.error('Erro ao salvar venda:', err);
        alert('Erro ao registrar a venda: ' + err.message);
      } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
      }
    }
    
    function addProductToClient() {
      const barcodeInput = document.getElementById('clientBarcodeSearch');
      const barcode = barcodeInput.value.trim();
      if (!barcode) return;
      
      const prod = allProducts.find(p => p.codigoBarras === barcode);
      if (!prod) {
        alert('Produto não encontrado com este código de barras.');
        return;
      }
      if (prod.vendido) {
        alert('Este produto já consta como vendido no sistema.');
        return;
      }
      
      if (clientSelectedProducts.find(p => p.id === prod.id)) {
        alert('Este produto já foi adicionado à venda.');
        barcodeInput.value = '';
        return;
      }

      clientSelectedProducts.push(prod);
      barcodeInput.value = '';
      
      const currentTotal = parseFloat(document.getElementById('clientTotal').value || 0);
      document.getElementById('clientTotal').value = (currentTotal + (Number(prod.preco) || 0)).toFixed(2);
      
      renderClientSelectedProducts();
    }

    function removeProductFromClient(index) {
      const prod = clientSelectedProducts[index];
      clientSelectedProducts.splice(index, 1);
      
      const currentTotal = parseFloat(document.getElementById('clientTotal').value || 0);
      const newTotal = Math.max(0, currentTotal - (Number(prod.preco) || 0));
      document.getElementById('clientTotal').value = newTotal > 0 ? newTotal.toFixed(2) : '';
      
      renderClientSelectedProducts();
    }

    function renderClientSelectedProducts() {
      const container = document.getElementById('clientSelectedProductsList');
      if (clientSelectedProducts.length === 0) {
        container.innerHTML = '<p style="color:var(--muted);font-size:13px;">Nenhum produto adicionado à venda.</p>';
        return;
      }
      
      container.innerHTML = clientSelectedProducts.map((p, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:8px 12px;border:1px solid var(--border);border-radius:8px;">
          <div style="font-size:13px;">
            <strong>${p.nome}</strong> | ${p.codigoBarras}
            <br><span style="color:var(--accent2);font-weight:600;">R$ ${Number(p.preco || 0).toFixed(2).replace('.', ',')}</span>
          </div>
          <button onclick="removeProductFromClient(${i})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:16px;" title="Remover">×</button>
        </div>
      `).join('');
    }

    function clearClientForm() {
      document.getElementById('clientName').value = '';
      document.getElementById('clientPhone').value = '';
      const bc = document.getElementById('clientBarcodeSearch');
      if(bc) bc.value = '';
      document.getElementById('clientTotal').value = '';
      document.getElementById('clientPaid').value = '';
      clientSelectedProducts = [];
      renderClientSelectedProducts();
    }
    function renderClientsList() {
      const c = document.getElementById('clientsList');
      if (!allClients.length) return c.innerHTML = '<p style="color:var(--muted);">Nenhum cliente cadastrado.</p>';
      c.innerHTML = '<table><thead><tr><th>Cliente</th><th>Telefone</th><th>Produto</th><th>Total</th><th>Pago</th><th>Falta</th><th>Status</th><th>Ações</th></tr></thead><tbody>' +
        allClients.map(x => {
          const falta = Math.max(0, Number(x.valorTotal || 0) - Number(x.valorPago || 0));
          const status = falta <= 0 ? 'Pago' : 'Pendente';
          const statusClass = falta <= 0 ? 'paid-badge' : 'pending-badge';
          return `<tr><td><strong>${x.nome}</strong></td><td>${x.telefone || '-'}</td><td>${x.produto || '-'}</td><td>R$ ${Number(x.valorTotal || 0).toFixed(2).replace('.', ',')}</td><td>R$ ${Number(x.valorPago || 0).toFixed(2).replace('.', ',')}</td><td style="font-weight:600;color:${falta > 0 ? '#b91c1c' : '#0a9e99'}">R$ ${falta.toFixed(2).replace('.', ',')}</td><td><span class="${statusClass}">${status}</span></td><td><button onclick="deleteClient('${x.id}')" class="danger-btn" style="padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;">Excluir</button></td></tr>`;
        }).join('') + '</tbody></table>';
    }
    async function deleteClient(id) { if (!confirm('Excluir este cliente?')) return; await db.collection('clientes').doc(id).delete(); loadClients(); }

    let selectedProductForWhatsApp = null;
    const SELLERS = {
      nicole: { nome: 'Nicole', telefone: '5541995511560' },
      fabiana: { nome: 'Fabiana', telefone: '5541991222449' }
    };

    function openWhatsAppModal(productId) {
      const prod = allProducts.find(p => p.id === productId);
      if (!prod) return;
      selectedProductForWhatsApp = prod;

      const preview = document.getElementById('waProductPreview');
      const imgHtml = prod.fotoBase64
        ? `<img src="${prod.fotoBase64}" alt="${prod.nome}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid var(--border);">`
        : `<div style="width:48px;height:48px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:20px;">💎</div>`;
      const preco = Number(prod.preco || 0).toFixed(2).replace('.', ',');

      preview.innerHTML = `
    ${imgHtml}
    <div style="flex:1;min-width:0;text-align:left;">
      <h5 style="font-weight:600;font-size:14px;margin:0;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${prod.nome}</h5>
      <p style="color:var(--accent2);font-weight:700;font-size:14px;margin:2px 0 0;">R$ ${preco}</p>
      ${prod.codigoBarras ? `<p style="font-size:11px;color:var(--muted);margin:2px 0 0;">Ref: ${prod.codigoBarras}</p>` : ''}
    </div>
  `;
      document.getElementById('whatsappModal').style.display = 'flex';
    }

    function closeWhatsAppModal() {
      document.getElementById('whatsappModal').style.display = 'none';
      selectedProductForWhatsApp = null;
    }

    function openGeneralWhatsApp(sellerKey) {
      selectedProductForWhatsApp = null;
      sendWhatsAppTo(sellerKey);
    }

    function sendWhatsAppTo(sellerKey) {
      const seller = SELLERS[sellerKey];
      if (!seller) return;

      let msg = '';
      if (selectedProductForWhatsApp) {
        const p = selectedProductForWhatsApp;
        const preco = Number(p.preco || 0).toFixed(2).replace('.', ',');
        msg = `Olá ${seller.nome}! Vi o catálogo e me interessei pela peça:\n\n✨ *${p.nome}*\n💰 *Valor:* R$ ${preco}`;
        if (p.codigoBarras) {
          msg += `\n🏷️ *Ref:* ${p.codigoBarras}`;
        }
        if (p.categoria) {
          msg += `\n📁 *Categoria:* ${p.categoria}`;
        }
        msg += `\n\nA peça ainda está disponível?`;
      } else {
        msg = `Olá ${seller.nome}! Estava olhando o catálogo de joias e gostaria de tirar algumas dúvidas.`;
      }

      const encoded = encodeURIComponent(msg);
      const waUrl = `https://wa.me/${seller.telefone}?text=${encoded}`;
      window.open(waUrl, '_blank');
      closeWhatsAppModal();
    }

    let currentGalleryImages = [];
    let galleryIndex = 0;

    function openGallery(productId) {
      const prod = allProducts.find(p => p.id === productId);
      if (!prod) return;
      currentGalleryImages = prod.fotosBase64 || (prod.fotoBase64 ? [prod.fotoBase64] : []);
      if (currentGalleryImages.length <= 1) return; // Nao abre se so tiver 1, ja aparece na vitrine
      
      galleryIndex = 0;
      updateGalleryView();
      document.getElementById('galleryModal').style.display = 'flex';
      setTimeout(() => document.getElementById('galleryModal').style.opacity = '1', 10);
    }
    
    function closeGallery() {
      const modal = document.getElementById('galleryModal');
      modal.style.opacity = '0';
      setTimeout(() => modal.style.display = 'none', 300);
    }
    
    function updateGalleryView() {
      document.getElementById('galleryImg').src = currentGalleryImages[galleryIndex];
      document.getElementById('galleryCounter').innerText = `${galleryIndex + 1} de ${currentGalleryImages.length}`;
    }
    
    function prevGalleryImage() {
      galleryIndex = (galleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
      updateGalleryView();
    }
    
    function nextGalleryImage() {
      galleryIndex = (galleryIndex + 1) % currentGalleryImages.length;
      updateGalleryView();
    }

    window.addEventListener('click', function (e) {
      const wm = document.getElementById('whatsappModal');
      const gm = document.getElementById('galleryModal');
      if (e.target === wm) closeWhatsAppModal();
      if (e.target === gm) closeGallery();
    });

    window.onload = function () { loadCategories(); loadProducts(); };
