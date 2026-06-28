/* shared.js — used by tools.html and sfx.html */

let allItems = [];
let activeCategory = "all";
let searchTerm = "";

/**
 * isSfxCategory(category) -> true if a category belongs to the SFX section
 * (build.py tags these as "SFX - X" or "Anime SFX")
 */
function isSfxCategory(cat) {
    return cat.startsWith("SFX") || cat === "Anime SFX";
}

async function loadData(sectionFilter) {
    try {
        const res = await fetch("./data.json");
        const data = await res.json();

        const filtered = data.filter(item =>
            sectionFilter === "sfx" ? isSfxCategory(item.category) : !isSfxCategory(item.category)
        );

        allItems = filtered;
        buildCategories(filtered);
        applyFilters();

        document.getElementById("search").addEventListener("input", (e) => {
            searchTerm = e.target.value.toLowerCase();
            applyFilters();
        });

    } catch (err) {
        console.log("FAILED TO LOAD DATA.JSON", err);
        document.getElementById("grid").innerHTML =
            "<p style='color:#b33'>Failed to load data.json</p>";
    }
}

function buildCategories(data) {
    const counts = {};
    data.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
    });

    const list = document.getElementById("categoryList");
    document.getElementById("countAll").textContent = data.length;

    Object.keys(counts).sort().forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "cat-btn";
        btn.dataset.cat = cat;
        btn.innerHTML = `<span>${cat}</span><span class="count">${counts[cat]}</span>`;
        list.appendChild(btn);
    });

    list.addEventListener("click", (e) => {
        const btn = e.target.closest(".cat-btn");
        if (!btn) return;

        list.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        activeCategory = btn.dataset.cat;
        applyFilters();
    });
}

function applyFilters() {
    let filtered = allItems;

    if (activeCategory !== "all") {
        filtered = filtered.filter(i => i.category === activeCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter(i =>
            i.name.toLowerCase().includes(searchTerm) ||
            i.category.toLowerCase().includes(searchTerm)
        );
    }

    document.getElementById("sectionTitle").textContent =
        activeCategory === "all" ? "All" : activeCategory;

    document.getElementById("resultCount").textContent =
        `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

    render(filtered);
}

function render(items) {
    const grid = document.getElementById("grid");
    const empty = document.getElementById("emptyState");
    grid.innerHTML = "";

    if (items.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <div class="card-name">${escapeHtml(item.name)}</div>
            <div class="card-meta">${escapeHtml(item.category)}</div>
            <a class="download-btn" href="${item.file}" download>Download</a>
        `;

        grid.appendChild(div);
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
