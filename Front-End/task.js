const baseURL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("jwt");


if (!token) window.location.href = "index.html";


function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}


const user = parseJwt(token);
if (!user || !user.id) {
    localStorage.removeItem("jwt");
    window.location.href = "index.html";
}
document.getElementById("user-name").innerText = user.email;


document.getElementById("btn-logout").addEventListener("click", () => {
    localStorage.removeItem("jwt");
    window.location.href = "index.html";
});


async function fetchTasks(priorityFilter = '', statusFilter = '') {
    try {
        const res = await fetch(`${baseURL}/tasks`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (res.status === 401) throw new Error("Session expirée. Connectez-vous à nouveau.");

        const allTasks = await res.json();


        let tasks = allTasks.filter(t => {
            if (!t.owner) return false;
            const ownerId = Number(t.owner.split("/").pop());
            return ownerId === user.id;
        });

        if (priorityFilter) tasks = tasks.filter(t => t.priority == priorityFilter);

        if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);

        tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        renderTasks(tasks);

    } catch (err) {
        alert(err.message);
    }
}


document.getElementById("btn-collaboration").addEventListener("click", function () {
    window.location.href = "Collaboration.html";
});
document.getElementById("btn-collaboration-dashboard").addEventListener("click", function () {
    window.location.href = "collaboration-dashboard.html";
});


function priorityLabel(p) {
    return {
        1: "Low",
        2: "Medium",
        3: "High"
    } [p] || "Unknown";
}

function renderTasks(tasks) {
    const tbody = document.querySelector("#task-table tbody");
    tbody.innerHTML = "";

    tasks.forEach(task => {
        const deadline = task.dueDate ? task.dueDate.split("T")[0] : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${task.title}</td>
            <td>${task.description || ""}</td>
            <td>${deadline}</td>
        <td>${priorityLabel(task.priority)}</td>
          <td>${task.status || "pending"}</td>

            <td>
                <button onclick="editTask(${task.id})">Modifier</button>
                <button onclick="deleteTask(${task.id})">Supprimer</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


document.getElementById("btn-add-task").addEventListener("click", async () => {
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-desc").value.trim();
    const dueDate = document.getElementById("task-deadline").value;
    const priority = parseInt(document.getElementById("task-priority").value);

    if (!title || !dueDate) return alert("Veuillez remplir le titre et la date limite");

    try {
        const res = await fetch(`${baseURL}/tasks/add`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                description,
                dueDate,
                priority,
                ownerId: user.id
            })
        });

        if (res.status === 400) {
            const err = await res.json();
            throw new Error(err.detail || "Données invalides");
        }

        if (!res.ok) throw new Error("Erreur lors de la création de la tâche");
        fetchTasks();
        document.getElementById("task-title").value = '';
        document.getElementById("task-desc").value = '';
        document.getElementById("task-deadline").value = '';
        document.getElementById("task-priority").value = 1;

    } catch (err) {
        alert(err.message);
    }
});

// ----- Supprimer tâche -----
async function deleteTask(id) {
    if (!confirm("Supprimer cette tâche ?")) return;
    try {
        const res = await fetch(`${baseURL}/tasks/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error("Erreur lors de la suppression");
        fetchTasks();
    } catch (err) {
        alert(err.message);
    }
}


async function editTask(id) {
    try {
        const res = await fetch(`${baseURL}/tasks/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        if (!res.ok) throw new Error("Erreur lors du chargement de la tâche");

        const task = await res.json();
        const newTitle = prompt("Titre :", task.title);
        if (newTitle === null) return;
        const newDesc = prompt("Description :", task.description || "");
        if (newDesc === null) return;
        const newDueDate = prompt("Date limite (YYYY-MM-DD) :", task.dueDate ? task.dueDate.split('T')[0] : "");
        if (newDueDate === null) return;
        const newPriority = prompt("Priorité (1-5) :", task.priority);
        if (newPriority === null) return;
        const newStatus = prompt("Statut (pending, in_progress, done) :", task.status || "pending");
        if (newStatus === null) return;

        const updateRes = await fetch(`${baseURL}/tasks/${id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: newTitle,
                description: newDesc,
                dueDate: newDueDate,
                priority: parseInt(newPriority),
                status: newStatus
            })
        });

        if (!updateRes.ok) throw new Error("Erreur lors de la mise à jour");
        fetchTasks();

    } catch (err) {
        alert(err.message);
    }
}


document.getElementById("btn-filter").addEventListener("click", () => {
    const priority = document.getElementById("filter-priority").value;
    const status = document.getElementById("filter-status").value;
    fetchTasks(priority, status);
});


fetchTasks();