/**
 * Dexie.js Database Configuration - UNIFIED
 * Une seule base de données unifiée : StockExpertDB
 * Contient :
 * - Tables pour stock.html (inventaire, factures, clients, etc.)
 * - Table appSettings pour les paramètres (logo, couleur, entreprise, backup)
 * - Base RH pour index.html (employés, pointage, paie)
 */

// === BASE UNIFIÉE (stock.html + index.html + paramètres partagés) ===
const db = new Dexie('StockExpertDB');

// Configuration Firebase globale utilisée par l'adaptateur de synchronisation.
// Le projet charge des scripts classiques dans le navigateur, donc on expose
// la config sur window au lieu d'utiliser des imports ES modules ici.
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
    apiKey: "AIzaSyAa1UIZm1DtzTmP2kJk9LM8Gn5iJIK_Z1E",
    authDomain: "echo-gestion-d2fd2.firebaseapp.com",
    projectId: "echo-gestion-d2fd2",
    storageBucket: "echo-gestion-d2fd2.firebasestorage.app",
    messagingSenderId: "959654285593",
    appId: "1:959654285593:web:8920fd9218b866150d3588"
};

// Configuration pour restreindre la connexion Microsoft à votre entreprise uniquement
// Remplacez "VOTRE_TENANT_ID_ICI" par l'ID de l'annuaire (tenant) Azure AD ou le domaine d'annuaire (ex: "votreentreprise.onmicrosoft.com")
window.MICROSOFT_TENANT_ID = "d64f809a-e0da-4724-abb6-6f2aac3bdef9"; 

// Liste des domaines e-mails autorisés (ex: ["votreentreprise.com"]) pour double validation
window.ALLOWED_EMAIL_DOMAINS = ["echosdechezmoi.com"];

// Activer/Désactiver la vérification obligatoire de l'adresse e-mail par Firebase
// Mis à false : le compte admin a été recréé dans Firebase Console (emailVerified=false par défaut).
// Remettre à true une fois connecté et le compte correctement vérifié.
window.REQUIRE_EMAIL_VERIFICATION = false;



db.version(2).stores({
    // Tables Stock
    inventory: '&id, name, category, type',
    dailyRecords: '&id, date, clientName',
    expenses: '&id, date',
    clients: '&id, name',
    suppliers: '&id, name',
    quotes: '&id, id, clientName, date',
    income: '&id, date',
    productions: '&id, date',
    rawMaterials: '&id, date',
    
    // Table Paramètres partagés (anciennement SharedSettingsDB)
    appSettings: '&key, timestamp',
    
    // Tables RH (index.html)
    rhAppData: '&key',
    
    // Table Utilisateurs (Login hybride)
    userAccounts: '&uid, email, role, status'
});

/**
 * Wrapper pour les paramètres (appSettings)
 * Utilise la table appSettings dans la base unifiée StockExpertDB
 * Compatible avec localStorage.getItem(key), setItem(key, value), removeItem(key), clear()
 */
const dbStorage = {
    getItem: async (key) => {
        try {
            const item = await db.appSettings.get(key);
            return item ? item.value : null;
        } catch (err) {
            console.warn(`DB getItem error for key "${key}":`, err);
            return null;
        }
    },

    setItem: async (key, value) => {
        try {
            await db.appSettings.put({ key, value, timestamp: Date.now() });
        } catch (err) {
            console.error(`DB setItem error for key "${key}":`, err);
        }
    },

    removeItem: async (key) => {
        try {
            await db.appSettings.delete(key);
        } catch (err) {
            console.warn(`DB removeItem error for key "${key}":`, err);
        }
    },

    clear: async () => {
        try {
            await db.appSettings.clear();
        } catch (err) {
            console.error('DB clear error:', err);
        }
    },

    getAllSettings: async () => {
        try {
            return await db.appSettings.toArray();
        } catch (err) {
            console.error('DB getAllSettings error:', err);
            return [];
        }
    }
};

/**
 * Méthodes pour gérer les tables principales
 */
const dbInventory = {
    getAll: async () => await db.inventory.toArray(),
    get: async (id) => await db.inventory.get(id),
    put: async (item) => await db.inventory.put(item),
    bulkPut: async (items) => await db.inventory.bulkPut(items),
    delete: async (id) => await db.inventory.delete(id),
    clear: async () => await db.inventory.clear(),
    where: (field) => db.inventory.where(field)
};

