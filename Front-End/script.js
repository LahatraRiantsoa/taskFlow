const baseURL = "http://127.0.0.1:8000/api";


document.getElementById("btn-login")?.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const res = await fetch(`${baseURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.status === 200) {
          
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    const tokenData = JSON.parse(atob(data.token.split(".")[1]));
    if (tokenData.roles.includes("ROLE_ADMIN")) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "dashboard.html";
    }
    } else {
        document.getElementById("login-error").innerText = data.error || "Erreur de connexion";
    }
});


document.getElementById("btn-register")?.addEventListener("click", async () => {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    const res = await fetch(`${baseURL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.status === 201) {
        document.getElementById("reg-success").innerText = "Utilisateur créé ! Connectez-vous.";
        document.getElementById("reg-error").innerText = "";
    } else {
        document.getElementById("reg-error").innerText = data.error || "Erreur d'inscription";
        document.getElementById("reg-success").innerText = "";
    }
});


if (window.location.pathname.endsWith("dashboard.html")) {
    const token = localStorage.getItem("jwt");
    if (!token) window.location.href = "index.html";

    const user = JSON.parse(localStorage.getItem("user"));
    document.getElementById("user-name").innerText = user.name;
    document.getElementById("user-email").innerText = user.email;
    document.getElementById("user-roles").innerText = user.roles.join(", ");

    document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });
}
