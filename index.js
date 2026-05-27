const express = require("express");
const session = require("express-session");
const msal = require("@azure/msal-node");
const fs = require("fs");
const crypto = require("crypto");
//https://www.npmjs.com/package/psn-api?activeTab=readme
const psnService = require("./psnService");
//const psn_accountToken = require("./psn_accountToken.json");
const apps = express();


const bodyParser = require("body-parser");
const ExcelJS = require("exceljs");

apps.use(bodyParser.json());
apps.use(express.static("public"));


apps.use(express.json());
apps.use(session({
    secret: "super-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
    },
}));

// 🔑 MSAL Config
const msalConfig = {
    auth: {
        clientId: "903c2771-f72c-496e-b2a3-0fb25f4f625e",
        authority: "https://login.microsoftonline.com/8df6274b-ccdd-442f-949f-7b390f973599",
        clientSecret: "fZv8Q~UwDHI33biExdKPt7YGtquI3~HvxZGuHaQ4",
    }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

const scopes = ["User.Read"];

// 🧠 Rollen prüfen
function getUserRoles(account) {
    // Rollen kommen im ID Token
    return account.idTokenClaims?.roles || [];
}

function base64URLEncode(buffer) {
    return buffer.toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest();
}

function createPkceCodes() {
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));
    return { verifier, challenge };
}

function sendAuthCallbackError(req, res, routeName) {
    if (req.query.error) {
        console.error(`${routeName} Fehler:`, req.query.error, req.query.error_description || req.query.error_description, req.query);
        return res.status(400).send(`Auth-Fehler: ${req.query.error}${req.query.error_description ? ` - ${req.query.error_description}` : ''}`);
    }
    console.error(`${routeName} ohne code:`, req.query);
    return res.status(400).send("Auth-Code fehlt. Bitte prüfe Redirect-URI, App-Registrierung und Session-Cookie.");
}

// 🎯 Rollen → Ziel-WebApp Mapping
const roleRedirectMap = {
    "user.fullaccess": "http://localhost:3000/admins",
    "user.psn.dashboard": "http://localhost:3000/psn-dashboard-heystan",
    "user.evi": "http://localhost:3000/evi",
    "user.psn.trofie.beta.access": "http://localhost:3000/admins/TrofyBETA",
    "user.splan_excel_tool": "http://localhost:3000/IE/Generator",
};


function randomNumber() {
    return Math.floor(Math.random() * 100000);
}

// 👉 Excel Datei erstellen
async function createExcel(fileName, selectedItems) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Materialliste");

    sheet.columns = [
        { header: "Name", key: "name", width: 20 },
        { header: "Typ", key: "type", width: 20 },
        { header: "Menge", key: "qty", width: 10 },
    ];

    selectedItems.forEach(item => {
        sheet.addRow(item);
    });

    // Formatierung
    sheet.getRow(1).font = { bold: true };
    sheet.eachRow((row) => {
        row.alignment = { vertical: "middle", horizontal: "center" };
    });

    const filePath = path.join(__dirname, `${fileName}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
}

// 👉 Splan8 Datei (Dummy XML Format)
function createSplan(fileName, selectedItems) {
    const content = `
<SPLAN>
    <PROJECT name="${fileName}">
        ${selectedItems.map(item => `
        <COMPONENT>
            <NAME>${item.name}</NAME>
            <TYPE>${item.type}</TYPE>
            <QTY>${item.qty}</QTY>
        </COMPONENT>
        `).join("")}
    </PROJECT>
</SPLAN>
`;

    const filePath = path.join(__dirname, `${fileName}.spl8`);
    fs.writeFileSync(filePath, content);
    return filePath;
}

// 👉 API
apps.post("/generate", async (req, res) => {
    const { fileName, items } = req.body;

    const finalName = `${fileName}_${randomNumber()}`;

    try {
        const excelPath = await createExcel(finalName, items);
        const splanPath = createSplan(finalName, items);

        res.json({
            message: "Dateien erstellt",
            excel: excelPath,
            splan: splanPath
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


apps.get("/evi", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }
    if (req.session.roles.includes("user.evi")) {
        res.sendFile("/H/Apps/evi/main.html", { root: __dirname });
    } else {
        return res.status(403).send("Kein Zugriff");
    }
});

apps.get("/IE/Generator", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }
    if (req.session.roles.includes("user.splan_excel_tool")) {
        res.sendFile("/H/Apps/db_user/index.html", { root: __dirname });
    } else {
        return res.status(403).send("Kein Zugriff");
    }
});

apps.get("/api/ms/user/filter", (req, res) => {
    req.query.q = req.query.q || "";
    fetch(`https://graph.microsoft.com/v1.0/users?$filter=${req.query.q}`, {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => res.status(200).json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

apps.get("/api/ms/users", (req, res) => {
    fetch("https://graph.microsoft.com/beta/users", {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => res.status(200).json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

apps.get("/api/ms/allperms", (req, res) => {
    res.status(200).json({ roles: [{ name: "user.fullaccess" }, { name: "user.psn.dashboard" }] });
});

apps.get("/api/ms/user/:id/roles", (req, res) => {
    const userId = req.params.id;
    fetch(`https://graph.microsoft.com/v1.0/users/${userId}/appRoleAssignments`, {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }    })
    .then(response => response.json())
    .then(data => res.status(200).json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});

apps.post("/api/ms/user/:id/roles", (req, res) => {
    const userId = req.params.id;
    const { permissions } = req.body;
    fetch(`https://graph.microsoft.com/v1.0/users/${userId}/appRoleAssignments`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "principalId": userId,
            "resourceId": "903c2771-f72c-496e-b2a3-0fb25f4f625e",
            "appRoleId": permissions === "user.fullaccess" ? "user.psn.dashboard" : "user.psn.dashboard"
        })
    })
    .then(response => response.json())
    .then(data => res.status(200).json(data))
    .catch(err => res.status(500).json({ error: err.message }));
});


apps.get("/admins", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }

    const roles = req.session.roles;

    let links = "";

        if (roles.includes("user.fullaccess")) {
            res.sendFile("/H/Apps/admin/admin.html", { root: __dirname });
        }else{
            return res.status(403).send("Kein Zugriff");
        }
});

