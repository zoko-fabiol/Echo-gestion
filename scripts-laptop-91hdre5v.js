// ==========================================
// GARDE D'AUTHENTIFICATION STRICT & REDIRECTION
// ==========================================
(function() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const sessionStr = localStorage.getItem('stock_expert_user_session');
        let isAuthenticated = false;
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                if (session && session.email && session.role) {
                    isAuthenticated = true;
                }
            } catch (e) {
                // Session corrompue ou invalide
            }
        }
        if (!isAuthenticated) {
            // Masquer immédiatement le body pour éviter FOUC (flash of unauthenticated content)
            if (document.body) {
                document.body.style.display = 'none';
            } else {
                document.write('<style>body { display: none !important; }</style>');
            }
            // Rediriger vers le portail RH pour connexion
            window.location.replace('index.html');
            // Lever une erreur pour stopper l'exécution du reste du code
            throw new Error("Authentification requise. Redirection en cours...");
        }
    }
})();

const INVENTORY_KEY = 'stock_expert_inventory_v3';
const DAILY_RECORDS_KEY = 'stock_expert_sales_v3';
const EXPENSES_KEY = 'stock_expert_expenses_v1';
const INCOME_KEY = 'stock_expert_income_v1'; // NOUVEAU
const PRODUCT_FILTER_KEY = 'stock_expert_product_type_filter_v1';
const INVENTORY_FILTER_KEY = 'stock_expert_inventory_type_filter_v1';
// Recipes & Productions module removed
const LOGO_KEY = 'stock_expert_logo';
const THEME_KEY = 'stock_expert_theme';
const COMPANY_KEY = 'stock_expert_company';
const THEME_COLOR_KEY = 'stock_expert_theme_color'; // NOUVEAU
const GLASS_ENABLED_KEY = 'stock_expert_glass_enabled'; // FIXED: restored missing key
const BACKEND_CONFIG_KEY = 'stock_expert_backend_config_v1';
const APP_YEAR_KEY = 'stock_expert_year'; // NOUVEAU: Clé pour l'année sélectionnée
// Ensure valid default
let savedYearVal = typeof localStorage !== 'undefined' ? localStorage.getItem(APP_YEAR_KEY) : null;
let APP_YEAR = savedYearVal ? parseInt(savedYearVal) : new Date().getFullYear();
if (isNaN(APP_YEAR)) APP_YEAR = new Date().getFullYear();


const CLIENTS_KEY = 'stock_expert_clients_v2';
const SUPPLIERS_KEY = 'stock_expert_suppliers_v1';
const QUOTES_KEY = 'stock_expert_quotes_v1'; // NOUVEAU
const BACKUP_SCHEDULE_KEY = 'stock_expert_backup_schedule_v1';
const LAST_BACKUP_KEY = 'stock_expert_last_backup_v1';
const BACKUP_LOCK_KEY = 'stock_expert_backup_lock_v1';

function isReadOnlyUser() {
    if (typeof localStorage === 'undefined') return false;
    const sessionStr = localStorage.getItem('stock_expert_user_session');
    if (!sessionStr) return false;
    try {
        const session = JSON.parse(sessionStr);
        return session && session.role === 'lecteur';
    } catch (e) {
        return false;
    }
}

