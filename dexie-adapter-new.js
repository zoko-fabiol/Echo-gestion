/**
 * Adapter Dexie pour les données principales (inventory, dailyRecords, expenses, etc.)
 * Ce fichier s'intercale entre storage-adapter.js et scripts.js
 */

// Variables globales pour stocker les données
let inventoryData = [];
let dailyRecordsData = [];
let expensesData = [];
let incomeData = [];
let productionsData = [];
let rawMaterialsData = [];
let clientsData = [];
let suppliersData = [];
let quotesData = [];

/**
 * Charger TOUTES les données depuis Dexie au démarrage
 */
async function loadAllDataFromDexie() {
    try {
        console.log('Loading data from Dexie...');
        
        inventoryData = await db.inventory.toArray();
        dailyRecordsData = await db.dailyRecords.toArray();
        expensesData = await db.expenses.toArray();
        incomeData = await db.income.toArray();
        productionsData = await db.productions.toArray();
        rawMaterialsData = await db.rawMaterials.toArray();
        clientsData = await db.clients.toArray();
        suppliersData = await db.suppliers.toArray();
        quotesData = await db.quotes.toArray();

        console.log('✓ All data loaded from Dexie');
        return true;
    } catch (err) {
        console.error('Error loading data from Dexie:', err);
        return false;
    }
}

/**
 * Sauvegarder inventory dans Dexie
 */
async function saveInventoryToDexie(inventoryArray) {
    try {
        if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
            await db.inventory.clear();
            await db.inventory.bulkPut(inventoryArray);
        }
    } catch (err) {
        console.error('Error saving inventory to Dexie:', err);
    }
}

/**
 * Sauvegarder dailyRecords dans Dexie
 */
async function saveDailyRecordsToDexie(recordsArray) {
    try {
        if (Array.isArray(recordsArray) && recordsArray.length > 0) {
            await db.dailyRecords.clear();
            await db.dailyRecords.bulkPut(recordsArray);
        }
    } catch (err) {
        console.error('Error saving daily records to Dexie:', err);
    }
}

/**
 * Sauvegarder expenses dans Dexie
 */
async function saveExpensesToDexie(expensesArray) {
    try {
        if (Array.isArray(expensesArray) && expensesArray.length > 0) {
            await db.expenses.clear();
            await db.expenses.bulkPut(expensesArray);
        }
    } catch (err) {
        console.error('Error saving expenses to Dexie:', err);
    }
}

/**
 * Sauvegarder clients dans Dexie
 */
async function saveClientsToDexie(clientsArray) {
    try {
        if (Array.isArray(clientsArray) && clientsArray.length > 0) {
            await db.clients.clear();
            await db.clients.bulkPut(clientsArray);
        }
    } catch (err) {
        console.error('Error saving clients to Dexie:', err);
    }
}

/**
 * Sauvegarder suppliers dans Dexie
 */
async function saveSupplierstoDexie(suppliersArray) {
    try {
        if (Array.isArray(suppliersArray) && suppliersArray.length > 0) {
            await db.suppliers.clear();
            await db.suppliers.bulkPut(suppliersArray);
        }
    } catch (err) {
        console.error('Error saving suppliers to Dexie:', err);
    }
}

/**
 * Sauvegarder quotes dans Dexie
 */
async function saveQuotesToDexie(quotesArray) {
    try {
        if (Array.isArray(quotesArray) && quotesArray.length > 0) {
            await db.quotes.clear();
            await db.quotes.bulkPut(quotesArray);
        }
    } catch (err) {
        console.error('Error saving quotes to Dexie:', err);
    }
}

/**
 * Sauvegarder income dans Dexie
 */
async function saveIncomeToDexie(incomeArray) {
    try {
        if (Array.isArray(incomeArray) && incomeArray.length > 0) {
            await db.income.clear();
            await db.income.bulkPut(incomeArray);
        }
    } catch (err) {
        console.error('Error saving income to Dexie:', err);
    }
}

/**
 * Sauvegarder productions dans Dexie
 */
async function saveProductionsToDexie(productionsArray) {
    try {
        if (Array.isArray(productionsArray) && productionsArray.length > 0) {
            await db.productions.clear();
            await db.productions.bulkPut(productionsArray);
        }
    } catch (err) {
        console.error('Error saving productions to Dexie:', err);
    }
}

/**
 * Sauvegarder rawMaterials dans Dexie
 */
async function saveRawMaterialsToDexie(rawMaterialsArray) {
    try {
        if (Array.isArray(rawMaterialsArray) && rawMaterialsArray.length > 0) {
            await db.rawMaterials.clear();
            await db.rawMaterials.bulkPut(rawMaterialsArray);
        }
    } catch (err) {
        console.error('Error saving raw materials to Dexie:', err);
    }
}

/**
 * Initialiser les données au démarrage (après DOMContentLoaded)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Attendre que storage-adapter initialise le cache
    setTimeout(async () => {
        await loadAllDataFromDexie();
        console.log('Dexie data adapter initialized');
    }, 100);
});
