/**
 * Middleware pour adapter localStorage à Dexie.js
 * Ce fichier doit être chargé AVANT scripts.js
 * 
 * MIGRATION: Si Dexie est vide, récupère les anciennes données du localStorage natif
 */

// Cache temporaire des valeurs en mémoire pour les accès synchrones rapides
const storageCache = new Map();
let dbInitialized = false;

// Sauvegarder le vrai localStorage natif AVANT de l'overwriter
const nativeLocalStorage = window.localStorage;
// Pré-remplir le cache mémoire à partir du localStorage natif **synchronement**
// afin que `localStorage.getItem()` (overridé) retourne immédiatement les valeurs
try {
    for (let i = 0; i < nativeLocalStorage.length; i++) {
        const k = nativeLocalStorage.key(i);
        try {
            const v = nativeLocalStorage.getItem(k);
            if (k) storageCache.set(k, v);
        } catch (e) {
            // ignore individual key read errors
        }
    }
    console.log('✓ storageCache pré-rempli depuis native localStorage (' + storageCache.size + ' entrées)');
} catch (e) {
    console.warn('Impossible de pré-remplir storageCache depuis native localStorage', e);
}
// Channel pour synchronisation entre onglets (préférer BroadcastChannel si disponible)
const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('stock_expert_sync') : null;

// Expose a helper to clean old sync keys from the native localStorage to free quota
window.cleanSyncLocalStorage = function() {
    try {
        let removed = 0;
        const keys = [];
        for (let i = 0; i < nativeLocalStorage.length; i++) keys.push(nativeLocalStorage.key(i));
        // Remove keys that start with _sync_
        for (const k of keys) {
            if (k && k.startsWith('_sync_')) {
                try {
                    nativeLocalStorage.removeItem(k);
                    removed++;
                } catch (e) {
                    // ignore individual removal errors
                }
            }
        }
        console.log(`cleanSyncLocalStorage: removed ${removed} _sync_ keys from native localStorage`);
        return removed;
    } catch (err) {
        console.warn('cleanSyncLocalStorage error', err);
        return 0;
    }
};

/**
 * Migre les données du localStorage natif vers Dexie si Dexie est vide
 * Appelée au premier chargement pour préserver les données des anciennes versions
 */
async function migrateFromNativeStorage() {
    try {
        console.log('🔄 Vérification migration données anciennes versions...');
        
        // Vérifier si Dexie est vide (première utilisation ou new version)
        const existingCount = await db.appSettings.count();
        if (existingCount > 0) {
            console.log('✓ SharedSettingsDB contient déjà des données, pas de migration');
            return { type: 'native', skipped: true, reason: 'appSettings exists' };
        }
        
        // Récupérer TOUTES les clés du localStorage natif
        const nativeKeys = [];
        for (let i = 0; i < nativeLocalStorage.length; i++) {
            nativeKeys.push(nativeLocalStorage.key(i));
        }
        
        if (nativeKeys.length === 0) {
            console.log('ℹ️ Aucune donnée ancienne dans le localStorage natif');
            return { type: 'native', skipped: true, reason: 'no native keys' };
        }
        
        console.log(`📦 Migration ${nativeKeys.length} clés depuis localStorage natif vers Dexie...`);
        
        // Migrer les paramètres partagés vers SharedSettingsDB
        const settingsKeys = [
            'stock_expert_logo',
            'stock_expert_theme_color',
            'stock_expert_company',
            'stock_expert_glass_enabled',
            'stock_expert_backup_schedule_v1',
            'stock_expert_theme',
            'stock_expert_glass_opacity'
        ];
        
        let settingsCopied = 0;
        for (const key of settingsKeys) {
            const value = nativeLocalStorage.getItem(key);
            if (value !== null) {
                await db.appSettings.put({ key, value, timestamp: Date.now() });
                console.log(`  ✓ Migré: ${key}`);
                settingsCopied++;
            }
        }
        
        // Migrer les données stock si elles existent
        const stockDataKeys = [
            'stock_expert_inventory_v3',
            'stock_expert_daily_records_v3',
            'stock_expert_expenses_v1',
            'stock_expert_clients_v1',
            'stock_expert_suppliers_v1',
            'stock_expert_quotes_v1',
            'stock_expert_income_v1'
        ];
        
        const stockCopied = {};
        for (const key of stockDataKeys) {
            const value = nativeLocalStorage.getItem(key);
            if (value !== null) {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) {
                        // Déterminer quelle table utiliser
                        if (key.includes('inventory')) {
                            await db.inventory.bulkPut(parsed);
                            stockCopied.inventory = (stockCopied.inventory || 0) + parsed.length;
                        } else if (key.includes('daily_records')) {
                            await db.dailyRecords.bulkPut(parsed);
                            stockCopied.dailyRecords = (stockCopied.dailyRecords || 0) + parsed.length;
                        } else if (key.includes('expenses')) {
                            await db.expenses.bulkPut(parsed);
                            stockCopied.expenses = (stockCopied.expenses || 0) + parsed.length;
                        } else if (key.includes('clients')) {
                            await db.clients.bulkPut(parsed);
                            stockCopied.clients = (stockCopied.clients || 0) + parsed.length;
                        } else if (key.includes('suppliers')) {
                            await db.suppliers.bulkPut(parsed);
                            stockCopied.suppliers = (stockCopied.suppliers || 0) + parsed.length;
                        } else if (key.includes('quotes')) {
                            await db.quotes.bulkPut(parsed);
                            stockCopied.quotes = (stockCopied.quotes || 0) + parsed.length;
                        }
                        console.log(`  ✓ Migré: ${key} (${parsed.length} items)`);
                    }
                } catch (e) {
                    console.warn(`  ⚠️ Erreur migration ${key}:`, e);
                }
            }
        }
        
        console.log('✅ Migration depuis localStorage natif terminée!');
        return { type: 'native', totalKeys: nativeKeys.length, settingsCopied, stockCopied };
        
    } catch (err) {
        console.error('❌ Erreur lors de la migration:', err);
        return { type: 'native', error: String(err) };
    }
}