// ---------- Tutoriel (stock) ----------
// --- AMELIORATION: FONCTION TOAST ---
function showToast(message, type = 'success') {
    // Créer l'élément si n'existe pas
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    // Icône selon le type
    const icon = type === 'error'
        ? '<i class="fa-solid fa-circle-exclamation"></i>'
        : '<i class="fa-solid fa-check-circle"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hide'); // assuming CSS animation
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', async () => {
    if (isReadOnlyUser()) {
        document.body.classList.add('is-lecteur');
        
        // Premium notification banner injection
        const banner = document.createElement('div');
        banner.className = 'lecteur-banner';
        banner.innerHTML = '<i class="fa-solid fa-eye mr-2"></i> Mode Lecture Seule — Accès restreint pour les comptes echosdechezmoi';
        document.body.insertBefore(banner, document.body.firstChild);
        
        // Dynamic premium style injection
        const style = document.createElement('style');
        style.innerHTML = `
            .lecteur-banner {
                background: linear-gradient(135deg, #d97706, #b45309);
                color: white;
                padding: 12px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                animation: slideDown 0.3s ease-out;
            }
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            .is-lecteur #btn-add-product,
            .is-lecteur #btn-add-expense,
            .is-lecteur #btn-add-income,
            .is-lecteur #btn-add-production,
            .is-lecteur #btn-add-raw-material,
            .is-lecteur #btn-add-client-supplier,
            .is-lecteur button#validate-btn,
            .is-lecteur button#clear-cart-btn,
            .is-lecteur button#save-settings,
            .is-lecteur button#reset-all-data,
            .is-lecteur button#reset-bilan,
            .is-lecteur button#save-backup-schedule,
            .is-lecteur button#import-csv,
            .is-lecteur .action-btn-delete,
            .is-lecteur .action-btn-edit,
            .is-lecteur button:has(.fa-trash),
            .is-lecteur button:has(.fa-edit),
            .is-lecteur button:has(.fa-plus),
            .is-lecteur button:has(.fa-save),
            .is-lecteur button[onclick*="delete"],
            .is-lecteur button[onclick*="edit"],
            .is-lecteur button[onclick*="initAdd"],
            .is-lecteur a[onclick*="delete"],
            .is-lecteur a[onclick*="edit"] {
                opacity: 0.5;
                pointer-events: none !important;
                cursor: not-allowed !important;
            }
            .is-lecteur input:not(#searchProduct):not(#searchInventory):not(#searchDaily):not(#searchExpense):not(#searchIncome):not(#productTypeFilter):not(#inventoryTypeFilter),
            .is-lecteur select:not(#productTypeFilter):not(#inventoryTypeFilter),
            .is-lecteur textarea {
                pointer-events: none !important;
                opacity: 0.7;
                background-color: #f3f4f6 !important;
                cursor: not-allowed !important;
            }
            .is-lecteur #productGrid .product-card {
                pointer-events: none !important;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
    // Wrap initialization so a single failure doesn't leave the UI hidden (v-cloak)
    try {
        // Charger depuis Dexie d'abord pour synchronisation entre pages
        await loadDataFromDexieIfAvailable();
        // Ensuite charger depuis localStorage (cache)
        loadData();
        loadClientsSuppliers();
        initTheme();
        applyThemeColor();
        initTheme();
        applyThemeColor();
        updateCompanyDisplays();
        renderProductTiles();
        renderInventory(); // rendre l'inventaire visible au chargement
        renderDailyHistory();
        renderExpenses();
        renderIncome(); // NOUVEAU
        renderClientSupplierList();
        updateStats();
        updateCharts();
        renderQuotes(); // NOUVEAU: Charger l'historique des devis
        // recipes/productions module removed, no rendering
        renderCart();
        // Initialize client mode buttons
        setClientMode('client');

        // NOUVEAU: Initialiser la date d'aujourd'hui pour le formulaire de rentrée d'argent
        const today = new Date().toISOString().split('T')[0];
        const incomeDate = document.getElementById('income-date');
        if (incomeDate) incomeDate.value = today;

        // Apply glass styling and set up observers


        // Re-apply when preference changes
        // Re-apply when preference changes
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_COLOR_KEY) {
                applyThemeColor();
            }
        });

        // Observe DOM changes for dynamic elements


        // Initialize Auth settings UI (if present)
        try {
            if (window.Auth) {
                const cfg = await window.Auth.getConfig();
                const authEnabledEl = document.getElementById('settings-auth-enabled');
                const authRememberEl = document.getElementById('settings-auth-remember');
                const adminCodeEl = document.getElementById('settings-admin-code');
                const secCodeEl = document.getElementById('settings-secretary-code');
                const logsEl = document.getElementById('auth-logs');
                if (authEnabledEl) authEnabledEl.checked = !!(cfg && cfg.enabled);
                if (authRememberEl) authRememberEl.checked = !!(cfg && cfg.remember);
                // Don't pre-fill actual codes for security, leave placeholders
                if (adminCodeEl) adminCodeEl.value = '';
                if (secCodeEl) secCodeEl.value = '';

                // Render logs
                if (logsEl) { const logs = await window.Auth.getLogs(); logsEl.innerHTML = logs.slice(0, 50).map(l => { const d = new Date(l.ts); return `<div class="py-1 border-b border-gray-100 dark:border-gray-800">[${d.toLocaleString()}] ${l.type} ${l.role ? '(' + l.role + ')' : ''} ${l.success ? '<span class="text-green-600">OK</span>' : '<span class="text-red-600">ÉCHEC</span>'}</div>`; }).join(''); }

                const saveBtn = document.getElementById('save-auth-settings');
                if (saveBtn) saveBtn.addEventListener('click', async () => {
                    const enabled = !!(document.getElementById('settings-auth-enabled')?.checked);
                    const remember = !!(document.getElementById('settings-auth-remember')?.checked);
                    const adminCode = document.getElementById('settings-admin-code')?.value || '';
                    const secCode = document.getElementById('settings-secretary-code')?.value || '';
                    await window.Auth.setConfig({ enabled, remember });
                    if (adminCode) await window.Auth.setRoleCode('admin', adminCode);
                    if (secCode) await window.Auth.setRoleCode('secretaire', secCode);
                    // refresh logs & UI
                    const logs2 = await window.Auth.getLogs(); if (logsEl) logsEl.innerHTML = logs2.slice(0, 50).map(l => { const d = new Date(l.ts); return `<div class="py-1 border-b border-gray-100 dark:border-gray-800">[${d.toLocaleString()}] ${l.type} ${l.role ? '(' + l.role + ')' : ''} ${l.success ? '<span class="text-green-600">OK</span>' : '<span class="text-red-600">ÉCHEC</span>'}</div>`; }).join('');
                    // clear inputs for security and show confirmation
                    if (adminCode) document.getElementById('settings-admin-code').value = '';
                    if (secCode) document.getElementById('settings-secretary-code').value = '';
                    alert('Paramètres d\'authentification sauvegardés. Les nouveaux codes sont actifs.');
                    window.dispatchEvent(new Event('auth-config-changed'));
                    try { updateAuthUI(); } catch (e) { }
                });

                // Test buttons (try login without remembering)
                const testAdminBtn = document.getElementById('test-admin-code');
                if (testAdminBtn) testAdminBtn.addEventListener('click', async () => {
                    const val = document.getElementById('settings-admin-code')?.value || '';
                    if (!val) return alert('Entrez un code admin pour le tester.');
                    const ok = await window.Auth.login('admin', val, { remember: false });
                    if (ok) { alert('Code Admin: OK'); window.Auth.logout(); } else alert('Code Admin: Incorrect');
                });
                const testSecBtn = document.getElementById('test-secretary-code');
                if (testSecBtn) testSecBtn.addEventListener('click', async () => {
                    const val = document.getElementById('settings-secretary-code')?.value || '';
                    if (!val) return alert('Entrez un code secrétaire pour le tester.');
                    const ok = await window.Auth.login('secretaire', val, { remember: false });
                    if (ok) { alert('Code Secrétaire: OK'); window.Auth.logout(); } else alert('Code Secrétaire: Incorrect');
                });

                // Update UI according to role & config
                async function updateAuthUI() {
                    try {
                        const cfg = await window.Auth.getConfig();
                        const role = await window.Auth.getRole();
                        const canSale = await window.Auth.hasAccess('sale');
                        const saleBtn = document.getElementById('toggle-sale-btn');
                        const validateBtn = document.getElementById('validate-btn');
                        const roleEl = document.getElementById('auth-current-role');
                        if (roleEl) roleEl.innerText = role ? (role === 'admin' ? 'Admin' : 'Secrétaire') : 'Non connecté';
                        if (saleBtn) {
                            if (cfg && cfg.enabled && !canSale) {
                                saleBtn.setAttribute('disabled', 'disabled');
                                saleBtn.classList.add('opacity-50', 'cursor-not-allowed');
                                saleBtn.title = 'Accès Vente : Non autorisé';
                                // Switch to quote ONLY if we are in sale mode and access is revoked explicitly
                                if (typeof currentMode !== 'undefined' && currentMode === 'sale') toggleMode('quote');
                            } else {
                                saleBtn.removeAttribute('disabled');
                                saleBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                                saleBtn.title = 'Mode Vente';
                                // Ensure we don't accidentally force quote mode here
                            }
                        }
                        if (validateBtn) {
                            if (cfg && cfg.enabled && !canSale) { validateBtn.setAttribute('disabled', 'disabled'); validateBtn.classList.add('opacity-50', 'cursor-not-allowed'); } else { validateBtn.removeAttribute('disabled'); validateBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
                        }
                    } catch (e) { console.warn('updateAuthUI error', e); }
                }

                // Register update hooks
                window.addEventListener('role-changed', () => { try { updateAuthUI(); } catch (e) { } });
                window.addEventListener('auth-config-changed', () => { try { updateAuthUI(); } catch (e) { } });
                window.addEventListener('storage', (e) => { if (e.key === 'app_auth_broadcast_v1') try { updateAuthUI(); } catch (e) { } });
                // call once to set initial state
                try { updateAuthUI(); } catch (e) { }
            }
        } catch (e) { console.warn('Auth UI init error', e); }

    } catch (err) {
        console.error('Initialisation error:', err);
        try { window.showNotification && window.showNotification('Erreur d\'initialisation: ' + (err && err.message ? err.message : String(err)), 'error'); } catch (e) { }
    } finally {
        // Ensure the main tab is visible and that v-cloak is removed even if an error happened
        try { switchTab('stock'); } catch (e) { }
        try { document.getElementById('stock-app')?.removeAttribute('v-cloak'); } catch (e) { }
    }
});



let inventory = [];

function getRawMaterials() {
    return inventory.filter(p => p && p.type === 'raw');
}

function getFinishedProducts() {
    return inventory.filter(p => p && p.type === 'finished');
}
let dailyRecords = [];
let expenses = [];
let income = []; // NOUVEAU: Rentrées d'argent
/*
 * productions: array of production records
 * Schema (suggested):
 * { id: number, date: ISO string, recipeId: number, productId: number, quantityProduced: number,
 *   inputs: [{ inventoryId: number, quantity: number }],
 *   waste: number (quantity lost),
 *   yieldPercentage: number (optional),
 *   materialsCost: number (optional), laborCost: number (optional), totalCost: number (optional),
 *   status: 'draft'|'completed'|'cancelled', producedBy: string (optional), notes: string (optional)
 * }
 */
// productions removed
let clients = []; // NOUVEAU
let suppliers = []; // NOUVEAU: Fournisseurs avec logo
let quotes = []; // NOUVEAU
let clientSupplierMode = 'client'; // 'client' ou 'supplier'

let cart = [];
let selectedInventoryId = null; // id of currently selected inventory item
let currentMode = 'sale'; // 'sale' ou 'quote' - Default to 'sale'
let currentInvoiceData = null;
let currentOrderData = null; // Pour la prévisualisation des commandes

let companyInfo = {
    name: "Nom de l'Entreprise",
    contact: "Adresse, Ville\nTél: 6xx xxx xxx",
    footer: "Merci de votre confiance !"
};

// --- EXPORT FUNCTIONS ---

function exportInventoryXLSX() {
    const typeFilter = document.getElementById('inventoryTypeFilter') ? document.getElementById('inventoryTypeFilter').value : 'all';
    const list = inventory.filter(i => typeFilter === 'all' || (i.type || 'finished') === typeFilter);
    const data = list.map(i => ({
        'Nom': i.name,
        'Catégorie': i.category || 'N/A',
        'Stock Actuel': i.stock,
        'Unité Vente': i.saleUnit || 'Pce',
        'Prix Vente (FCFA)': i.salePrice || 0,
        'Unité Achat': i.purchaseUnit || 'Pce',
        'Prix Achat (FCFA)': i.purchasePrice || 0,
        'Valeur Stock (Vente)': i.stock * (i.salePrice || 0),
        'Valeur Stock (Achat)': i.stock * (i.purchasePrice || 0)
    }));
    const totalStockValueSale = list.reduce((sum, i) => sum + i.stock * (i.salePrice || 0), 0);
    const totalStockValuePurchase = list.reduce((sum, i) => sum + i.stock * (i.purchasePrice || 0), 0);
    data.push({
        "Nom": "TOTAL",
        "Catégorie": "",
        "Stock Actuel": inventory.reduce((sum, i) => sum + i.stock, 0),
        "Prix Vente (FCFA)": "",
        "Unité Vente": "",
        "Prix Achat (FCFA)": "",
        "Unité Achat": "",
        "Valeur Stock (Achat)": totalStockValuePurchase.toLocaleString(),
        "Valeur Stock (Vente)": totalStockValueSale.toLocaleString()
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{
        wch: 25
    }, {
        wch: 15
    }, {
        wch: 15
    }, {
        wch: 18
    }, {
        wch: 15
    }, {
        wch: 18
    }, {
        wch: 18
    }, {
        wch: 18
    }]; // Ajuster les largeurs de colonnes
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    const typeSuffix = getTypeFileSuffix(typeFilter);
    XLSX.writeFile(wb, `Inventaire_${typeSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportInventoryPDF() {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // LOGO
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // EN-TéTE
    doc.setFontSize(18);
    doc.setTextColor(31, 122, 62);
    doc.text("RAPPORT D'INVENTAIRE", pageWidth / 2, y + 8, {
        align: 'center'
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const typeLabel = getTypeLabel(typeFilter);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')} é ${typeLabel}`, pageWidth / 2, y + 14, {
        align: 'center'
    });
    // No period label for inventory export

    doc.setFontSize(9);
    doc.setTextColor(0);
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 20;
    contactLines.forEach(line => {
        doc.text(line, pageWidth / 2, contactY, {
            align: 'center'
        });
        contactY += 4;
    });

    // TABLEAU
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const typeFilter = document.getElementById('inventoryTypeFilter') ? document.getElementById('inventoryTypeFilter').value : 'all';
    // Trier l'inventaire par nom (alphabétique) pour un ordre déterministe
    const sortedInventory = inventory.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const list = sortedInventory.filter(i => typeFilter === 'all' || (i.type || 'finished') === typeFilter);
    const body = list.map(item => [
        item.name,
        item.category,
        item.stock,
        `${sanitizeNumber(item.salePrice)} F`,
        item.saleUnit,
        `${sanitizeNumber(item.purchasePrice)} F`,
        item.purchaseUnit,
        sanitizeNumber(item.stock * (item.salePrice || 0)),
        sanitizeNumber(item.stock * (item.purchasePrice || 0))
    ]);

    doc.autoTable({
        startY: contactY + 5,
        head: [
            ['Produit', 'Catégorie', 'Stock', 'Prix Vente', 'Unité Vente', 'Prix Achat', 'Unité Achat', 'Valeur Vente (FCFA)', 'Valeur Achat (FCFA)']
        ],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8
        },
        styles: {
            fontSize: 7
        },
        columnStyles: {
            0: {
                halign: 'left',
                cellWidth: 35
            },
            1: {
                halign: 'left',
                cellWidth: 20
            },
            2: {
                halign: 'center',
                cellWidth: 15
            },
            3: {
                halign: 'right',
                cellWidth: 18
            },
            4: {
                halign: 'center',
                cellWidth: 15
            },
            5: {
                halign: 'right',
                cellWidth: 18
            },
            6: {
                halign: 'center',
                cellWidth: 15
            },
            7: {
                halign: 'right',
                cellWidth: 22
            },
            8: {
                halign: 'right',
                cellWidth: 22
            }
        },
        didDrawCell: (data) => {
            // Couleur pour le stock faible ou épuisé
            if (data.section === 'body' && data.column.index === 2) {
                const stock = parseInt(data.cell.text);
                if (stock <= 0) {
                    data.cell.styles.textColor = [220, 53, 69];
                    data.cell.styles.fontStyle = 'bold';
                } else if (stock < 5) {
                    data.cell.styles.textColor = [255, 127, 14];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
            // Couleur verte pour la valeur de vente
            if (data.section === 'body' && data.column.index === 7) {
                data.cell.styles.textColor = [31, 122, 62];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    // TOTAUX
    const totalValue = inventory.reduce((sum, i) => sum + (i.stock * i.salePrice), 0);
    const totalItems = inventory.reduce((sum, i) => sum + i.stock, 0);
    const lowStockCount = inventory.filter(i => i.stock < 5 && i.stock > 0).length;
    const outOfStock = inventory.filter(i => i.stock <= 0).length;
    doc.setFillColor(240, 250, 245);
    doc.rect(15, finalY, pageWidth - 30, 25, 'F');
    doc.setFontSize(11);
    doc.setTextColor(31, 122, 62);
    doc.text("RESUME", 20, finalY + 7);
    doc.setFontSize(9);
    doc.setTextColor(0);
    const totalValueStr = Math.round(totalValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    doc.text(`Valeur Totale du Stock (Vente): ${totalValueStr} FCFA`, 20, finalY + 13);
    doc.text(`Nombre Total d'Articles en Stock: ${totalItems}`, 20, finalY + 18);
    doc.text(`Articles en Alerte (Stock < 5): ${lowStockCount}`, 110, finalY + 13);
    doc.text(`Articles épuisés (Stock <= 0): ${outOfStock}`, 110, finalY + 18);


    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 15, {
        align: 'center'
    });

    const typeSuffixPdf = getTypeFileSuffix(typeFilter);
    doc.save(`Inventaire_${typeSuffixPdf}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportHistoryPDF() {
    if (window.Auth) { const logged = await window.Auth.isLoggedIn(); if (!logged) { window.Auth.showLogin({ requiredFeature: 'reports' }); return; } const ok = await window.Auth.hasAccess('reports'); if (!ok) return alert('Accès refusé: rapports de ventes réservés aux administrateurs.'); }
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // LOGO
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // EN-TéTE
    doc.setFontSize(18);
    doc.setTextColor(31, 122, 62);
    doc.text("HISTORIQUE DES VENTES", pageWidth / 2, y + 8, {
        align: 'center'
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y + 14, {
        align: 'center'
    });

    doc.setFontSize(9);
    doc.setTextColor(0);
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 20;
    contactLines.forEach(line => {
        doc.text(line, pageWidth / 2, contactY, {
            align: 'center'
        });
        contactY += 4;
    });

    // TABLEAU
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const hf = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
    const salesFilterList = filterByTime(dailyRecords.filter(r => r.type === 'sale'), hf).sort((a, b) => new Date(b.date) - new Date(a.date));
    const body = salesFilterList.map(r => [
        new Date(r.date).toLocaleDateString('fr-FR') + ' ' + new Date(r.date).toLocaleTimeString('fr-FR').slice(0, 5),
        r.items.length,
        sanitizeNumber(r.total),
        sanitizeNumber(r.total - (r.totalCost || 0)),
        r.items.map(i => `${i.name} (${i.qty}x${sanitizeNumber(i.price)}F)`).join('\n')
    ]);

    doc.autoTable({
        startY: contactY + 5,
        head: [
            ['Date & Heure', 'Articles', 'Total (FCFA)', 'Marge Brute (FCFA)', 'Détails de la Vente']
        ],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8
        },
        styles: {
            fontSize: 7
        },
        columnStyles: {
            0: {
                halign: 'center',
                cellWidth: 25
            },
            1: {
                halign: 'center',
                cellWidth: 15
            },
            2: {
                halign: 'right',
                cellWidth: 20
            },
            3: {
                halign: 'right',
                cellWidth: 20
            },
            4: {
                halign: 'left'
            },
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                data.cell.styles.textColor = [255, 127, 14];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    // TOTAUX
    const totalVentes = salesFilterList.reduce((sum, r) => sum + r.total, 0);
    const totalArticles = salesFilterList.reduce((sum, r) => sum + r.items.length, 0);
    doc.setFillColor(240, 250, 245);
    doc.rect(15, finalY, pageWidth - 30, 15, 'F');
    doc.setFontSize(11);
    doc.setTextColor(31, 122, 62);
    doc.text("RéSUMé DES VENTES", 20, finalY + 7);
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`Total Chiffre d'Affaires: ${sanitizeNumber(totalVentes)} FCFA`, 20, finalY + 13);
    doc.text(`Total Articles Vendus: ${totalArticles}`, 100, finalY + 13);


    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 15, {
        align: 'center'
    });

    const hfSuffix = getFilterFileSuffix(hf);
    doc.save(`Historique_Ventes_${hfSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportHistoryXLSX() {
    if (window.Auth) { const logged = await window.Auth.isLoggedIn(); if (!logged) { window.Auth.showLogin({ requiredFeature: 'reports' }); return; } const ok = await window.Auth.hasAccess('reports'); if (!ok) return alert('Accès refusé: rapports de ventes réservés aux administrateurs.'); }
    const hf = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
    const hfLabel = getFilterLabel(hf);
    const hfSuffix = getFilterFileSuffix(hf);
    const list = filterByTime(dailyRecords.filter(r => r.type === 'sale'), hf);
    const data = list.map(r => ({
        'Date': new Date(r.date).toLocaleDateString('fr-FR'),
        'Heure': new Date(r.date).toLocaleTimeString('fr-FR'),
        'Nombre d\'articles': r.items.length,
        'Montant Total (FCFA)': r.total,
        'Coét Total (Achats)': r.totalCost || 0, // COéT
        'Marge Brute (FCFA)': r.margin || (r.total - (r.totalCost || 0)), // MARGE
        'Détails': r.items.map(i => `${i.name} (${i.qty}x${i.price}F)`).join('; '),
    }));
    // Add header rows: period label + empty row before the data
    const header = [
        [`Historique des Ventes - ${hfLabel}`],
        [`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`],
        []
    ];
    const ws = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(ws, data, {
        origin: 'A4'
    });
    ws['!cols'] = [{
        wch: 15
    }, {
        wch: 12
    }, {
        wch: 18
    }, {
        wch: 18
    }, {
        wch: 18
    }, {
        wch: 18
    }, {
        wch: 50
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historique Ventes");
    XLSX.writeFile(wb, `Historique_Ventes_${hfSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// --- NOUVELLE FONCTION: Exportation PDF des Dépenses ---
function exportExpensesPDF() {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // LOGO
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // EN-TéTE
    doc.setFontSize(18);
    doc.setTextColor(31, 122, 62);
    doc.text("HISTORIQUE DES DéPENSES", pageWidth / 2, y + 8, {
        align: 'center'
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y + 14, {
        align: 'center'
    });

    doc.setFontSize(9);
    doc.setTextColor(0);
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 20;
    contactLines.forEach(line => {
        doc.text(line, pageWidth / 2, contactY, {
            align: 'center'
        });
        contactY += 4;
    });

    // TABLEAU DES DéPENSES (triées par date - plus récentes en premier)
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const ef = document.getElementById('expensesFilter') ? document.getElementById('expensesFilter').value : 'all';
    const pf = document.getElementById('expensesPaymentFilter') ? document.getElementById('expensesPaymentFilter').value : 'all';
    let expensesList = filterByTime(expenses, ef).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (pf && pf !== 'all') {
        expensesList = expensesList.filter(exp => {
            const paid = Number(exp.paidAmount || 0);
            const remaining = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
            if (pf === 'partial') return remaining > 0;
            if (pf === 'paid') return remaining === 0;
            return true;
        });
    }
    const body = expensesList.map(exp => {
        let desc = exp.description || '';
        if (exp.transportCost != null) desc += (desc ? ' | ' : '') + `Transport: ${sanitizeNumber(exp.transportCost)} FCFA`;
        if (exp.lossPercentage != null) desc += (desc ? ' | ' : '') + `Perte: ${exp.lossPercentage}%`;
        // Payment info
        if (exp.paymentType === 'partial') {
            const paid = Number(exp.paidAmount || 0);
            const remaining = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
            desc += (desc ? ' | ' : '') + `Payé: ${sanitizeNumber(paid)} FCFA` + (remaining > 0 ? ` | Reste: ${sanitizeNumber(remaining)} FCFA` : '');
        } else {
            // total or considered paid
            desc += (desc ? ' | ' : '') + `Payé: ${sanitizeNumber(exp.amount || 0)} FCFA`;
        }
        return [
            new Date(exp.date).toLocaleDateString('fr-FR'),
            exp.category || 'N/A',
            sanitizeNumber(exp.amount) + ' FCFA',
            desc
        ];
    });

    // Totaux
    const totalAmount = expensesList.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalDebts = expensesList.reduce((sum, exp) => {
        const paid = Number(exp.paidAmount || 0);
        const remaining = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
        return sum + (remaining > 0 ? remaining : 0);
    }, 0);
    const totalRow = [{
        content: 'TOTAL DéPENSES',
        colSpan: 2,
        styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 250, 245],
            textColor: [31, 122, 62]
        }
    }, {
        content: sanitizeNumber(totalAmount) + ' FCFA',
        styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [240, 250, 245],
            textColor: [31, 122, 62]
        }
    }, {
        content: '',
        styles: {
            fillColor: [240, 250, 245]
        }
    }];

    // If there are debts, add an extra footer row for total debts
    const foot = [totalRow];
    if (totalDebts > 0) {
        foot.push([{
            content: 'TOTAL DETTES (reste à payer)',
            colSpan: 2,
            styles: {
                fontStyle: 'bold',
                halign: 'right',
                fillColor: [255, 243, 205],
                textColor: [133, 94, 0]
            }
        }, {
            content: sanitizeNumber(totalDebts) + ' FCFA',
            styles: {
                fontStyle: 'bold',
                halign: 'right',
                fillColor: [255, 243, 205],
                textColor: [133, 94, 0]
            }
        }, {
            content: '',
            styles: {
                fillColor: [255, 243, 205]
            }
        }]);
    }

    doc.autoTable({
        startY: contactY + 5,
        head: [
            ['Date', 'Catégorie', 'Montant', 'Description']
        ],
        body: body,
        foot: foot,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: {
                halign: 'center',
                valign: 'middle',
                cellWidth: 25
            },
            1: {
                halign: 'left',
                valign: 'middle',
                cellWidth: 35
            },
            2: {
                halign: 'right',
                valign: 'middle',
                cellWidth: 30
            },
            3: {
                halign: 'left'
            },
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                // Montant en rouge
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 15, {
        align: 'center'
    });

    const efSuffix = getFilterFileSuffix(ef);
    const pfSuffix = pf || 'all';
    doc.save(`Depenses_${efSuffix}_${pfSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Rentrées d'Argent PDF
function exportIncomeHistoryPDF() {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // LOGO
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // EN-TÊTE
    doc.setFontSize(18);
    doc.setTextColor(31, 122, 62);
    doc.text("HISTORIQUE DES RENTRÉES D'ARGENT", pageWidth / 2, y + 8, {
        align: 'center'
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y + 14, {
        align: 'center'
    });

    doc.setFontSize(9);
    doc.setTextColor(0);
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 20;
    contactLines.forEach(line => {
        doc.text(line, pageWidth / 2, contactY, {
            align: 'center'
        });
        contactY += 4;
    });

    // TABLEAU DES RENTRÉES (triées par date - plus récentes en premier)
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const incomeFilter = document.getElementById('incomeFilter') ? document.getElementById('incomeFilter').value : 'all';
    const incomeList = filterByTime(income, incomeFilter).sort((a, b) => new Date(b.date) - new Date(a.date));
    const body = incomeList.map(inc => [
        new Date(inc.date).toLocaleDateString('fr-FR'),
        inc.receivedBy || 'N/A',
        inc.source || '-',
        inc.description || '-',
        sanitizeNumber(inc.amount) + ' FCFA'
    ]);

    // Totaux
    const totalAmount = incomeList.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalRow = [{
        content: 'TOTAL RENTRÉES',
        colSpan: 4,
        styles: {
            fontStyle: 'bold',
            halign: 'right',
        }
    }, sanitizeNumber(totalAmount) + ' FCFA'];

    doc.autoTable({
        head: [['Date', 'Reçu par', 'Source', 'Description', 'Montant (FCFA)']],
        body: body,
        foot: [totalRow],
        startY: contactY + 5,
        margin: {
            left: 15,
            right: 15
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        footStyles: {
            fillColor: [220, 250, 224],
            fontStyle: 'bold',
            textColor: [31, 122, 62]
        },
        columnStyles: {
            4: {
                halign: 'right',
                textColor: [31, 122, 62],
                fontStyle: 'bold'
            }
        }
    });

    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 15, {
        align: 'center'
    });

    const ifSuffix = getFilterFileSuffix(incomeFilter);
    doc.save(`Rentrees_Argent_${ifSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportExpensesXLSX() {
    const ef = document.getElementById('expensesFilter') ? document.getElementById('expensesFilter').value : 'all';
    const list = filterByTime(expenses, ef);
    const data = list.map(e => ({
        'Date': new Date(e.date).toLocaleDateString('fr-FR'),
        'Heure': new Date(e.date).toLocaleTimeString('fr-FR'),
        'Catégorie': e.category || '',
        'Montant (FCFA)': e.amount || 0,
        'Transport (FCFA)': e.transportCost != null ? e.transportCost : '',
        'Perte (%)': e.lossPercentage != null ? e.lossPercentage : '',
        'Description': e.description || ''
    }));
    const efLabel = getFilterLabel(ef);
    const efSuffix = getFilterFileSuffix(ef);
    const header = [
        [`Historique des Dépenses - ${efLabel}`],
        [`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`],
        []
    ];
    const ws = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(ws, data, {
        origin: 'A4'
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Depenses');
    XLSX.writeFile(wb, `Depenses_${efSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// --- NOUVELLE FONCTION: Exportation PDF des Clients ---
function exportClientsPDF() {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // LOGO
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // EN-TéTE
    doc.setFontSize(18);
    doc.setTextColor(31, 122, 62);
    doc.text("LISTE DES CLIENTS ENREGISTRéS", pageWidth / 2, y + 8, {
        align: 'center'
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Clients: ${clients.length} | Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y + 14, {
        align: 'center'
    });

    doc.setFontSize(9);
    doc.setTextColor(0);
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 20;
    contactLines.forEach(line => {
        doc.text(line, pageWidth / 2, contactY, {
            align: 'center'
        });
        contactY += 4;
    });

    // TABLEAU DES CLIENTS
    const body = clients.sort((a, b) => a.name.localeCompare(b.name)).map((c, i) => [
        i + 1,
        c.name || 'N/A',
        c.phone || '',
        c.address || 'N/A'
    ]);

    doc.autoTable({
        startY: contactY + 5,
        head: [
            ['#', 'Nom / Entité', 'Téléphone', 'Adresse / Ville']
        ],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: {
                halign: 'center',
                cellWidth: 10
            },
            1: {
                halign: 'left',
                cellWidth: 70
            },
            2: {
                halign: 'center',
                cellWidth: 40
            },
            3: {
                halign: 'left'
            },
        }
    });

    // FOOTER
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 15, {
        align: 'center'
    });

    doc.save(`Clients_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// --- KEYBOARD SHORTCUTS ---

document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('searchProduct').focus();
    } else if (e.key === 'F10') {
        e.preventDefault();
        handleSaleValidation();
    } else if (e.key === 'Escape') {
        closeAllModals();
    } else if (e.ctrlKey && e.key === 'q' && cart.length === 0) {
        // Raccourci pour changer de mode (Vente/Devis)
        e.preventDefault();
        const newMode = currentMode === 'sale' ? 'quote' : 'sale';
        toggleMode(newMode);
    }
});

// --- THEME & DATA INITIALIZATION ---

function initTheme() {
    if (localStorage.getItem(THEME_KEY) === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-icon-moon').classList.add('hidden');
        document.getElementById('theme-icon-sun').classList.remove('hidden');
    }
}

// --- Animation Goutte d'eau ---
function toggleTheme(event) {
    const x = event.clientX;
    const y = event.clientY;
    const ripple = document.createElement('div');
    ripple.classList.add('theme-ripple');
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    ripple.style.background = isCurrentlyDark ? '#f3f4f6' : '#111827';
    const size = Math.max(window.innerWidth, window.innerHeight) * 2.5;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);

    setTimeout(() => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        document.getElementById('theme-icon-moon').classList.toggle('hidden');
        document.getElementById('theme-icon-sun').classList.toggle('hidden');
        updateCharts();
    }, 350);

    setTimeout(() => {
        ripple.remove();
    }, 700);
}
// ---------------------------------------------------------



/**
 * Charger les données depuis Dexie (pour synchronisation entre pages)
 */
async function loadDataFromDexieIfAvailable() {
    try {
        // Charger depuis Dexie (base unifiée) si disponible et localStorage est vide
        if (typeof dbInventory !== 'undefined' && localStorage.getItem(INVENTORY_KEY) === null) {
            const dexieInventory = await dbInventory.getAll();
            if (dexieInventory && dexieInventory.length > 0) {
                inventory = dexieInventory;
                console.log('✓ Inventory loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbDailyRecords !== 'undefined' && localStorage.getItem(DAILY_RECORDS_KEY) === null) {
            const dexieRecords = await dbDailyRecords.getAll();
            if (dexieRecords && dexieRecords.length > 0) {
                dailyRecords = dexieRecords;
                console.log('✓ Daily records loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbExpenses !== 'undefined' && localStorage.getItem(EXPENSES_KEY) === null) {
            const dexieExpenses = await dbExpenses.getAll();
            if (dexieExpenses && dexieExpenses.length > 0) {
                expenses = dexieExpenses;
                console.log('✓ Expenses loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbIncome !== 'undefined' && localStorage.getItem(INCOME_KEY) === null) {
            const dexieIncome = await dbIncome.getAll();
            if (dexieIncome && dexieIncome.length > 0) {
                income = dexieIncome;
                console.log('✓ Income loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbClients !== 'undefined' && localStorage.getItem(CLIENTS_KEY) === null) {
            const dexieClients = await dbClients.getAll();
            if (dexieClients && dexieClients.length > 0) {
                clients = dexieClients;
                console.log('✓ Clients loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbSuppliers !== 'undefined' && localStorage.getItem(SUPPLIERS_KEY) === null) {
            const dexieSuppliers = await dbSuppliers.getAll();
            if (dexieSuppliers && dexieSuppliers.length > 0) {
                suppliers = dexieSuppliers;
                console.log('✓ Suppliers loaded from Dexie (unified DB)');
            }
        }
        if (typeof dbQuotes !== 'undefined' && localStorage.getItem(QUOTES_KEY) === null) {
            const dexieQuotes = await dbQuotes.getAll();
            if (dexieQuotes && dexieQuotes.length > 0) {
                quotes = dexieQuotes;
                console.log('✓ Quotes loaded from Dexie (unified DB)');
            }
        }
    } catch (err) {
        console.warn('Error loading from Dexie (unified DB):', err);
    }
}

function loadData() {
    const storedInv = localStorage.getItem(INVENTORY_KEY);
    inventory = storedInv ? JSON.parse(storedInv) : [{
        id: 1,
        name: "Exemple Produit",
        category: "Divers",
        stock: 100,
        salePrice: 500,
        saleUnit: "Pce",
        purchasePrice: 400,
        purchaseUnit: "Crt",
        type: 'finished'
    }];
    // Ensure legacy products get a type (default to 'finished') to avoid breaking the app
    inventory = inventory.map(p => ({
        ...p,
        type: p.type || 'finished'
    }));
    const storedHist = localStorage.getItem(DAILY_RECORDS_KEY);
    if (storedHist) dailyRecords = JSON.parse(storedHist);
    const storedExp = localStorage.getItem(EXPENSES_KEY);
    if (storedExp) {
        try {
            expenses = JSON.parse(storedExp);
            // Ensure backward compatibility: attach optional fields used for raw-material purchases
            expenses = expenses.map(e => ({
                ...e,
                transportCost: ('transportCost' in e) ? e.transportCost : null,
                lossPercentage: ('lossPercentage' in e) ? e.lossPercentage : null
            }));
        } catch (err) {
            console.warn('Erreur parsing expenses from localStorage', err);
            expenses = [];
        }
    }
    // NOUVEAU: Chargement des rentrées d'argent
    const storedIncome = localStorage.getItem(INCOME_KEY);
    if (storedIncome) {
        try {
            income = JSON.parse(storedIncome);
        } catch (err) {
            console.warn('Erreur parsing income from localStorage', err);
            income = [];
        }
    }
    // NOUVEAU: Clients & Devis & Fournisseurs
    const storedClients = localStorage.getItem(CLIENTS_KEY);
    if (storedClients) clients = JSON.parse(storedClients);
    const storedSuppliers = localStorage.getItem(SUPPLIERS_KEY);
    if (storedSuppliers) suppliers = JSON.parse(storedSuppliers);
    const storedQuotes = localStorage.getItem(QUOTES_KEY);
    if (storedQuotes) quotes = JSON.parse(storedQuotes);

    // Recipes & productions module removed from local storage

    currentMode = localStorage.getItem(CURRENT_MODE_KEY) || 'sale';
    const logo = localStorage.getItem(LOGO_KEY);
    if (logo) document.getElementById('appLogo').src = logo;

    const storedCompany = localStorage.getItem(COMPANY_KEY);
    if (storedCompany) companyInfo = JSON.parse(storedCompany);
    // Restore saved filters
    const savedProdFilter = localStorage.getItem(PRODUCT_FILTER_KEY) || 'all';
    const prodFilterEl = document.getElementById('productTypeFilter');
    if (prodFilterEl) {
        prodFilterEl.value = savedProdFilter;
    }
    const savedInvFilter = localStorage.getItem(INVENTORY_FILTER_KEY) || 'all';
    const invFilterEl = document.getElementById('inventoryTypeFilter');
    if (invFilterEl) {
        invFilterEl.value = savedInvFilter;
    }
    // Update backend settings UI and attempt to load from backend if enabled
    // updateBackendUI(); // Backend removed

    // Try to load from backend (non-blocking)
    // tryLoadFromBackend(); // Backend removed

    // Restore visual preferences
    if (typeof populateSettingsForm === 'function') {
        populateSettingsForm();
    }

    // NOUVEAU: Load selected year
    const savedYear = localStorage.getItem(APP_YEAR_KEY);
    if (savedYear) {
        APP_YEAR = parseInt(savedYear);
    } else {
        APP_YEAR = new Date().getFullYear();
    }
    // Restore visual preferences

}

function saveData() {
    // Sauvegarder dans localStorage (cache)
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(dailyRecords));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    localStorage.setItem(INCOME_KEY, JSON.stringify(income));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(companyInfo));
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));

    // Synchroniser avec Dexie (base unifiée) pour partager entre les pages
    if (typeof dbInventory !== 'undefined') {
        dbInventory.bulkPut(inventory).catch(err => console.warn('Sync inventory to Dexie error:', err));
    }
    if (typeof dbDailyRecords !== 'undefined') {
        dbDailyRecords.bulkPut(dailyRecords).catch(err => console.warn('Sync dailyRecords to Dexie error:', err));
    }
    if (typeof dbExpenses !== 'undefined') {
        dbExpenses.bulkPut(expenses).catch(err => console.warn('Sync expenses to Dexie error:', err));
    }
    if (typeof dbIncome !== 'undefined') {
        dbIncome.bulkPut(income).catch(err => console.warn('Sync income to Dexie error:', err));
    }
    if (typeof dbClients !== 'undefined') {
        dbClients.bulkPut(clients).catch(err => console.warn('Sync clients to Dexie error:', err));
    }
    if (typeof dbSuppliers !== 'undefined') {
        dbSuppliers.bulkPut(suppliers).catch(err => console.warn('Sync suppliers to Dexie error:', err));
    }
    if (typeof dbQuotes !== 'undefined') {
        dbQuotes.bulkPut(quotes).catch(err => console.warn('Sync quotes to Dexie error:', err));
    }

    renderInventory();
    renderProductTiles();
    attachProductTileAccessibility();
    renderCart();
    renderDailyHistory();
    renderExpenses();
    renderClients();
    renderQuotes();
    // recipes/productions rendering removed
    updateStats();
    // Auto-push to backend if enabled
    try {
        const cfg = getBackendConfig();
        if (cfg.enabled && cfg.autoPush) {
            const statusEl = document.getElementById('backend-status');
            statusEl && (statusEl.innerText = 'Envoi automatique des données au backend...');
            const state = {
                inventory,
                dailyRecords,
                expenses,
                clients,
                quotes,
                companyInfo,
                logo: localStorage.getItem(LOGO_KEY),
                theme: localStorage.getItem(THEME_KEY),
                themeColor: localStorage.getItem(THEME_COLOR_KEY)
            };
            apiAdapter.pushState(cfg, state).then(res => {
                statusEl && (statusEl.innerText = 'Auto-push terminé.');
            }).catch(err => {
                statusEl && (statusEl.innerText = 'Auto-push échoué: ' + err.message);
            });
        }
    } catch (err) {
        console.warn('Auto-push error', err);
    }
    // Ensure glass preference applied after data changes as the UI might re-render

}

function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('appLogo');
            img.src = e.target.result;
            localStorage.setItem(LOGO_KEY, e.target.result);
            // Sync to index.html via storage event
            window.dispatchEvent(new Event('storage'));
        };
        reader.readAsDataURL(file);
    }
}

function handleLogoUploadFromSettings(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const logoData = e.target.result;
            // Update the main logo in header
            const img = document.getElementById('appLogo');
            if (img) img.src = logoData;
            // Save to localStorage
            localStorage.setItem(LOGO_KEY, logoData);
            // Sync to Dexie (unified DB) for cross-page sync
            if (typeof dbStorage !== 'undefined') {
                dbStorage.setItem(LOGO_KEY, logoData).catch(err => console.warn('Error saving logo to Dexie:', err));
            }
            // Also update invoice logo placeholder
            const invoiceLogo = document.getElementById('invoice-logo');
            if (invoiceLogo) invoiceLogo.src = logoData;
            // Trigger storage event for index.html to listen
            window.dispatchEvent(new Event('storage'));
            // Clear the input
            input.value = '';
            alert('Logo mis à jour avec succés !');
        };
        reader.readAsDataURL(file);
    }
}

// --- BACKEND ADAPTER & SYNC HELPERS ---

function getBackendConfig() {
    try {
        const raw = localStorage.getItem(BACKEND_CONFIG_KEY);
        if (!raw) return {
            enabled: false,
            baseUrl: '',
            token: '',
            autoPush: false
        };
        const cfg = JSON.parse(raw);
        return {
            enabled: !!cfg.enabled,
            baseUrl: cfg.baseUrl || '',
            token: cfg.token || '',
            autoPush: !!cfg.autoPush
        };
    } catch (err) {
        console.warn('Invalid backend config in localStorage', err);
        return {
            enabled: false,
            baseUrl: '',
            token: '',
            autoPush: false
        };
    }
}

function setBackendConfig(cfg) {
    localStorage.setItem(BACKEND_CONFIG_KEY, JSON.stringify(cfg));
    updateBackendUI();
}

function updateBackendUI() {
    const cfg = getBackendConfig();
    const enabledEl = document.getElementById('settings-backend-enabled');
    const urlEl = document.getElementById('settings-backend-url');
    const tokenEl = document.getElementById('settings-backend-token');
    const autoPushEl = document.getElementById('settings-backend-autopush');
    const statusEl = document.getElementById('backend-status');
    if (enabledEl) enabledEl.checked = cfg.enabled;
    if (urlEl) urlEl.value = cfg.baseUrl || '';
    if (tokenEl) tokenEl.value = cfg.token || '';
    if (autoPushEl) autoPushEl.checked = cfg.autoPush || false;
    if (statusEl) statusEl.innerText = cfg.enabled ? 'Backend activé' : 'Backend désactivé';
}

const apiAdapter = {
    async test(cfg) {
        if (!cfg || !cfg.baseUrl) throw new Error('No backend base URL provided');
        const base = cfg.baseUrl.replace(/\/$/, '');
        const headers = {};
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        // Try /health then /ping then base
        const candidates = [base + '/health', base + '/ping', base];
        for (const url of candidates) {
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    headers
                });
                if (res.ok) return true;
            } catch (err) {
                // continue to next candidate
            }
        }
        throw new Error('Backend not reachable');
    },
    async pullState(cfg) {
        if (!cfg || !cfg.baseUrl) throw new Error('No backend base URL provided');
        const base = cfg.baseUrl.replace(/\/$/, '');
        const url = base + '/state';
        const headers = {
            'Content-Type': 'application/json'
        };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(url, {
            method: 'GET',
            headers
        });
        if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
        return res.json();
    },
    async pushState(cfg, stateObj) {
        if (!cfg || !cfg.baseUrl) throw new Error('No backend base URL provided');
        const base = cfg.baseUrl.replace(/\/$/, '');
        const url = base + '/state';
        const headers = {
            'Content-Type': 'application/json'
        };
        if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(stateObj)
        });
        if (!res.ok) {
            const content = await res.text();
            throw new Error(`Push failed: ${res.status} ${content}`);
        }
        try {
            return await res.json();
        } catch (e) {
            return {
                ok: true
            };
        }
    }
};

async function testBackendConnection() {
    const statusEl = document.getElementById('backend-status');
    const cfg = getBackendConfigFromInputs();
    if (!cfg.enabled) return alert('Activez la synchronisation pour tester la connexion.');
    statusEl.innerText = 'Test de connexion...';
    try {
        await apiAdapter.test(cfg);
        statusEl.innerText = 'Connexion OK ?';
    } catch (err) {
        statusEl.innerText = `échec de connexion: ${err.message}`;
    }
}

function getBackendConfigFromInputs() {
    const enabledEl = document.getElementById('settings-backend-enabled');
    const urlEl = document.getElementById('settings-backend-url');
    const tokenEl = document.getElementById('settings-backend-token');
    const autoPushEl = document.getElementById('settings-backend-autopush');
    const cfg = {
        enabled: enabledEl ? enabledEl.checked : false,
        baseUrl: urlEl ? urlEl.value.trim() : '',
        token: tokenEl ? tokenEl.value.trim() : '',
        autoPush: autoPushEl ? autoPushEl.checked : false
    };
    return cfg;
}

async function pullDataFromBackend() {
    const cfg = getBackendConfigFromInputs();
    if (!cfg.enabled) return alert('Veuillez activer la synchronisation backend dans les paramétres.');
    if (!cfg.baseUrl) return alert('Entrez léURL de léAPI.');
    if (!confirm('Importer les données depuis le backend remplace vos données locales. étes-vous sér ?')) return;
    const statusEl = document.getElementById('backend-status');
    statusEl.innerText = 'Importation depuis le backend...';
    try {
        const remote = await apiAdapter.pullState(cfg);
        if (remote) {
            // Update localStorage keys - we follow the structure used by exportStateJSON
            if (remote.inventory) localStorage.setItem(INVENTORY_KEY, JSON.stringify(remote.inventory));
            if (remote.dailyRecords) localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(remote.dailyRecords));
            if (remote.expenses) localStorage.setItem(EXPENSES_KEY, JSON.stringify(remote.expenses));
            // Recipes/productions data ignored - production module removed
            if (remote.clients) localStorage.setItem(CLIENTS_KEY, JSON.stringify(remote.clients));
            if (remote.quotes) localStorage.setItem(QUOTES_KEY, JSON.stringify(remote.quotes));
            if (remote.companyInfo) localStorage.setItem(COMPANY_KEY, JSON.stringify(remote.companyInfo));
            if (remote.logo) localStorage.setItem(LOGO_KEY, remote.logo);
            if (remote.theme) localStorage.setItem(THEME_KEY, remote.theme);
            if (remote.themeColor) localStorage.setItem(THEME_COLOR_KEY, remote.themeColor);
            if (remote.income) {
                localStorage.setItem(INCOME_KEY, JSON.stringify(remote.income));
                if (typeof dbIncome !== 'undefined') await dbIncome.bulkPut(remote.income);
            }

            statusEl.innerText = 'Importation terminée, rafraéchissement...';
            await loadData(); // ensure variables set and UI re-render
            // Re-render explicitly
            renderInventory();
            renderProductTiles();
            renderCart();
            renderDailyHistory();
            renderExpenses();
            renderIncome();
            renderClients();
            renderQuotes();
            // recipes/productions rendering removed
            updateCompanyDisplays();
            statusEl.innerText = 'Importation terminée.';
        }
    } catch (err) {
        statusEl.innerText = `échec de l'import: ${err.message}`;
    }
}

async function pushDataToBackend() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    const cfg = getBackendConfigFromInputs();
    if (!cfg.enabled) return alert('Veuillez activer la synchronisation backend dans les paramétres.');
    if (!cfg.baseUrl) return alert('Entrez léURL de léAPI.');
    if (!confirm('Exporter les données locales vers le backend peut remplacer les données distantes. Continuer ?')) return;
    const statusEl = document.getElementById('backend-status');
    statusEl.innerText = 'Envoi des données au backend...';
    const state = {
        inventory,
        dailyRecords,
        expenses,
        clients,
        quotes,
        companyInfo,
        logo: localStorage.getItem(LOGO_KEY),
        theme: localStorage.getItem(THEME_KEY),
        themeColor: localStorage.getItem(THEME_COLOR_KEY),
        income
    };
    try {
        const res = await apiAdapter.pushState(cfg, state);
        statusEl.innerText = 'Données envoyées au backend avec succés.';
        return res;
    } catch (err) {
        statusEl.innerText = `échec de l'envoi: ${err.message}`;
        throw err;
    }
}

// Try to pull state from backend on startup if enabled
async function tryLoadFromBackend() {
    const cfg = getBackendConfig();
    if (!cfg.enabled) return;
    const statusEl = document.getElementById('backend-status');
    statusEl && (statusEl.innerText = 'Chargement depuis le backend...');
    try {
        const remote = await apiAdapter.pullState(cfg);
        if (remote) {
            if (remote.inventory) inventory = remote.inventory;
            if (remote.dailyRecords) dailyRecords = remote.dailyRecords;
            if (remote.expenses) expenses = remote.expenses;
            // Recipes/productions from remote ignored (module removed)
            if (remote.clients) clients = remote.clients;
            if (remote.quotes) quotes = remote.quotes;
            if (remote.companyInfo) companyInfo = remote.companyInfo;
            // Apply theme/logo if present
            const logo = remote.logo || localStorage.getItem(LOGO_KEY);
            if (logo) localStorage.setItem(LOGO_KEY, logo);
            if (remote.theme) localStorage.setItem(THEME_KEY, remote.theme);
            if (remote.themeColor) localStorage.setItem(THEME_COLOR_KEY, remote.themeColor);
            statusEl && (statusEl.innerText = 'Chargement backend réussi');
            // Re-render
            renderInventory();
            renderProductTiles();
            renderCart();
            renderDailyHistory();
            renderExpenses();
            renderClients();
            renderQuotes();
            // recipes/productions rendering removed
            updateCompanyDisplays();
        }
    } catch (err) {
        statusEl && (statusEl.innerText = `Erreur chargement backend: ${err.message}`);
    }
}

// --- GESTION DES MODALES ---
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    if (id === 'modalAddProduct') clearProductForm();
    if (id === 'modalInvoice') {
        currentInvoiceData = null;
        // document.getElementById('invoice-items-body').innerHTML = '';
    }
    // Réactiver le scroll du body si aucune autre modale n'est ouverte (simple vérification)
    if (document.querySelectorAll('.fixed.inset-0:not(.hidden)').length === 0) {
        document.body.style.overflow = 'auto';
    }
}

function closeAllModals() {
    document.querySelectorAll('.fixed.inset-0').forEach(modal => modal.classList.add('hidden'));
    document.body.style.overflow = 'auto';
    clearProductForm();
}

// --- GESTION DES TABS ---


function switchTab(tab) {
    // window.switchTab assignment moved to end of definition
    // Update main tabs select if it exists (responsive UI)
    const mainSelect = document.getElementById('main-tabs-select');
    if (mainSelect) {
        mainSelect.value = tab;
    }

    document.querySelectorAll('[id^="content-"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="tab-"]').forEach(el => {
        el.classList.remove('active');
    });

    const target = document.getElementById(`content-${tab}`);
    if (target) {
        target.classList.remove('hidden');
        // Reset animation
        target.classList.remove('animate-page-turn');
        target.style.perspective = '1000px'; // Ensure 3D effect works
        void target.offsetWidth;
        target.classList.add('animate-page-turn');
    }
    const tabBtn = document.getElementById(`tab-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');

    if (tab === 'stats') updateCharts();
    if (tab === 'clients') switchSubTab('subtab-clients'); // Assurer l'affichage par défaut
    if (tab === 'expenses') {
        // Ensure expenses view is rendered when user opens the tab
        try {
            renderExpenses();
        } catch (e) {
            console.warn('renderExpenses error', e);
        }
    }
    // production tab handling removed
}
window.switchTab = switchTab;

function switchSubTab(subtab) {
    document.querySelectorAll('[id^="subtab-"]:not([id$="-btn"])').forEach(el => el.classList.add('hidden'));

    // Deactivate all subtab buttons (including specific mode buttons)
    document.querySelectorAll('.m3-tab').forEach(el => {
        if (el.closest('.m3-tabs') && el.parentElement.querySelector('#subtab-quotes-btn')) { // Context check to limit scope if needed, or just rely on class
            el.classList.remove('active');
        }
    });
    // Fallback for ID based if strict containment not enough
    document.querySelectorAll('[id$="-btn"]').forEach(el => el.classList.remove('active'));
    document.getElementById('btn-mode-client')?.classList.remove('active');
    document.getElementById('btn-mode-supplier')?.classList.remove('active');


    const targetContent = document.getElementById(subtab);
    if (targetContent) targetContent.classList.remove('hidden');

    const subtabBtn = document.getElementById(`${subtab}-btn`);
    if (subtabBtn) subtabBtn.classList.add('active');

    // NOUVEAU: Mettre à jour les données si nécessaire lors du changement d'onglet
    if (subtab === 'subtab-quotes') {
        renderQuotes();
    } else if (subtab === 'subtab-clients') {
        renderClientSupplierList();
    }
}

// NOUVEAU: Fonction pour basculer entre onglets Dépenses/Rentrées
function switchExpenseTab(tab) {
    document.getElementById('tab-depenses').classList.toggle('hidden', tab !== 'tab-depenses');
    document.getElementById('tab-rentrées').classList.toggle('hidden', tab !== 'tab-rentrées');

    const depensesBtn = document.getElementById('tab-depenses-btn');
    const rentréesBtn = document.getElementById('tab-rentrées-btn');

    if (tab === 'tab-depenses') {
        depensesBtn.classList.add('m3-btn-tonal');
        depensesBtn.classList.remove('m3-btn-text');
        rentréesBtn.classList.add('m3-btn-text');
        rentréesBtn.classList.remove('m3-btn-tonal');
    } else {
        rentréesBtn.classList.add('m3-btn-tonal');
        rentréesBtn.classList.remove('m3-btn-text');
        depensesBtn.classList.add('m3-btn-text');
        depensesBtn.classList.remove('m3-btn-tonal');
        renderIncome();
    }
}

// NOUVEAU: Réinitialiser le formulaire de rentrée d'argent
function resetIncomeForm() {
    document.getElementById('incomeForm').reset();
    document.getElementById('income-id').value = '';
    document.getElementById('income-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Ajouter Rentrée';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('income-date').value = today;
}

// --- GESTION PRODUITS (CRUD) ---

function clearProductForm() {
    document.getElementById('prodId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodCategory').value = '';
    document.getElementById('prodStock').value = '';
    document.getElementById('prodPurchasePrice').value = '';
    document.getElementById('prodPurchaseUnit').value = '';
    document.getElementById('prodSalePrice').value = '';
    // default: finished
    const typeEl = document.getElementById('prodType');
    if (typeEl) typeEl.value = 'finished';
    updateProductTypeUI();
    document.getElementById('prodSaleUnit').value = '';
    document.getElementById('productSubmitBtn').innerText = 'Ajouter Produit';
}

function updateProductTypeUI() {
    const typeEl = document.getElementById('prodType');
    const saleSection = document.getElementById('saleSection');
    const saleInput = document.getElementById('prodSalePrice');
    const saleUnitInput = document.getElementById('prodSaleUnit');
    if (!typeEl || !saleSection || !saleInput) return;
    const type = typeEl.value || 'finished';
    if (type === 'raw') {
        if (saleSection) saleSection.style.display = 'none';
        if (saleInput) {
            saleInput.required = false;
            saleInput.value = '';
        }
        if (saleUnitInput) {
            saleUnitInput.required = false;
            saleUnitInput.value = '';
        }
    } else {
        if (saleSection) saleSection.style.display = 'grid';
        if (saleInput) saleInput.required = true;
        if (saleUnitInput) saleUnitInput.required = true;
    }
}

window.handleProductSubmit = function (e) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }
    if (e) e.preventDefault();

    const idInput = document.getElementById('prodId').value;
    const isModification = idInput !== null && idInput !== undefined && idInput !== '';

    const name = document.getElementById('prodName').value;
    const category = document.getElementById('prodCategory').value;
    const stock = parseInt(document.getElementById('prodStock').value) || 0;
    const purchasePrice = parseFloat(document.getElementById('prodPurchasePrice').value) || 0;
    const purchaseUnit = document.getElementById('prodPurchaseUnit').value;
    const salePrice = document.getElementById('prodSalePrice').value ? parseFloat(document.getElementById('prodSalePrice').value) : 0;
    const type = document.getElementById('prodType') ? document.getElementById('prodType').value : 'finished';
    const saleUnit = document.getElementById('prodSaleUnit').value;

    if (isModification) {
        // Modification
        const index = inventory.findIndex(p => String(p.id) === String(idInput));
        if (index !== -1) {
            inventory[index] = {
                ...inventory[index],
                name,
                category,
                stock,
                purchasePrice,
                purchaseUnit,
                type,
                salePrice,
                saleUnit
            };
            if (typeof showToast === 'function') showToast('Produit modifié avec succès', 'success');
        } else {
            console.error('Produit introuvable pour modification ID:', idInput);
            if (typeof showToast === 'function') showToast('Erreur: Produit introuvable', 'error');
            return;
        }
    } else {
        // Ajout
        const newId = inventory.length > 0 ? Math.max(...inventory.map(p => parseInt(p.id) || 0)) + 1 : 1;
        inventory.push({
            id: newId,
            name,
            category,
            stock,
            purchasePrice,
            purchaseUnit,
            type,
            salePrice,
            saleUnit
        });
        if (typeof showToast === 'function') showToast('Produit ajouté avec succès', 'success');
    }

    // Mettre é jour la datalist des catégories
    const categoriesDatalist = document.getElementById('categories');
    if (categoriesDatalist) {
        const uniqueCategories = [...new Set(inventory.map(p => p.category).filter(Boolean))];
        categoriesDatalist.innerHTML = uniqueCategories.map(cat => `<option value="${cat}">`).join('');
    }

    saveData();
    closeModal('modalAddProduct');
}

window.editProduct = function (id) {
    const product = inventory.find(p => String(p.id) === String(id));
    if (!product) return;

    document.getElementById('prodId').value = product.id;
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodStock').value = product.stock;
    document.getElementById('prodPurchasePrice').value = product.purchasePrice || 0;
    document.getElementById('prodPurchaseUnit').value = product.purchaseUnit || '';
    document.getElementById('prodSalePrice').value = (product.salePrice != null) ? product.salePrice : '';
    document.getElementById('prodSaleUnit').value = product.saleUnit || '';
    document.getElementById('productSubmitBtn').innerText = 'Modifier Produit';
    document.getElementById('prodType').value = product.type || 'finished';
    updateProductTypeUI();

    openModal('modalAddProduct');
}

window.deleteProduct = function (id) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
        inventory = inventory.filter(p => String(p.id) !== String(id));
        // Supprimer également du panier s'il y est
        cart = cart.filter(c => String(c.id) !== String(id));
        saveData();
    }
}

// Mise é jour rapide du stock depuis le tableau
window.updateStock = function (id, newStock) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    const product = inventory.find(p => String(p.id) === String(id));
    if (product) {
        const stockVal = parseInt(newStock, 10);
        if (!isNaN(stockVal)) {
            product.stock = stockVal;
            saveData();
            // Also re-render cart immediately to reflect updated stock (reste) for items in the cart
            // Ensure cart quantities do not exceed new stock
            cart.forEach(ci => {
                if (String(ci.id) === String(id)) {
                    if (ci.qty > stockVal) {
                        ci.qty = stockVal;
                    }
                }
            });
            renderCart();
        }
    }
}


// --- RENDU PRODUITS (Vignettes) ---

function renderProductTiles() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();

    const typeFilter = document.getElementById('productTypeFilter') ? document.getElementById('productTypeFilter').value : 'all';
    const filteredProducts = inventory.filter(p => {
        const matchesSearch = (p.name.toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm));
        let matchesType = false;
        const pType = (p.type || 'finished');
        const pStock = Number(p.stock || 0);
        if (typeFilter === 'all') matchesType = true;
        else if (typeFilter === 'in_stock') matchesType = (pType === 'finished' && pStock >= 1);
        else matchesType = (pType === typeFilter);
        return matchesSearch && matchesType;
    });

    // Regrouper par catégorie pour l'affichage
    const grouped = filteredProducts.reduce((acc, p) => {
        const key = p.category || 'Autres';
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    Object.keys(grouped).sort().forEach(category => {
        // Titre de la catégorie
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'col-span-full font-bold text-xs text-gray-500 dark:text-gray-400 mt-2 sticky top-0 bg-gray-50 dark:bg-gray-900/50 p-1 z-10 border-b border-gray-200 dark:border-gray-700 uppercase';
        categoryTitle.innerText = category;
        grid.appendChild(categoryTitle);


        grouped[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
            const stockColor = item.stock <= 0 ? 'text-red-500' : (item.stock < 5 ? 'text-yellow-600' : 'text-brand');
            const div = document.createElement('div');
            div.className = 'product-tile interactive bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-center border dark:border-gray-700 min-h-[140px]';
            div.setAttribute('onclick', `addToCart(${item.id})`);
            div.setAttribute('role', 'button');
            div.setAttribute('tabindex', '0');
            div.setAttribute('aria-label', `${item.name} - ${item.category} - ${item.stock} en stock`);
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addToCart(item.id);
                }
            });
            div.innerHTML = `
                        <p class="font-medium text-sm text-gray-800 dark:text-white truncate" title="${item.name}">${item.name}</p>
                        <p class="text-xs text-gray-500 italic truncate">${item.category}</p>
                            <div class="mt-2 flex justify-center items-end gap-2">
                            <span class="font-bold text-base text-brand">${(item.type === 'raw' ? (item.purchasePrice || 0) : (item.salePrice || 0)).toLocaleString()}</span>
                            <span class="text-xs text-gray-500">${item.type === 'raw' ? (item.purchaseUnit || '') : (item.saleUnit || '')} / F</span>
                        </div>
                        <div class="text-sm ${stockColor}">${item.stock} en stock</div>
                        <!-- Recipe badge removed -->
                    `;
            grid.appendChild(div);
        });
    });

    // Accessibility for dynamic tiles
    attachProductTileAccessibility();
}

// --- GESTION PANIER ---

const CURRENT_MODE_KEY = 'stock_expert_current_mode';

async function toggleMode(mode) {
    // window.toggleMode assignment moved to end of definition
    // Prevent switching to sale mode if user is not logged or has no access
    if (mode === 'sale' && window.Auth) {
        const logged = await window.Auth.isLoggedIn();
        if (!logged) { window.Auth.showLogin({ requiredFeature: 'sale' }); return; }
        const ok = await window.Auth.hasAccess('sale');
        if (!ok) return alert('Accès interdit: vous n\'êtes pas autorisé à utiliser le mode Vente.');
    }
    currentMode = mode;
    localStorage.setItem(CURRENT_MODE_KEY, mode);
    const isSale = mode === 'sale';

    const saleBtn = document.getElementById('toggle-sale-btn');
    const quoteBtn = document.getElementById('toggle-quote-btn');

    // Update buttons using M3 classes
    if (isSale) {
        saleBtn.classList.add('m3-btn-tonal');
        saleBtn.classList.remove('m3-btn-text', 'text-gray-600', 'dark:text-gray-300');

        quoteBtn.classList.remove('m3-btn-tonal');
        quoteBtn.classList.add('m3-btn-text', 'text-gray-600', 'dark:text-gray-300');
    } else {
        saleBtn.classList.remove('m3-btn-tonal');
        saleBtn.classList.add('m3-btn-text', 'text-gray-600', 'dark:text-gray-300');

        quoteBtn.classList.add('m3-btn-tonal');
        quoteBtn.classList.remove('m3-btn-text', 'text-gray-600', 'dark:text-gray-300');
    }

    // Mise à jour du titre
    document.getElementById('current-mode-title').innerText = isSale ? 'Point de Vente' : 'Création de Devis (Proforma)';

    // Mise à jour du bouton de validation
    const valBtn = document.getElementById('validate-btn');
    const valText = document.getElementById('validate-btn-text');

    valText.innerText = isSale ? 'Valider & Facturer (F10)' : 'Sauvegarder Devis (F10)';

    // Ensure validate button also follows M3 or brand styling consistently
    if (isSale) {
        valBtn.classList.remove('bg-blue-500', 'hover:bg-blue-700');
        valBtn.classList.add('m3-btn-primary'); // Ensure primary brand color for sale
    } else {
        valBtn.classList.remove('m3-btn-primary');
        valBtn.classList.add('bg-blue-500', 'hover:bg-blue-700', 'text-white'); // Blue for quotes logic
    }


    // Affichage de la colonne Reste (seulement en mode Vente)
    const resteHeader = document.getElementById('header-reste-stock');
    if (resteHeader) resteHeader.style.display = isSale ? 'table-cell' : 'none';

    // Mettre à jour le statut du panier si des éléments sont dedans
    if (cart.length > 0) renderCart();
}
window.toggleMode = toggleMode;

// --- Refactorisation de la validation Vente/Devis ---
async function handleSaleValidation() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    // Consider cart empty if no item has qty > 0
    const effectiveCount = cart.filter(c => c.qty && c.qty > 0).length;
    if (effectiveCount === 0) return alert("Le panier est vide");

    // Block validation for non-admin users in sale mode
    if (currentMode === 'sale' && window.Auth) {
        const logged = await window.Auth.isLoggedIn();
        if (!logged) { window.Auth.showLogin({ requiredFeature: 'sale' }); return; }
        const ok = await window.Auth.hasAccess('sale');
        if (!ok) return alert('Accès refusé: vous n\'êtes pas autorisé à valider une vente.');
    }

    if (currentMode === 'sale') {
        saveDailySales();
    } else if (currentMode === 'quote') {
        saveQuote();
    }
}

async function addToCart(id) {
    // Only allowed roles can add products to the sale cart (mode 'sale')
    if (currentMode === 'sale' && window.Auth) {
        const logged = await window.Auth.isLoggedIn();
        if (!logged) { window.Auth.showLogin({ requiredFeature: 'sale' }); return; }
        const ok = await window.Auth.hasAccess('sale');
        if (!ok) return alert('Accès interdit: vous n\'êtes pas autorisé à effectuer des ventes.');
    }
    const prod = inventory.find(p => String(p.id) === String(id));
    if (!prod) return;
    if (prod.type === 'raw') return alert('Ce produit est une matiére premiére et ne peut pas étre vendu ici.');

    // Allow adding even if stock <= 0 (manage products in sale even when out of stock)

    const item = cart.find(i => String(i.id) === String(id));
    if (item) {
        // Only increase quantity if it won't exceed available stock
        if (prod.stock === undefined || prod.stock === null || item.qty < prod.stock) {
            item.qty++;
        } else {
            // Optionally notify user
            alert(`Quantité maximale atteinte pour ${prod.name} (${prod.stock})`);
        }
    } else {
        cart.push({
            ...prod,
            qty: prod.stock > 0 ? 1 : 0,
            purchaseUnit: prod.purchaseUnit || '',
            purchasePrice: prod.purchasePrice || 0,
            saleUnit: prod.saleUnit || 'Unit',
            salePrice: prod.salePrice || 0
        });
    }

    renderCart();
    highlightInventoryRow(id);
}

window.updateCartItem = function (index, key, value) {
    const item = cart[index];
    if (!item) return;

    if (key === 'qty' || key === 'salePrice' || key === 'purchasePrice') {
        // Use let because we may clamp/adjust the value below
        let numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return renderCart(); // Annuler si invalide
        item[key] = numValue;

        // En mode Vente, vérifier que la quantité ne dépasse pas le stock
        if (currentMode === 'sale' && key === 'qty') {
            const prod = inventory.find(p => String(p.id) === String(item.id));
            if (prod) {
                if (numValue > prod.stock) {
                    // Clamp to available stock and inform user
                    numValue = prod.stock;
                    alert(`Quantité ajustée: ${numValue} (stock disponible: ${prod.stock}).`);
                }
                // Allow 0 quantity in the cart; clamp negatives to 0
                if (numValue < 0) numValue = 0;
            }
            item.qty = numValue;
        }

    } else {
        item[key] = value;
    }

    renderCart();
}

window.remCart = function (index) {
    cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    let total = 0;
    const isSale = currentMode === 'sale';

    if (cart.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-gray-400 italic">Ajoutez des produits é partir du catalogue...</td></tr>`;
        document.getElementById('total-revenue').innerText = "0 FCFA";
        return;
    }

    cart.forEach((item, idx) => {
        const sum = item.salePrice * item.qty;
        total += sum;

        const prod = inventory.find(p => String(p.id) === String(item.id));
        const remaining = prod ? prod.stock - item.qty : 0;
        const restColor = remaining < 0 ? 'text-red-500 font-bold' : (remaining <= 5 ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-300');

        const restCell = isSale ?
            `<td class="text-center font-mono ${restColor}">${remaining}</td>` :
            `<td class="text-center font-mono" style="display:none;">-</td>`; // Colonne 'Reste' masquée en mode Devis

        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-gray-700";
        tr.setAttribute('data-id', item.id);
        tr.innerHTML = `
                    <td class="px-1 py-2 font-medium truncate w-40" title="${item.name}">${item.name}</td>
                    <td class="px-1 text-gray-500 italic truncate w-20" title="${item.category}">${item.category}</td>
                    <td class="px-1"><input type="text" value="${item.purchaseUnit}" class="table-input text-center" onchange="updateCartItem(${idx}, 'purchaseUnit', this.value)"></td>
                    <td class="px-1"><input data-field="purchasePrice" type="number" value="${item.purchasePrice}" class="table-input text-right" onchange="updateCartItem(${idx}, 'purchasePrice', this.value)"></td>
                    <td class="px-1"><input type="number" value="${prod ? prod.stock : item.stock}" class="table-input text-center font-mono" readonly tabindex="-1" style="background:#f3f4f6; color:#888; cursor:not-allowed;"></td>
                    <td class="px-1"><input type="text" value="${item.saleUnit}" class="table-input text-center" onchange="updateCartItem(${idx}, 'saleUnit', this.value)"></td>
                    <td class="px-1"><input data-field="salePrice" type="number" value="${item.salePrice}" class="table-input text-right font-medium" onchange="updateCartItem(${idx}, 'salePrice', this.value)"></td>
                    <td class="px-1"><input data-field="qty" type="number" min="0" max="${isSale && prod ? prod.stock : 9999}" value="${item.qty}" ${isSale && prod && prod.stock <= 0 ? 'disabled' : ''} class="table-input text-center font-bold text-brand border-brand-green/30 bg-green-50/30 dark:bg-green-900/20 rounded" onchange="updateCartItem(${idx}, 'qty', this.value)"></td>
                    ${restCell}
                    <td class="text-right font-bold text-brand text-xs pr-2">${sum.toLocaleString()}</td>
                    <td class="text-center"><button onclick="remCart(${idx})" class="text-gray-400 hover:text-red-500 transition-colors"><i class="fas fa-times"></i></button></td>
                `;

        // Masquer la colonne Reste si mode Devis
        if (!isSale) {
            const cells = tr.querySelectorAll('td');
            if (cells.length > 8) cells[8].style.display = 'none'; // Le 9éme TD est 'Reste'
        }
        // Highlight cart row if it corresponds to selected inventory
        if (selectedInventoryId && selectedInventoryId === item.id) {
            tr.classList.add('bg-green-50', 'dark:bg-green-900/30');
        }
        tbody.appendChild(tr);
    });

    document.getElementById('total-revenue').innerText = total.toLocaleString() + " FCFA";

    // S'assurer que le header "Reste" est masqué si mode Devis, méme aprés le rendu
    const resteHeader = document.getElementById('header-reste-stock');
    if (resteHeader) resteHeader.style.display = isSale ? 'table-cell' : 'none';
}

// --- GESTION DES VENTES (Mode 'sale') ---

function saveDailySales() {
    if (cart.length === 0) return alert("Le panier est vide");

    let totalRevenue = 0;
    let totalCost = 0;
    let stockAlert = [];

    cart.forEach(c => {
        // Skip items with non-positive qty: they should not be sold or recorded
        if (!c.qty || c.qty <= 0) return;
        const saleTotal = c.salePrice * c.qty;
        const costTotal = c.purchasePrice * c.qty;
        totalRevenue += saleTotal;
        totalCost += costTotal;

        // Update stock in inventory
        const p = inventory.find(i => i.id === c.id);
        if (p) {
            if (p.stock < c.qty) {
                stockAlert.push(`${c.name} (Stock: ${p.stock}, Vendu: ${c.qty})`);
            }
            p.stock -= c.qty;
        }
    });

    if (stockAlert.length > 0) {
        // Do not allow sales that exceed stock. Revert stock updates and abort.
        cart.forEach(c => {
            const p = inventory.find(i => i.id === c.id);
            if (p) p.stock += c.qty;
        });
        console.warn('Attempted sale rejected due to insufficient stock for items:', stockAlert);
        alert(`VENTE ANNULéE: Stock insuffisant pour les articles suivants:\n- ${stockAlert.join('\n- ')}`);
        renderCart();
        return;
    }

    const rec = {
        id: Date.now(),
        type: 'sale',
        date: new Date().toISOString(),
        items: cart.map(i => ({
            name: i.name,
            qty: i.qty,
            price: i.salePrice,
            cost: i.purchasePrice,
            total: i.qty * i.salePrice,
            totalCost: i.qty * i.purchasePrice
        })),
        total: totalRevenue,
        totalCost: totalCost,
        margin: totalRevenue - totalCost
    };

    dailyRecords.unshift(rec);
    cart = [];
    saveData();
    renderCart();
    renderDailyHistory();
    updateCharts();
    prepareInvoice(rec.id, 'sale');
}

// --- GESTION DES DEVIS (Mode 'quote') ---

function saveQuote() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (cart.length === 0) return alert("Le panier est vide");

    // Tentative de récupération du nom du client (soit depuis l'input modal s'il est pré-rempli, soit générique)
    // Note: Le champ client-name est dans la modale facturation, souvent vide avant ouverture.
    // On pourrait demander le nom ici via prompt si souhaité, mais pour l'instant on garde la logique non-bloquante.
    const clientNameInput = document.getElementById('client-name');
    const clientName = clientNameInput ? clientNameInput.value : '';

    let totalQuote = cart.reduce((sum, c) => sum + (c.salePrice * c.qty), 0);

    const quoteRecord = {
        id: Date.now(),
        type: 'quote',
        date: new Date().toISOString(),
        items: cart.map(i => ({
            name: i.name,
            qty: i.qty,
            price: i.salePrice,
            cost: i.purchasePrice,
            total: i.qty * i.salePrice,
            totalCost: i.qty * i.purchasePrice
        })),
        total: totalQuote,
        clientName: clientName || 'Client de Passage',
        clientPhone: document.getElementById('client-phone') ? document.getElementById('client-phone').value : '',
    };

    quotes.unshift(quoteRecord);
    cart = []; // Vider le panier
    saveData(); // Sauvegarder et Re-render (inclut renderQuotes)

    // UX: Switcher immédiatement vers l'onglet Devis pour montrer l'ajout
    switchTab('clients');
    switchSubTab('subtab-quotes');

    // Notification
    if (window.showToast) window.showToast('Devis enregistré avec succès !', 'success');

    // Ouvrir le modal pour impression éventuelle
    prepareInvoice(quoteRecord.id, 'quote');
}

window.loadQuoteToCart = function (id) {
    const quote = quotes.find(q => q.id === id);
    if (!quote) return alert("Devis introuvable.");

    // Nettoyer le panier et charger les articles du devis
    cart = quote.items.map(item => {
        const prod = inventory.find(p => p.name === item.name); // Re-associer au produit actuel
        return {
            id: prod ? prod.id : Date.now(), // Conserver l'ID du produit si trouvé
            name: item.name,
            category: prod ? prod.category : 'N/A',
            stock: prod ? prod.stock : 0, // Stock actuel
            salePrice: item.price,
            saleUnit: prod ? prod.saleUnit : 'Unit',
            purchasePrice: item.cost,
            purchaseUnit: prod ? prod.purchaseUnit : '',
            qty: prod ? Math.min(item.qty, prod.stock) : item.qty
        };
    });

    // Passer en mode Vente et affiche le panier
    toggleMode('sale');
    renderCart();
    renderQuotes();
    switchTab('stock');
    alert("Devis chargé dans le panier de vente. Procédez é la validation pour déduire le stock.");
}


// --- RENDU INVENTAIRE ---

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    const searchTerm = document.getElementById('searchInventory').value.toLowerCase();
    let count = 0;

    const typeFilter = document.getElementById('inventoryTypeFilter') ? document.getElementById('inventoryTypeFilter').value : 'all';
    const filteredProducts = inventory.filter(item => {
        const matchesSearch = (item.name.toLowerCase().includes(searchTerm) || item.category.toLowerCase().includes(searchTerm));
        let matchesType = false;
        const itemType = (item.type || 'finished');
        const itemStock = Number(item.stock || 0);
        if (typeFilter === 'all') matchesType = true;
        else if (typeFilter === 'in_stock') matchesType = (itemType === 'finished' && itemStock >= 1);
        else matchesType = (itemType === typeFilter);
        return matchesSearch && matchesType;
    });

    filteredProducts.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
        count++;
        const tr = document.createElement('tr');
        // Make inventory rows non-clickable to prevent unwanted addition in sales input
        tr.className = "hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 cursor-default";
        // Do not assign onclick to inventory rows; product tiles should remain the entry point for adding to cart
        tr.setAttribute('data-id', item.id);
        tr.innerHTML = `
                    <td class="px-2 py-2 font-medium" data-label="Nom"><div class="text-gray-900 dark:text-white truncate w-24 sm:w-32" title="${item.name}">${item.name}</div></td>
                    <td class="px-2 py-2 text-center" data-label="Stock">
                        <input onclick="event.stopPropagation()" type="number" value="${item.stock}" min="0" class="w-16 px-2 py-1 border border-gray-300 rounded text-center font-mono" onchange="updateStock(${item.id}, this.value)" style="background-color: ${item.stock <= 0 ? '#fecaca' : (item.stock < 5 ? '#fef3c7' : 'transparent')};">
                    </td>
                    <td class="px-2 py-2 text-right" data-label="Prix">
                        <span onclick="event.stopPropagation()" class="font-bold text-sm text-brand">${((item.type === 'raw' ? (item.purchasePrice || 0) : (item.salePrice || 0)) || 0).toLocaleString()} F</span>
                    </td>
                    <td class="px-2 py-2 text-center whitespace-nowrap" data-label="Actions">
                        <i class="fas fa-edit cursor-pointer text-blue-500 hover:text-blue-700 mr-2" onclick="event.stopPropagation(); editProduct(${item.id})" title="Modifier"></i>
                        <i class="fas fa-trash-alt cursor-pointer text-red-400 hover:text-red-600" onclick="event.stopPropagation(); deleteProduct(${item.id})" title="Supprimer"></i>
                    </td>
                `;
        // If this row corresponds to the currently selected inventory item, keep it highlighted
        if (selectedInventoryId && selectedInventoryId === item.id) {
            tr.classList.add('bg-gray-200', 'opacity-60', 'dark:bg-gray-700/50');
        }
        tbody.appendChild(tr);
    });

    document.getElementById('inv-count').innerText = count;
}

// --- Selection & focus helpers for Inventory / Cart ---
function highlightInventoryRow(id) {
    selectedInventoryId = id;
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.children);
    rows.forEach(tr => tr.classList.remove('bg-gray-200', 'opacity-60', 'dark:bg-gray-700/50'));
    const target = rows.find(tr => tr.getAttribute('data-id') == id);
    if (target) {
        target.classList.add('bg-gray-200', 'opacity-60', 'dark:bg-gray-700/50');
        try {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        } catch (e) { }
    }
}

