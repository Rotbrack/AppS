document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("contacts-table-body");
  const headerrow = document.getElementById("headerrow");
  const Or = window.origin || window.location.origin;
  const departmentTasks = {
    "R.T-H 1": "Allgemeines Personal für Rotbracks Team",
    "R.V-H 1": "Verwaltungs Personal - Verantwortlich für die überwachung von neuen Personalen Anfragen und allgemeine Verwaltungstätigkeiten",
    "R.V-H 2": "Supportabteilung - Verantwortlich für alle Anfragen an Rotbracks Team (Extern)",
    "R.V-H 3": "Vertrieb - Vermarktung/PR Abteilung",
    "R.V-H 4": "Finanzen - Buchhaltung/Controlling Abteilung",
    "R.UF.H-E 1": "UEFN DEVteam Creators - Verantwortlich für die Erstellung von UEFN Inhalten (begrenzt auf Props/Assets)",
    "R.UF.H-E 2": "UEFN DEVteam Developer - Verantwortlich für die Erstellung von UEFN Inhalten, auch Verse Scripte und komplexe Mechaniken",
    "R.UF.H-A 1": "UEFN DEVteam Adminstartor/Teamleitung - Verantwortlich für die Administration und Leitung aller Mitarbeitenden die mit UEFN arbeiten/mitabeiten",
    "R.UF.H 1": "UEFN DEVteam Controling - Verantwortlich für die Überwachung und Qualitätssicherung aller UEFN Inhalte",
  };
  const authUrl =
    `https://login.microsoftonline.com/8df6274b-ccdd-442f-949f-7b390f973599/oauth2/v2.0/authorize?client_id=9d960f65-3747-4c74-a6fb-7dd8764b08ab&redirect_uri=${Or}&response_type=code&scope=${encodeURIComponent('Directory.AccessAsUser.All Directory.Read.All Directory.ReadWrite.All offline_access User.Read User.Read.All User.ReadBasic.All User.ReadWrite.All Mail.Send.Shared Mail.Send Mail.ReadWrite.Shared Mail.ReadWrite Mail.ReadBasic.Shared Mail.ReadBasic Mail.Read.Shared Mail.Read')}`;