/**
 * Migre les données depuis d'anciennes bases Dexie (SharedSettingsDB, RH_AppDB)
 * vers la base unifiée `db` sans supprimer les anciennes bases.
 */
async function migrateFromLegacyDexie() {
    try {
        if (typeof Dexie === 'undefined') return;
        // Liste des bases legacy à vérifier
        const legacyDBs = [
            { name: 'SharedSettingsDB', tables: ['appSettings'] },
            { name: 'RH_AppDB', tables: ['rhAppData'] }
        ];

        const legacySummary = {};
        for (const legacy of legacyDBs) {
            try {
                const exists = await Dexie.exists(legacy.name);
                if (!exists) continue;
                console.log(`🔁 Migration détectée: ancienne base '${legacy.name}' trouvée — copie en cours...`);

                const legacyDb = new Dexie(legacy.name);
                await legacyDb.open();

                legacySummary[legacy.name] = legacySummary[legacy.name] || {};
                for (const tbl of legacy.tables) {
                    if (!legacyDb[ tbl ]) continue;
                    const items = await legacyDb.table(tbl).toArray();
                    if (!items || items.length === 0) continue;

                    // Cible dans la nouvelle DB
                    let targetTable = null;
                    if (tbl === 'appSettings') targetTable = db.appSettings;
                    else if (tbl === 'rhAppData') targetTable = db.rhAppData;

                    if (!targetTable) continue;

                    // Pour chaque entrée, ne pas écraser si la clé existe déjà
                    let copied = 0;
                    for (const it of items) {
                        try {
                            // Détection clé possible: appSettings uses {key, value}, rhAppData uses {key, value}
                            const key = it.key || it.id || null;
                            if (key !== null) {
                                const existing = await targetTable.get(key);
                                if (existing) continue; // skip existing
                                await targetTable.put(it);
                                copied++;
                            } else {
                                // If no key, just bulk put (may generate duplicates)
                                await targetTable.put(it);
                                copied++;
                            }
                        } catch (e) {
                            console.warn(`Erreur lors de la copie d'une entrée (${legacy.name}.${tbl}):`, e);
                        }
                    }
                    console.log(`✅ Copiés ${copied} éléments de ${legacy.name}.${tbl} → base unifiée`);
                    legacySummary[legacy.name][tbl] = copied;
                }

                // Do not delete legacy DB - keep it for safety
                try { await legacyDb.close(); } catch(e){}
            } catch (e) {
                console.warn(`Erreur migration depuis ${legacy.name}:`, e);
            }
        }
        return { type: 'legacy', summary: legacySummary };
    } catch (err) {
        console.error('Erreur lors de la migration Dexie legacy:', err);
        return { type: 'legacy', error: String(err) };
    }
}

/**
 * Initialise la base de données et charge toutes les données en cache
 */