function selectInventoryRow(id) {
    // Single selection visual + center
    highlightInventoryRow(id);
    // We no longer auto-add inventory rows to the cart when clicking an inventory row.
    // Keep selection behavior only (highlight), and if a cart item exists, focus it.
    const inCart = cart.find(i => String(i.id) === String(id));
    if (inCart) focusCartItem(id);
}

function focusCartItem(id) {
    setTimeout(() => {
        const tbody = document.getElementById('cartTableBody');
        if (!tbody) return;
        const rows = Array.from(tbody.children);
        rows.forEach(tr => tr.classList.remove('bg-green-50', 'dark:bg-green-900/30'));
        const target = rows.find(tr => tr.getAttribute('data-id') == id);
        if (target) {
            target.classList.add('bg-green-50', 'dark:bg-green-900/30');
            try {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            } catch (e) { }
            const qtyInput = target.querySelector('input[data-field="qty"]');
            if (qtyInput) {
                qtyInput.focus();
                qtyInput.select();
                return;
            }
            const priceInput = target.querySelector('input[data-field="salePrice"]');
            if (priceInput) {
                priceInput.focus();
                priceInput.select();
            }
        }
    }, 120);
}

// --- RENDU HISTORIQUE (Bilan) ---

function renderDailyHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    // Filter by Context Year FIRST
    const yearFiltered = filterByContextYear(dailyRecords);

    const filter = document.getElementById('historyFilter') ? document.getElementById('historyFilter').value : 'all';
    // Use the year-filtered list for further filtering
    const sales = filterByTime(yearFiltered.filter(r => r.type === 'sale'), filter).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400 italic">Aucune vente enregistrée.</td></tr>`;
        return;
    }

    sales.forEach(r => {
        const tr = document.createElement('tr');
        const date = new Date(r.date).toLocaleDateString('fr-FR');
        const time = new Date(r.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const margin = r.total - (r.totalCost || 0);

        tr.className = "hover:bg-green-50 dark:hover:bg-gray-700 transition-colors border-b text-xs";
        tr.innerHTML = `
                    <td class="p-2 font-medium text-gray-700 dark:text-gray-200" data-label="Date">${date}</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300" data-label="Heure">${time}</td>
                    <td class="p-2 font-semibold text-green-600 dark:text-green-400" data-label="Articles">${r.items.length} art.</td>
                    <td class="p-2 text-right font-bold text-green-600 dark:text-green-400" data-label="Total">${r.total.toLocaleString()} FCFA</td>
                    <td class="p-2 text-right font-bold text-yellow-600 dark:text-yellow-400" data-label="Marge">${margin.toLocaleString()} FCFA</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300 truncate" title="${r.items.map(i => i.name).join(', ')}" data-label="Détails">${r.items.map(i => i.name).join(', ')}</td>
                    <td class="p-2 flex gap-2 justify-center" data-label="Actions">
                        <button onclick="prepareInvoice(${r.id}, 'sale')" class="text-blue-500 hover:text-blue-700 dark:text-blue-400" title="Voir/Modifier"><i class="fas fa-eye"></i></button>
                        <button onclick="printOrderFromSale(${r.id})" class="text-green-500 hover:text-green-700 dark:text-green-400" title="Imprimer"><i class="fas fa-print"></i></button>
                        <button onclick="deleteHistoryRecord(${r.id})" class="text-red-500 hover:text-red-700 dark:text-red-400" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

window.deleteHistoryRecord = function (id) {
    if (confirm("Supprimer cet historique de vente ? Le stock NE sera PAS rétabli.")) {
        dailyRecords = dailyRecords.filter(r => r.id !== id);
        saveData();
        // Refresh UI and bilan immediately
        renderDailyHistory();
        updateCharts();
        updateStats();
        // Also update invoices list if present
        renderQuotes();
    }
}

// --- GESTION DéPENSES ---

window.addExpense = function (e) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }
    e.preventDefault();
    const date = document.getElementById('expense-date').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value || 'Divers';
    const description = document.getElementById('expense-description').value;
    const expenseType = document.getElementById('expense-type').value || 'general';
    const editId = document.getElementById('expense-id').value ? parseInt(document.getElementById('expense-id').value) : null;

    if (isNaN(amount) || amount <= 0 || !date) return alert("Veuillez entrer une date et un montant valides.");

    // Product name (for purchase invoices)
    const productName = document.getElementById('expense-product-name').value || '';
    const supplier = document.getElementById('expense-supplier').value || '';

    // Optional inputs for raw-material purchase details (transport cost, loss %)
    const transportCostInput = document.getElementById('expense-transport-cost');
    const lossPercentageInput = document.getElementById('expense-loss-percentage');
    const transportCost = transportCostInput ? parseFloat(transportCostInput.value) : null;
    const lossPercentage = lossPercentageInput ? parseFloat(lossPercentageInput.value) : null;
    // Payment fields (new)
    const paymentTypeInput = document.getElementById('expense-payment-type');
    const paidAmountInput = document.getElementById('expense-paid-amount');
    const paymentType = paymentTypeInput ? paymentTypeInput.value : 'total';
    const paidAmount = paidAmountInput ? parseFloat(paidAmountInput.value) : (paymentType === 'total' ? amount : 0);
    const remainingAmount = (paymentType === 'total') ? 0 : Math.max(0, amount - (isNaN(paidAmount) ? 0 : paidAmount));

    if (editId) {
        const idx = expenses.findIndex(x => x.id === editId);
        if (idx !== -1) {
            expenses[idx] = {
                id: editId,
                date: new Date(date).toISOString(),
                amount,
                category,
                description,
                type: expenseType,
                productName,
                supplier,
                transportCost: transportCostInput ? (isNaN(transportCost) ? null : transportCost) : null,
                lossPercentage: lossPercentageInput ? (isNaN(lossPercentage) ? null : lossPercentage) : null,
                paymentType: paymentType,
                paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
                remainingAmount: isNaN(remainingAmount) ? 0 : remainingAmount
            };
        }
    } else {
        expenses.unshift({
            id: Date.now(),
            date: new Date(date).toISOString(),
            amount,
            category,
            description,
            type: expenseType,
            productName,
            supplier,
            transportCost: transportCostInput ? (isNaN(transportCost) ? null : transportCost) : null,
            lossPercentage: lossPercentageInput ? (isNaN(lossPercentage) ? null : lossPercentage) : null,
            paymentType: paymentType,
            paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
            remainingAmount: isNaN(remainingAmount) ? 0 : remainingAmount
        });
    }

    // Mise é jour de la datalist des catégories de dépenses
    const categoriesDatalist = document.getElementById('expense-categories');
    const uniqueCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];
    categoriesDatalist.innerHTML = uniqueCategories.map(cat => `<option value="${cat}">`).join('');

    document.getElementById('expenseForm').reset();
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-type').value = 'general';
    updateExpenseForm();
    const submitBtn = document.getElementById('expense-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter Dépense';
    saveData();

    // WARNING: Year Check
    const expYear = new Date(date).getFullYear();
    if (expYear !== APP_YEAR) {
        alert(`Note: Dépense enregistrée en ${expYear}, visible uniquement en changeant l'exercice (Année actuelle: ${APP_YEAR}).`);
    }

    updateCharts();
    if (typeof updateStats === 'function') updateStats();
}

// NOUVEAU: Fonctions pour les rentrées d'argent
window.addIncome = function (e) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }
    e.preventDefault();
    const date = document.getElementById('income-date').value;
    const amount = parseFloat(document.getElementById('income-amount').value);
    const receivedBy = document.getElementById('income-received-by').value || 'Non spécifié';
    const source = document.getElementById('income-source').value || ''; // Optionnel
    const description = document.getElementById('income-description').value || '';
    const incomeId = document.getElementById('income-id').value;

    if (isNaN(amount) || amount <= 0 || !date) {
        showToast('Veuillez entrer une date et un montant valides', 'error');
        return;
    }

    // Si édition
    if (incomeId) {
        const idx = income.findIndex(i => i.id === parseInt(incomeId));
        if (idx !== -1) {
            income[idx] = {
                id: parseInt(incomeId),
                date: new Date(date).toISOString(),
                amount,
                receivedBy,
                source,
                description
            };
            showToast('Rentrée mise à jour', 'success');
            document.getElementById('income-id').value = '';
            const submitBtn = document.getElementById('income-submit-btn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter Rentrée';
        }
    } else {
        // Nouvelle rentrée
        income.unshift({
            id: Date.now(),
            date: new Date(date).toISOString(),
            amount,
            receivedBy,
            source,
            description
        });
        showToast('Rentrée enregistrée avec succès', 'success');
    }

    document.getElementById('incomeForm').reset();
    // Définir la date d'aujourd'hui par défaut
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('income-date').value = today;

    saveData();

    // WARNING: Year Check
    const incYear = new Date(date).getFullYear();
    if (incYear !== APP_YEAR) {
        alert(`Note: Rentrée enregistrée en ${incYear}, non visible dans la vue actuelle (${APP_YEAR}).`);
    }

    renderIncome();
    updateStats();
    updateCharts();
};

