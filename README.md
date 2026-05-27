# H Apps - Electron Desktop App

## 🚀 Setup & Installation

### 1. Dependencies installieren

```bash
npm install
```

### 2. Lokal testen

```bash
npm start
# oder
npm run dev
```

Die App öffnet sich automatisch unter `http://localhost:3000`

### 3. Build erstellen

**Nur EXE (Portable + NSIS Installer):**
```bash
npm run build:win
```

**Oder manuell:**
```bash
npm run dist
```

## 📦 Output

Die gebauten Dateien findest du in `dist/`:
- `H Apps-1.0.0-portable.exe` - Portable Version (keine Installation nötig)
- `H Apps Setup 1.0.0.exe` - NSIS Installer

## 🔧 Struktur

```
H_Apps/
├── electron.js          # Electron Main Process
├── preload.js           # IPC Bridge (Sicherheit)
├── index.js             # Express Server (Backend)
├── psnService.js        # PSN API
├── e.js                 # Init Script
├── H/                   # HTML/CSS/JS Assets
├── api/                 # API Dateien
├── package.json         # Dependencies & Build Config
└── dist/                # (Generiert) Gebaute App
```

## 🔐 Sicherheit

- **Context Isolation** ist aktiviert
- **Node Integration** ist deaktiviert
- **Preload Script** für sichere IPC

## 📝 Features

✅ Express Server läuft im Hintergrund
✅ Azure AD (MSAL) Integration
✅ PSN API Integration
✅ Role-based Access Control (RBAC)
✅ Session Management
✅ Multiple Web UIs (Admin, PSN, EVI)

## ❌ Troubleshooting

**Problem: npm install funktioniert nicht**
```bash
# PowerShell Execution Policy ändern:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Dann nochmal versuchen:
npm install
```

**Problem: Port 3000 wird bereits verwendet**
- Ändere den Port in `index.js` (z.B. 3001)
- Aktualisiere auch `electron.js` wenn nötig

**Problem: Beim Build: "node_modules\psn-api\..." nicht gefunden**
- Stelle sicher, dass alle npm packages installiert sind
- Lösche `node_modules` und `package-lock.json` und installiere neu

## 🎯 Weitere Anpassungen

### Port ändern
In `index.js`, Zeile am Ende:
```javascript
apps.listen(3000, () => { // <- Hier Port ändern
```

In `electron.js`:
```javascript
mainWindow.loadURL('http://localhost:3000'); // <- Hier Port ändern
```

### App-Version aktualisieren
In `package.json`:
```json
"version": "1.0.1"
```

### App-Icon hinzufügen
1. Icon als `icon.ico` (Windows) in `assets/` speichern
2. In `package.json` build section wird es automatisch verwendet

---

**Fertig!** 🎉 Deine Electron App ist ready to go!