apps.get("/img/:filename", (req, res) => {
    res.sendFile(`/H/Apps/img/${req.params.filename}`, { root: __dirname });
});

apps.get("/admins/TrofyBETA", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }

    const roles = req.session.roles;

    let links = "";

        if (roles.includes("user.fullaccess")) {
            res.sendFile("/H/Apps/admin/tropfy_test.html", { root: __dirname });
        }else if(roles.includes("user.psn.trofie.beta.access")){
            res.sendFile("/H/Apps/admin/tropfy_test.html", { root: __dirname });
        }else{
            return res.status(403).send("Kein Zugriff");
        }
});

apps.get("/admins/userManagement", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }

    const roles = req.session.roles;

    let links = "";

        if (roles.includes("user.fullaccess")) {
            res.sendFile("/H/Apps/admin/userM.html", { root: __dirname });
        }else{
            return res.status(403).send("Kein Zugriff");
        }
});

apps.get("/psn-dashboard-heystan", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }
    if (req.session.roles.includes("user.psn.dashboard")) {
        res.sendFile("/H/Apps/psn/main.html", { root: __dirname });
    } else {
        return res.status(403).send("Kein Zugriff");
    }
});

// 🏠 Startseite
apps.get("/", (req, res) => {
    if (req.session.accessToken) {
        res.redirect("/dashboard");
    } else {
        res.redirect("/login");
    }
});

// 🔐 Login
apps.get("/login", async (req, res) => {
    const pkceCodes = createPkceCodes();
    req.session.pkceCodeVerifier = pkceCodes.verifier;

    const url = await pca.getAuthCodeUrl({
        scopes,
        redirectUri: "http://localhost:3000/auth/callback",
        codeChallenge: pkceCodes.challenge,
        codeChallengeMethod: "S256",
    });

    req.session.save((err) => {
        if (err) {
            console.error("Session save error:", err);
            return res.status(500).send("Session konnte nicht gespeichert werden.");
        }
        res.redirect(url);
    });
});

// 🔄 Callback
apps.get("/auth/callback", async (req, res) => {
    if (!req.query.code) {
        return sendAuthCallbackError(req, res, "Callback");
    }

    const codeVerifier = req.session.pkceCodeVerifier;
    if (!codeVerifier) {
        console.error("PKCE Verifier fehlt in Session");
        return res.status(400).send("PKCE Verifier fehlt. Bitte starte den Login-Vorgang erneut.");
    }

    try {
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes,
            redirectUri: "http://localhost:3000/auth/callback",
            codeVerifier,
        });

        req.session.accessToken = tokenResponse.accessToken;
        req.session.account = tokenResponse.account;
        req.session.roles = getUserRoles(tokenResponse.account);

        delete req.session.pkceCodeVerifier;

        res.redirect("/dashboard");

    } catch (err) {
        console.error("acquireTokenByCode Fehler:", err, {
            errorCode: err.errorCode,
            suberror: err.suberror,
            statusCode: err.statusCode,
            stack: err.stack,
        });
        res.status(500).send(`Auth-Fehler: ${err.errorCode || err.name || "unknown"} - ${err.message}`);
    }
});

