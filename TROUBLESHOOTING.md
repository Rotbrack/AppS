# 🔧 TROUBLESHOOTING

## Problem 1: "npm install" funktioniert nicht

**Fehler:** `execution of scripts on this system is deactivated`

**Lösung:**
```powershell
# PowerShell als Admin öffnen und ausführen:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Dann nochmal versuchen:
npm install
```

---

## Problem 2: Port 3000 wird bereits verwendet

**Fehler:** `listen EADDRINUSE: address already in use :::3000`

**Lösung:**
Ändere den Port in zwei Dateien:

**A) electron.js (Zeile ~27):**
```javascript
// Alt:
mainWindow.loadURL('http://localhost:3000');

// Neu (z.B. Port 3001):
mainWindow.loadURL('http://localhost:3001');
```

**B) index.js (letzte Zeile ~800+):**
```javascript
// Alt:
apps.listen(3000, () => {

// Neu:
apps.listen(3001, () => {
```

---

## Problem 3: "electron" Befehl nicht erkannt

**Fehler:** `'electron' is not recognized as an internal or external command`

**Lösung:**
```bash
# Installiere electron neu:
npm install --save-dev electron

# Dann starten:
npm start
```

---

## Problem 4: Build schlägt fehl mit "node_modules not found"

**Fehler:** `Error building app`

**Lösung:**
```bash
# Komplett neu starten:
rm -r node_modules
rm package-lock.json

# Neu installieren:
npm install

# Build nochmal:
npm run build:win
```

---

## Problem 5: "psn-api" Fehler beim Start

**Fehler:** `Cannot find module 'psn-api'`

**Lösung:**
```bash
# psn-api neu installieren:
npm install psn-api --save

# Dann nochmal testen:
npm start
```

---

## Problem 6: App startet aber zeigt weiße Seite

**Fehler:** Fenster öffnet sich, aber nichts wird angezeigt

**Lösung:**
1. In `electron.js` nach dieser Zeile schauen:
```javascript
if (isDev) {
    mainWindow.webContents.openDevTools();
}
```

2. DevTools öffnen und Fehler prüfen (Konsole Tab)
3. Prüfen ob Express Server läuft (Terminal sollte Logs zeigen)
4. Prüfen ob `http://localhost:3000` erreichbar ist

---

## Problem 7: Microsoft Azure Token Fehler

**Fehler:** `AADSTS error` beim Login

**Lösung:**
Dies ist nicht ein Electron Problem. Prüfe:
1. Azure App Registration ist korrekt konfiguriert
2. `clientId`, `authority`, `clientSecret` in `index.js` sind richtig
3. Redirect URIs in Azure sind auf `http://localhost:3000/auth/callback` gesetzt

---

## Problem 8: Beim Build: "Portable exe generation failed"

**Fehler:** Build schlägt beim EXE-Erstellen fehl

**Lösung:**
```bash
# Installiere electron-builder neu:
npm install --save-dev electron-builder

# Versuche normalem build:
npm run dist
```

---

## Problem 9: "File too large" Error beim Build

**Fehler:** Datei zu groß für Signierung

**Lösung:**
Das ist oft ein PSN-API oder node_modules Problem.
```bash
# Entferne große Dependencies die nicht nötig sind:
npm prune --production
```

---

## Problem 10: Beim Test: Express Server startet aber Fenster bleibt leer

**Fehler:** Terminal zeigt `Gateway läuft auf http://localhost:3000` aber App zeigt nichts

**Lösung:**
Der Server braucht mehr Zeit zum Starten. In `electron.js` ändern:

```javascript
// Alt (2000ms):
setTimeout(() => {
    resolve();
}, 2000);

// Neu (5000ms = 5 Sekunden):
setTimeout(() => {
    resolve();
}, 5000);
```

---

## 🆘 Nichts hilft?

Versuche Komplett-Reset:
```bash
# 1. Alles löschen
rm -r node_modules
rm -r dist
rm package-lock.json

# 2. Cache leeren
npm cache clean --force

# 3. Neu installieren
npm install

# 4. Test
npm start
```

Wenn das nicht hilft, post den kompletten Error hier!

---

## ✅ Schnellcheck

Führe diese Kommandos nacheinander aus:
```bash
# 1. npm Version
npm -v

# 2. node Version
node -v

# 3. Prüfe ob electron installiert ist
npx electron --version

# 4. Prüfe ob alle packages installiert sind
npm list

# 5. Starte app
npm start
```
