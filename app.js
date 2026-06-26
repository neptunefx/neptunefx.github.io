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

        const fileName = item.file.split("/").pop();

        div.innerHTML = `
            <div class="card-name">${escapeHtml(item.name)}</div>
            <div class="card-meta">${escapeHtml(item.category)}</div>
            <a class="download-btn" href="${item.file}" data-filename="${escapeHtml(fileName)}">⬇ Download</a>
            <div class="progress-track" style="display:none;">
                <div class="progress-fill"></div>
            </div>
        `;

        grid.appendChild(div);
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- FORCE CORRECT FILENAME ON DOWNLOAD + PROGRESS BAR (cross-origin safe) ---------- */
document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".download-btn");
    if (!btn) return;

    e.preventDefault();
    const url = btn.getAttribute("href");
    const filename = btn.getAttribute("data-filename") || "download";
    const card = btn.closest(".card");
    const track = card ? card.querySelector(".progress-track") : null;
    const fill = card ? card.querySelector(".progress-fill") : null;

    const originalText = btn.textContent;
    btn.textContent = "Starting...";
    btn.classList.add("disabled");
    if (track) {
        track.style.display = "block";
        fill.style.width = "0%";
    }

    try {
        const res = await fetch(url);
        const total = Number(res.headers.get("content-length")) || 0;

        let loaded = 0;
        const reader = res.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;

            if (total) {
                const pct = Math.round((loaded / total) * 100);
                if (fill) fill.style.width = pct + "%";
                btn.textContent = `${pct}%`;
            } else {
                btn.textContent = `${(loaded / 1048576).toFixed(1)} MB`;
            }
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(blobUrl);
        btn.textContent = "Done ✓";
    } catch (err) {
        console.log("Download failed", err);
        btn.textContent = "Failed — retry";
    } finally {
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove("disabled");
            if (track) {
                track.style.display = "none";
                fill.style.width = "0%";
            }
        }, 2000);
    }
});

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