apps.get("/auth/callback/admindash", async (req, res) => {
    if (!req.query.code) {
        return sendAuthCallbackError(req, res, "Admin-Callback");
    }

    const codeVerifier = req.session.pkceCodeVerifier;
    if (!codeVerifier) {
        console.error("PKCE Verifier fehlt in Session (Admin Callback)");
        return res.status(400).send("PKCE Verifier fehlt. Bitte starte den Login-Vorgang erneut.");
    }

    try {
        const tokenResponse = await pca.acquireTokenByCode({
            code: req.query.code,
            scopes,
            redirectUri: "http://localhost:3000/auth/callback/admindash",
            codeVerifier,
        });

        req.session.accessToken = tokenResponse.accessToken;
        req.session.account = tokenResponse.account;
        req.session.roles = getUserRoles(tokenResponse.account);

        delete req.session.pkceCodeVerifier;

        res.redirect("/psn-dashboard-heystan");

    } catch (err) {
        console.error("acquireTokenByCode Fehler (admindash):", err, {
            errorCode: err.errorCode,
            suberror: err.suberror,
            statusCode: err.statusCode,
            stack: err.stack,
        });
        res.status(500).send(`Auth-Fehler: ${err.errorCode || err.name || "unknown"} - ${err.message}`);
    }
});

// 🧭 Dashboard mit RBAC
apps.get("/dashboard", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }

    const roles = req.session.roles;

    let links = "";

    roles.forEach(role => {
        if (roleRedirectMap[role]) {
            if(role === "user.fullaccess"){
                links += `
            <a class="tool-card" href="/go/${role}">
                <div class="tool-banner">Admin Dashboard</div>
                <img src="/img/UserManagement.png" alt="Benutzerverwaltung Bild">
                <div class="tool-card-content">
                    <h2>Admin Dashboard Zugang</h2>
                </div>
            </a>`;
            }else if(role === "user.psn.dashboard"){
                links += `
            <a class="tool-card" href="/go/${role}">
                <div class="tool-banner">PSN Dashboard</div>
                <img src="/img/TROPFIES.jpg" alt="PSN Dashboard Bild">
                <div class="tool-card-content">
                    <h2>PSN Token Upload Zugang</h2>
                </div>
            </a>`;
            }else if(role === "user.evi"){
                links += `
            <a class="tool-card" href="/go/${role}">
                <div class="tool-banner">EVI</div>
                <img src="/img/EVI.png" alt="EVI Bild">
                <div class="tool-card-content">
                    <h2>EVI Zugang</h2>
                </div>
            </a>`;
            }else if(role === "user.psn.trofie.beta.access"){
                links += `
            <a class="tool-card" href="/go/${role}">
                <div class="tool-banner">Trofie Beta</div>
                <img src="/img/TROPFIES.jpg" alt="Trofie Beta Bild">
                <div class="tool-card-content">
                    <h2> Trofie Beta Zugang</h2>
                </div>
            </a>`;

            }else if(role === "user.splan_excel_tool"){
                links += `
            <a class="tool-card" href="/go/${role}">
                <div class="tool-banner">SPlan Excel Tool</div>
                <img src="/img/RotbracksTeamLogo.png" alt="SPlan Excel Tool Bild">
                <div class="tool-card-content">
                    <h2>SPlan Excel Tool Zugang</h2>
                </div>
            </a>`;
            }
        }
    });

    res.send(`
        <style>
        body {
            margin: 0;
            font-family: Inter, system-ui, sans-serif;
            background: #f4f7fb;
            color: #1f2937;
        }
        header {
            padding: 2rem 1.5rem;
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            text-align: center;
        }
        header h1 {
            margin: 0 0 0.5rem;
            font-size: 2rem;
            color: #111827;
        }
        header p {
            margin: 0;
            color: #4b5563;
            max-width: 720px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.6;
        }
        .overview {
            display: grid;
            gap: 1.5rem;
            padding: 2rem 1.5rem 3rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        .tool-card {
            display: flex;
            flex-direction: column;
            text-decoration: none;
            color: inherit;
            background: #ffffff;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .tool-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 40px rgba(15, 23, 42, 0.12);
        }
        .tool-banner {
            padding: 1rem 1.25rem;
            font-weight: 700;
            color: #ffffff;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }
        .tool-image {
            min-height: 180px;
            background: linear-gradient(180deg, #eef2ff 0%, #eff6ff 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6366f1;
            font-size: 0.9rem;
        }
        .tool-card-content {
            padding: 1.5rem 1.25rem 1.75rem;
        }
        .tool-card-content h2 {
            margin: 0 0 0.75rem;
            font-size: 1.35rem;
        }
        .tool-card-content p {
            margin: 0;
            color: #475569;
            line-height: 1.7;
        }
        @media (min-width: 720px) {
            .overview {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        @media (min-width: 1080px) {
            .overview {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
        }
        </style>
        <header>
            <h1>Dashboard</h1>
            <p>User: ${req.session.account.username}</p>
            <p>Deine Rollen: ${roles.join(", ")}</p>
            <a href="/logout">Logout</a>
        </header>
        <main class="overview">
            ${links}
        </main>
        
    `);
});

