let allItems = [];
let activeCategory = "all";
let searchTerm = "";

async function loadData() {
    try {
        const res = await fetch("./data.json");
        const data = await res.json();

        allItems = data;
        buildCategories(data);
        applyFilters();

        document.getElementById("search").addEventListener("input", (e) => {
            searchTerm = e.target.value.toLowerCase();
            applyFilters();
        });

    } catch (err) {
        console.log("FAILED TO LOAD DATA.JSON", err);
        document.getElementById("grid").innerHTML =
            "<p style='color:#ff6b6b'>Failed to load data.json</p>";
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
        activeCategory === "all" ? "All Tools" : activeCategory;

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
            <a class="download-btn" href="${item.file}" download>⬇ Download</a>
        `;

        grid.appendChild(div);
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- ANIMATED STAR BACKGROUND ---------- */
function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const STAR_COUNT = 140;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        speed: Math.random() * 0.15 + 0.02,
        twinkle: Math.random() * Math.PI * 2
    }));

    function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.twinkle += 0.02;
            const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${Math.max(alpha, 0)})`;
            ctx.fill();

            s.y += s.speed;
            if (s.y > canvas.height) {
                s.y = 0;
                s.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(frame);
    }
    frame();
}

initStars();
loadData();