function renderIncome() {
    const tbody = document.getElementById('incomeTableBodyUnique');
    let filter = document.getElementById('incomeFilter') ? document.getElementById('incomeFilter').value : 'all';

    // DISABLE time filter for past years to avoid hiding data
    // If APP_YEAR is selected and is NOT the current year, force 'year' or 'all' logic
    if (APP_YEAR !== new Date().getFullYear()) {
        // Show all for that year
        if (filter !== 'all' && filter !== 'year') filter = 'all';
        // Optional: Visual cue could be added here
    }

    // Filter by Year first
    const yearFiltered = filterByContextYear(income);
    const list = filterByTime(yearFiltered, filter).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400 italic">Aucune rentrée d'argent enregistrée.</td></tr>`;
        return;
    }

    list.forEach(inc => {
        const date = new Date(inc.date).toLocaleDateString('fr-FR');
        const time = new Date(inc.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const row = document.createElement('tr');
        row.className = 'hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors border-b';
        row.innerHTML = `
                    <td class="p-2 text-xs font-medium text-gray-700 dark:text-gray-200" data-label="Date">${date}</td>
                    <td class="p-2 text-xs text-gray-600 dark:text-gray-300" data-label="Heure">${time}</td>
                    <td class="p-2 text-xs font-semibold text-purple-600 dark:text-purple-400" data-label="Reçu par">${inc.receivedBy}</td>
                    <td class="p-2 text-xs text-gray-600 dark:text-gray-300" data-label="Source">${inc.source || '-'}</td>
                    <td class="p-2 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title="${inc.description || '-'}" data-label="Description">${inc.description || '-'}</td>
                    <td class="p-2 text-xs font-bold text-green-600 dark:text-green-400 text-right" data-label="Montant">${inc.amount.toLocaleString()} FCFA</td>
                    <td class="p-2 text-xs flex gap-2 justify-center" data-label="Actions">
                        <button onclick="editIncome(${inc.id})" class="text-blue-500 hover:text-blue-700 dark:text-blue-400" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteIncome(${inc.id})" class="text-red-500 hover:text-red-700 dark:text-red-400" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(row);
    });
}

window.editIncome = function (id) {
    const inc = income.find(i => i.id === id);
    if (!inc) return;

    const dateStr = new Date(inc.date).toISOString().split('T')[0];
    document.getElementById('income-date').value = dateStr;
    document.getElementById('income-amount').value = inc.amount;
    document.getElementById('income-received-by').value = inc.receivedBy;
    document.getElementById('income-source').value = inc.source;
    document.getElementById('income-description').value = inc.description;
    document.getElementById('income-id').value = id;

    const submitBtn = document.getElementById('income-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Mettre à jour';

    // Scroll to form
    document.getElementById('incomeForm').scrollIntoView({ behavior: 'smooth' });
};

window.deleteIncome = function (id) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (confirm('Supprimer cette rentrée d\'argent ?')) {
        income = income.filter(i => i.id !== id);
        saveData();
        renderIncome();
        updateCharts();
    }
};

function renderExpenses() {
    const tbody = document.getElementById('expensesTableBody');
    const mobileContainer = document.getElementById('expensesMobileList');
    const filter = document.getElementById('expensesFilter') ? document.getElementById('expensesFilter').value : 'all';
    const paymentFilter = document.getElementById('expensesPaymentFilter') ? document.getElementById('expensesPaymentFilter').value : 'all';

    // Filter by Year first
    const yearFiltered = filterByContextYear(expenses);

    let list = filterByTime(yearFiltered, filter);
    // Apply payment-status filter if set
    if (paymentFilter && paymentFilter !== 'all') {
        list = list.filter(exp => {
            const paid = Number(exp.paidAmount || 0);
            const remaining = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
            if (paymentFilter === 'partial') return remaining > 0;
            if (paymentFilter === 'paid') return remaining === 0;
            return true;
        });
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // If mobile, render card list for better visibility
    if (isMobile && mobileContainer) {
        // hide table
        if (tbody && tbody.closest && tbody.closest('table')) tbody.closest('table').style.display = 'none';
        mobileContainer.style.display = 'block';
        mobileContainer.innerHTML = '';

        if (list.length === 0) {
            mobileContainer.innerHTML = `<div class="text-center py-4 text-gray-400 italic">Aucune dépense enregistrée.</div>`;
            return;
        }

        list.forEach(exp => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 border rounded p-3 mb-3';

            const date = new Date(exp.date).toLocaleDateString('fr-FR');
            const typeBadge = exp.type === 'purchase' ? '<span class="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded font-semibold mr-2">Achat</span>' : '';

            let detailsHtml = '';
            if (exp.type === 'purchase') {
                if (exp.productName) detailsHtml += `<div class="text-sm font-semibold">Produit: ${exp.productName}</div>`;
                if (exp.supplier) detailsHtml += `<div class="text-xs text-gray-500">Fournisseur: ${exp.supplier}</div>`;
            } else {
                if (exp.description) detailsHtml += `<div class="text-xs text-gray-500">${exp.description}</div>`;
            }

            const transportHtml = (exp.transportCost != null) ? `<div class="text-xs text-gray-400 mt-1">Transport: ${Number(exp.transportCost).toLocaleString()} F</div>` : '';
            const lossHtml = (exp.lossPercentage != null) ? `<div class="text-xs text-gray-400 mt-1">Perte: ${exp.lossPercentage}%</div>` : '';
            let paymentHtml = '';
            if (exp.paymentType === 'partial') {
                const paid = Number(exp.paidAmount || 0);
                const rem = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
                paymentHtml = `<div class="text-xs text-gray-500 mt-1">Payé: ${paid.toLocaleString()} F — Reste: ${rem.toLocaleString()} F</div>`;
            } else if (exp.paymentType === 'total' || (exp.paidAmount && Number(exp.paidAmount) >= Number(exp.amount))) {
                paymentHtml = `<div class="text-xs text-gray-500 mt-1">Payé: ${Number(exp.amount || 0).toLocaleString()} F</div>`;
            }

            // actions
            let actionHtml = '';
            if (exp.type === 'purchase') {
                actionHtml = `
                            <button onclick="prepareExpensePurchaseInvoice(${exp.id})" class="text-blue-500 hover:text-blue-700 mr-2" title="Aperéu facture"><i class="fas fa-eye"></i></button>
                            <button onclick="generateExpensePurchasePDF(${exp.id})" class="text-green-600 hover:text-green-800 mr-2" title="Télécharger PDF"><i class="fas fa-file-pdf"></i></button>
                        `;
            }
            actionHtml += `<button onclick="editExpense(${exp.id})" class="text-blue-500 hover:text-blue-700 mr-2"><i class="fas fa-edit"></i></button>`;
            actionHtml += `<button onclick="deleteExpense(${exp.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash-alt"></i></button>`;

            card.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="text-sm text-gray-700 dark:text-gray-200 font-semibold">${date}</div>
                                <div class="text-xs text-gray-500 mt-1">${typeBadge}<span class="font-medium">${exp.category || ''}</span></div>
                                ${detailsHtml}
                                ${transportHtml}${lossHtml}${paymentHtml}
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-bold text-red-600">${exp.amount.toLocaleString()} F</div>
                                <div class="mt-2">${actionHtml}</div>
                            </div>
                        </div>
                    `;

            mobileContainer.appendChild(card);
        });

        return;
    }

    // Desktop / table rendering
    if (tbody && tbody.closest && tbody.closest('table')) tbody.closest('table').style.display = '';
    if (mobileContainer) mobileContainer.style.display = 'none';

    if (!tbody) return;
    tbody.innerHTML = '';

    list.forEach(exp => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';

        // Build product/supplier info
        let detailsHtml = '';
        if (exp.type === 'purchase') {
            if (exp.productName) detailsHtml += `<div class="text-xs text-blue-600 dark:text-blue-400 font-semibold">Produit: ${exp.productName}</div>`;
            if (exp.supplier) detailsHtml += `<div class="text-xs text-gray-400">Fournisseur: ${exp.supplier}</div>`;
        } else {
            if (exp.description) detailsHtml += `<div class="text-xs text-gray-400">${exp.description}</div>`;
        }

        const transportHtml = (exp.transportCost != null) ? `<div class="text-xs text-gray-400 mt-1">Transport: ${Number(exp.transportCost).toLocaleString()} F</div>` : '';
        const lossHtml = (exp.lossPercentage != null) ? `<div class="text-xs text-gray-400 mt-1">Perte: ${exp.lossPercentage}%</div>` : '';
        let paymentHtml = '';
        if (exp.paymentType === 'partial') {
            const paid = Number(exp.paidAmount || 0);
            const rem = Number(exp.remainingAmount != null ? exp.remainingAmount : Math.max(0, (exp.amount || 0) - paid));
            paymentHtml = `<div class="text-xs text-gray-500 mt-1">Payé: ${paid.toLocaleString()} F — Reste: ${rem.toLocaleString()} F</div>`;
        } else if (exp.paymentType === 'total' || (exp.paidAmount && Number(exp.paidAmount) >= Number(exp.amount))) {
            paymentHtml = `<div class="text-xs text-gray-500 mt-1">Payé: ${Number(exp.amount || 0).toLocaleString()} F</div>`;
        }

        const typeBadge = exp.type === 'purchase' ? '<span class="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded font-semibold mr-2">Achat</span>' : '';

        // Action buttons
        let actionHtml = '';
        if (exp.type === 'purchase') {
            actionHtml = `
                        <button onclick="prepareExpensePurchaseInvoice(${exp.id})" class="text-blue-500 hover:text-blue-700 opacity-80 mr-2" title="Aperéu facture"><i class="fas fa-eye"></i></button>
                        <button onclick="generateExpensePurchasePDF(${exp.id})" class="text-green-600 hover:text-green-800 opacity-80 mr-2" title="Télécharger PDF"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="editExpense(${exp.id})" class="text-blue-500 hover:text-blue-700 opacity-80 mr-2"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteExpense(${exp.id})" class="text-red-400 hover:text-red-600 opacity-70"><i class="fas fa-trash-alt"></i></button>
                    `;
        } else {
            actionHtml = `
                        <button onclick="editExpense(${exp.id})" class="text-blue-500 hover:text-blue-700 opacity-80 mr-2"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteExpense(${exp.id})" class="text-red-400 hover:text-red-600 opacity-70"><i class="fas fa-trash-alt"></i></button>
                    `;
        }

        tr.innerHTML = `
                    <td class="px-2 py-2 text-gray-500" data-label="Date">${new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                    <td class="px-2 py-2" data-label="Détails">
                        <div>${typeBadge}<span class="font-medium">${exp.category}</span></div>
                        ${detailsHtml}
                        ${transportHtml}${lossHtml}${paymentHtml}
                    </td>
                    <td class="px-2 py-2 text-right font-bold text-red-600" data-label="Montant">${exp.amount.toLocaleString()} F</td>
                    <td class="px-2 py-2 text-center whitespace-nowrap" data-label="Actions">${actionHtml}</td>
                `;
        tbody.appendChild(tr);
    });

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-400 italic">Aucune dépense enregistrée.</td></tr>`;
    }
}