async function initializeStorage() {
    try {
        // 1. D'abord, migrer les anciennes données si nécessaire
        // run native localStorage migration and legacy Dexie migrations in parallel
        const tasks = [migrateFromNativeStorage()];
        if (typeof Dexie !== 'undefined') tasks.push(migrateFromLegacyDexie());
        // don't await here fully to avoid blocking UI; let them run but show notification when complete
        Promise.all(tasks).then((results) => {
            try {
                console.log('✔️ Migrations (native + legacy Dexie) terminées', results);
                // Build a human readable summary
                const parts = [];
                results.forEach(r => {
                    if (!r) return;
                    if (r.type === 'native') {
                        if (r.skipped) parts.push('Migration native: aucun élément à migrer');
                        else if (r.error) parts.push('Migration native: erreur');
                        else {
                            const s = `Migration native: paramètres ${r.settingsCopied || 0}`;
                            const stockParts = [];
                            if (r.stockCopied) for (const k in r.stockCopied) stockParts.push(`${k}:${r.stockCopied[k]}`);
                            parts.push(s + (stockParts.length ? ' | stock: ' + stockParts.join(', ') : ''));
                        }
                    } else if (r.type === 'legacy') {
                        if (r.error) parts.push('Migration legacy: erreur');
                        else {
                            const sums = [];
                            for (const dbn in r.summary) {
                                const tbls = [];
                                for (const t in r.summary[dbn]) tbls.push(`${t}:${r.summary[dbn][t]}`);
                                sums.push(`${dbn}(${tbls.join(', ')})`);
                            }
                            if (sums.length) parts.push('Migration legacy: ' + sums.join(' ; '));
                        }
                    }
                });
                const msg = parts.length ? parts.join('\n') : 'Migrations terminées (rien à migrer)';
                if (window && typeof window.showNotification === 'function') {
                    window.showNotification(msg, 'success', 8000);
                } else {
                    console.log('Migration summary:', msg);
                }
            } catch (e) {
                console.warn('Erreur building migration summary', e);
            }
        }).catch(e => console.warn('Migrations erreurs:', e));
        
        // 2. Charger toutes les données appSettings dans le cache (fast)
        // Read appSettings but don't block on huge reads; we do it fast and populate storageCache
        db.appSettings.toArray().then(settings => {
            settings.forEach(s => {
                storageCache.set(s.key, s.value);
            });
            dbInitialized = true;
            console.log('✓ Storage initialized with Dexie (IndexedDB) - Illimité');
        }).catch(err => {
            console.error('Failed to load appSettings into cache:', err);
            dbInitialized = true;
        });
        return true;
    } catch (err) {
        console.error('Failed to initialize storage:', err);
        return false;
    }
}

/**
 * Replacement localStorage pour Dexie (API compatible)
 * Utilise un cache en mémoire pour la performance
 */
window.localStorage = {
    getItem: function(key) {
        // Retour immédiat depuis le cache
        return storageCache.get(key) || null;
    },

    setItem: function(key, value) {
        // Mise à jour du cache (immédiate)
        storageCache.set(key, value);
        
        // Persistence asynchrone en base de données
        if (dbInitialized) {
            db.appSettings.put({ key, value, timestamp: Date.now() }).catch(err => {
                console.error(`Failed to save "${key}" to DB:`, err);
            });
        }
    },

    removeItem: function(key) {
        // Suppression du cache
        storageCache.delete(key);
        
        // Suppression asynchrone de la base de données
        if (dbInitialized) {
            db.appSettings.delete(key).catch(err => {
                console.error(`Failed to delete "${key}" from DB:`, err);
            });
        }
    },

    clear: function() {
        // Vider le cache
        storageCache.clear();
        
        // Vider la base de données
        if (dbInitialized) {
            db.appSettings.clear().catch(err => {
                console.error('Failed to clear DB:', err);
            });
        }
    },

    key: function(index) {
        const keys = Array.from(storageCache.keys());
        return keys[index] || null;
    },

    get length() {
        return storageCache.size;
    }
};

/**
 * Initialiser le stockage au chargement
 */
document.addEventListener('DOMContentLoaded', () => {
    // Lancer l'initialisation DB en arrière-plan sans bloquer le rendu
    initializeStorage().catch(err => console.error('initializeStorage error (background):', err));

    // Écouter les changements depuis d'autres onglets/pages
    window.addEventListener('storage', (e) => {
        if (e.key && e.newValue !== null) {
            storageCache.set(e.key, e.newValue);
            console.log('✓ Sync received from other tab:', e.key);
        }
    });
});

/**
 * Fonction pour synchroniser les données Dexie entre les pages
 * Appelée par les pages pour partager les modifications
 * IMPORTANT: Les paramètres sont synchronisés via SharedSettingsDB
 *            Les données de chaque application restent dans leur base propre
 */
