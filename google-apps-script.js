/**
 * Google Apps Script pour Stock Expert
 * Ce script sert de backend pour synchroniser les données de Dexie.js vers Google Sheets.
 * 
 * INSTRUCTIONS DE DEPLOIEMENT:
 * 1. Créer un nouveau Google Sheet
 * 2. Extensions > Apps Script
 * 3. Copier ce code dans Code.gs
 * 4. Déployer > Nouvelle mise à jour
 * 5. Type: Application Web
 * 6. Description: v1
 * 7. Exécuter en tant que: Moi
 * 8. Qui a accès: N'importe qui (ou N'importe qui avec un compte Google)
 * 9. Copier l'URL de l'application Web et la coller dans les paramètres de l'application Stock Expert.
 * 
 * STRATEGIE: Unified JSON Blobs (stockAppData, rhAppData)
 */

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    // Wait for up to 30 seconds for other processes to finish.
    if (lock.tryLock(30000)) {
        try {
            // CORS headers
            const output = ContentService.createTextOutput();

            let action = e.parameter.action;
            let data = null;

            // Handle POST data safely
            if (e.postData && e.postData.contents) {
                try {
                    const postData = JSON.parse(e.postData.contents);
                    action = postData.action || action;
                    data = postData.data;
                } catch (err) {
                    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }))
                        .setMimeType(ContentService.MimeType.JSON);
                }
            }

            let result = { status: 'error', message: 'Unknown action' };

            if (action === 'syncUp') {
                result = syncUp(data);
            } else if (action === 'syncDown') {
                result = syncDown();
            } else {
                result = { status: 'success', message: 'Hello from Stock Expert Backend!' };
            }

            // Output JSON
            return output
                .setMimeType(ContentService.MimeType.JSON)
                .setContent(JSON.stringify(result));

        } catch (e) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
                .setMimeType(ContentService.MimeType.JSON);
        } finally {
            lock.releaseLock();
        }
    } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Server busy' }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Reçoit les données de l'application et met à jour les feuilles Google Sheets
 * @param {Object} data - Objet contenant les tableaux de données (inventory, expenses, etc.)
 */
function syncUp(data) {
    if (!data) return { status: 'error', message: 'No data provided' };

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Liste des tables gérées
    // Liste des tables gérées (Unified Blobs)
    const tables = [
        'stockAppData',
        'rhAppData'
    ];

    const summary = {};

    tables.forEach(tableName => {
        if (data[tableName] && Array.isArray(data[tableName])) {
            updateSheet(ss, tableName, data[tableName]);
            summary[tableName] = data[tableName].length;
        }
    });

    return { status: 'success', summary: summary, timestamp: new Date().toISOString() };
}

/**
 * Récupère toutes les données des feuilles Google Sheets pour l'application
 */
function syncDown() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Liste des tables gérées (Unified Blobs)
    const tables = [
        'stockAppData',
        'rhAppData'
    ];

    const data = {};
    let hasData = false;

    tables.forEach(tableName => {
        const sheetData = readSheet(ss, tableName);
        data[tableName] = sheetData;
        if (sheetData && sheetData.length > 0) hasData = true;
    });

    if (!hasData) {
        return { status: 'error', message: 'Aucune donnée trouvée sur le Google Sheet (stockAppData/rhAppData vides ou inexistants).' };
    }

    return { status: 'success', data: data, timestamp: new Date().toISOString() };
}

/**
 * Helper: Met à jour une feuille spécifique (Supprime tout et réécrit - méthode simple pour la synchro complète)
 * Pour une synchro plus fine, on pourrait utiliser des IDs, mais ici on veut une sauvegarde miroir.
 */
function updateSheet(ss, sheetName, items) {
    if (!items || items.length === 0) return;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    // Clés (headers) basées sur le premier objet, ou union de toutes les clés si structure variable
    // Pour simplifier, on prend les clés du premier item, ou une liste prédéfinie si besoin.
    // On va scanner tous les items pour avoir toutes les clés possibles.
    const allKeys = new Set();
    items.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys).sort(); // Sort for consistency

    // Préparer les données
    const values = [headers]; // Row 1: Headers
    items.forEach(item => {
        const row = headers.map(header => {
            const val = item[header];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val); // Stringify arrays/objects
            return val;
        });
        values.push(row);
    });

    // Écrire
    try {
        sheet.clear();
        if (values.length > 0) {
            sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
        }
    } catch (e) {
        // Handle giant data if needed, but 10MB limit usually fine.
        throw new Error("Erreur écriture Sheet: " + e.toString());
    }
}

/**
 * Helper: Lit une feuille et retourne un tableau d'objets
 */
/**
 * Helper: Lit une feuille et retourne un tableau d'objets
 */
function readSheet(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const range = sheet.getDataRange();
    if (range.getLastRow() < 2) return []; // No data (just headers or empty)

    const values = range.getValues();
    const headers = values[0];
    const rows = values.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            let val = row[index];

            // ROBUSTESSE: Si c'est la colonne 'value' (le gros chunk JSON), on s'assure que c'est une string
            // Google Sheets peut parfois interpréter des nombres ou dates
            if (header === 'value' && typeof val !== 'string') {
                val = String(val);
            }

            obj[header] = val;
        });
        return obj;
    });
}