window.deleteExpense = function (id) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (confirm('Supprimer cette dépense ?')) {
        expenses = expenses.filter(e => e.id !== id);
        saveData();
        renderExpenses();
        updateCharts();
        if (typeof updateStats === 'function') updateStats();
    }
}

function editExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return alert('Dépense introuvable');
    // Fill the form
    document.getElementById('expense-id').value = exp.id;
    document.getElementById('expense-date').value = new Date(exp.date).toISOString().slice(0, 10);
    document.getElementById('expense-amount').value = exp.amount;
    document.getElementById('expense-type').value = exp.type || 'general';
    document.getElementById('expense-category').value = exp.category || '';
    document.getElementById('expense-product-name').value = exp.productName || '';
    document.getElementById('expense-supplier').value = exp.supplier || '';
    document.getElementById('expense-description').value = exp.description || '';
    const transportInput = document.getElementById('expense-transport-cost');
    const lossInput = document.getElementById('expense-loss-percentage');
    if (transportInput) transportInput.value = exp.transportCost != null ? exp.transportCost : '';
    if (lossInput) lossInput.value = exp.lossPercentage != null ? exp.lossPercentage : '';
    // Payment fields (new)
    const paymentTypeSelect = document.getElementById('expense-payment-type');
    const paidInput = document.getElementById('expense-paid-amount');
    const remainingInput = document.getElementById('expense-remaining-amount');
    if (paymentTypeSelect) paymentTypeSelect.value = exp.paymentType || (exp.paidAmount && exp.paidAmount >= exp.amount ? 'total' : 'total');
    if (paidInput) paidInput.value = exp.paidAmount != null ? exp.paidAmount : '';
    if (remainingInput) remainingInput.value = exp.remainingAmount != null ? exp.remainingAmount : '';
    updateExpenseForm();
    if (typeof updateExpensePaymentFields === 'function') updateExpensePaymentFields();
    switchTab('expenses');
    // Change Submit button to 'Sauvegarder'
    const submitBtn = document.getElementById('expense-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
    // Focus the amount input
    setTimeout(() => document.getElementById('expense-amount').focus(), 120);
}

window.updateExpenseForm = function () {
    const expenseType = document.getElementById('expense-type').value || 'general';
    const productField = document.getElementById('expense-product-field');
    const supplierField = document.getElementById('expense-supplier-field');

    if (expenseType === 'purchase') {
        productField.classList.remove('hidden');
        supplierField.classList.remove('hidden');
    } else {
        productField.classList.add('hidden');
        supplierField.classList.add('hidden');
    }
}

// --- GESTION PARAMETRES & THEME & GLASS EFFECT ---

function toggleGlassEffect(enabled) {
    const key = GLASS_ENABLED_KEY;
    localStorage.setItem(key, enabled ? 'true' : 'false');
    const statusEl = document.getElementById('glass-status');
    if (statusEl) statusEl.textContent = enabled ? 'Activé' : 'Désactivé';
    if (enabled) {
        document.documentElement.classList.remove('no-glass');
    } else {
        document.documentElement.classList.add('no-glass');
    }
    updateGlassUI();
    broadcastGlassSettings();
}

function updateGlassOpacity(value) {
    const opacityPercent = parseInt(value);
    const opacity = opacityPercent / 100;
    const opacityLight = 0.62 * opacity;
    const opacityDark = 0.04 * opacity;
    document.documentElement.style.setProperty('--glass-opacity-light', opacityLight);
    document.documentElement.style.setProperty('--glass-opacity-dark', opacityDark);
    const opacityValueEl = document.getElementById('opacity-value');
    if (opacityValueEl) opacityValueEl.textContent = opacityPercent;
    localStorage.setItem('stock_expert_glass_opacity', opacityPercent);
    broadcastGlassSettings();
}

function updateGlassUI() {
    const enabled = (localStorage.getItem(GLASS_ENABLED_KEY) || 'true') === 'true';
    const opacity = parseInt(localStorage.getItem('stock_expert_glass_opacity') || '100');
    const checkboxEl = document.getElementById('settings-glass-enabled');
    const rangeEl = document.getElementById('settings-glass-opacity');
    const opacityValueEl = document.getElementById('opacity-value');
    const statusEl = document.getElementById('glass-status');

    if (checkboxEl) checkboxEl.checked = enabled;
    if (rangeEl) rangeEl.value = opacity;
    if (opacityValueEl) opacityValueEl.textContent = opacity;
    if (statusEl) statusEl.textContent = enabled ? 'Activé' : 'Désactivé';

    if (!enabled) {
        document.documentElement.classList.add('no-glass');
    } else {
        document.documentElement.classList.remove('no-glass');
    }
}

function broadcastGlassSettings() {
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('stock_expert_sync');
            const enabled = (localStorage.getItem(GLASS_ENABLED_KEY) || 'true') === 'true';
            const opacity = parseInt(localStorage.getItem('stock_expert_glass_opacity') || '100');
            bc.postMessage({
                type: 'glass-settings',
                enabled: enabled,
                opacity: opacity
            });
            try {
                bc.close();
            } catch (e) { }
        }
    } catch (e) { }
}

// Expose functions to global scope
window.toggleGlassEffect = toggleGlassEffect;
window.updateGlassOpacity = updateGlassOpacity;
window.updateGlassUI = updateGlassUI;
// --- Settings Helper Functions ---

function updateThemeColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--brand-green', color);
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
    localStorage.setItem(THEME_COLOR_KEY, color);

    // Update input if it exists and differs (e.g. triggered programmatically)
    const colorInput = document.getElementById('settings-color');
    if (colorInput && colorInput.value !== color) {
        colorInput.value = color;
    }
}

function handleLogoUploadFromSettings(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const base64Logo = e.target.result;
            localStorage.setItem(LOGO_KEY, base64Logo);

            // Update displayed logo immediately
            const appLogo = document.getElementById('appLogo');
            if (appLogo) appLogo.src = base64Logo;

            // Update preview if it exists (optional)
            // Save to companyInfo as well if intended structure uses it, 
            // but LOGO_KEY is the primary source currently.

            showToast('Logo mis à jour avec succès', 'success');
        };

        reader.readAsDataURL(file);
    }
}

function populateSettingsForm() {
    // Populate Company Info
    const nameEl = document.getElementById('settings-name');
    const contactEl = document.getElementById('settings-contact');
    const footerEl = document.getElementById('settings-footer');

    if (nameEl && companyInfo.name) nameEl.value = companyInfo.name;
    if (contactEl && companyInfo.contact) contactEl.value = companyInfo.contact;
    if (footerEl && companyInfo.footer) footerEl.value = companyInfo.footer;

    // Populate Color
    const storedColor = localStorage.getItem(THEME_COLOR_KEY);
    const colorEl = document.getElementById('settings-color');
    if (storedColor && colorEl) {
        colorEl.value = storedColor;
    }

    // NOUVEAU: Populate Year Selector
    const yearSelect = document.getElementById('settings-app-year');
    if (yearSelect) {
        const years = getAvailableYears();
        yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === APP_YEAR ? 'selected' : ''}>${y}</option>`).join('');
    }

    // Populate Glass Mode
    const glassEl = document.getElementById('settings-glass-enabled');
    if (glassEl) {
        glassEl.checked = isGlassEnabled();
    }

    // Populate Backup Toggle
    const backupEnabledEl = document.getElementById('backup-enabled');
    const backupDayEl = document.getElementById('backup-day');
    const storedSchedule = localStorage.getItem(BACKUP_SCHEDULE_KEY);
    if (storedSchedule) {
        try {
            const sched = JSON.parse(storedSchedule);
            if (backupEnabledEl) backupEnabledEl.checked = sched.enabled;
            if (backupDayEl) backupDayEl.value = sched.day;
        } catch (e) { console.error('Error parsing backup schedule for form', e); }
    }
}

window.broadcastGlassSettings = broadcastGlassSettings;

function saveSettings() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    try {
        const nameEl = document.getElementById('settings-name');
        const contactEl = document.getElementById('settings-contact');
        const footerEl = document.getElementById('settings-footer');

        if (nameEl) companyInfo.name = nameEl.value;
        if (contactEl) companyInfo.contact = contactEl.value;
        if (footerEl) companyInfo.footer = footerEl.value;

        // Backend settings removed - logic deleted to prevent crash

        const glassEl = document.getElementById('settings-glass-enabled');
        const glassEnabled = glassEl ? glassEl.checked : true; // Default to true if missing

        localStorage.setItem(GLASS_ENABLED_KEY, glassEnabled ? 'true' : 'false');

        // Sync company info and glass settings to Dexie (unified DB) for cross-page sync
        if (typeof dbStorage !== 'undefined') {
            dbStorage.setItem(COMPANY_KEY, JSON.stringify(companyInfo)).catch(err => console.warn('Error saving company info to Dexie:', err));
            dbStorage.setItem(GLASS_ENABLED_KEY, glassEnabled ? 'true' : 'false').catch(err => console.warn('Error saving glass setting to Dexie:', err));
        }

        // Apply changes
        // applyGlassPreference(); // Function might be removed, check existence
        if (typeof applyGlassPreference === 'function') applyGlassPreference();

        saveData();
        updateCompanyDisplays();

        showToast("Informations de l'entreprise mises à jour !", "success");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des paramètres:", error);
        alert("Une erreur est survenue lors de la sauvegarde. Veuillez vérifier la console.");
    }
}

// Glass preference
function isGlassEnabled() {
    return (localStorage.getItem(GLASS_ENABLED_KEY) || 'true') === 'true';
}

function applyGlassPreference() {
    const enabled = isGlassEnabled();
    if (!enabled) {
        document.documentElement.classList.add('no-glass');
    } else {
        document.documentElement.classList.remove('no-glass');
    }
}

// --- Manual Update / Cache Clear ---
async function forceAppUpdate() {
    if (!confirm("Ceci va effacer le cache de l'application et forcer le rechargement de la dernière version. Continuer ?")) return;

    showToast("Nettoyage en cours...", "info");

    try {
        // 1. Unregister all Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Delete all Caches
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                await caches.delete(key);
            }
        }

        showToast("Mise à jour réussie ! Rechargement...", "success");

        // 3. Reload with cache bypass
        setTimeout(() => {
            window.location.reload(true);
        }, 1500);

    } catch (error) {
        console.error("Erreur mise à jour:", error);
        alert("Erreur lors de la mise à jour: " + error.message);
    }
}

function saveInvoiceChanges() {
    if (!currentInvoiceData) return alert('Aucune facture ouverte.');
    const type = currentInvoiceData.type || 'sale';
    const dateInput = document.getElementById('invoice-date').value;
    const clientName = document.getElementById('client-name').value || '';
    const clientPhone = document.getElementById('client-phone').value || '';
    const ref = document.getElementById('invoice-ref').value || '';
    // Validate date
    const parsedDate = new Date(dateInput);
    if (isNaN(parsedDate.getTime())) return alert('Date invalide');
    // Update the current record in memory
    if (type === 'sale') {
        const rec = dailyRecords.find(r => r.id === currentInvoiceData.id);
        if (!rec) return alert('Vente introuvable.');
        rec.date = new Date(dateInput).toISOString();
        rec.clientName = clientName;
        rec.clientPhone = clientPhone;
        rec.ref = ref;
    } else {
        const q = quotes.find(x => x.id === currentInvoiceData.id);
        if (!q) return alert('Devis introuvable.');
        q.date = new Date(dateInput).toISOString();
        q.clientName = clientName;
        q.clientPhone = clientPhone;
        q.ref = ref;
    }
    saveData();
    renderDailyHistory();
    renderQuotes();
    alert('Modifications sauvegardées.');
}

function updateThemeColor(color) {
    localStorage.setItem(THEME_COLOR_KEY, color);
    // Sync to Dexie for cross-page sync
    syncDataAcrossPages('appSettings', 'put', { key: THEME_COLOR_KEY, value: color });
    applyThemeColor();
}

function applyThemeColor() {
    const color = localStorage.getItem(THEME_COLOR_KEY) || '#14522D';
    document.documentElement.style.setProperty('--brand-green', color);
    document.documentElement.style.setProperty('--brand-dark', color);
}

function applyGlassPreference() {
    const enabled = (localStorage.getItem(GLASS_ENABLED_KEY) || 'true') === 'true';
    if (!enabled) {
        document.documentElement.classList.add('no-glass');
    } else {
        document.documentElement.classList.remove('no-glass');
    }
}

function applyGlassToUI() {
    const enabled = (localStorage.getItem(GLASS_ENABLED_KEY) || 'true') === 'true';
    const cardSelectors = ['.bg-white', '.bg-brand-green', '.bg-gray-50', '.bg-gray-100', '.rounded-xl', '.rounded-2xl', '.rounded-lg', '.modal', '.card', '.product-tile'];
    const interactiveSelectors = ['button', 'input[type="text"]', 'input[type="number"]', 'input[type="date"]', 'input[type="email"]', 'input[type="tel"]', 'select', 'textarea', '.btn', '.btn-primary', '.btn-secondary', '.status-btn'];
    const dropdownSelectors = ['[role="listbox"]', '[role="menu"]', '.dropdown-menu', '.dropdown-content', '.menu-list', '.menu', '.select-options', '.choices__list', '.choices__dropdown', '.select2-dropdown', '.popover'];

    // Apply glass to cards/panels
    cardSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (enabled) el.classList.add('glass');
            else el.classList.remove('glass');
        });
    });

    // Apply glass + interactive to buttons and inputs
    interactiveSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (enabled) {
                el.classList.add('glass', 'interactive');
            } else {
                el.classList.remove('glass', 'interactive');
            }
        });
    });

    // Apply glass to dropdowns
    dropdownSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (enabled) el.classList.add('glass');
            else el.classList.remove('glass');
        });
    });
}

function updateCompanyDisplays() {
    document.querySelectorAll('.company-name-display').forEach(el => el.innerText = companyInfo.name);
    document.querySelectorAll('.company-contact-display').forEach(el => el.innerText = companyInfo.contact);
    document.querySelectorAll('.company-footer-display').forEach(el => el.innerText = companyInfo.footer);

    // Sync settings form inputs if they exist (e.g. settings tab is open)
    if (typeof populateSettingsForm === 'function') {
        populateSettingsForm();
    }
}

function resetAllData() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (confirm("ATTENTION: Vous allez effacer TOUTES les données (stock, ventes, dépenses, clients, devis) de façon permanente. Êtes-vous sûr ?")) {
        // Nettoyer localStorage
        localStorage.clear();

        // Nettoyer Dexie (base unifiée)
        if (typeof dbInventory !== 'undefined') dbInventory.clear().catch(err => console.warn('Error clearing inventory:', err));
        if (typeof dbDailyRecords !== 'undefined') dbDailyRecords.clear().catch(err => console.warn('Error clearing daily records:', err));
        if (typeof dbExpenses !== 'undefined') dbExpenses.clear().catch(err => console.warn('Error clearing expenses:', err));
        if (typeof dbIncome !== 'undefined') dbIncome.clear().catch(err => console.warn('Error clearing income:', err));
        if (typeof dbClients !== 'undefined') dbClients.clear().catch(err => console.warn('Error clearing clients:', err));
        if (typeof dbSuppliers !== 'undefined') dbSuppliers.clear().catch(err => console.warn('Error clearing suppliers:', err));
        if (typeof dbQuotes !== 'undefined') dbQuotes.clear().catch(err => console.warn('Error clearing quotes:', err));
        if (typeof dbStorage !== 'undefined') dbStorage.clear().catch(err => console.warn('Error clearing settings:', err));

        window.location.reload();
    }
}

function exportStateJSON() {
    const state = {
        inventory,
        dailyRecords,
        expenses,
        income,
        clients,
        suppliers,
        quotes,
        companyInfo,
        logo: localStorage.getItem(LOGO_KEY),
        theme: localStorage.getItem(THEME_KEY),
        themeColor: localStorage.getItem(THEME_COLOR_KEY)
    };
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `StockExpert_Backup_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    try {
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
        if (typeof dbStorage !== 'undefined') {
            dbStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()).catch(err => console.warn('Error saving backup timestamp to Dexie:', err));
        }
    } catch (e) { }

    alert("Sauvegarde JSON exportée avec succés !");
}