// 🚀 Weiterleitung basierend auf Rolle
apps.get("/go/:role", (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect("/login");
    }

    const role = req.params.role;
    const roles = req.session.roles;

    if (!roles.includes(role)) {
        return res.status(403).send("Kein Zugriff");
    }

    const targetApp = roleRedirectMap[role];

    if (!targetApp) {
        return res.status(404).send("Keine App für Rolle");
    }

    // ⚠️ WICHTIG: Token NICHT einfach via URL senden!
    // Demo-Lösung (nicht prod-ready):
    res.redirect(`${targetApp}`);
});

// PSN-API Basis-Endpunkte
apps.post("/api/psn/auth/npsso", async (req, res) => {
    const { npsso } = req.body;
    if (!npsso) {
        return res.status(400).json({ error: "npsso fehlt" });
    }

    try {
        const authorization = await psnService.authFromNpsso(npsso);
        req.session.psnAuth = authorization;
        const tokenData = JSON.stringify({
            accessToken: authorization.accessToken,
            refreshToken: authorization.refreshToken,
            expiresIn: authorization.expiresIn,
        });
        fs.readFile("psn_accountToken.json", "utf-8", (err, data) => {
            if (err) {
                console.error("Fehler beim Speichern des Tokens:", err);
            } else {
                fs.writeFile("psn_accountToken.json", tokenData, (err) => {
                    if (err) {
                        console.error("Fehler beim Aktualisieren des Tokens:", err);
                    }
                });
            }
        });
        res.json({
            message: "PSN authentifiziert",
            accessToken: authorization.accessToken,
            refreshToken: authorization.refreshToken,
            expiresIn: authorization.expiresIn,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/auth/load-token", (req, res) => {
    console.log("[LOAD-TOKEN] Versuche PSN Token aus Datei zu laden...");
    try {
        const tokenData = fs.readFileSync("psn_accountToken.json", "utf-8");
        const auth = JSON.parse(tokenData);
        req.session.psnAuth = auth;
        console.log("[LOAD-TOKEN] Token erfolgreich geladen");
        res.json({ 
            message: "PSN Token aus Datei geladen", 
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            expiresIn: auth.expiresIn
        });
    } catch (err) {
        console.error("[LOAD-TOKEN] Fehler:", err.message);
        res.status(500).json({ error: "Token-Datei konnte nicht geladen werden", details: err.message });
    }
});

apps.post("/api/psn/auth/refresh", async (req, res) => {
    const refreshToken = req.body.refreshToken || req.session.psnAuth?.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken fehlt" });
    }

    try {
        const authorization = await psnService.refreshAuth(refreshToken);
        req.session.psnAuth = authorization;
        res.json(authorization);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/search", async (req, res) => {
    const query = req.query.q;
    console.log("[SEARCH] Suchanfrage für:", query);
    
    if (!query) {
        console.log("[SEARCH] Fehler: Query q fehlt");
        return res.status(400).json({ error: "Query q fehlt" });
    }

    const accessToken = req.session.psnAuth?.accessToken;
    console.log("[SEARCH] AccessToken vorhanden:", !!accessToken);
    
    if (!accessToken) {
        console.log("[SEARCH] Fehler: Kein PSN Token in Session");
        return res.status(401).json({ error: "PSN Token nicht vorhanden. Bitte erst authentifizieren." });
    }

    try {
        console.log("[SEARCH] Rufe searchUser auf mit Query:", query);
        const data = await psnService.searchUser(query, accessToken);
        console.log("[SEARCH] Erfolgreich erhalten:", !!data);
        res.json(data);
    } catch (err) {
        console.error("[SEARCH] Fehler:", err.message, err.stack);
        res.status(500).json({ error: err.message, details: err.toString() });
    }
});

apps.get("/api/psn/profile/:accountId", async (req, res) => {
    const accountId = req.params.accountId;
    if (!accountId) {
        return res.status(400).json({ error: "accountId fehlt" });
    }

    try {
        const data = await psnService.getProfileByAccountId(accountId, req.session.psnAuth?.accessToken);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/user/:accountId/titles", async (req, res) => {
    const accountId = req.params.accountId;
    console.log("[USER-TITLES] Anfrage für accountId:", accountId);
    
    if (!accountId) {
        console.log("[USER-TITLES] Fehler: accountId fehlt");
        return res.status(400).json({ error: "accountId fehlt" });
    }

    const accessToken = req.session.psnAuth?.accessToken;
    console.log("[USER-TITLES] AccessToken vorhanden:", !!accessToken);
    
    if (!accessToken) {
        console.log("[USER-TITLES] Fehler: Kein PSN Token in Session");
        return res.status(401).json({ error: "PSN Token nicht vorhanden. Bitte erst authentifizieren." });
    }

    try {
        console.log("[USER-TITLES] Rufe getUserTitles auf mit accountId:", accountId);
        const data = await psnService.getUserTitles(accessToken, accountId);
        console.log("[USER-TITLES] Erfolgreich erhalten:", !!data);
        res.json(data);
    } catch (err) {
        console.error("[USER-TITLES] Fehler:", err.message, err.stack);
        res.status(500).json({ error: err.message, details: err.toString() });
    }
});

apps.get("/api/psn/user/:accountId/trophy-summary", async (req, res) => {
    const accountId = req.params.accountId;
    console.log("[TROPHY-SUMMARY] Anfrage für accountId:", accountId);
    
    if (!accountId) {
        console.log("[TROPHY-SUMMARY] Fehler: accountId fehlt");
        return res.status(400).json({ error: "accountId fehlt" });
    }

    const accessToken = req.session.psnAuth?.accessToken;
    console.log("[TROPHY-SUMMARY] AccessToken vorhanden:", !!accessToken);
    
    if (!accessToken) {
        console.log("[TROPHY-SUMMARY] Fehler: Kein PSN Token in Session");
        return res.status(401).json({ error: "PSN Token nicht vorhanden. Bitte erst authentifizieren." });
    }

    try {
        console.log("[TROPHY-SUMMARY] Rufe getTrophyProfileSummary auf mit accountId:", accountId);
        const data = await psnService.getTrophyProfileSummary(accountId, accessToken);
        console.log("[TROPHY-SUMMARY] Erfolgreich erhalten:", !!data);
        res.json(data);
    } catch (err) {
        console.error("[TROPHY-SUMMARY] Fehler:", err.message, err.stack);
        res.status(500).json({ error: err.message, details: err.toString() });
    }
});

apps.get("/api/psn/user/:accountId/trophies/:titleId", async (req, res) => {
    const accountId = req.params.accountId;
    const titleId = req.params.titleId;

    if (!accountId) {
        return res.status(400).json({ error: "accountId fehlt" });
    }
    if (!titleId) {
        return res.status(400).json({ error: "titleId fehlt" });
    }

    try {
        const data = await psnService.getTrophiesForTitle(accountId, titleId, req.session.psnAuth?.accessToken);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/me/titles", async (req, res) => {
    try {
        const data = await psnService.getMyTitles(req.session.psnAuth?.accessToken);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/me/trophies/:titleId", async (req, res) => {
    const titleId = req.params.titleId;
    if (!titleId) {
        return res.status(400).json({ error: "titleId fehlt" });
    }

    try {
        const accountId = "me";
        const data = await psnService.getTrophiesForTitle(accountId, titleId, req.session.psnAuth?.accessToken);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apps.get("/api/psn/me/trophy-summary", async (req, res) => {
    try {
        const data = await psnService.getTrophyProfileSummary("me", req.session.psnAuth?.accessToken);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//eMLjTczL0I8hNGgx55P4xmX0oiNJvTVSRI4M54jnUSPB1Nz8MUXWfX764me8g4c7/
// 🚪 Logout
apps.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

apps.listen(3000, () => {
    console.log("Gateway läuft auf http://localhost:3000");
    fs.readFile("psn_accountToken.json", "utf-8", (err, data) => {
        if (err) {console.error("Fehler beim Lesen des Tokens:", err);}
        const d = JSON.parse(data);
        psnService.refreshAuth(d.refreshToken).then(auth => {
            console.log("PSN Auth erfolgreich:", {
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
                expiresIn: auth.expiresIn,
            });
            fs.writeFile("psn_accountToken.json", JSON.stringify({
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
                expiresIn: auth.expiresIn,
            }), (err) => {
                if (err) {console.error("Fehler beim Aktualisieren des Tokens:", err);}
            });
        }).catch(err => {
        console.error("PSN Auth Fehler:", err);
        });
        
    });
});