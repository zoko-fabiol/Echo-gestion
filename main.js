const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8989;
let serverInstance = null;

// 1. Serveur HTTP local ultra-léger en pur Node.js
function startLocalServer() {
    serverInstance = http.createServer((req, res) => {
        // Nettoyage de l'URL pour éviter la navigation en dehors du dossier de travail
        const safeUrl = req.url.split('?')[0].split('#')[0];
        let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

        // Protection contre le parcours de répertoires (directory traversal)
        if (!filePath.startsWith(__dirname)) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Accès interdit');
            return;
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.csv': 'text/csv; charset=utf-8',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf',
            '.wasm': 'application/wasm'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    // Si un fichier n'est pas trouvé, on peut renvoyer index.html (pour le routage SPA si nécessaire)
                    // Mais ici, c'est une SPA simple sans routeur HTML5 history API complexe, donc un 404 classique convient.
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end('Fichier non trouvé');
                } else {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end('Erreur interne : ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    serverInstance.listen(PORT, '127.0.0.1', () => {
        console.log(`[Desktop Server] Actif sur http://127.0.0.1:${PORT}`);
    });
}

// 2. Initialisation de la fenêtre d'affichage Electron
function createWindow() {
    const win = new BrowserWindow({
        width: 1366,
        height: 768,
        title: "Echo Gestion",
        icon: path.join(__dirname, 'image_circulaire_recadree.png'),
        autoHideMenuBar: true, // Cache la barre de menu classique Windows
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true // Pour une sécurité maximale
        }
    });

    // Charge la page d'accueil via le serveur local sécurisé
    win.loadURL(`http://127.0.0.1:${PORT}/index.html`);

    // Gère le cas où le chargement échoue (ex: port occupé au démarrage)
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[Desktop App] Échec du chargement : ${errorDescription} (${errorCode})`);
        // Attendre 1s et réessayer une fois
        setTimeout(() => {
            win.loadURL(`http://127.0.0.1:${PORT}/index.html`);
        }, 1000);
    });
}

// Lancement global
app.whenReady().then(() => {
    startLocalServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Arrêt du serveur et fermeture de l'application
app.on('window-all-closed', () => {
    if (serverInstance) {
        serverInstance.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