window.importStateJSON = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const state = JSON.parse(e.target.result);

            // Mettre à jour localStorage ET Dexie (base unifiée)
            if (state.inventory) {
                localStorage.setItem(INVENTORY_KEY, JSON.stringify(state.inventory));
                if (typeof dbInventory !== 'undefined') await dbInventory.bulkPut(state.inventory);
            }
            if (state.dailyRecords) {
                localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(state.dailyRecords));
                if (typeof dbDailyRecords !== 'undefined') await dbDailyRecords.bulkPut(state.dailyRecords);
            }
            if (state.expenses) {
                localStorage.setItem(EXPENSES_KEY, JSON.stringify(state.expenses));
                if (typeof dbExpenses !== 'undefined') await dbExpenses.bulkPut(state.expenses);
            }
            if (state.income) {
                localStorage.setItem(INCOME_KEY, JSON.stringify(state.income));
                if (typeof dbIncome !== 'undefined') await dbIncome.bulkPut(state.income);
            }
            if (state.clients) {
                localStorage.setItem(CLIENTS_KEY, JSON.stringify(state.clients));
                if (typeof dbClients !== 'undefined') await dbClients.bulkPut(state.clients);
            }
            if (state.suppliers) {
                localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(state.suppliers));
                if (typeof dbSuppliers !== 'undefined') await dbSuppliers.bulkPut(state.suppliers);
            }
            if (state.quotes) {
                localStorage.setItem(QUOTES_KEY, JSON.stringify(state.quotes));
                if (typeof dbQuotes !== 'undefined') await dbQuotes.bulkPut(state.quotes);
            }
            if (state.companyInfo) localStorage.setItem(COMPANY_KEY, JSON.stringify(state.companyInfo));
            if (state.logo) localStorage.setItem(LOGO_KEY, state.logo);
            if (state.theme) localStorage.setItem(THEME_KEY, state.theme);
            if (state.themeColor) localStorage.setItem(THEME_COLOR_KEY, state.themeColor);

            alert("Restauration réussie ! La page va se recharger.");
            window.location.reload();

        } catch (error) {
            console.error("Erreur lors de la lecture du fichier JSON:", error);
            alert("Erreur: Le fichier n'est pas un fichier de sauvegarde valide.");
        }
    };
    reader.readAsText(file);
}

// --- Backup Scheduler / Rappel ---
// Keys: BACKUP_SCHEDULE_KEY, LAST_BACKUP_KEY
function saveBackupSchedule() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    const day = document.getElementById('backup-day') ? document.getElementById('backup-day').value : String(new Date().getDay());
    const time = document.getElementById('backup-time') ? document.getElementById('backup-time').value : '03:00';
    const enabled = document.getElementById('backup-enabled') ? document.getElementById('backup-enabled').checked : false;
    const obj = {
        day: day,
        time: time,
        enabled: enabled
    };
    try {
        const scheduleJson = JSON.stringify(obj);
        localStorage.setItem(BACKUP_SCHEDULE_KEY, scheduleJson);
        // Sync to Dexie (unified DB) for cross-page sync
        if (typeof dbStorage !== 'undefined') {
            dbStorage.setItem(BACKUP_SCHEDULE_KEY, scheduleJson).catch(err => console.warn('Error saving backup schedule to Dexie:', err));
        }
    } catch (e) {
        console.warn('Error saving backup schedule:', e);
    }
    alert('Paramétres de rappel sauvegardés.');
}

function loadBackupSchedule() {
    try {
        const raw = localStorage.getItem(BACKUP_SCHEDULE_KEY);
        const def = {
            day: String(new Date().getDay()),
            time: '03:00',
            enabled: false
        };
        const obj = raw ? JSON.parse(raw) : def;
        const dayEl = document.getElementById('backup-day');
        const timeEl = document.getElementById('backup-time');
        const enEl = document.getElementById('backup-enabled');
        const lastEl = document.getElementById('backup-last');
        if (dayEl) dayEl.value = obj.day;
        if (timeEl) timeEl.value = obj.time;
        if (enEl) enEl.checked = !!obj.enabled;
        if (lastEl) lastEl.textContent = localStorage.getItem(LAST_BACKUP_KEY) ? new Date(localStorage.getItem(LAST_BACKUP_KEY)).toLocaleString() : 'Jamais';
    } catch (e) {
        console.warn('Load backup schedule error', e);
    }
}

function acquireBackupLock() {
    try {
        const now = Date.now();
        const lock = localStorage.getItem(BACKUP_LOCK_KEY);
        if (lock) {
            const ts = parseInt(lock, 10) || 0;
            if (now - ts < 5 * 60 * 1000) return false; // locked recently
        }
        localStorage.setItem(BACKUP_LOCK_KEY, String(now));
        return true;
    } catch (e) {
        return false;
    }
}

function releaseBackupLock() {
    try {
        localStorage.removeItem(BACKUP_LOCK_KEY);
    } catch (e) { }
}

function attemptBackup() {
    console.log('[stock] attemptBackup called');
    if (!acquireBackupLock()) {
        console.log('[stock] attemptBackup: lock not acquired, aborting');
        return;
    }
    try {
        console.log('[stock] attemptBackup: exporting state');
        exportStateJSON();
        try {
            localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
            // broadcast backup done to other tabs
            try {
                if ('BroadcastChannel' in window) {
                    const whenIso = new Date().toISOString();
                    console.log('[stock] broadcasting backup-done ->', whenIso);
                    const bc = new BroadcastChannel('stock_expert_sync');
                    bc.postMessage({
                        type: 'backup-done',
                        when: whenIso
                    });
                    try {
                        bc.close();
                    } catch (e) { }
                }
            } catch (e) { }
        } catch (e) { }
    } finally {
        // release after a short delay to avoid race on concurrent tabs
        setTimeout(releaseBackupLock, 2000);
    }
}

function checkAndTriggerBackup() {
    try {
        console.log('[stock] checkAndTriggerBackup called at', new Date().toISOString());
        const raw = localStorage.getItem(BACKUP_SCHEDULE_KEY);
        if (!raw) {
            console.log('[stock] no backup schedule configured');
            return;
        }
        const cfg = JSON.parse(raw);
        console.log('[stock] backup config:', cfg);
        if (!cfg || !cfg.enabled) {
            console.log('[stock] backup not enabled');
            return;
        }
        const now = new Date();
        console.log('[stock] current time:', now.toISOString());
        const targetDay = parseInt(cfg.day, 10);
        const [hh, mm] = (cfg.time || '03:00').split(':').map(v => parseInt(v, 10));
        console.log('[stock] target day:', targetDay, 'time:', hh + ':' + mm);
        // compute most recent scheduled occurrence (<= now)
        const candidate = new Date(now);
        const delta = targetDay - candidate.getDay();
        candidate.setDate(candidate.getDate() + delta);
        candidate.setHours(isNaN(hh) ? 3 : hh, isNaN(mm) ? 0 : mm, 0, 0);
        if (candidate > now) {
            candidate.setDate(candidate.getDate() - 7);
        }
        console.log('[stock] candidate scheduled time:', candidate.toISOString());

        const lastRaw = localStorage.getItem(LAST_BACKUP_KEY);
        const lastBackup = lastRaw ? new Date(lastRaw) : new Date(0);
        console.log('[stock] last backup time:', lastBackup.toISOString());

        if (lastBackup < candidate) {
            console.log('[stock] backup is due (last < candidate)');
            const minutesSince = (now - candidate) / 60000;
            console.log('[stock] minutes since scheduled time:', minutesSince);
            const promptKey = 'stock_expert_backup_prompt_shown_' + candidate.toISOString().slice(0, 10);
            if (now >= candidate && minutesSince < 60) {
                console.log('[stock] showing reminder banner (within 60 min window)');
                if (!localStorage.getItem(promptKey)) {
                    localStorage.setItem(promptKey, '1');
                    showBackupBanner('Rappel: c\'est le moment de sauvegarder les données.', function () {
                        attemptBackup();
                        removeBackupBanner();
                    });
                } else {
                    console.log('[stock] prompt already shown for this date');
                }
            } else if (now >= candidate && minutesSince >= 60) {
                console.log('[stock] automatic backup triggered (>60 min passed)');
                attemptBackup();
            } else {
                console.log('[stock] not yet time for reminder (candidate still in future)');
            }
        } else {
            console.log('[stock] no backup due (lastBackup >= candidate)');
        }
    } catch (e) {
        console.warn('[stock] checkAndTriggerBackup err', e);
    }
}

// Small UI banner for backup reminder (bottom-right)
function showBackupBanner(message, onSave) {
    try {
        console.log('[stock] showBackupBanner called with message:', message);
        if (document.getElementById('backup-banner')) {
            console.log('[stock] backup-banner already exists, skipping');
            return; // already shown
        }
        const div = document.createElement('div');
        div.id = 'backup-banner';
        div.setAttribute('role', 'dialog');
        div.style.position = 'fixed';
        div.style.right = '16px';
        div.style.bottom = '16px';
        div.style.zIndex = 99999;
        div.style.background = 'linear-gradient(180deg,#ffffff, #f3f4f6)';
        div.style.color = '#0f172a';
        div.style.padding = '12px 14px';
        div.style.borderRadius = '8px';
        div.style.boxShadow = '0 8px 24px rgba(2,6,23,0.2)';
        div.style.maxWidth = '320px';
        div.style.fontSize = '13px';
        div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="flex:1">${message}</div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
                        <button id="backup-now-btn" style="background:#059669;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer">Sauvegarder maintenant</button>
                        <button id="backup-dismiss-btn" style="background:transparent;color:#374151;border:1px solid #e5e7eb;padding:6px 10px;border-radius:6px;cursor:pointer">Ignorer</button>
                    </div>
                `;
        document.body.appendChild(div);
        console.log('[stock] backup-banner DOM element created and appended');
        // Broadcast reminder to other tabs/pages immediately so other open pages (e.g., index.html) show the same banner
        try {
            if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('stock_expert_sync');
                console.log('[stock] broadcasting backup-reminder ->', message);
                bc.postMessage({
                    type: 'backup-reminder',
                    message: message
                });
                try {
                    bc.close();
                } catch (e) { }
            }
        } catch (e) {
            console.warn('[stock] BroadcastChannel error in showBackupBanner', e);
        }
        document.getElementById('backup-now-btn').addEventListener('click', function () {
            try {
                console.log('[stock] backup-now-btn clicked');
                onSave && onSave();
            } catch (e) {
                console.warn('[stock] error in onSave callback', e);
            }
        });
        document.getElementById('backup-dismiss-btn').addEventListener('click', function () {
            console.log('[stock] backup-dismiss-btn clicked');
            removeBackupBanner();
            // Broadcast reminder to other tabs/pages
            try {
                if ('BroadcastChannel' in window) {
                    console.log('[stock] broadcasting backup-reminder (dismiss) ->', message);
                    const bc = new BroadcastChannel('stock_expert_sync');
                    bc.postMessage({
                        type: 'backup-reminder',
                        message: message
                    });
                    try {
                        bc.close();
                    } catch (e) { }
                }
            } catch (e) {
                console.warn('[stock] BroadcastChannel error on dismiss', e);
            }
        });
    } catch (e) {
        console.warn('[stock] showBackupBanner error', e);
    }
}

function removeBackupBanner() {
    try {
        const el = document.getElementById('backup-banner');
        if (el) el.remove();
    } catch (e) { }
}

function initBackupScheduler() {
    loadBackupSchedule();
    // check immediately and then every 5 minutes
    checkAndTriggerBackup();
    setInterval(checkAndTriggerBackup, 5 * 60 * 1000);
    // also refresh UI periodically
    setInterval(loadBackupSchedule, 60 * 1000);
    // listen for broadcast requests from other tabs/pages
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('stock_expert_sync');
            bc.addEventListener('message', (ev) => {
                const msg = ev.data || {};
                try {
                    console.log('[stock] received bc message', msg);
                    if (msg.type === 'backup-request') {
                        console.log('[stock] backup-request received -> attempting backup');
                        attemptBackup();
                    }
                } catch (e) { }
            });
        }
    } catch (e) { }
}

// Import products CSV from settings (simple, robust parsing for common format)
function importProductsCSV(input) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    const file = input.files && input.files[0];
    if (!file) return;

    console.log('Import products CSV', file.name, file.size, file.type);

    function readTextWithFallback(file, cb, errCb) {
        const reader = new FileReader();
        reader.onload = function (e) {
            cb(e.target.result);
        };
        reader.onerror = function (e) {
            console.warn('readAsText failed, falling back to arrayBuffer decode', e);
            const rb = new FileReader();
            rb.onload = function (ev) {
                try {
                    const arr = new Uint8Array(ev.target.result);
                    try {
                        cb(new TextDecoder('windows-1252').decode(arr));
                    } catch (err2) {
                        try {
                            cb(new TextDecoder('utf-8').decode(arr));
                        } catch (err3) {
                            console.error('Text decode failed', err2, err3);
                            errCb(err3);
                        }
                    }
                } catch (ex) {
                    console.error('ArrayBuffer decode failed', ex);
                    errCb(ex);
                }
            };
            rb.onerror = function (ev) {
                console.error('Reading ArrayBuffer failed', ev);
                errCb(ev);
            };
            rb.readAsArrayBuffer(file);
        };
        try {
            reader.readAsText(file, 'windows-1252');
        } catch (e) {
            try {
                reader.readAsText(file, 'utf-8');
            } catch (e2) {
                reader.readAsText(file);
            }
        }
    }

    function splitLine(line, sep) {
        // Simple quote-aware split
        const parts = [];
        let cur = '',
            inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQ && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQ = !inQ;
                }
            } else if (ch === sep && !inQ) {
                parts.push(cur);
                cur = '';
            } else cur += ch;
        }
        parts.push(cur);
        return parts;
    }

    function detectSeparator(lines) {
        const candidates = [';', '\t', ','];
        let best = ',';
        let bestAvg = 0;
        for (const s of candidates) {
            let total = 0,
                count = 0;
            for (let i = 0; i < Math.min(lines.length, 6); i++) {
                if (!lines[i]) continue;
                const p = splitLine(lines[i], s);
                total += p.length;
                count++;
            }
            const avg = count ? total / count : 0;
            if (avg > bestAvg) {
                bestAvg = avg;
                best = s;
            }
        }
        return best;
    }

    readTextWithFallback(file, (csvText) => {
        try {
            csvText = csvText.replace(/^\uFEFF/, '');
            const rawLines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
            if (rawLines.length < 1) return alert('Fichier CSV vide ou invalide.');
            // detect separator
            const sep = detectSeparator(rawLines);
            // header detection: find a header line containing both a name-like column and a column with stock/price/category
            let hIdx = -1;
            const nameCandidates = ['name', 'nom', 'produit', 'designation', 'item', 'article'];
            const otherCandidates = ['category', 'categorie', 'stock', 'stockdebase', 'disponible', 'vendu', 'prix', 'price', 'total', 'unite', 'unitedemesure', 'qte', 'quantite', 'quantity'];
            const candidateCount = Math.min(rawLines.length, 20);
            for (let i = 0; i < candidateCount; i++) {
                const parts = splitLine(rawLines[i], sep).map(p => p.trim());
                if (!parts.length) continue;
                const normalizedParts = parts.map(p => p.toLowerCase().replace(/[ _\-\/\\\.]/g, '').normalize('NFD').replace(/\p{Diacritic}/gu, ''));
                const hasName = normalizedParts.some(p => nameCandidates.some(c => p.includes(c)));
                const hasOther = normalizedParts.some(p => otherCandidates.some(c => p.includes(c)));
                if (hasName && hasOther) {
                    hIdx = i;
                    break;
                }
            }
            // fallback: common CSVs contain 3 metadata lines before header (e.g. Stock.csv)
            if (hIdx === -1 && rawLines.length > 3) hIdx = 3;
            if (hIdx === -1) hIdx = 0;
            const headerParts = splitLine(rawLines[hIdx], sep).map(h => h.trim());
            const keys = headerParts.map(h => h.toLowerCase().replace(/[ _\-\/\\\.]/g, '').normalize('NFD').replace(/\p{Diacritic}/gu, ''));
            // map indices
            // Prefer exact 'name' or 'nom' header if present
            let nameIdx = -1;
            if (keys.indexOf('name') !== -1) nameIdx = keys.indexOf('name');
            else if (keys.indexOf('nom') !== -1) nameIdx = keys.indexOf('nom');
            else {
                nameIdx = keys.findIndex(k => ['produit', 'designation', 'item', 'article'].some(c => k.includes(c)));
            }
            // Fallbacks: if not found, prefer a column whose header looks like a 'name' (letters & not a short 'no')
            if (nameIdx === -1) {
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    if (!k) continue;
                    // avoid purely numeric or single-letter ID like 'n', 'no'
                    if (/^\d+$/.test(k)) continue;
                    if (k.length <= 2 && (k === 'n' || k === 'no' || k === 'id')) continue;
                    // prefer keys with letters
                    if (/[a-z]/.test(k)) {
                        nameIdx = i;
                        break;
                    }
                }
            }
            // Prefer exact category header
            let categoryIdx = -1;
            if (keys.indexOf('category') !== -1) categoryIdx = keys.indexOf('category');
            else if (keys.indexOf('categorie') !== -1) categoryIdx = keys.indexOf('categorie');
            else categoryIdx = keys.findIndex(k => ['cat', 'famille'].some(c => k.includes(c)));
            const stockIdx = keys.findIndex(k => ['stockdebase', 'stock', 'disponible', 'qte', 'quantite', 'quantity'].includes(k));
            const priceIdx = keys.findIndex(k => ['prixpiece', 'prixpiéce', 'prix', 'price', 'prixvente', 'prix_vente'].includes(k));
            const unitIdx = keys.findIndex(k => ['unitedemesure', 'unite', 'unit', 'saleunit', 'unitevente'].includes(k));
            const typeIdx = keys.findIndex(k => ['type', 'typedeproduit', 'typedeproduits', 'producttype', 'typeproduit', 'typ'].includes(k));

            if (nameIdx === -1) {
                console.error('CSV header: no product name column detected. keys=', keys);
                return alert('Entéte CSV non reconnue: la colonne Nom est manquante');
            }

            let added = 0,
                updated = 0,
                addedRaw = 0,
                addedFinished = 0,
                updatedRaw = 0,
                updatedFinished = 0;
            for (let i = hIdx + 1; i < rawLines.length; i++) {
                const parts = splitLine(rawLines[i], sep);
                const rawNameCandidate = (parts[nameIdx] || '').trim();
                // If the chosen column looks numeric, prefer the exact 'name' column if available
                const exactNameIdx = keys.indexOf('name') !== -1 ? keys.indexOf('name') : -1;
                let rawName = rawNameCandidate;
                if (/^\d+$/.test(rawNameCandidate) && exactNameIdx !== -1 && parts[exactNameIdx]) {
                    rawName = (parts[exactNameIdx] || '').trim();
                }
                if (!rawName) continue;
                const rawCat = (categoryIdx >= 0 ? (parts[categoryIdx] || '') : '').trim();
                const rawStock = (stockIdx >= 0 ? (parts[stockIdx] || '') : '').trim();
                const rawPrice = (priceIdx >= 0 ? (parts[priceIdx] || '') : '').trim();
                const rawUnit = (unitIdx >= 0 ? (parts[unitIdx] || '') : '').trim();
                // detect type in CSV row if available
                let parsedType = null;
                if (typeIdx !== -1) {
                    const tVal = (parts[typeIdx] || '').toLowerCase().trim();
                    if (tVal) {
                        const clean = tVal.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z]/g, '');
                        if (['raw', 'matiere', 'matierepremiere', 'mp', 'ingredient', 'ing'].includes(clean)) parsedType = 'raw';
                        if (['finished', 'fini', 'produitfini', 'vendu', 'vendre'].includes(clean)) parsedType = 'finished';
                    }
                }

                const name = rawName;
                const category = rawCat || 'Divers';
                const stock = parseInt(String(rawStock || '').replace(/[^0-9\-]+/g, '')) || 0;
                const price = parseFloat(String(rawPrice || '').replace(/\s+/g, '').replace(/,/g, '.').replace(/[^\\d.\-]/g, '')) || 0;
                const unit = rawUnit || 'Pce';
                const forceRaw = document.getElementById('productsCsvForceRaw') ? document.getElementById('productsCsvForceRaw').checked : false;
                const productType = forceRaw ? 'raw' : (parsedType || 'finished');
                const hasPrice = (rawPrice || '').toString().trim() !== '' && !isNaN(parseFloat(String(rawPrice || '').replace(/\s+/g, '').replace(/,/g, '.').replace(/[^\\d.\-]/g, '')));
                const parsedNumericPrice = hasPrice ? parseFloat(String(rawPrice || '').replace(/\s+/g, '').replace(/,/g, '.').replace(/[^\\d.\-]/g, '')) : 0;
                let computedSalePrice = null;
                let computedPurchasePrice = 0;
                if (productType === 'raw') {
                    if (hasPrice) computedPurchasePrice = parsedNumericPrice;
                    computedSalePrice = null;
                } else {
                    computedSalePrice = hasPrice ? parsedNumericPrice : 0;
                    computedPurchasePrice = 0;
                }

                const existing = inventory.find(p => p.name.toLowerCase() === name.toLowerCase());
                if (existing) {
                    // update stock only if present; do not override sale price if not provided (price=0 indicates absent)
                    if (!isNaN(stock) && stock !== 0) existing.stock = stock;
                    if (hasPrice) {
                        if (productType === 'raw') {
                            existing.purchasePrice = parsedNumericPrice;
                            // ensure sale price is cleared for raw materials
                            existing.salePrice = null;
                            existing.purchaseUnit = unit || existing.purchaseUnit;
                            existing.saleUnit = '';
                        } else {
                            existing.salePrice = computedSalePrice;
                            existing.saleUnit = unit || existing.saleUnit;
                        }
                    } else if (productType === 'raw') {
                        existing.salePrice = null;
                        existing.saleUnit = '';
                    }
                    existing.saleUnit = unit || existing.saleUnit;
                    existing.category = category || existing.category;
                    if (productType) existing.type = productType;
                    if (productType === 'raw') updatedRaw++;
                    else updatedFinished++;
                    updated++;
                } else {
                    const newId = inventory.length > 0 ? Math.max(...inventory.map(p => p.id)) + 1 : 1;
                    inventory.push({
                        id: newId,
                        name,
                        category,
                        stock,
                        salePrice: computedSalePrice,
                        saleUnit: productType === 'finished' ? unit : '',
                        purchasePrice: computedPurchasePrice || 0,
                        purchaseUnit: productType === 'raw' ? unit : '',
                        type: productType
                    });
                    added++;
                    if (productType === 'raw') addedRaw++;
                    else addedFinished++;
                }
            }

            saveData();
            renderInventory();
            alert(`Import CSV terminé: ${added} produits ajoutés (${addedFinished} finis, ${addedRaw} MP), ${updated} produits mis é jour (${updatedFinished} finis, ${updatedRaw} MP).`);
        } catch (e) {
            console.error('importProductsCSV failed', e);
            alert('Erreur lors de l\'import CSV. Consultez la console pour plus de détails.');
        }
    }, (err) => {
        console.error('Reading CSV failed', err);
        alert('Erreur lecture fichier: ' + err);
    });
}


// --- CHARTS (Bilan) ---

let revenueChart = null;

function updateStats() {
    // Apply Year Filter for Valid Stats
    const yearDailyRecords = filterByContextYear(dailyRecords);
    const yearExpenses = filterByContextYear(expenses);
    const yearIncome = filterByContextYear(income);

    const totalRevenue = yearDailyRecords.reduce((sum, r) => sum + r.total, 0);
    const totalCost = yearDailyRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDebts = yearExpenses.reduce((sum, e) => {
        if (e.paymentType === 'partial') {
            const paid = Number(e.paidAmount || 0);
            const remaining = Number(e.remainingAmount != null ? e.remainingAmount : Math.max(0, (e.amount || 0) - paid));
            return sum + (isNaN(remaining) ? 0 : remaining);
        }
        return sum;
    }, 0);
    const totalIncome = yearIncome.reduce((sum, i) => sum + i.amount, 0);

    const marginBrute = totalRevenue - totalCost;
    const netProfit = marginBrute - totalExpenses + totalIncome;

    document.getElementById('stat-revenue').innerText = totalRevenue.toLocaleString() + " FCFA";
    document.getElementById('stat-expenses').innerText = totalExpenses.toLocaleString() + " FCFA";
    document.getElementById('stat-margin-brute').innerText = marginBrute.toLocaleString() + " FCFA";
    document.getElementById('stat-net-profit').innerText = netProfit.toLocaleString() + " FCFA";

    // Mettre à jour aussi les rentrées d'argent si l'élément existe
    const incomeElem = document.getElementById('stat-income');
    if (incomeElem) {
        incomeElem.innerText = totalIncome.toLocaleString() + " FCFA";
    }
    const debtsElem = document.getElementById('stat-debts');
    if (debtsElem) debtsElem.innerText = (totalDebts || 0).toLocaleString() + " FCFA";
}

// Reset only the Bilan (sales history and charts) without affecting inventory or other data
async function resetBilan() {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (!confirm('ATTENTION: Vous allez supprimer l\'historique des ventes (bilan) uniquement. Continuer ?')) return;

    dailyRecords = [];
    quotes = [];

    // Force save to localStorage immediately
    localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(dailyRecords));
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));

    // If backend is enabled, push the reset state to backend
    try {
        const cfg = getBackendConfig();
        if (cfg.enabled) {
            const state = {
                inventory,
                dailyRecords: [],
                expenses,
                clients,
                quotes: [],
                companyInfo,
                logo: localStorage.getItem(LOGO_KEY),
                theme: localStorage.getItem(THEME_KEY),
                themeColor: localStorage.getItem(THEME_COLOR_KEY)
            };
            await apiAdapter.pushState(cfg, state);
        }
    } catch (err) {
        console.warn('Erreur lors du push de reset au backend:', err);
    }

    // Persist all other changes and re-render the affected views
    saveData();
    renderDailyHistory();
    renderQuotes();
    updateCharts();
    updateStats();
    alert('Bilan réinitialisé définitivement.');
}

async function refreshBilanFromBackend() {
    const cfg = getBackendConfig();
    if (!cfg.enabled) return alert('Veuillez activer la synchronisation backend dans les paramétres.');
    if (!cfg.baseUrl) return alert('Entrez l\'URL de l\'API dans les paramétres.');

    const statusEl = document.getElementById('backend-status') || document.createElement('div');
    statusEl.innerText = 'Chargement du bilan depuis le backend...';

    try {
        const remote = await apiAdapter.pullState(cfg);
        if (remote) {
            // Update only the sales history data (dailyRecords and quotes)
            if (remote.dailyRecords) {
                dailyRecords = remote.dailyRecords;
                localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(dailyRecords));
            }
            if (remote.quotes) {
                quotes = remote.quotes;
                localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
            }
            if (remote.expenses) {
                expenses = remote.expenses;
                localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
            }

            // Re-render the bilan views
            renderDailyHistory();
            renderQuotes();
            renderExpenses();
            updateCharts();
            updateStats();

            statusEl.innerText = 'Bilan actualisé depuis le backend.';
            alert('Bilan actualisé avec succés depuis le backend.');
        } else {
            statusEl.innerText = 'Aucune donnée reéue du backend.';
            alert('Aucune donnée é charger depuis le backend.');
        }
    } catch (err) {
        statusEl.innerText = `Erreur lors de l'actualisation: ${err.message}`;
        alert(`Erreur lors de l'actualisation du bilan: ${err.message}`);
    }
}