const dbDailyRecords = {
    getAll: async () => await db.dailyRecords.toArray(),
    get: async (id) => await db.dailyRecords.get(id),
    put: async (item) => await db.dailyRecords.put(item),
    bulkPut: async (items) => await db.dailyRecords.bulkPut(items),
    delete: async (id) => await db.dailyRecords.delete(id),
    clear: async () => await db.dailyRecords.clear(),
    where: (field) => db.dailyRecords.where(field)
};

const dbExpenses = {
    getAll: async () => await db.expenses.toArray(),
    get: async (id) => await db.expenses.get(id),
    put: async (item) => await db.expenses.put(item),
    bulkPut: async (items) => await db.expenses.bulkPut(items),
    delete: async (id) => await db.expenses.delete(id),
    clear: async () => await db.expenses.clear(),
    where: (field) => db.expenses.where(field)
};

const dbClients = {
    getAll: async () => await db.clients.toArray(),
    get: async (id) => await db.clients.get(id),
    put: async (item) => await db.clients.put(item),
    bulkPut: async (items) => await db.clients.bulkPut(items),
    delete: async (id) => await db.clients.delete(id),
    clear: async () => await db.clients.clear(),
    where: (field) => db.clients.where(field)
};

const dbSuppliers = {
    getAll: async () => await db.suppliers.toArray(),
    get: async (id) => await db.suppliers.get(id),
    put: async (item) => await db.suppliers.put(item),
    bulkPut: async (items) => await db.suppliers.bulkPut(items),
    delete: async (id) => await db.suppliers.delete(id),
    clear: async () => await db.suppliers.clear(),
    where: (field) => db.suppliers.where(field)
};

const dbQuotes = {
    getAll: async () => await db.quotes.toArray(),
    get: async (id) => await db.quotes.get(id),
    put: async (item) => await db.quotes.put(item),
    bulkPut: async (items) => await db.quotes.bulkPut(items),
    delete: async (id) => await db.quotes.delete(id),
    clear: async () => await db.quotes.clear(),
    where: (field) => db.quotes.where(field)
};

const dbIncome = {
    getAll: async () => await db.income.toArray(),
    get: async (id) => await db.income.get(id),
    put: async (item) => await db.income.put(item),
    bulkPut: async (items) => await db.income.bulkPut(items),
    delete: async (id) => await db.income.delete(id),
    clear: async () => await db.income.clear(),
    where: (field) => db.income.where(field)
};

const dbProductions = {
    getAll: async () => await db.productions.toArray(),
    get: async (id) => await db.productions.get(id),
    put: async (item) => await db.productions.put(item),
    bulkPut: async (items) => await db.productions.bulkPut(items),
    delete: async (id) => await db.productions.delete(id),
    clear: async () => await db.productions.clear(),
    where: (field) => db.productions.where(field)
};

const dbRawMaterials = {
    getAll: async () => await db.rawMaterials.toArray(),
    get: async (id) => await db.rawMaterials.get(id),
    put: async (item) => await db.rawMaterials.put(item),
    bulkPut: async (items) => await db.rawMaterials.bulkPut(items),
    delete: async (id) => await db.rawMaterials.delete(id),
    clear: async () => await db.rawMaterials.clear(),
    where: (field) => db.rawMaterials.where(field)
};

/**
 * Wrapper pour la table RH (index.html)
 */
const dbRhData = {
    getAll: async () => await db.rhAppData.toArray(),
    get: async (key) => await db.rhAppData.get(key),
    put: async (item) => await db.rhAppData.put(item),
    bulkPut: async (items) => await db.rhAppData.bulkPut(items),
    delete: async (key) => await db.rhAppData.delete(key),
    clear: async () => await db.rhAppData.clear(),
    where: (field) => db.rhAppData.where(field)
};

/**
 * Wrapper pour la table Utilisateurs (index.html)
 */
const dbUserAccounts = {
    getAll: async () => await db.userAccounts.toArray(),
    get: async (uid) => await db.userAccounts.get(uid),
    put: async (item) => await db.userAccounts.put(item),
    bulkPut: async (items) => await db.userAccounts.bulkPut(items),
    delete: async (uid) => await db.userAccounts.delete(uid),
    clear: async () => await db.userAccounts.clear(),
    where: (field) => db.userAccounts.where(field)
};