async function syncDataAcrossPages(tableName, action, data) {
    try {
        if (tableName === 'appSettings') {
            // Paramètres partagés via SharedSettingsDB
            if (action === 'put' && data && data.key) {
                localStorage.setItem(data.key, data.value);
                // Également stocker dans sharedDb pour la persistence
                await db.appSettings.put({ key: data.key, value: data.value, timestamp: Date.now() });
            } else if (action === 'delete' && data) {
                localStorage.removeItem(data);
                await db.appSettings.delete(data);
            } else if (action === 'clear') {
                localStorage.clear();
                await db.appSettings.clear();
            }
        } else if (tableName === 'inventory' && dbInventory) {
            if (action === 'bulkPut') await dbInventory.bulkPut(data);
            else if (action === 'put') await dbInventory.put(data);
            else if (action === 'delete') await dbInventory.delete(data);
            else if (action === 'clear') await dbInventory.clear();
        } else if (tableName === 'dailyRecords' && dbDailyRecords) {
            if (action === 'bulkPut') await dbDailyRecords.bulkPut(data);
            else if (action === 'put') await dbDailyRecords.put(data);
            else if (action === 'delete') await dbDailyRecords.delete(data);
            else if (action === 'clear') await dbDailyRecords.clear();
        } else if (tableName === 'expenses' && dbExpenses) {
            if (action === 'bulkPut') await dbExpenses.bulkPut(data);
            else if (action === 'put') await dbExpenses.put(data);
            else if (action === 'delete') await dbExpenses.delete(data);
            else if (action === 'clear') await dbExpenses.clear();
        } else if (tableName === 'clients' && dbClients) {
            if (action === 'bulkPut') await dbClients.bulkPut(data);
            else if (action === 'put') await dbClients.put(data);
            else if (action === 'delete') await dbClients.delete(data);
            else if (action === 'clear') await dbClients.clear();
        } else if (tableName === 'suppliers' && dbSuppliers) {
            if (action === 'bulkPut') await dbSuppliers.bulkPut(data);
            else if (action === 'put') await dbSuppliers.put(data);
            else if (action === 'delete') await dbSuppliers.delete(data);
            else if (action === 'clear') await dbSuppliers.clear();
        } else if (tableName === 'quotes' && dbQuotes) {
            if (action === 'bulkPut') await dbQuotes.bulkPut(data);
            else if (action === 'put') await dbQuotes.put(data);
            else if (action === 'delete') await dbQuotes.delete(data);
            else if (action === 'clear') await dbQuotes.clear();
        } else if (tableName === 'income' && dbIncome) {
            if (action === 'bulkPut') await dbIncome.bulkPut(data);
            else if (action === 'put') await dbIncome.put(data);
            else if (action === 'delete') await dbIncome.delete(data);
            else if (action === 'clear') await dbIncome.clear();
        }
        // Émettre un petit événement (léger) pour notifier les autres pages.
        // Nous évitons d'écrire le payload complet (qui peut être très volumineux)
        // afin de ne pas remplir le quota localStorage. On préfère BroadcastChannel.
        try {
            const summary = { table: tableName, action, timestamp: Date.now() };
            // Inclure un identifiant sommaire si possible (éviter gros objets)
            if (action === 'delete' && (typeof data === 'string' || typeof data === 'number')) {
                summary.id = data;
            } else if ((action === 'put' || action === 'bulkPut') && Array.isArray(data)) {
                summary.count = data.length;
            } else if (action === 'put' && data && (data.id || data.key)) {
                summary.id = data.id || data.key;
            }

            // Envoyer via BroadcastChannel si disponible (aucune limite de quota pour ce cas)
            if (syncChannel) {
                try {
                    syncChannel.postMessage(summary);
                } catch (bcErr) {
                    console.warn('BroadcastChannel postMessage failed', bcErr);
                }
            } else {
                // Fallback: écrire un petit item dans le localStorage natif
                try {
                    nativeLocalStorage.setItem(`_sync_${tableName}_${Date.now()}`, JSON.stringify(summary));
                } catch (lsErr) {
                    // Si échec (quota), on l'ignore car la sync via Dexie est la source de vérité
                    console.warn(`Sync localStorage write failed for ${tableName}:`, lsErr);
                }
            }
            console.log(`✓ Synced ${tableName}:${action}`);
        } catch (err) {
            console.warn('Sync broadcast error', err);
        }
    } catch (err) {
        console.error(`Sync error (${tableName}):`, err);
    }
}

/**
 * Fonction pour charger les données depuis Dexie
 */
async function loadDataFromDexie(tableName) {
    try {
        if (tableName === 'inventory' && dbInventory) return await dbInventory.getAll();
        if (tableName === 'dailyRecords' && dbDailyRecords) return await dbDailyRecords.getAll();
        if (tableName === 'expenses' && dbExpenses) return await dbExpenses.getAll();
        if (tableName === 'clients' && dbClients) return await dbClients.getAll();
        if (tableName === 'suppliers' && dbSuppliers) return await dbSuppliers.getAll();
        if (tableName === 'quotes' && dbQuotes) return await dbQuotes.getAll();
        if (tableName === 'income' && dbIncome) return await dbIncome.getAll();
        return [];
    } catch (err) {
        console.error(`Load error (${tableName}):`, err);
        return [];
    }
}