function updateCharts() {
    // 1. Check if the element exists (renamed to chartBilan in HTML, but we'll support both for safety or update HTML first)
    // Let's assume we update HTML to id="chartBilan"
    const canvas = document.getElementById('chartBilan') || document.getElementById('chartRevenue');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? 'white' : 'black';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-green').trim() || '#00A651'; // Fallback
    const redColor = '#ef4444';

    // 2. Calculate the 6 Metrics
    // Re-calculate here to ensure we have the latest (similar to updateStats)
    const yearDailyRecords = filterByContextYear(dailyRecords);
    const yearExpenses = filterByContextYear(expenses);
    const yearIncome = filterByContextYear(income);

    const totalRevenue = yearDailyRecords.reduce((sum, r) => sum + r.total, 0);
    const totalCost = yearDailyRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate Debts
    const totalDebts = yearExpenses.reduce((sum, e) => {
        if (e.paymentType === 'partial') {
            const paid = Number(e.paidAmount || 0);
            const remaining = Number(e.remainingAmount != null ? e.remainingAmount : Math.max(0, (e.amount || 0) - paid));
            return sum + (isNaN(remaining) ? 0 : remaining);
        }
        return sum;
    }, 0);

    const totalIncome = yearIncome.reduce((sum, i) => sum + i.amount, 0);
    const marginBrute = totalRevenue - totalCost;
    const netProfit = marginBrute - totalExpenses + totalIncome;

    // 3. Prepare Data for Chart
    const labels = [
        "Chiffre d'Affaires",
        "Dépenses",
        "Marge Brute",
        "Bénéfice Net",
        "Dettes",
        "Rentrées" // Shortened for chart
    ];

    const dataValues = [
        totalRevenue,
        totalExpenses,
        marginBrute,
        netProfit,
        totalDebts,
        totalIncome
    ];

    // Determine colors based on nature of metric
    // Revenue: Brand
    // Expenses: Red
    // Margin: Brand/Red (if negative)
    // Net Profit: Brand/Red
    // Debts: Red
    // Income: Brand (or maybe Purple/Blue to distinguish? Let's stick to Green vs Red for simple financial view)

    const backgroundColors = [
        brandColor, // Revenue
        redColor,   // Expenses
        marginBrute >= 0 ? brandColor : redColor, // Margin
        netProfit >= 0 ? brandColor : redColor,   // Net Profit
        redColor,   // Debts
        '#a855f7'   // Income (Purple to match the card color in UI)
    ];

    // 4. Update or Create Chart
    if (revenueChart) {
        revenueChart.data.labels = labels;
        revenueChart.data.datasets[0].data = dataValues;
        revenueChart.data.datasets[0].backgroundColor = backgroundColors;
        revenueChart.data.datasets[0].borderColor = backgroundColors;

        // Update styling in case theme changed
        revenueChart.options.scales.y.ticks.color = textColor;
        revenueChart.options.scales.x.ticks.color = textColor;
        revenueChart.options.scales.y.grid.color = gridColor;
        revenueChart.options.scales.x.grid.color = gridColor;

        revenueChart.update();
    } else {
        revenueChart = new Chart(ctx, {
            type: 'bar', // Bar Chart for comparison
            data: {
                labels: labels,
                datasets: [{
                    label: 'Montant (FCFA)',
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors,
                    borderWidth: 1,
                    borderRadius: 4, // Rounded bars for M3 feel
                    barPercentage: 0.6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Hide legend as bars are distinct metrics
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('fr-FR').format(context.parsed.y) + ' FCFA';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: function (value) {
                                // Shorten large numbers
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value;
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            display: false // Cleaner look
                        }
                    }
                }
            }
        });
    }
}


// --- TIME FILTER HELPERS ---
function getDateThreshold(filter) {
    const now = new Date();
    switch (filter) {
        case 'day':
            // start of today
            const d = new Date(now);
            d.setHours(0, 0, 0, 0);
            return d;
        case 'week':
            return new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        case 'month':
            return new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        case 'year':
            return new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        case 'all':
        default:
            return null; // no threshold
    }
}

function filterByTime(records, filter) {
    if (!filter || filter === 'all') return (records || []);
    const threshold = getDateThreshold(filter);
    if (!threshold) return (records || []);
    return (records || []).filter(r => {
        const d = new Date(r.date);
        return d >= threshold;
    });
}

function getFilterLabel(filter) {
    switch (filter) {
        case 'day':
            return "Aujourd'hui";
        case 'week':
            return '7 derniers jours';
        case 'month':
            return '30 derniers jours';
        case 'year':
            return '12 mois';
        case 'all':
        default:
            return 'Toutes';
    }
}

function getFilterFileSuffix(filter) {
    switch (filter) {
        case 'day':
            return 'jour';
        case 'week':
            return '7jours';
        case 'month':
            return '30jours';
        case 'year':
            return '12mois';
        case 'all':
        default:
            return 'tous';
    }
}

function getTypeLabel(type) {
    switch (type) {
        case 'finished':
            return 'Produit Fini';
        case 'in_stock':
            return 'En Stock (Produit Fini)';
        case 'raw':
            return 'Matiére Premiére';
        case 'all':
        default:
            return 'Tous';
    }
}

function getTypeFileSuffix(type) {
    switch (type) {
        case 'finished':
            return 'produit-fini';
        case 'in_stock':
            return 'en-stock';
        case 'raw':
            return 'matiere-premiere';
        case 'all':
        default:
            return 'tous';
    }
}



// --- YEAR MANAGEMENT HELPERS ---

function filterByContextYear(list) {
    if (!list) return [];
    // Filter items where the date's year matches APP_YEAR
    // If an item doesn't have a date, we might choose to show or hide. Usually transactional data has a date.
    return list.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear() === APP_YEAR;
    });
}

function getAvailableYears() {
    // Collect all unique years from transaction data
    const years = new Set();
    years.add(new Date().getFullYear()); // Always include current year

    [dailyRecords, expenses, income, quotes].forEach(dataset => {
        if (Array.isArray(dataset)) {
            dataset.forEach(d => {
                if (d.date) {
                    years.add(new Date(d.date).getFullYear());
                }
            });
        }
    });

    return Array.from(years).sort((a, b) => b - a); // Descending
}

function setAppYear(year) {
    APP_YEAR = parseInt(year);
    localStorage.setItem(APP_YEAR_KEY, APP_YEAR);
    // Refresh all views
    renderDailyHistory();
    renderExpenses();
    renderIncome();
    renderQuotes();
    updateCharts();
    updateStats();

    // Update UI display of current year if needed
    const yearDisplay = document.getElementById('current-year-display');
    if (yearDisplay) yearDisplay.innerText = APP_YEAR;

    if (window.showToast) window.showToast(`Année ${APP_YEAR} sélectionnée`);
}

// --- GESTION CLIENTS (CRUD) ---

// --- GESTION CLIENTS & FOURNISSEURS ---

function loadClientsSuppliers() {
    clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    suppliers = JSON.parse(localStorage.getItem(SUPPLIERS_KEY) || '[]');
}

function saveClientsSuppliers() {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
}

function switchClientSupplierMode() {
    const select = document.getElementById('clientSupplierSwitch');
    if (!select) return;
    clientSupplierMode = select.value;
    document.getElementById('addClientSupplierTitle').innerText = clientSupplierMode === 'client' ? 'Ajouter Client' : 'Ajouter Fournisseur';
    document.getElementById('clientNameLabel').innerText = clientSupplierMode === 'client' ? 'Nom du Client' : 'Nom du Fournisseur';
    document.getElementById('clientLogoLabel').innerText = clientSupplierMode === 'client' ? 'Logo Client' : 'Logo Fournisseur';
    document.getElementById('clientSupplierBtnLabel').innerText = clientSupplierMode === 'client' ? 'Enregistrer Client' : 'Enregistrer Fournisseur';
    renderClientSupplierList();
    clearClientSupplierForm();
}

function setClientMode(mode) {
    clientSupplierMode = mode;

    // Deactivate both first
    document.getElementById('btn-mode-client').classList.remove('active');
    document.getElementById('btn-mode-supplier').classList.remove('active');

    // Activate the correct one
    if (mode === 'client') {
        document.getElementById('btn-mode-client').classList.add('active');
    } else {
        document.getElementById('btn-mode-supplier').classList.add('active');
    }

    // Update labels and content
    document.getElementById('addClientSupplierTitle').innerText = mode === 'client' ? 'Ajouter Client' : 'Ajouter Fournisseur';
    document.getElementById('clientNameLabel').innerText = mode === 'client' ? 'Nom du Client' : 'Nom du Fournisseur';
    document.getElementById('clientLogoLabel').innerText = mode === 'client' ? 'Logo Client' : 'Logo Fournisseur';
    document.getElementById('clientSupplierBtnLabel').innerText = mode === 'client' ? 'Enregistrer Client' : 'Enregistrer Fournisseur';
    renderClientSupplierList();
    clearClientSupplierForm();
}

function handleClientSupplierLogoUpload(input) {
    const preview = document.getElementById('client-logo-preview');
    preview.innerHTML = '';
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'h-12 w-12 object-contain border rounded';
            preview.appendChild(img);
            preview.dataset.logo = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.dataset.logo = '';
    }
}

window.addClientSupplier = function (e) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }
    e.preventDefault();
    const name = document.getElementById('client-name-input').value.trim();
    const phone = document.getElementById('client-phone-input').value.trim();
    const address = document.getElementById('client-address-input').value.trim();
    const editId = document.getElementById('client-id').value;
    const logo = document.getElementById('client-logo-preview').dataset.logo || '';

    if (!name) return alert('Nom requis');

    const entry = {
        id: editId || Date.now(),
        name,
        phone,
        address,
        logo
    };
    let list = clientSupplierMode === 'client' ? clients : suppliers;

    if (editId) {
        const idx = list.findIndex(x => x.id == editId);
        if (idx !== -1) list[idx] = entry;
    } else {
        list.unshift(entry);
    }

    if (clientSupplierMode === 'client') clients = list;
    else suppliers = list;

    saveClientsSuppliers();
    saveData();
    renderClientSupplierList();
    clearClientSupplierForm();
    alert(`${clientSupplierMode === 'client' ? 'Client' : 'Fournisseur'} enregistré !`);
}

function clearClientSupplierForm() {
    document.getElementById('client-id').value = '';
    document.getElementById('client-name-input').value = '';
    document.getElementById('client-phone-input').value = '';
    document.getElementById('client-address-input').value = '';
    document.getElementById('client-logo-input').value = '';
    document.getElementById('client-logo-preview').innerHTML = '';
    document.getElementById('client-logo-preview').dataset.logo = '';
}

function renderClientSupplierList() {
    const tbody = document.getElementById('clientsTableBody');
    let list = clientSupplierMode === 'client' ? clients : suppliers;
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan='6' class='text-center py-4 text-gray-400 italic'>Aucun ${clientSupplierMode === 'client' ? 'client' : 'fournisseur'} enregistré.</td></tr>`;
        return;
    }

    const sortedList = [...list].reverse();

    sortedList.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors border-b text-xs';
        const type = clientSupplierMode === 'client' ? 'Client' : 'Fournisseur';

        tr.innerHTML = `
                    <td class="p-2 font-medium text-gray-700 dark:text-gray-200" data-label="Type">${type}</td>
                    <td class="p-2 flex items-center gap-2" data-label="Nom">
                        ${entry.logo ? `<img src='${entry.logo}' class='h-6 w-6 object-contain border rounded'/>` : '<span class="text-gray-400">-</span>'}
                        <span class="font-semibold text-purple-600 dark:text-purple-400">${entry.name}</span>
                    </td>
                    <td class="p-2 text-gray-600 dark:text-gray-300" data-label="Téléphone">${entry.phone || '-'}</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300 truncate" title="${entry.address || '-'}" data-label="Adresse">${entry.address || '-'}</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300 text-center text-xs" data-label="ID">ID: ${entry.id}</td>
                    <td class="p-2 flex gap-2 justify-center" data-label="Actions">
                        <button onclick="editClientSupplier('${entry.id}')" class="text-blue-500 hover:text-blue-700 dark:text-blue-400" title="Modifier"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteClientSupplier('${entry.id}')" class="text-red-500 hover:text-red-700 dark:text-red-400" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

window.editClientSupplier = function (id) {
    let list = clientSupplierMode === 'client' ? clients : suppliers;
    const entry = list.find(x => x.id == id);
    if (!entry) return;

    document.getElementById('client-id').value = entry.id;
    document.getElementById('client-name-input').value = entry.name;
    document.getElementById('client-phone-input').value = entry.phone || '';
    document.getElementById('client-address-input').value = entry.address || '';
    document.getElementById('client-logo-preview').innerHTML = entry.logo ? `<img src='${entry.logo}' class='h-12 w-12 object-contain border rounded'/>` : '';
    document.getElementById('client-logo-preview').dataset.logo = entry.logo || '';
}

window.deleteClientSupplier = function (id) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (!confirm(`Supprimer ce ${clientSupplierMode === 'client' ? 'client' : 'fournisseur'} ?`)) return;
    let list = clientSupplierMode === 'client' ? clients : suppliers;
    list = list.filter(x => x.id != id);
    if (clientSupplierMode === 'client') clients = list;
    else suppliers = list;
    saveClientsSuppliers();
    saveData();
    renderClientSupplierList();
}

function getLogoForInvoice(name, type) {
    // type: 'sale'/'quote' => client, 'purchase' => fournisseur
    if (type === 'purchase') {
        const found = suppliers.find(s => s.name === name);
        return found && found.logo ? found.logo : '';
    } else {
        const found = clients.find(c => c.name === name);
        return found && found.logo ? found.logo : '';
    }
}

window.addClient = function (e) {
    e.preventDefault();
    const id = document.getElementById('client-id').value ? parseInt(document.getElementById('client-id').value) : null;
    const name = document.getElementById('client-name-input').value;
    const phone = document.getElementById('client-phone-input').value;
    const address = document.getElementById('client-address-input').value;

    if (id) {
        // Modification
        const index = clients.findIndex(c => c.id === id);
        if (index !== -1) {
            clients[index] = {
                id,
                name,
                phone,
                address
            };
        }
    } else {
        // Ajout
        const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;
        clients.push({
            id: newId,
            name,
            phone,
            address
        });
    }

    document.getElementById('clientForm').reset();
    document.getElementById('client-id').value = '';
    saveData();
    document.getElementById('client-name-input').focus();
}

function renderClients() {
    renderClientSupplierList();
    const datalist = document.getElementById('client-names-datalist');
    if (datalist) datalist.innerHTML = clients.map(c => `<option value="${c.name}">`).join('');
}

window.editClient = function (id) {
    setClientMode('client');
    editClientSupplier(id);
    switchTab('clients');
    switchSubTab('subtab-clients');
    document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
}

window.deleteClient = function (id) {
    setClientMode('client');
    deleteClientSupplier(id);
}

// Synchroniser le client sélectionné dans la modal de facture
document.addEventListener('input', (e) => {
    if (e.target.id === 'client-name') {
        const clientName = e.target.value;
        const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (client) {
            document.getElementById('client-phone').value = client.phone || '';
            // Display client logo
            const logoContainer = document.getElementById('client-logo-container');
            if (logoContainer) {
                logoContainer.innerHTML = '';
                if (client.logo) {
                    logoContainer.innerHTML = `<img src="${client.logo}" class="h-16 w-16 object-contain border rounded" style="margin-bottom: 10px;">`;
                }
            }
        }
    }
});

// --- GESTION DEVIS ---

function renderQuotes() {
    const tbody = document.getElementById('quotesTableBody');
    tbody.innerHTML = '';

    // Filter by Year first
    const yearFiltered = filterByContextYear(quotes);

    const sortedQuotes = yearFiltered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedQuotes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400 italic">Aucun devis enregistré.</td></tr>`;
        return;
    }

    sortedQuotes.forEach(q => {
        const tr = document.createElement('tr');
        const date = new Date(q.date).toLocaleDateString('fr-FR');
        const time = new Date(q.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const clientDisplay = q.clientName || 'N/A';

        tr.className = "hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b text-xs";
        tr.innerHTML = `
                    <td class="p-2 font-medium text-gray-700 dark:text-gray-200" data-label="Date">${date}</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300" data-label="Heure">${time}</td>
                    <td class="p-2 font-semibold text-blue-600 dark:text-blue-400" data-label="Client">${clientDisplay}</td>
                    <td class="p-2 text-right font-bold text-blue-600 dark:text-blue-400" data-label="Total">${q.total.toLocaleString()} FCFA</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300" data-label="Articles">${q.items ? q.items.length : 0} art.</td>
                    <td class="p-2 text-gray-600 dark:text-gray-300 truncate" title="${q.items ? q.items.map(i => i.name).join(', ') : '-'}" data-label="Liste">${q.items ? q.items.map(i => i.name).join(', ') : '-'}</td>
                    <td class="p-2 flex gap-2 justify-center" data-label="Actions">
                        <button onclick="prepareInvoice(${q.id}, 'quote')" class="text-blue-500 hover:text-blue-700 dark:text-blue-400" title="Voir PDF"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="loadQuoteToCart(${q.id})" class="text-green-500 hover:text-green-700 dark:text-green-400" title="Charger en vente"><i class="fas fa-cart-arrow-down"></i></button>
                        <button onclick="deleteQuoteRecord(${q.id})" class="text-red-500 hover:text-red-700 dark:text-red-400" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

function prepareExpensePurchaseInvoice(expenseId) {
    const exp = expenses.find(x => x.id === expenseId);
    if (!exp || exp.type !== 'purchase') return alert('Facture d\'achat introuvable.');

    currentInvoiceData = {
        ...exp,
        invoiceType: 'purchase'
    };

    const docRef = `FAC-ACHAT-${exp.id.toString().slice(-6)}`;

    document.getElementById('invoice-doc-type').innerText = 'éditeur de Facture d\'Achat';
    document.getElementById('invoice-type-title').innerText = 'FACTURE D\'ACHAT';
    document.getElementById('download-pdf-btn-text').innerText = 'Télécharger Facture d\'Achat PDF';
    document.getElementById('invoice-ref').value = docRef;
    document.getElementById('invoice-date').valueAsDate = new Date(exp.date);

    // Supplier/Client data
    document.getElementById('client-name').value = exp.supplier || 'Fournisseur';
    document.getElementById('client-phone').value = exp.supplier || '';

    // Build a single-line item for the purchase invoice
    const tbody = document.getElementById('invoice-items-body');
    tbody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.className = "border-b border-gray-100 dark:border-gray-700/50";
    tr.innerHTML = `
                <td class="text-center py-2 text-gray-400">1</td>
                <td class="text-left font-medium text-gray-800 dark:text-white">${exp.productName || exp.category}</td>
                <td class="text-center font-mono">1 lot</td>
                <td class="text-right font-mono">${(exp.amount || 0).toLocaleString()}</td>
                <td class="text-right font-bold text-brand font-mono">${(exp.amount || 0).toLocaleString()}</td>
            `;
    tbody.appendChild(tr);

    document.getElementById('invoice-subtotal').innerText = (exp.amount || 0).toLocaleString() + ' FCFA';
    document.getElementById('invoice-total').innerText = (exp.amount || 0).toLocaleString() + ' FCFA';

    // Hide save button for purchase invoices (read-only)
    const saveBtn = document.getElementById('invoice-save-btn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }

    openModal('modalInvoice');
}

window.generateExpensePurchasePDF = function (expenseId) {
    const exp = expenses.find(x => x.id === expenseId);
    if (!exp || exp.type !== 'purchase') return alert('Facture d\'achat introuvable.');

    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    const docRef = `FAC-ACHAT-${exp.id.toString().slice(-6)}`;
    const docDate = new Date(exp.date).toLocaleDateString('fr-FR');
    const supplier = exp.supplier || 'Fournisseur';
    const totalAmount = exp.amount || 0;

    // ===== EN-TéTE =====
    // LOGO (Hauteur: 25mm)
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // INFO ENTREPRISE (é gauche du logo)
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(companyInfo.name, 47, y + 3);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 9;
    contactLines.forEach(line => {
        doc.text(line, 47, contactY);
        contactY += 4;
    });

    // TITRE DOCUMENT (é droite)
    doc.setFontSize(24);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("FACTURE D'ACHAT", pageWidth - 15, y + 10, {
        align: 'right'
    });

    // DATE & RéF (é droite)
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${docDate}`, pageWidth - 15, y + 18, {
        align: 'right'
    });

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(`Réf: ${docRef}`, pageWidth - 15, y + 25, {
        align: 'right'
    });

    // ===== BLOC FOURNISSEUR =====
    const supplierBoxY = y + 35;
    doc.setFillColor(245, 250, 245);
    doc.rect(120, supplierBoxY, 75, 28, 'F');

    doc.setFontSize(8);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("FOURNISSEUR", 125, supplierBoxY + 5);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    const supplierLines = doc.splitTextToSize(supplier, 60);
    doc.text(supplierLines, 125, supplierBoxY + 11);

    // ===== TABLEAU ARTICLES =====
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    // Single item for purchase invoice
    const body = [
        [
            '1',
            exp.productName || exp.category,
            '1 lot',
            sanitizeNumber(totalAmount) + ' F',
            sanitizeNumber(totalAmount) + ' F'
        ]
    ];

    // Add transport if present
    if (exp.transportCost != null && exp.transportCost > 0) {
        body.push([
            '',
            `Frais de transport`,
            '',
            '',
            sanitizeNumber(exp.transportCost) + ' F'
        ]);
    }

    // Add loss percentage info
    if (exp.lossPercentage != null && exp.lossPercentage > 0) {
        body.push([
            '',
            `Perte (${exp.lossPercentage}%)`,
            '',
            '',
            '0 F'
        ]);
    }

    doc.autoTable({
        startY: supplierBoxY + 33,
        head: [
            ['#', 'Description', 'Qté', 'Prix U.', 'Total']
        ],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            0: {
                halign: 'center',
                valign: 'middle',
                cellWidth: 10
            },
            1: {
                halign: 'left',
                valign: 'middle'
            },
            2: {
                halign: 'center',
                valign: 'middle',
                cellWidth: 20
            },
            3: {
                halign: 'right',
                valign: 'middle',
                cellWidth: 25
            },
            4: {
                halign: 'right',
                valign: 'middle',
                fontStyle: 'bold',
                textColor: [31, 122, 62],
                cellWidth: 25
            },
        },
        margin: {
            left: 15,
            right: 15
        }
    });

    // ===== BLOC TOTAL =====
    const totalBoxY = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(245, 250, 245);
    doc.rect(pageWidth - 90, totalBoxY, 75, 26, 'F');

    // Ligne "Total HT"
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("Total HT", pageWidth - 85, totalBoxY + 6);
    doc.text(sanitizeNumber(totalAmount) + ' FCFA', pageWidth - 20, totalBoxY + 6, {
        align: 'right'
    });

    // Ligne "Net é Payer"
    doc.setFontSize(12);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("Net é Payer", pageWidth - 85, totalBoxY + 16);
    doc.text(sanitizeNumber(totalAmount) + ' FCFA', pageWidth - 20, totalBoxY + 16, {
        align: 'right'
    });

    // ===== SIGNATURES & PIED DE PAGE =====
    // Ligne de séparation
    doc.setDrawColor(200);
    doc.line(15, pageHeight - 65, pageWidth - 15, pageHeight - 65);

    // Signatures
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');

    // Signature Fournisseur (gauche)
    doc.text("Signature Fournisseur", 30, pageHeight - 60, {
        align: 'center'
    });
    doc.setDrawColor(200);
    doc.line(15, pageHeight - 55, 45, pageHeight - 55);

    // Signature Acheteur (droite)
    doc.text("Signature Acheteur", pageWidth - 30, pageHeight - 60, {
        align: 'center'
    });
    doc.line(pageWidth - 45, pageHeight - 55, pageWidth - 15, pageHeight - 55);

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(undefined, 'normal');
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 10, {
        align: 'center'
    });

    doc.save(`FACTURE_ACHAT_${docRef}.pdf`);
}