///main.html
  headerrow.innerHTML += `
  <a href="${authUrl}" style="margin-left: 5%"><button class="mdl-button mdl-js-button" style="background-color: #ff0000ff" title="Login">Erneuter Login</button></a>`;
  // Helper: clean URL (remove query string)
  function cleanUrl() {
    try {
      const clean =
        window.location.origin +
        window.location.pathname +
        window.location.hash;
      history.replaceState(null, "", clean);
    } catch (e) {
      /* ignore */
    }
  }

  // Helper: populate table
  function fetchUsersAndPopulate(token) {
    if (!token) return;
    fetch("/api/ms/users", {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.value)) return;
        data.value.forEach((user) => {
          if(user.profileImage) {
            user.profileImage = `<img src="${user.profileImage}" alt="Profile Image" style="height:32px;width:32px;border-radius:50%"></img>`;
          }
          const img = user.profileImage || '<i class="material-icons">person</i>';
          const displayName = user.displayName || user.givenName || "—";
          const surname = user.userType || "No Name";
          const department = user.department || "—";
          const mail = user.mail || user.userPrincipalName || "—";

          tableBody.innerHTML += `
    <tr>
        <td class="mdl-data-table__cell--non-numeric">${img}</td>
        <td class="mdl-data-table__cell--non-numeric">${displayName}</td>
        <td class="mdl-data-table__cell--non-numeric">${surname}</td>
        <td class="mdl-data-table__cell--non-numeric">${department}</td>
        <td class="mdl-data-table__cell--non-numeric">${mail}</td>
        <td>
            <button class="mdl-button mdl-js-button mdl-button--icon" title="Details">
                <i class="material-icons">info</i>
            </button>
        </td>
    </tr>`;
        });
      })
      .catch((error) => console.error("Error fetching users:", error));
    }

    // Clear contacts table
    function clearContactsTable() {
      try { document.getElementById('contacts-table-body').innerHTML = ''; } catch (e) {}
    }

    // Fetch users by department (uses v1.0 with $filter)
    function fetchUsersByDepartment(token, department) {
      if (!token) return;
      if (!department || department === 'ALL') {
        // fetch all
        clearContactsTable();
        fetchUsersAndPopulate(token);
        return;
      }
      clearContactsTable();
      // build OData filter: department eq 'Dept'
      const safeDept = department.replace(/'/g, "\\'");
      const filter = `department eq '${safeDept}'`;
      const url = `/api/ms/user/filter?q=${encodeURIComponent(filter)}`;

      fetch(url, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(data => {
        if (!data || !Array.isArray(data.value)) return;
        document.getElementById('fs2').innerHTML = `
          <div style="font-weight:bold;border-radius:15px">Aufgaben von ${safeDept} : ${departmentTasks[safeDept] || 'Allgemeine Aufgaben'}</div>
          `;
        data.value.forEach(user => {
          const img = user.profileImage ? `<img src="${user.profileImage}" alt="Profile Image" style="height:32px;width:32px;border-radius:50%"></img>` : '<i class="material-icons">person</i>';
          const displayName = user.displayName || user.givenName || '—';
          const surname = user.userType || 'No Name';
          const department = user.department || safeDept || '—';
          const mail = user.mail || user.userPrincipalName || '—';
          
          document.getElementById('contacts-table-body').innerHTML += `
    <tr>
        <td class="mdl-data-table__cell--non-numeric">${img}</td>
        <td class="mdl-data-table__cell--non-numeric">${displayName}</td>
        <td class="mdl-data-table__cell--non-numeric">${surname}</td>
        <td class="mdl-data-table__cell--non-numeric">${department}</td>
        <td class="mdl-data-table__cell--non-numeric">${mail}</td>
        <td>
            <button class="mdl-button mdl-js-button mdl-button--icon" title="Details">
                <i class="material-icons">info</i>
            </button>
        </td>
    </tr>`;
        });
      })
      .catch(err => console.error('Error fetching users by department:', err));
    
  }

  // read token from sessionStorage if present
  let accessToken = null;
  try {
    accessToken = sessionStorage.getItem("accessToken");
    getMSD(accessToken);
  } catch (e) {
    accessToken = null;
  }

  // parse URL params
  try {
    const params = new URLSearchParams(window.location.search);

    // 1) Authorization Code flow: exchange code on backend
    const code = params.get("code");
    if (code) {
      fetch("/exchange-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json && json.access_token) {
            accessToken = json.access_token;
            try {
              sessionStorage.setItem("accessToken", accessToken);
            } catch (e) {}
            cleanUrl();
            fetchUsersAndPopulate(accessToken);
          } else {
            console.error("Token exchange failed", json);
            setTimeout(() => {
              alert(
                "Die Authentifizierung ist fehlgeschlagen. Sie werden zur Anmeldung weitergeleitet. A"
              );
              window.location.href = authUrl;
            }, 1000);
          }
        })
        .catch((err) => {
          console.error("Error exchanging code:", err);
          window.location.href = authUrl;
        });
      return;
    }

    // 2) Implicit/fragment-style: access_token provided as query param
    const tokenFromUrl = params.get("access_token");
    if (tokenFromUrl) {
      accessToken = tokenFromUrl;
      try {
        sessionStorage.setItem("accessToken", accessToken);
      } catch (e) {}
      cleanUrl();
      fetchUsersAndPopulate(accessToken);
      return;
    }
  } catch (e) {
    /* ignore parsing errors */
  }

  // if we already have a token use it
  if (accessToken) {
    fetchUsersAndPopulate(accessToken);
  } else {
    // no token -> redirect to auth
    console.log(
      "Kein Zugriffstoken gefunden, leite zur Authentifizierung weiter..."
    );
    setTimeout(() => {
      alert(
        "Sie werden zur Authentifizierung weitergeleitet. Nach erfolgreichem Login kehren Sie bitte zur Anwendung zurück. B"
      );
      window.location.href = authUrl;
    }, 1000);
  }

  // Department select -> fetch members for selected department
  try {
    const deptSelect = document.getElementById('department-select');
    if (deptSelect) {
      deptSelect.addEventListener('change', () => {
        const token = (() => { try { return sessionStorage.getItem('accessToken'); } catch (e) { return null; } })();
        const dept = deptSelect.value;
        if (!token) {
          // force auth
          alert('Bitte zuerst anmelden (weiterleitung).');
          window.location.href = authUrl;
          return;
        }
        if (dept === 'ALL') {
          clearContactsTable();
          fetchUsersAndPopulate(token);
        } else {
          fetchUsersByDepartment(token, dept);
        }
      });
    }
  } catch (e) { /* ignore */ }

});
