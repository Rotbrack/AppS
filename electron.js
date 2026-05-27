const { app, BrowserWindow, ipcMain, Menu, dialog, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const electronUserData = path.join(__dirname, 'electron-user-data');
const electronCache = path.join(__dirname, 'electron-cache');
app.setPath('userData', electronUserData);
app.setPath('cache', electronCache);
app.commandLine.appendSwitch('disk-cache-dir', electronCache);
app.commandLine.appendSwitch('disable-gpu');
app.disableHardwareAcceleration();


app.setAsDefaultProtocolClient("rotbracks-m-apps");
const gotTheLock = app.requestSingleInstanceLock();



let mainWindow;
let serverProcess;

// 🔧 Starten des Express Servers als Child Process
function waitForServer(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        function check() {
            const req = http.get(url, () => {
                req.destroy();
                resolve();
            });

            req.on('error', () => {
                if (Date.now() - start > timeoutMs) {
                    reject(new Error(`Server nicht erreichbar unter ${url} nach ${timeoutMs}ms`));
                } else {
                    setTimeout(check, 250);
                }
            });
        }

        check();
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        console.log('Starte Express-Server...');
        const serverScript = path.join(__dirname, 'index.js');
        serverProcess = spawn('node', [serverScript], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: false,
        });

        serverProcess.on('error', (err) => {
            console.error('Server-Fehler:', err);
            reject(err);
        });

        waitForServer('http://localhost:3000/login')
            .then(() => {
                console.log('Express-Server ist bereit.');
                resolve();
            })
            .catch((err) => {
                console.error('Server konnte nicht gestartet werden:', err);
                reject(err);
            });
    });
}

// 🪟 Hauptfenster erstellen
function createWindow() {
    console.log('Erzeuge BrowserWindow...');
    const primary = screen.getPrimaryDisplay().workArea;
    const width = Math.min(1200, primary.width - 100);
    const height = Math.min(900, primary.height - 100);
    const x = primary.x + Math.max(0, Math.floor((primary.width - width) / 2));
    const y = primary.y + Math.max(0, Math.floor((primary.height - height) / 2));

    mainWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        title: 'Rotbracks M Apps',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        show: true,
        frame: true,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        alwaysOnTop: true,
        fullscreenable: true,
        movable: true,
        resizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });


    // Menü definieren
    const template = [
        {
            label: 'Navigation',
            submenu: [
                {
                    label: 'Startseite',
                    click: () => {
                        mainWindow.loadURL('http://localhost:3000');
                    }
                },
                {
                    label: 'Dashboard',
                    click: () => {
                        mainWindow.loadURL('http://localhost:3000/dashboard');
                    }
                }
            ]
        },
        {
            label: 'App',
            submenu: [
                { role: 'quit' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    mainWindow.setMenuBarVisibility(true);

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('WebContents fertig geladen.', {
            visible: mainWindow.isVisible(),
            minimized: mainWindow.isMinimized(),
            focused: mainWindow.isFocused(),
            bounds: mainWindow.getBounds(),
        });
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error('WebContents fehlgeschlagen zu laden:', { errorCode, errorDescription, validatedURL, isMainFrame });
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('Render-Prozess beendet:', details);
    });

    mainWindow.webContents.on('crashed', () => {
        console.error('WebContents ist abgestürzt');
    });

    mainWindow.once('ready-to-show', () => {
        console.log('BrowserWindow ready-to-show.');
        if (mainWindow) {
            mainWindow.center();
        }
    });
    setInterval(() => {
        mainWindow.setMenuBarVisibility(true);
        mainWindow.setAutoHideMenuBar(false);
        mainWindow.setMenu(menu);
    }, 5000);
    mainWindow.loadURL('http://localhost:3000/login')
        .then(() => {
            console.log('Aufruf der URL gestartet: http://localhost:3000/login');
            console.log('Window state after load:', {
                visible: mainWindow.isVisible(),
                minimized: mainWindow.isMinimized(),
                focused: mainWindow.isFocused(),
                bounds: mainWindow.getBounds(),
            });
        })
        .catch((err) => console.error('Fehler beim Laden der URL:', err));

    // DevTools zur Diagnose immer öffnen
    mainWindow.webContents.openDevTools({ mode: 'detach' });

    mainWindow.on('closed', () => {
        console.log('BrowserWindow geschlossen.');
        mainWindow = null;
    });
}

// 🚀 App starten
app.on('ready', async () => {
    console.log('Electron app ready event erhalten.');
    try {
        console.log('Starte Express-Server aus Electron...');
        await startServer();
        console.log('Express-Server gestartet, erstelle Fenster...');
        createWindow();
    } catch (err) {
        console.error('Fehler beim Starten:', err);
        app.quit();
    }
});

app.on('browser-window-created', (event, window) => {
    console.log('BrowserWindow erzeugt.');
});

// ✅ App beenden
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (serverProcess) {
            serverProcess.kill();
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// 🛑 Cleanup bei Beendigung
process.on('exit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// IPC Beispiel (optional)
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

app.on("second-instance", (event, argv) => {
  const url = argv.find(arg => arg.startsWith("rotbracks-m-apps://"));
  if (url) {
    handleUrl(url);
  }
});

function handleUrl(url) {
  console.log("Empfangene URL:", url);

  const parsed = new URL(url);

  const user = parsed.searchParams.get("user");
  const action = parsed.searchParams.get("action");

  console.log(user, action);
    if(parsed.pathname === "open") {
        if (mainWindow) {
            mainWindow.loadURL('http://localhost:3000/dashboard');
            mainWindow.show();
            mainWindow.focus();
        }   else {
            //createWindow();
            console.log("ok");
        }
    }
}