// Production & Recipes module removed

window.deleteQuoteRecord = function (id) {
    if (isReadOnlyUser()) {
        showToast("Accès en lecture seule : opération non autorisée.", "error");
        return;
    }
    if (confirm("Supprimer ce devis ?")) {
        quotes = quotes.filter(q => q.id !== id);
        saveData();
    }
}


// --- GESTION FACTURE / DEVIS (Modal) ---

function handleDownloadPDF() {
    if (currentInvoiceData && currentInvoiceData.invoiceType === 'purchase') {
        generateExpensePurchasePDF(currentInvoiceData.id);
    } else {
        generateInvoicePDF();
    }
}

function prepareInvoice(recordId, type) {
    const r = type === 'sale' ? dailyRecords.find(x => x.id === recordId) : quotes.find(x => x.id === recordId);
    if (!r) return;

    currentInvoiceData = r;
    currentInvoiceData.type = type; // Store the document type for later use
    const docType = type === 'sale' ? 'Facture' : 'Devis';
    const docRef = type === 'sale' ? `FAC-${r.id.toString().slice(-6)}` : `DEV-${r.id.toString().slice(-6)}`;

    document.getElementById('invoice-doc-type').innerText = `éditeur de ${docType}`;
    document.getElementById('invoice-type-title').innerText = docType.toUpperCase();
    document.getElementById('download-pdf-btn-text').innerText = `Télécharger ${docType} PDF`;
    document.getElementById('invoice-ref').value = docRef;
    document.getElementById('invoice-date').valueAsDate = new Date(r.date);

    // Client data
    document.getElementById('client-name').value = r.clientName || '';
    document.getElementById('client-phone').value = r.clientPhone || '';

    if (r.clientName) {
        const client = clients.find(c => c.name === r.clientName);
        if (client) {
            document.getElementById('client-phone').value = client.phone || r.clientPhone || '';
        }
    }

    // Client/Supplier logo (if exists)
    const contactLogo = getLogoForInvoice(r.clientName || '', type);
    const logoContainer = document.getElementById('client-logo-container');
    if (logoContainer) {
        logoContainer.innerHTML = '';
        if (contactLogo) {
            logoContainer.innerHTML = `<img src="${contactLogo}" class="h-16 w-16 object-contain border rounded" style="margin-bottom: 10px;">`;
        }
    }

    // En-téte entreprise
    document.getElementById('invoice-logo').src = localStorage.getItem(LOGO_KEY) || 'https://placehold.co/40x40/1f7a3e/white?text=S';
    // Build invoice table body
    const tbody = document.getElementById('invoice-items-body');
    tbody.innerHTML = '';
    let subtotal = 0;
    (currentInvoiceData.items || []).forEach((item, index) => {
        const total = (item.price || 0) * (item.qty || 0);
        subtotal += total;

        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 dark:border-gray-700/50";
        tr.innerHTML = `
                    <td class="text-center py-2 text-gray-400">${index + 1}</td>
                    <td class="text-left font-medium text-gray-800 dark:text-white">${item.name}</td>
                    <td class="text-center font-mono">${item.qty} ${item.saleUnit || 'Unit'}</td>
                    <td class="text-right font-mono">${(item.price || 0).toLocaleString()}</td>
                    <td class="text-right font-bold text-brand font-mono">${total.toLocaleString()}</td>
                `;
        tbody.appendChild(tr);
    });

    document.getElementById('invoice-subtotal').innerText = subtotal.toLocaleString() + ' FCFA';
    document.getElementById('invoice-total').innerText = subtotal.toLocaleString() + ' FCFA';
    // Show Save button for sales (enable edit) and hide for quotes; show PDF label accordingly
    const saveBtn = document.getElementById('invoice-save-btn');
    if (saveBtn) {
        if (type === 'sale') {
            saveBtn.classList.remove('hidden');
        } else {
            saveBtn.classList.add('hidden');
        }
    }
    openModal('modalInvoice');
}

window.generateInvoicePDF = function () {
    if (!currentInvoiceData) return alert("Aucune donnée de document é imprimer.");

    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    const docType = currentInvoiceData.type === 'sale' ? 'Facture' : 'Devis';
    const docRef = document.getElementById('invoice-ref').value;
    const docDate = document.getElementById('invoice-date').value;
    const clientName = document.getElementById('client-name').value || 'Client Non Spécifié';
    const clientPhone = document.getElementById('client-phone').value || '';
    const totalToPay = currentInvoiceData.total;

    // ===== EN-TéTE =====
    // LOGO (Hauteur: 25mm)
    const logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) {
        try {
            doc.addImage(logoData, 'JPEG', 15, y, 25, 25);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // Contact Logo (if exists) - next to company logo
    const contactLogo = getLogoForInvoice(clientName, currentInvoiceData.type || 'sale');
    if (contactLogo) {
        try {
            doc.addImage(contactLogo, 'JPEG', 50, y, 20, 20);
        } catch (e) {
            console.warn("Contact logo error", e);
        }
    }

    // INFO ENTREPRISE (é droite des logos)
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(companyInfo.name, 80, y + 3);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const contactLines = companyInfo.contact.split('\n');
    let contactY = y + 9;
    contactLines.forEach(line => {
        doc.text(line, 80, contactY);
        contactY += 4;
    });

    // TITRE DOCUMENT (é droite)
    doc.setFontSize(24);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text(docType.toUpperCase(), pageWidth - 15, y + 10, {
        align: 'right'
    });

    // DATE & RéF (é droite)
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${new Date(docDate).toLocaleDateString('fr-FR')}`, pageWidth - 15, y + 18, {
        align: 'right'
    });

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(`Réf: ${docRef}`, pageWidth - 15, y + 25, {
        align: 'right'
    });

    // ===== BLOC CLIENT =====
    const clientBoxY = y + 35;
    doc.setFillColor(245, 250, 245);
    doc.rect(120, clientBoxY, 75, 28, 'F');

    doc.setFontSize(8);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", 125, clientBoxY + 5);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    const nameLines = doc.splitTextToSize(clientName, 60);
    doc.text(nameLines, 125, clientBoxY + 11);

    doc.setFontSize(9);
    doc.text(clientPhone, 125, clientBoxY + 20);

    // ===== TABLEAU ARTICLES =====
    const sanitizeNumber = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const body = (currentInvoiceData.items || []).map((item, i) => [
        i + 1,
        item.name,
        `${item.qty} ${item.saleUnit || 'Unit'}`,
        sanitizeNumber(item.price) + ' F',
        sanitizeNumber(item.total) + ' F'
    ]);

    doc.autoTable({
        startY: clientBoxY + 33,
        head: [
            ['#', 'Description', 'Qté', 'Prix U.', 'Total']
        ],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            0: {
                halign: 'center',
                valign: 'middle',
                cellWidth: 10
            },
            1: {
                halign: 'left',
                valign: 'middle'
            },
            2: {
                halign: 'center',
                valign: 'middle',
                cellWidth: 20
            },
            3: {
                halign: 'right',
                valign: 'middle',
                cellWidth: 25
            },
            4: {
                halign: 'right',
                valign: 'middle',
                fontStyle: 'bold',
                textColor: [31, 122, 62],
                cellWidth: 25
            },
        },
        margin: {
            left: 15,
            right: 15
        }
    });

    // ===== BLOC TOTAL =====
    const totalBoxY = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(245, 250, 245);
    doc.rect(pageWidth - 90, totalBoxY, 75, 26, 'F');

    // Ligne "Total HT"
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("Total HT", pageWidth - 85, totalBoxY + 6);
    doc.text(sanitizeNumber(totalToPay) + ' FCFA', pageWidth - 20, totalBoxY + 6, {
        align: 'right'
    });

    // Ligne "Net é Payer"
    doc.setFontSize(12);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("Net é Payer", pageWidth - 85, totalBoxY + 16);
    doc.text(sanitizeNumber(totalToPay) + ' FCFA', pageWidth - 20, totalBoxY + 16, {
        align: 'right'
    });

    // ===== SIGNATURES & PIED DE PAGE =====
    // Ligne de séparation
    doc.setDrawColor(200);
    doc.line(15, pageHeight - 65, pageWidth - 15, pageHeight - 65);

    // Signatures
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');

    // Signature Client (gauche)
    doc.text("Signature Client", 30, pageHeight - 60, {
        align: 'center'
    });
    doc.setDrawColor(200);
    doc.line(15, pageHeight - 55, 45, pageHeight - 55);

    // Signature Vendeur (droite)
    doc.text("Signature Vendeur", pageWidth - 30, pageHeight - 60, {
        align: 'center'
    });
    doc.line(pageWidth - 45, pageHeight - 55, pageWidth - 15, pageHeight - 55);

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(undefined, 'normal');
    doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 10, {
        align: 'center'
    });

    doc.save(`${docType}_${docRef}.pdf`);
}

window.printOrderFromSale = function (recordId) {
    const sale = dailyRecords.find(r => r.id === recordId);
    if (!sale) return alert("Vente introuvable.");

    // Récupérer le logo du client s'il existe (recherche insensible é la casse et aux espaces)
    const clientNameKey = (sale.clientName || '').toString().trim().toLowerCase();
    const client = clients.find(c => (c.name || '').toString().trim().toLowerCase() === clientNameKey);
    const clientLogo = client && client.logo ? client.logo : '';

    currentOrderData = {
        ...sale,
        orderNumber: `CMD-${sale.id.toString().slice(-6)}`,
        orderDate: new Date(sale.date).toISOString().split('T')[0],
        clientLogo: clientLogo // Sauvegarder le logo du client
    };

    // Remplir le modal
    document.getElementById('order-number').value = currentOrderData.orderNumber;
    document.getElementById('order-date').value = currentOrderData.orderDate;
    document.getElementById('order-client-name').value = sale.clientName || '';
    document.getElementById('order-client-phone').value = sale.clientPhone || '';

    // Logo entreprise
    const companyLogoData = localStorage.getItem(LOGO_KEY);
    if (companyLogoData) {
        document.getElementById('order-company-logo').src = companyLogoData;
    }

    // Logo client
    const clientLogoImg = document.getElementById('order-client-logo');
    console.log('DEBUG: clientLogo for sale', sale.id, clientLogo);
    currentOrderData.clientLogo = clientLogo; // ensure it's set
    console.log('DEBUG: currentOrderData.clientLogo', currentOrderData.clientLogo);
    if (clientLogo) {
        clientLogoImg.src = clientLogo;
        clientLogoImg.style.display = 'block';
    } else {
        clientLogoImg.style.display = 'none';
    }

    // Infos entreprise
    document.getElementById('order-company-info').innerHTML = `
                <p>${companyInfo.name}</p>
                ${companyInfo.contact.split('\n').map(line => `<p>${line}</p>`).join('')}
            `;

    // Tableau articles
    const tbody = document.getElementById('order-items-body');
    tbody.innerHTML = '';
    (sale.items || []).forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 dark:border-gray-700/50";
        tr.innerHTML = `
                    <td class="text-center py-2 text-gray-400">${i + 1}</td>
                    <td class="text-left font-medium text-gray-800 dark:text-white">${item.name}</td>
                    <td class="text-center font-mono">${item.qty}</td>
                    <td class="text-center font-mono">${item.saleUnit || 'Unit'}</td>
                `;
        tbody.appendChild(tr);
    });

    // Footer
    document.getElementById('order-footer').innerText = companyInfo.footer || 'Merci de votre confiance !';

    openModal('modalOrderPreview');
}

window.downloadOrderPDF = function () {
    if (!currentOrderData) return alert("Aucune commande é imprimer.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a5'); // Landscape, A5 format
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 12;

    const orderNumber = document.getElementById('order-number').value;
    const orderDate = document.getElementById('order-date').value;
    const clientName = document.getElementById('order-client-name').value;
    const clientPhone = document.getElementById('order-client-phone').value;
    const clientLogoSrc = currentOrderData.clientLogo || ''; // Utiliser le logo stocké dans currentOrderData

    // ===== EN-TéTE =====
    // Logo entreprise
    const companyLogoData = localStorage.getItem(LOGO_KEY);
    if (companyLogoData) {
        try {
            // Detecter le format é partir du dataURL
            let compFormat = 'PNG';
            if (companyLogoData.indexOf('data:image/jpeg') === 0 || companyLogoData.indexOf('data:image/jpg') === 0) compFormat = 'JPEG';
            else if (companyLogoData.indexOf('data:image/png') === 0) compFormat = 'PNG';
            else if (companyLogoData.indexOf('data:image/gif') === 0) compFormat = 'GIF';
            doc.addImage(companyLogoData, compFormat, 12, y, 18, 18);
        } catch (e) {
            console.warn("Logo error", e);
        }
    }

    // Titre entreprise
    doc.setFontSize(11);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text(companyInfo.name, pageWidth / 2, y + 4, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text("COMMANDE", pageWidth / 2, y + 9, { align: 'center' });

    // Né et Date
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(`Né : ${orderNumber}`, pageWidth - 15, y + 2, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text(`Date : ${new Date(orderDate).toLocaleDateString('fr-FR')}`, pageWidth - 15, y + 7, { align: 'right' });

    // Infos client
    y += 22;
    if (clientLogoSrc) {
        try {
            // Déterminer le format du logo (PNG, JPEG, etc.)
            let imageFormat = 'PNG';
            if (clientLogoSrc.includes('data:image/jpeg')) {
                imageFormat = 'JPEG';
            } else if (clientLogoSrc.includes('data:image/png')) {
                imageFormat = 'PNG';
            } else if (clientLogoSrc.includes('data:image/gif')) {
                imageFormat = 'GIF';
            }
            doc.addImage(clientLogoSrc, imageFormat, 12, y, 12, 12);
        } catch (e) {
            console.warn("Client logo error", e);
        }
    }
    doc.setFontSize(8);
    doc.setTextColor(31, 122, 62);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", clientLogoSrc ? 28 : 12, y + 2);

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    doc.text(clientName, clientLogoSrc ? 28 : 12, y + 8);
    if (clientPhone) {
        doc.text(clientPhone, clientLogoSrc ? 28 : 12, y + 13);
    }

    // ===== TABLEAU COMMANDE =====
    y += 18;
    const body = (currentOrderData.items || []).map((item, i) => [
        i + 1,
        item.name,
        `${item.qty}`,
        item.saleUnit || 'Unit'
    ]);

    doc.autoTable({
        startY: y,
        head: [['#', 'Produit', 'Qté', 'Unité']],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: [31, 122, 62],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 8,
            halign: 'left',
            valign: 'middle'
        },
        columnStyles: {
            0: {
                halign: 'center',
                cellWidth: 8
            },
            1: {
                halign: 'left',
                cellWidth: 55
            },
            2: {
                halign: 'center',
                cellWidth: 15
            },
            3: {
                halign: 'center',
                cellWidth: 20
            }
        },
        margin: { left: 12, right: 12 },
        didDrawPage: function () {
            // Footer
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(companyInfo.footer, pageWidth / 2, pageHeight - 6, { align: 'center' });
        }
    });

    doc.save(`${orderNumber}.pdf`);
}

// CSV & Excel import functionality removed from this file. To re-enable, use the import functions in `stock.html` or restore a previous commit.


// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Charger depuis Dexie d'abord pour synchronisation entre pages
    await loadDataFromDexieIfAvailable();
    // Ensuite charger depuis localStorage (cache)
    loadData();
    loadClientsSuppliers();
    initTheme();
    applyThemeColor();

    updateCompanyDisplays();
    renderProductTiles();
    renderInventory(); // rendre l'inventaire visible au chargement
    renderDailyHistory();
    renderExpenses();
    renderIncome(); // NOUVEAU
    renderClientSupplierList();
    updateStats();
    updateCharts();
    // recipes/productions module removed, no rendering
    renderCart();
    // Initialize client mode buttons
    setClientMode('client');
    switchTab('stock'); // Afficher l'onglet stock par défaut

    // NOUVEAU: Initialiser la date d'aujourd'hui pour le formulaire de rentrée d'argent
    const today = new Date().toISOString().split('T')[0];
    const incomeDate = document.getElementById('income-date');
    if (incomeDate) incomeDate.value = today;

    // Apply glass styling and set up observers


    // Re-apply when preference changes



    // Re-render expenses on window resize to adapt mobile/table view
    let __resizeTimeoutExpenses = null;
    window.addEventListener('resize', () => {
        clearTimeout(__resizeTimeoutExpenses);
        __resizeTimeoutExpenses = setTimeout(() => {
            try {
                renderExpenses();
            } catch (e) { }
        }, 150);
    });
    // Initialize backup scheduler
    try {
        initBackupScheduler();
    } catch (e) {
        console.warn('initBackupScheduler error', e);
    }

    // Update order preview logo when user changes client name in the preview
    const orderClientNameEl = document.getElementById('order-client-name');
    if (orderClientNameEl) {
        orderClientNameEl.addEventListener('input', (ev) => {
            const name = (ev.target.value || '').toString().trim().toLowerCase();
            const found = clients.find(c => (c.name || '').toString().trim().toLowerCase() === name);
            const clientLogoImg = document.getElementById('order-client-logo');
            if (found && found.logo) {
                currentOrderData = currentOrderData || {};
                currentOrderData.clientLogo = found.logo;
                clientLogoImg.src = found.logo;
                clientLogoImg.style.display = 'block';
            } else {
                if (currentOrderData) currentOrderData.clientLogo = '';
                if (clientLogoImg) clientLogoImg.style.display = 'none';
            }
        });
    }
    // --- AMELIORATION: FONCTION TOAST ---
    function showToast(message, type = 'success') {
        // Créer l'élément si n'existe pas
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;

        // Icône selon le type
        const icon = type === 'error'
            ? '<i class="fa-solid fa-circle-exclamation"></i>'
            : '<i class="fa-solid fa-check-circle"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);

        // Animation Entrée
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Suppression Automatique après 3 secondes
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ============= MIGRATION TEST FUNCTIONS (pour scripts.js - stock.html) =============

    async function testMigrationStock() {
        try {
            const nativeCount = window.localStorage.length || 0;
            const dexieCount = await db.inventory.count();
            const settingsCount = await sharedDb.appSettings.count();

            let html = '<div class="success">✅ Rapport Migration (Stock):</div><br>';
            html += `<strong>localStorage natif:</strong> ${nativeCount} clés<br>`;
            html += `<strong>Dexie StockExpertDB (inventory):</strong> ${dexieCount} entrées<br>`;
            html += `<strong>SharedSettingsDB:</strong> ${settingsCount} entrées<br>`;

            if ((nativeCount > 0 || dexieCount > 0) && settingsCount > 0) {
                html += '<p style="color: green; font-weight: bold;">✓ Migration Stock semble complète!</p>';
            } else if (nativeCount > 0 && (dexieCount === 0 || settingsCount === 0)) {
                html += '<p style="color: orange;">⚠️ Données native trouvées mais Dexie partiellement vide. Rechargez la page pour déclencher la migration.</p>';
            } else {
                html += '<p style="color: blue;">ℹ️ Pas de données à migrer (ou déjà migrées).</p>';
            }

            console.log('✅ Migration Test Stock:', { nativeCount, dexieCount, settingsCount });
            showToast('Migration vérifiée - Voir console', 'success');
        } catch (err) {
            console.error('❌ Erreur migration test:', err);
            showToast('Erreur: ' + err.message, 'error');
        }
    }

    async function simulateOldDataStock() {
        try {
            // Référence au localStorage natif
            const nativeStorage = window.localStorage;

            // Ajouter des données de test stock
            const testInventory = [
                { id: 1, name: 'Farine', category: 'Matière Première', quantity: 100, unit: 'kg', costPrice: 500, salePrice: 750 },
                { id: 2, name: 'Sucre', category: 'Matière Première', quantity: 50, unit: 'kg', costPrice: 400, salePrice: 600 }
            ];

            nativeStorage.setItem('stock_expert_inventory_v3', JSON.stringify(testInventory));
            nativeStorage.setItem('stock_expert_theme_color', '#1f7a3e');
            nativeStorage.setItem('stock_expert_logo', 'data:image/png;base64,iVBORw0KGgo...');
            nativeStorage.setItem('stock_expert_company', 'Test Company');

            showToast('✅ Données de test stock ajoutées au localStorage natif! Rechargez la page.', 'success');
            console.log('✅ Données test stock ajoutées:', testInventory);
        } catch (err) {
            console.error('❌ Erreur simulation:', err);
            showToast('Erreur: ' + err.message, 'error');
        }
    }

    async function clearDexieStock() {
        try {
            await db.inventory.clear();
            await db.dailyRecords.clear();
            await db.expenses.clear();
            await db.income.clear();
            await db.clients.clear();
            await db.suppliers.clear();
            await db.quotes.clear();

            showToast('✅ Dexie StockExpertDB complètement effacé!', 'success');
            console.log('✅ Dexie stock vidé');
        } catch (err) {
            console.error('❌ Erreur clear:', err);
            showToast('Erreur: ' + err.message, 'error');
        }
    }

    // ============= FIN MIGRATION TEST FUNCTIONS =============
});




