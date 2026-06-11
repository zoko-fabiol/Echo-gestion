/**
 * Firebase sync adapter.
 * Keeps the historical `window.GoogleSheetsAdapter` API so the app does not
 * need to be rewritten, but stores and syncs data with Firestore instead.
 */
console.log('%c STOCK EXPERT FIREBASE SYNC ACTIVE ', 'background: #14522D; color: #fff; font-size: 18px; padding: 10px; border-radius: 5px;');

(function installFirebaseSyncAdapter() {
    const CONFIG_KEY = 'stock_expert_backend_config_v1';
    const APP_NAME = 'StockExpertSync';
    const FIREBASE_SDK_URLS = [
        'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js',
        'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage-compat.js'
    ];
    const COLLECTIONS = [
        'inventory',
        'dailyRecords',
        'expenses',
        'clients',
        'suppliers',
        'quotes',
        'income',
        'productions',
        'rawMaterials',
        'rhAppData',
        'userAccounts',
        'appSettings'
    ];

    let firebaseLoadPromise = null;
    let initPromise = null;
    let firebaseApp = null;
    let firestore = null;
    let auth = null;
    let storage = null;
    let realtimeUnsubs = [];
    let realtimeTimer = null;
    let syncQueuePromise = Promise.resolve();
    let queuedSyncState = null;
    let firebaseConfigSignature = '';
    const MIGRATION_LOCK_KEY = 'stock_expert_firebase_initial_seed_v1';
    const SYNC_RETRY_ATTEMPTS = 3;
    const SYNC_RETRY_BASE_DELAY_MS = 300;

    function readConfig() {
        const fallbackConfig = window.FIREBASE_CONFIG || null;
        try {
            const raw = localStorage.getItem(CONFIG_KEY);
            if (!raw) {
                return {
                    enabled: !!fallbackConfig,
                    baseUrl: fallbackConfig ? JSON.stringify(fallbackConfig) : '',
                    token: '',
                    autoPush: !!fallbackConfig
                };
            }

            const parsed = JSON.parse(raw);
            return {
                enabled: parsed.enabled !== undefined ? !!parsed.enabled : !!fallbackConfig,
                baseUrl: parsed.baseUrl || (fallbackConfig ? JSON.stringify(fallbackConfig) : ''),
                token: parsed.token || '',
                autoPush: parsed.autoPush !== undefined ? !!parsed.autoPush : !!fallbackConfig
            };
        } catch (err) {
            console.warn('Firebase sync config is invalid', err);
            return {
                enabled: !!fallbackConfig,
                baseUrl: fallbackConfig ? JSON.stringify(fallbackConfig) : '',
                token: '',
                autoPush: !!fallbackConfig
            };
        }
    }

    function writeConfig(cfg) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify({
            enabled: !!cfg.enabled,
            baseUrl: cfg.baseUrl || '',
            token: cfg.token || '',
            autoPush: !!cfg.autoPush
        }));

        if (typeof updateBackendUI === 'function') {
            try {
                updateBackendUI();
            } catch (err) {
                console.warn('updateBackendUI failed after Firebase config update', err);
            }
        }
    }

    function getApiUrl() {
        return readConfig().baseUrl || '';
    }

    function setApiUrl(url) {
        const cfg = readConfig();
        cfg.baseUrl = (url || '').trim();
        cfg.enabled = true;
        cfg.autoPush = true;
        writeConfig(cfg);
        firebaseConfigSignature = '';
        initPromise = null;
        init().catch(err => console.warn('Firebase init after config save failed', err));
    }

    function getConfig() {
        return readConfig();
    }

    function setConfig(cfg) {
        writeConfig({ ...readConfig(), ...cfg });
        firebaseConfigSignature = '';
        initPromise = null;
        if (cfg && cfg.enabled) {
            init().catch(err => console.warn('Firebase init after config save failed', err));
        }
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if ([...document.scripts].some(script => script.src === url)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Impossible de charger ${url}`));
            document.head.appendChild(script);
        });
    }

    async function ensureFirebaseSdk() {
        if (window.firebase && window.firebase.firestore) return;
        if (!firebaseLoadPromise) {
            firebaseLoadPromise = (async () => {
                for (const url of FIREBASE_SDK_URLS) {
                    await loadScript(url);
                }
            })();
        }
        await firebaseLoadPromise;
    }

    function parseJsonMaybe(value) {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed.startsWith('{')) return null;
        try {
            return JSON.parse(trimmed);
        } catch (err) {
            return null;
        }
    }

    async function resolveFirebaseConfig() {
        const cfg = readConfig();
        const raw = (cfg.baseUrl || '').trim();

        const inline = parseJsonMaybe(raw);
        if (inline) return inline;

        if (window.FIREBASE_CONFIG) {
            return window.FIREBASE_CONFIG;
        }

        if (raw && /^https?:\/\//i.test(raw)) {
            const response = await fetch(raw, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`Impossible de charger la config Firebase: ${response.status}`);
            }
            const text = await response.text();
            const parsed = parseJsonMaybe(text);
            if (!parsed) throw new Error('Le document distant ne contient pas un JSON Firebase valide');
            return parsed;
        }

        return null;
    }

    function buildSignature(firebaseConfig) {
        try {
            return JSON.stringify(firebaseConfig || {});
        } catch (err) {
            return String(Date.now());
        }
    }

    function serializeRhAppData(value) {
        if (value === undefined) {
            return '';
        }

        if (typeof value === 'string') {
            return value;
        }

        try {
            return JSON.stringify(value);
        } catch (err) {
            console.warn('Unable to serialize rhAppData payload', err);
            return '';
        }
    }

    function deserializeRhAppData(docData) {
        if (!docData) {
            return [];
        }

        if (docData.payload !== undefined) {
            const rawPayload = docData.payload;
            if (typeof rawPayload !== 'string') {
                return [rawPayload];
            }

            try {
                return [JSON.parse(rawPayload)];
            } catch (err) {
                console.warn('Unable to parse rhAppData payload from Firestore', err);
                return [rawPayload];
            }
        }

        const clone = { ...docData };
        delete clone.id;
        delete clone.updatedAt;
        delete clone.updatedBy;
        delete clone.deviceId;
        return [clone];
    }

    function getCollectionSource(tableName) {
        const value = window[tableName];
        if (Array.isArray(value)) return value;

        if (tableName === 'rhAppData') {
            try {
                const raw = localStorage.getItem('rh_app_data');
                return raw ? [JSON.parse(raw)] : [];
            } catch (err) {
                console.warn('Impossible de lire rh_app_data', err);
                return [];
            }
        }

        const localKeyMap = {
            inventory: 'stock_expert_inventory_v3',
            dailyRecords: 'stock_expert_sales_v3',
            expenses: 'stock_expert_expenses_v1',
            income: 'stock_expert_income_v1',
            productions: 'stock_expert_production_v1',
            rawMaterials: 'stock_expert_raw_materials_v1',
            clients: 'stock_expert_clients_v2',
            suppliers: 'stock_expert_suppliers_v1',
            quotes: 'stock_expert_quotes_v1'
        };

        const raw = localStorage.getItem(localKeyMap[tableName] || '');
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn(`Impossible de lire les données locales pour ${tableName}`, err);
            return [];
        }
    }

    function normalizeRecord(tableName, item, index) {
        const record = { ...(item || {}) };

        if (tableName === 'userAccounts') {
            if (record.uid) record.id = record.uid;
            else if (!record.id) record.id = `user_${Date.now()}_${index}`;
            return record;
        }

        if (tableName === 'rhAppData') {
            record.id = 'current';
            return record;
        }

        if (tableName === 'appSettings') {
            if (!record.key && record.id) record.key = String(record.id);
            if (!record.key) record.key = `${tableName}_${index}`;
            record.id = record.key;
            return record;
        }

        if (!record.id) {
            record.id = `${tableName}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
        }

        if (!record.updatedAt) {
            record.updatedAt = Date.now();
        }

        return record;
    }

    function chunkArray(items, size) {
        const chunks = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function retryOperation(operation, label, attempts = SYNC_RETRY_ATTEMPTS) {
        let lastError = null;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                return await operation();
            } catch (err) {
                lastError = err;
                const msg = String(err && err.message || '').toLowerCase();
                // Detect Firestore quota/resource exhausted errors and abort retries
                if (msg.includes('quota') || msg.includes('resource-exhausted') || msg.includes('exceeded') || (err && err.code && String(err.code).toLowerCase().includes('resource-exhausted'))) {
                    try { err.quotaExceeded = true; } catch (e) {}
                    console.error(`${label} failed due to quota/exhaustion, aborting retries`, err);
                    throw err; // do not retry on quota exhaustion
                }

                console.warn(`${label} failed (attempt ${attempt}/${attempts})`, err);
                if (attempt < attempts) {
                    await sleep(SYNC_RETRY_BASE_DELAY_MS * attempt);
                }
            }
        }
        throw lastError;
    }

    function getDeviceId() {
        const existing = localStorage.getItem('stock_expert_device_id');
        if (existing) return existing;
        const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem('stock_expert_device_id', id);
        return id;
    }

    async function ensureInitialized() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) return null;

        if (initPromise) return initPromise;

        initPromise = (async () => {
            await ensureFirebaseSdk();

            const firebaseConfig = await resolveFirebaseConfig();
            if (!firebaseConfig) {
                throw new Error('Configuration Firebase introuvable.');
            }

            const signature = buildSignature(firebaseConfig);
            if (firestore && signature === firebaseConfigSignature) {
                return { app: firebaseApp, firestore, auth };
            }

            if (window.firebase.apps && window.firebase.apps.length > 0) {
                const existing = window.firebase.apps.find(app => app.name === APP_NAME);
                firebaseApp = existing || window.firebase.initializeApp(firebaseConfig, APP_NAME);
            } else {
                firebaseApp = window.firebase.initializeApp(firebaseConfig, APP_NAME);
            }

            firestore = firebaseApp.firestore();
            try {
                firestore.settings({ ignoreUndefinedProperties: true });
            } catch (err) {
                if (String(err && err.message || '').toLowerCase().includes('settings can no longer be changed')) {
                    console.info('Firestore settings already applied; continuing without re-applying settings.');
                } else {
                    throw err;
                }
            }
            auth = firebaseApp.auth ? firebaseApp.auth() : null;
            // Initialise Firebase Storage if SDK was loaded
            try {
                storage = (firebaseApp.storage && window.firebase && window.firebase.storage) ? firebaseApp.storage() : null;
                if (storage) console.info('Firebase Storage initialisé.');
            } catch (storageErr) {
                console.warn('Firebase Storage non disponible', storageErr);
                storage = null;
            }

            // Anonymous sign-in removed - app uses explicit email/password or Microsoft OAuth.
            // The Firestore adapter operates with the currently authenticated user or without auth.

            firebaseConfigSignature = signature;
            return { app: firebaseApp, firestore, auth };
        })();

        try {
            return await initPromise;
        } finally {
            initPromise = null;
        }
    }

    async function collectionToArray(collectionName) {
        if (!firestore) return [];
        if (collectionName === 'rhAppData') {
            const doc = await firestore.collection(collectionName).doc('current').get();
            return doc.exists ? deserializeRhAppData(doc.data()) : [];
        }
        if (collectionName === 'appSettings') {
            try {
                const doc = await firestore.collection('appSettings').doc('settings').get();
                if (!doc.exists) return [];
                const data = doc.data();
                // Deserialise companyInfo if stored as JSON string
                if (data.companyInfo && typeof data.companyInfo === 'string') {
                    try { data.companyInfo = JSON.parse(data.companyInfo); } catch (ignore) {}
                }
                return [{ id: 'settings', ...data }];
            } catch (err) {
                console.warn('collectionToArray appSettings failed', err);
                return [];
            }
        }
        const snapshot = await firestore.collection(collectionName).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function writeCollection(collectionName, items) {
        if (!firestore) return;

        // Allow items to be either an array or a single object (rhAppData uses a single doc)
        const sourceItems = Array.isArray(items) ? items : (items ? [items] : []);

        if (collectionName === 'appSettings') {
            // Dedicated single-document write for app settings (logo URL, theme, company info)
            const s = (sourceItems.length > 0 ? sourceItems[0] : {}) || {};
            const doc = {
                updatedAt: Date.now(),
                deviceId: getDeviceId()
            };
            // Store logo if it is a remote URL or a compressed base64 blob
            if (s.logoUrl && typeof s.logoUrl === 'string' && (s.logoUrl.startsWith('http') || s.logoUrl.startsWith('data:image/'))) {
                doc.logoUrl = s.logoUrl;
            }
            if (s.themeColor != null) doc.themeColor = s.themeColor;
            if (s.theme != null) doc.theme = s.theme;
            if (s.companyName != null) doc.companyName = s.companyName;
            if (s.companyContact != null) doc.companyContact = s.companyContact;
            if (s.companyFooter != null) doc.companyFooter = s.companyFooter;
            try {
                await firestore.collection('appSettings').doc('settings').set(doc, { merge: true });
                console.info('appSettings écrit dans Firestore', doc);
            } catch (err) {
                console.warn('writeCollection appSettings failed', err);
            }
            return;
        }

        if (sourceItems.length === 0) return;

        if (collectionName === 'rhAppData') {
            const current = sourceItems[0] || {};
            console.info('Writing rhAppData to Firestore:', current);
            await firestore.collection(collectionName).doc('current').set({
                payload: serializeRhAppData(current),
                updatedAt: Date.now(),
                updatedBy: (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : 'local-device',
                deviceId: getDeviceId()
            }, { merge: true });
            return;
        }

        const batches = chunkArray(sourceItems, 350);
        for (const batchItems of batches) {
            const batch = firestore.batch();
            batchItems.forEach((item, index) => {
                const record = normalizeRecord(collectionName, item, index);
                const docRef = firestore.collection(collectionName).doc(String(record.id));
                batch.set(docRef, {
                    ...record,
                    updatedAt: Date.now(),
                    updatedBy: (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : 'local-device',
                    deviceId: getDeviceId()
                }, { merge: true });
            });
            try {
                await batch.commit();
            } catch (err) {
                console.error(`Batch commit failed for collection ${collectionName}`, err);
                throw new Error(`Batch commit failed for ${collectionName}: ${err && err.message}`);
            }
        }
    }

    function captureLocalState() {
        let rhAppData = [];
        try {
            const rawRh = localStorage.getItem('rh_app_data');
            if (rawRh) {
                const parsed = JSON.parse(rawRh);
                rhAppData = Array.isArray(parsed) ? parsed : [parsed];
            } else {
                rhAppData = [];
            }
        } catch (err) {
            rhAppData = [];
        }

        return {
            inventory: getCollectionSource('inventory'),
            dailyRecords: getCollectionSource('dailyRecords'),
            expenses: getCollectionSource('expenses'),
            clients: getCollectionSource('clients'),
            suppliers: getCollectionSource('suppliers'),
            quotes: getCollectionSource('quotes'),
            income: getCollectionSource('income'),
            productions: getCollectionSource('productions'),
            rawMaterials: getCollectionSource('rawMaterials'),
            rhAppData,
            userAccounts: [],
            companyInfo: window.companyInfo || null,
            logo: localStorage.getItem('stock_expert_logo'),
            theme: localStorage.getItem('stock_expert_theme'),
            themeColor: localStorage.getItem('stock_expert_theme_color')
        };
    }

    // Async capture to include RH data stored in Dexie (dbRhData) when available
    async function captureLocalStateAsync() {
        const state = captureLocalState();
        try {
            if ((!state.rhAppData || state.rhAppData.length === 0) && typeof dbRhData !== 'undefined' && dbRhData.get) {
                // dbRhData.get may return { key, value } or the raw value depending on implementation
                const row = await dbRhData.get('rh_app_data');
                let value = null;
                if (row) {
                    if (row.value !== undefined) value = row.value;
                    else value = row;
                }
                if (value) {
                    state.rhAppData = Array.isArray(value) ? value : [value];
                    console.info('captureLocalStateAsync: loaded rhAppData from dbRhData', state.rhAppData);
                }
            }
        } catch (err) {
            console.warn('captureLocalStateAsync: failed reading dbRhData', err);
        }

        // Include userAccounts in the captured state
        try {
            if (typeof dbUserAccounts !== 'undefined' && dbUserAccounts.getAll) {
                state.userAccounts = await dbUserAccounts.getAll();
                console.info('captureLocalStateAsync: loaded userAccounts from dbUserAccounts', state.userAccounts.length);
            }
        } catch (err) {
            console.warn('captureLocalStateAsync: failed reading dbUserAccounts', err);
        }

        // Build appSettings entry — logo URL only (base64 blobs are too large for Firestore)
        try {
            const logoValue = localStorage.getItem('stock_expert_logo') || null;
            const logoUrl = (logoValue && (logoValue.startsWith('http') || logoValue.startsWith('data:image/'))) ? logoValue : null;
            const ci = window.companyInfo || {};
            state.appSettings = [{
                id: 'settings',
                logoUrl: logoUrl,
                themeColor: localStorage.getItem('stock_expert_theme_color') || null,
                theme: localStorage.getItem('stock_expert_theme') || null,
                companyName: ci.name || null,
                companyContact: ci.contact || null,
                companyFooter: ci.footer || null
            }];
        } catch (err) {
            console.warn('captureLocalStateAsync: failed building appSettings', err);
        }

        return state;
    }

    async function pushStateToFirestore(state) {
        await ensureInitialized();
        if (!firestore) throw new Error('Firestore indisponible');

        const projectInfo = {
            appName: (firebaseApp && firebaseApp.name) || '(unknown)',
            projectId: (firebaseApp && firebaseApp.options && firebaseApp.options.projectId) || '(unknown)'
        };
        console.info('Pushing state to Firestore', projectInfo);

        const failed = [];
        for (const collectionName of COLLECTIONS) {
            try {
                await retryOperation(
                    () => writeCollection(collectionName, state[collectionName]),
                    `Firestore write for ${collectionName}`
                );
            } catch (err) {
                // keep the original error object so we can detect quota-related failures
                failed.push({ collection: collectionName, error: err });
            }
        }

        if (failed.length > 0) {
            const quotaProblem = failed.some(f => f.error && (f.error.quotaExceeded || String(f.error && f.error.message || '').toLowerCase().includes('quota') || String(f.error && f.error.message || '').toLowerCase().includes('resource-exhausted')));
            const msg = `Some collections failed to write: ${failed.map(f => f.collection).join(', ')}`;
            console.error(msg, failed);
            if (quotaProblem) {
                const e = new Error('QUOTA_EXCEEDED: Firestore quota or resource exhausted');
                try { e.details = failed; } catch (ignore) {}
                throw e;
            }
            throw new Error(msg);
        }

        return { ok: true, timestamp: Date.now() };
    }

    // Debug helper to inspect which Firebase app/config is active
    window.FirebaseSyncDebug = async function () {
        try {
            await ensureInitialized();
        } catch (err) {
            console.warn('ensureInitialized failed in debug helper', err);
        }
        const info = {
            firebaseAvailable: !!window.firebase,
            appName: firebaseApp && firebaseApp.name,
            projectId: firebaseApp && firebaseApp.options && firebaseApp.options.projectId,
            configSignature: firebaseConfigSignature,
            currentUser: auth && auth.currentUser ? { uid: auth.currentUser.uid, isAnonymous: auth.currentUser.isAnonymous } : null
        };
        console.log('FirebaseSyncDebug', info);
        return info;
    };

    // Test push: write a tiny doc to `diagnostics` to verify project/permissions/quota
    window.FirestoreTestPush = async function () {
        try {
            await ensureInitialized();
        } catch (err) {
            console.warn('ensureInitialized failed in FirestoreTestPush', err);
        }
        if (!firestore) return { ok: false, error: 'firestore-not-initialized' };

        const docId = `test_${getDeviceId()}_${Date.now()}`;
        const payload = {
            deviceId: getDeviceId(),
            ts: Date.now(),
            note: 'diagnostic test'
        };

        try {
            const ref = firestore.collection('diagnostics').doc(docId);
            await ref.set(payload);
            console.info('FirestoreTestPush: write OK', { projectId: firebaseApp && firebaseApp.options && firebaseApp.options.projectId, docId });
            return { ok: true, projectId: firebaseApp && firebaseApp.options && firebaseApp.options.projectId, doc: docId };
        } catch (err) {
            const msg = String(err && err.message || '').toLowerCase();
            if (msg.includes('quota') || msg.includes('resource-exhausted') || (err && err.code && String(err.code).toLowerCase().includes('resource-exhausted'))) {
                console.error('FirestoreTestPush: quota exceeded', err);
                return { ok: false, quotaExceeded: true, error: String(err && err.message), details: err };
            }
            console.error('FirestoreTestPush failed', err);
            return { ok: false, error: String(err && err.message), details: err };
        }
    };

    // Import RH JSON (object or JSON string) into localStorage / Dexie and push to Firestore
    window.ImportRhAndPush = async function (jsonOrObj) {
        let obj = null;
        try {
            if (typeof jsonOrObj === 'string') {
                obj = JSON.parse(jsonOrObj);
            } else {
                obj = jsonOrObj;
            }
        } catch (err) {
            console.error('ImportRhAndPush: invalid JSON provided', err);
            throw new Error('Invalid JSON');
        }

        try {
            localStorage.setItem('rh_app_data', JSON.stringify(obj));
        } catch (err) {
            console.error('ImportRhAndPush: failed writing localStorage.rh_app_data', err);
            throw err;
        }

        // also attempt to persist into Dexie `dbRhData` if available
        try {
            if (typeof dbRhData !== 'undefined' && dbRhData.put) {
                // some implementations expect { key: 'rh_app_data', value: obj }
                try {
                    await dbRhData.put({ key: 'rh_app_data', value: obj });
                } catch (e) {
                    // fallback to putting raw object under 'rh_app_data'
                    try { await dbRhData.put(obj); } catch (_) { /* ignore */ }
                }
                console.info('ImportRhAndPush: wrote into dbRhData');
            }
        } catch (err) {
            console.warn('ImportRhAndPush: dbRhData write failed', err);
        }

        // call PushRhNow to push to Firestore
        try {
            const res = await window.PushRhNow();
            console.log('ImportRhAndPush: PushRhNow result', res);
            return res;
        } catch (err) {
            console.error('ImportRhAndPush: PushRhNow failed', err);
            throw err;
        }
    };

    // Force-push RH data only (helper for debugging)
    window.PushRhNow = async function () {
        try {
            await ensureInitialized();
        } catch (err) {
            console.warn('ensureInitialized failed in PushRhNow', err);
        }

        if (!firestore) {
            throw new Error('Firestore non initialisé');
        }

        let parsed = null;
        try {
            const raw = localStorage.getItem('rh_app_data');
            if (!raw) throw new Error('Aucune clé rh_app_data dans localStorage');
            parsed = JSON.parse(raw);
        } catch (err) {
            console.error('Impossible de lire localStorage.rh_app_data', err);
            throw err;
        }

        try {
            console.info('PushRhNow: pushing rhAppData to Firestore', parsed);
            await writeCollection('rhAppData', parsed);
            console.info('PushRhNow: success');
            return { ok: true };
        } catch (err) {
            const msg = String(err && err.message || '').toLowerCase();
            if (String(err && err.message || '').toLowerCase().includes('quota') || (err && err.message && err.message.toLowerCase().includes('resource-exhausted')) || (err && err.message && err.message.toLowerCase().includes('quota_exceeded')) || (err && err.code && String(err.code).toLowerCase().includes('resource-exhausted'))) {
                console.error('PushRhNow failed: Firestore quota exceeded', err);
                return { ok: false, quotaExceeded: true, error: String(err && err.message) };
            }
            if (msg.includes('settings can no longer be changed') || msg.includes('already been started')) {
                console.warn('PushRhNow detected Firestore settings error; attempting fallback');
                try {
                    if (window.firebase && window.firebase.firestore) {
                        firestore = window.firebase.firestore();
                        await writeCollection('rhAppData', parsed);
                        console.info('PushRhNow: success after fallback');
                        return { ok: true, fallback: true };
                    }
                } catch (retryErr) {
                    console.error('PushRhNow fallback failed', retryErr);
                    throw retryErr;
                }
            }
            console.error('PushRhNow failed', err);
            throw err;
        }
    };

    // List local RH storage sources for debugging
    window.ListRhLocal = async function () {
        const out = {
            localStorageRaw: null,
            localStorageParsed: null,
            dbRhDataGet: null,
            dbRhDataAll: null,
            errors: []
        };

        try {
            out.localStorageRaw = localStorage.getItem('rh_app_data');
            try { out.localStorageParsed = out.localStorageRaw ? JSON.parse(out.localStorageRaw) : null; } catch(e){ out.errors.push({source:'localStorage.parse', error:String(e)}); }
        } catch (e) {
            out.errors.push({ source: 'localStorage.read', error: String(e) });
        }

        try {
            if (typeof dbRhData !== 'undefined' && dbRhData.get) {
                try {
                    out.dbRhDataGet = await dbRhData.get('rh_app_data');
                } catch (e) {
                    out.errors.push({ source: 'dbRhData.get', error: String(e) });
                }
                try {
                    if (dbRhData.getAll) out.dbRhDataAll = await dbRhData.getAll();
                } catch (e) {
                    out.errors.push({ source: 'dbRhData.getAll', error: String(e) });
                }
            } else {
                out.errors.push({ source: 'dbRhData', error: 'dbRhData not available' });
            }
        } catch (e) {
            out.errors.push({ source: 'dbRhData.outer', error: String(e) });
        }

        console.log('ListRhLocal', out);
        return out;
    };

    async function hasRemoteData() {
        await ensureInitialized();
        if (!firestore) return false;

        for (const collectionName of COLLECTIONS) {
            const snapshot = await firestore.collection(collectionName).limit(1).get();
            if (!snapshot.empty) return true;
        }

        return false;
    }

    function hasLocalData(state) {
        return COLLECTIONS.some(collectionName => Array.isArray(state[collectionName]) && state[collectionName].length > 0) ||
            !!state.companyInfo ||
            !!state.logo ||
            !!state.theme ||
            !!state.themeColor;
    }

    async function seedRemoteIfEmpty() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) return false;

        if (localStorage.getItem(MIGRATION_LOCK_KEY) === 'done') return false;

        const remoteHasData = await hasRemoteData();
        if (remoteHasData) {
            localStorage.setItem(MIGRATION_LOCK_KEY, 'done');
            return false;
        }

        const state = await captureLocalStateAsync();
        if (!hasLocalData(state)) return false;

        await pushStateToFirestore(state);
        localStorage.setItem(MIGRATION_LOCK_KEY, 'done');

        if (typeof showToast === 'function') {
            showToast('Données locales transférées vers Firebase', 'success');
        }

        return true;
    }

    async function pullStateFromFirestore() {
        await ensureInitialized();
        if (!firestore) throw new Error('Firestore indisponible');

        const state = {};
        for (const collectionName of COLLECTIONS) {
            state[collectionName] = await collectionToArray(collectionName);
        }

        // Extract app settings (logo, theme, company info) from appSettings collection
        if (Array.isArray(state.appSettings) && state.appSettings.length > 0) {
            const s = state.appSettings[0];
            if (s.logoUrl) state.logo = s.logoUrl;
            if (s.themeColor) state.themeColor = s.themeColor;
            if (s.theme) state.theme = s.theme;
            if (s.companyName || s.companyContact || s.companyFooter) {
                state.companyInfo = {
                    name: s.companyName || '',
                    contact: s.companyContact || '',
                    footer: s.companyFooter || ''
                };
            }
        }

        return state;
    }

    async function applyRemoteState(state) {
        if (typeof window.applyRemoteStateFromCloud === 'function') {
            return window.applyRemoteStateFromCloud(state);
        }

        if (typeof window.location !== 'undefined' && window.location.reload) {
            window.location.reload();
        }
        return state;
    }

    async function syncUp() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) {
            throw new Error('La synchronisation Firebase est désactivée');
        }

        queuedSyncState = await captureLocalStateAsync();

        syncQueuePromise = syncQueuePromise
            .catch(() => null)
            .then(async () => {
                if (!queuedSyncState) {
                    return { ok: true, skipped: true };
                }

                const state = queuedSyncState;
                queuedSyncState = null;

                window._isPushingLocalData = true;
                try {
                    const result = await pushStateToFirestore(state);
                    if (typeof showToast === 'function') {
                        showToast('Sauvegarde Firebase effectuée', 'success');
                    }
                    return result;
                } catch (err) {
                    // If Firestore quota exceeded, surface a user-friendly message and abort
                    const emsg = String(err && err.message || '').toLowerCase();
                    if (emsg.includes('quota_exceeded') || emsg.includes('quota') || emsg.includes('resource-exhausted') || (err && err.quotaExceeded)) {
                        console.error('syncUp aborted: Firestore quota exceeded', err);
                        if (typeof showToast === 'function') {
                            showToast('Erreur: quota Firestore dépassé. Vérifiez votre console Firebase et votre facturation.', 'error');
                        }
                        throw err;
                    }

                    // Fallback: if Firestore settings error occurs, try re-obtaining the Firestore instance
                    const msg = String(err && err.message || '').toLowerCase();
                    if (msg.includes('settings can no longer be changed') || msg.includes('already been started')) {
                        console.warn('Firestore settings error detected; attempting fallback by re-obtaining firestore from window.firebase');
                        try {
                            if (window.firebase && window.firebase.firestore) {
                                firestore = window.firebase.firestore();
                                console.info('Fallback: reassigned firestore from window.firebase.firestore()');
                                const retryResult = await pushStateToFirestore(state);
                                if (typeof showToast === 'function') {
                                    showToast('Sauvegarde Firebase effectuée (fallback)', 'success');
                                }
                                return retryResult;
                            }
                        } catch (retryErr) {
                            console.error('Fallback retry for Firestore failed', retryErr);
                            throw retryErr;
                        }
                    }
                    throw err;
                } finally {
                    setTimeout(() => {
                        window._isPushingLocalData = false;
                    }, 2000);
                }
            });

        return syncQueuePromise;
    }

    async function syncDown() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) {
            throw new Error('La synchronisation Firebase est désactivée');
        }

        const state = await pullStateFromFirestore();
        await applyRemoteState(state);

        if (typeof showToast === 'function') {
            showToast('Restauration Firebase effectuée', 'success');
        }

        return state;
    }

    function stopRealtimeSync() {
        realtimeUnsubs.forEach(unsub => {
            try {
                if (typeof unsub === 'function') unsub();
            } catch (err) {
                console.warn('Error while stopping Firebase listener', err);
            }
        });
        realtimeUnsubs = [];
        if (realtimeTimer) {
            clearTimeout(realtimeTimer);
            realtimeTimer = null;
        }
    }

    function scheduleRealtimeRefresh() {
        if (realtimeTimer) clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(async () => {
            realtimeTimer = null;
            try {
                const state = await pullStateFromFirestore();
                await applyRemoteState(state);
            } catch (err) {
                console.warn('Firebase realtime refresh failed', err);
            }
        }, 1000); // 1s pull debounce batches rapid writes
    }

    async function startRealtimeSync() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) return false;

        await ensureInitialized();
        if (!firestore) return false;

        stopRealtimeSync();

        COLLECTIONS.forEach(collectionName => {
            const unsubscribe = firestore.collection(collectionName).onSnapshot((snapshot) => {
                // Ignore snapshot if it contains pending local writes
                if (snapshot && snapshot.metadata && snapshot.metadata.hasPendingWrites) {
                    return;
                }
                // Only trigger refresh if NOT currently applying remote data or pushing local data (avoids push-pull loop)
                if (!window._isApplyingRemoteData && !window.__applyingRemoteState && !window._isPushingLocalData && !window._isSyncPending) {
                    scheduleRealtimeRefresh();
                }
            }, (err) => {
                console.warn(`Firebase listener error for ${collectionName}`, err);
            });
            realtimeUnsubs.push(unsubscribe);
        });

        // NOTE: No immediate scheduleRealtimeRefresh() here.
        // Data is already loaded from Dexie on mount. Remote sync only triggers on actual changes.
        return true;
    }

    async function init() {
        const cfg = readConfig();
        if (!cfg.enabled && !window.FIREBASE_CONFIG) return false;

        try {
            await ensureInitialized();
            await seedRemoteIfEmpty();
            await startRealtimeSync();
            return true;
        } catch (err) {
            console.warn('Firebase init failed', err);
            return false;
        }
    }

    const adapter = {
        init,
        getApiUrl,
        setApiUrl,
        getConfig,
        setConfig,
        syncUp,
        syncDown,
        startRealtimeSync,
        stopRealtimeSync,
        ensureInitialized
    };

    window.GoogleSheetsAdapter = adapter;
    window.FirebaseSyncAdapter = adapter;

    /**
     * Upload a File to Firebase Storage and return the public download URL.
     * Usage: const url = await window.FirebaseUploadImage(file, 'logos/company_logo.png');
     */
    window.FirebaseUploadImage = async function (file, storagePath) {
        if (!storage) {
            await ensureInitialized();
        }
        if (!storage) {
            throw new Error('Firebase Storage non disponible. Vérifiez votre configuration Firebase.');
        }
        const ref = storage.ref(storagePath);
        const snapshot = await ref.put(file);
        const url = await snapshot.ref.getDownloadURL();
        console.info('FirebaseUploadImage OK:', url);
        return url;
    };
})();
