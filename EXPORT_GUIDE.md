# 📦 QUICK START - Electron App bauen & exportieren

## ✅ Das wurde bereits gemacht:

- ✓ `electron.js` - Electron Main Process
- ✓ `preload.js` - IPC Bridge (Sicherheit)
- ✓ `package.json` - Mit Electron & Build Config
- ✓ `build.bat` - Automatisches Build Script
- ✓ Express Server läuft als Background Process
- ✓ Alle HTML/Assets werden gebündelt

## 🚀 So baust du die App (3 Schritte):

### Schritt 1: PowerShell Execution Policy (nur einmalig)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Bestätige mit `y` und Enter

### Schritt 2: Dependencies installieren
```bash
npm install
```

### Schritt 3: App bauen & exportieren
**Option A - Automatisch (empfohlen):**
```bash
npm run build:win
```

**Option B - Manuell mit Build Script:**
```bash
.\build.bat
```

**Option C - Nur testen ohne zu bauen:**
```bash
npm start
```

---

## 📁 Wo findest du die Dateien?

Nach dem Build sind die EXE-Dateien hier:
```
H_Apps/dist/
├── H Apps-1.0.0-portable.exe    ← Diese brauchst du!
└── H Apps Setup 1.0.0.exe       ← NSIS Installer
```

---

## 🔍 Was passiert beim Build?

1. ✓ Alle JS/CSS/HTML Dateien werden gebündelt
2. ✓ node_modules werden mit eingepackt
3. ✓ Eine EXE wird generiert
4. ✓ Express Server startet automatisch im Hintergrund
5. ✓ Fenster öffnet sich auf `http://localhost:3000`

---

## ⚙️ Wenn was nicht funktioniert:

```bash
# Cleanup und neu starten
rm -r node_modules package-lock.json
npm install
npm run build:win
```

---

## 🎯 Fertig!

Deine Dateien zum Verteilen/Exportieren:
- **Portable (recommended):** `H Apps-1.0.0-portable.exe` - Keine Installation nötig
- **Installer:** `H Apps Setup 1.0.0.exe` - Normale Installation

Speichern, verteilen, fertig! 🎉
