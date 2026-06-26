let allItems = [];
let activeCategory = "all";
let searchTerm = "";
let sortMode = "name";
let typeFilter = "all";
let viewMode = "grid";

async function loadData() {
    try {
        const res = await fetch("./data.json");
        const data = await res.json();

        allItems = data;
        buildCategories(data);
        setupLanding(data);
        setupTypeFilter(data);
        setupHeaderControls();
        setupRandomButton();
        setupRequestModal();
        setupChangelog(data);

        const liveCount = document.getElementById("liveCount");
        if (liveCount) liveCount.textContent = `• ${data.length} files`;

        const totalBytes = data.reduce((sum, i) => sum + (i.size || 0), 0);
        const totalSizeEl = document.getElementById("totalSize");
        if (totalSizeEl && totalBytes) {
            totalSizeEl.textContent = `• ${(totalBytes / (1024 ** 3)).toFixed(1)}GB`;
        }

        document.getElementById("search").addEventListener("input", (e) => {
            searchTerm = e.target.value.toLowerCase();
            if (searchTerm) {
                showResults();
                applyFilters();
            } else {
                showLanding();
            }
        });

    } catch (err) {
        console.log("FAILED TO LOAD DATA.JSON", err);
        document.getElementById("grid").innerHTML =
            "<p style='color:#ff6b6b'>Failed to load data.json</p>";
    }
}

function setupTypeFilter(data) {
    const select = document.getElementById("typeSelect");
    if (!select) return;

    const exts = new Set();
    data.forEach(i => {
        const ext = i.file.split(".").pop().toLowerCase();
        if (ext.length <= 5) exts.add(ext);
    });

    [...exts].sort().forEach(ext => {
        const opt = document.createElement("option");
        opt.value = ext;
        opt.textContent = `.${ext}`;
        select.appendChild(opt);
    });

    select.addEventListener("change", () => {
        typeFilter = select.value;
        applyFilters();
    });
}

function setupHeaderControls() {
    const sortSelect = document.getElementById("sortSelect");
    const viewToggle = document.getElementById("viewToggle");
    const grid = document.getElementById("grid");

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            sortMode = sortSelect.value;
            applyFilters();
        });
    }

    if (viewToggle) {
        viewToggle.addEventListener("click", () => {
            const modes = ["grid", "list", "table"];
            const next = modes[(modes.indexOf(viewMode) + 1) % modes.length];
            viewMode = next;
            grid.classList.toggle("list-view", viewMode === "list");
            const icons = { grid: "▦", list: "☰", table: "📋" };
            viewToggle.textContent = icons[viewMode];
            applyFilters();
        });
    }
}

function setupRandomButton() {
    const favBtn = document.getElementById("favBtn");
    if (favBtn) {
        favBtn.addEventListener("click", () => {
            activeCategory = "__favorites__";
            document.getElementById("search").value = "";
            searchTerm = "";
            showResults();
            applyFilters();
        });
    }

    const btn = document.getElementById("randomBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        if (!allItems.length) return;
        const pick = allItems[Math.floor(Math.random() * allItems.length)];
        activeCategory = pick.category;
        searchTerm = pick.name.toLowerCase();
        document.getElementById("search").value = pick.name;
        showResults();
        applyFilters();
    });
}

function setupRequestModal() {
    const btn = document.getElementById("requestBtn");
    const modal = document.getElementById("requestModal");
    const cancel = document.getElementById("requestCancel");
    const send = document.getElementById("requestSend");
    const text = document.getElementById("requestText");
    if (!btn || !modal) return;

    btn.addEventListener("click", () => { modal.style.display = "flex"; });
    cancel.addEventListener("click", () => { modal.style.display = "none"; });

    send.addEventListener("click", async () => {
        const message = text.value.trim();
        if (!message) return;

        send.textContent = "Sending...";
        send.disabled = true;

        try {
            const res = await fetch("https://formspree.io/f/mojodvpz", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ message: message, source: "Neptune tool request" })
            });

            if (res.ok) {
                send.textContent = "Sent ✓";
                setTimeout(() => {
                    modal.style.display = "none";
                    text.value = "";
                    send.textContent = "Send";
                    send.disabled = false;
                }, 1200);
            } else {
                send.textContent = "Failed — try again";
                send.disabled = false;
            }
        } catch (err) {
            send.textContent = "Failed — try again";
            send.disabled = false;
        }
    });

    const aboutBtn = document.getElementById("aboutLink");
    const aboutModal = document.getElementById("aboutModal");
    const aboutClose = document.getElementById("aboutClose");
    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            aboutModal.style.display = "flex";
        });
        aboutClose.addEventListener("click", () => { aboutModal.style.display = "none"; });
    }
}

function setupChangelog(data) {
    const link = document.getElementById("changelogLink");
    const modal = document.getElementById("changelogModal");
    const close = document.getElementById("changelogClose");
    const list = document.getElementById("changelogList");
    if (!link || !modal) return;

    link.addEventListener("click", (e) => {
        e.preventDefault();
        const sorted = [...data]
            .filter(i => i.added)
            .sort((a, b) => b.added - a.added)
            .slice(0, 25);

        list.innerHTML = sorted.map(i => {
            const date = new Date(i.added * 1000).toLocaleDateString();
            return `<div class="changelog-item"><span>${escapeHtml(i.name)}</span><span>${date}</span></div>`;
        }).join("") || "<div>No date info available.</div>";

        modal.style.display = "flex";
    });

    close.addEventListener("click", () => { modal.style.display = "none"; });
}

function isRecent(item) {
    if (!item.added) return false;
    const sevenDays = 7 * 24 * 60 * 60;
    return (Date.now() / 1000 - item.added) < sevenDays;
}

/* ---------- FAVORITES ---------- */
function getFavorites() {
    try { return JSON.parse(localStorage.getItem("neptuneFavorites") || "[]"); }
    catch (e) { return []; }
}

function isFavorite(link) {
    return getFavorites().includes(link);
}

function toggleFavorite(link) {
    let favs = getFavorites();
    if (favs.includes(link)) {
        favs = favs.filter(f => f !== link);
    } else {
        favs.push(link);
    }
    localStorage.setItem("neptuneFavorites", JSON.stringify(favs));
    return favs.includes(link);
}

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".fav-btn");
    if (!btn) return;
    const isFav = toggleFavorite(btn.dataset.link);
    btn.textContent = isFav ? "★" : "☆";
    btn.classList.toggle("active", isFav);
    showToast(isFav ? "Added to favorites" : "Removed from favorites");
    if (activeCategory === "__favorites__") applyFilters();
});

/* ---------- TOAST NOTIFICATIONS ---------- */
function showToast(message) {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

/* ---------- FIRST DOWNLOAD CONFETTI ---------- */
function celebrateFirstDownload() {
    if (localStorage.getItem("neptuneFirstDownloadDone")) return;
    localStorage.setItem("neptuneFirstDownloadDone", "1");

    const colors = ["#5b8cff", "#9b6bff", "#00d4ff", "#ff6ad5"];
    for (let i = 0; i < 40; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (Math.random() * 1.5 + 1.5) + "s";
        piece.style.animationDelay = (Math.random() * 0.3) + "s";
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3000);
    }
    showToast("🎉 First download! Welcome to Neptune");
}

function setupLanding(data) {
    const allCount = data.length;
    const toolsCount = data.filter(i => !i.category.startsWith("SFX - ") && i.category !== "Anime SFX").length;
    const sfxCount = data.filter(i => i.category.startsWith("SFX - ") || i.category === "Anime SFX").length;

    document.getElementById("landingAllCount").textContent = `${allCount} files`;
    document.getElementById("landingToolsCount").textContent = `${toolsCount} files`;
    document.getElementById("landingSfxCount").textContent = `${sfxCount} files`;

    document.querySelectorAll(".landing-box").forEach(box => {
        box.addEventListener("click", () => {
            activeCategory = box.dataset.cat;
            showResults();
            applyFilters();
        });
    });

    document.getElementById("backToHome").addEventListener("click", () => {
        document.getElementById("search").value = "";
        searchTerm = "";
        activeCategory = "all";
        showLanding();
    });
}

function showResults() {
    document.getElementById("landing").style.display = "none";
    document.getElementById("resultsArea").style.display = "block";
}

function showLanding() {
    document.getElementById("landing").style.display = "block";
    document.getElementById("resultsArea").style.display = "none";
}

function buildCategories(data) {
    const counts = {};
    data.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
    });

    const list = document.getElementById("categoryList");
    document.getElementById("countAll").textContent = data.length;

    const sfxCats = [];
    const normalCats = [];

    Object.keys(counts).sort().forEach(cat => {
        if (cat.startsWith("SFX - ") || cat === "Anime SFX") {
            sfxCats.push(cat);
        } else {
            normalCats.push(cat);
        }
    });

    normalCats.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "cat-btn";
        btn.dataset.cat = cat;
        btn.innerHTML = `<span>${cat}</span><span class="count">${counts[cat]}</span>`;
        list.appendChild(btn);
    });

    if (sfxCats.length) {
        const sfxTotal = sfxCats.reduce((sum, c) => sum + counts[c], 0);

        const parent = document.createElement("button");
        parent.className = "cat-btn cat-parent";
        parent.dataset.cat = "__sfx_parent__";
        parent.innerHTML = `<span>SFX <span class="chevron">▸</span></span><span class="count">${sfxTotal}</span>`;
        list.appendChild(parent);

        const subWrap = document.createElement("div");
        subWrap.className = "cat-sublist";
        subWrap.style.display = "none";

        sfxCats.forEach(cat => {
            const label = cat.replace("SFX - ", "");
            const sub = document.createElement("button");
            sub.className = "cat-btn cat-sub";
            sub.dataset.cat = cat;
            sub.innerHTML = `<span>${label}</span><span class="count">${counts[cat]}</span>`;
            subWrap.appendChild(sub);
        });

        list.appendChild(subWrap);

        parent.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = subWrap.style.display !== "none";
            subWrap.style.display = isOpen ? "none" : "flex";
            parent.querySelector(".chevron").textContent = isOpen ? "▸" : "▾";
        });
    }

    list.addEventListener("click", (e) => {
        const btn = e.target.closest(".cat-btn");
        if (!btn || btn.dataset.cat === "__sfx_parent__") return;

        list.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        activeCategory = btn.dataset.cat;
        showResults();
        applyFilters();
    });
}

function applyFilters() {
    let filtered = allItems;

    if (activeCategory === "__all_sfx__") {
        filtered = filtered.filter(i => i.category.startsWith("SFX - ") || i.category === "Anime SFX");
    } else if (activeCategory === "__favorites__") {
        const favs = getFavorites();
        filtered = filtered.filter(i => favs.includes(i.file));
    } else if (activeCategory !== "all") {
        filtered = filtered.filter(i => i.category === activeCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter(i =>
            i.name.toLowerCase().includes(searchTerm) ||
            i.category.toLowerCase().includes(searchTerm)
        );
    }

    if (typeFilter !== "all") {
        filtered = filtered.filter(i => i.file.split(".").pop().toLowerCase() === typeFilter);
    }

    filtered = [...filtered];
    if (sortMode === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "category") {
        filtered.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortMode === "size-desc") {
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else if (sortMode === "size-asc") {
        filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (sortMode === "newest") {
        filtered.sort((a, b) => (b.added || 0) - (a.added || 0));
    }

    const titleMap = { all: "All Tools", __all_sfx__: "SFX", __favorites__: "⭐ Favorites" };
    document.getElementById("sectionTitle").textContent =
        titleMap[activeCategory] || activeCategory;

    document.getElementById("resultCount").textContent =
        `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

    render(filtered);
}

function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
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

    if (viewMode === "table") {
        renderTable(items, grid);
        return;
    }

    items.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "card";
        div.tabIndex = 0;
        div.style.animationDelay = `${Math.min(idx * 0.03, 0.6)}s`;

        const fileName = item.file.split("/").pop();
        const isAudio = /\.(mp3|wav|ogg|m4a|flac)$/i.test(fileName);
        const sizeLabel = formatSize(item.size);
        const recentBadge = isRecent(item) ? `<span class="recent-badge">NEW</span>` : "";
        const isFav = isFavorite(item.file);

        div.innerHTML = `
            <button class="fav-btn ${isFav ? "active" : ""}" data-link="${item.file}">${isFav ? "★" : "☆"}</button>
            <div class="card-name">${escapeHtml(item.name)}</div>
            <div class="card-meta">${escapeHtml(item.category)}${sizeLabel ? " • " + sizeLabel : ""}</div>
            ${isAudio ? `<button class="preview-btn" data-src="${item.file}">▶ Preview</button>` : ""}
            <a class="download-btn" href="${item.file}" data-filename="${escapeHtml(fileName)}">⬇ Download${recentBadge}</a>
            <button class="copy-link-btn" data-link="${item.file}">🔗 Copy link</button>
            <div class="progress-track" style="display:none;">
                <div class="progress-fill"></div>
            </div>
        `;

        addTilt(div);
        grid.appendChild(div);
    });
}

function renderTable(items, container) {
    const table = document.createElement("table");
    table.className = "data-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Date Added</th>
                <th>Size</th>
                <th>Category</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => {
                const fileName = item.file.split("/").pop();
                const dateStr = item.added ? new Date(item.added * 1000).toLocaleDateString() : "—";
                const sizeLabel = formatSize(item.size) || "—";
                const recentBadge = isRecent(item) ? `<span class="recent-badge table-badge">NEW</span>` : "";
                return `
                    <tr>
                        <td>${escapeHtml(item.name)}${recentBadge}</td>
                        <td>${dateStr}</td>
                        <td>${sizeLabel}</td>
                        <td>${escapeHtml(item.category)}</td>
                        <td><a class="table-dl" href="${item.file}" data-filename="${escapeHtml(fileName)}">⬇</a></td>
                    </tr>
                `;
            }).join("")}
        </tbody>
    `;

    container.appendChild(table);
}

/* ---------- COPY LINK ---------- */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-link-btn");
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.link).then(() => {
        const original = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => { btn.textContent = original; }, 1500);
    });
});

/* ---------- KEYBOARD NAV ---------- */
document.addEventListener("keydown", (e) => {
    if (document.activeElement.id === "search") return;
    const cards = [...document.querySelectorAll(".card")];
    if (!cards.length) return;

    const current = document.activeElement.closest(".card");
    let index = cards.indexOf(current);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        index = Math.min(cards.length - 1, index + 1);
        cards[index].focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        index = Math.max(0, index - 1);
        cards[index].focus();
    } else if (e.key === "Enter" && current) {
        const dl = current.querySelector(".download-btn");
        if (dl) dl.click();
    }
});

function addTilt(el) {
    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `translateY(-3px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
    });
    el.addEventListener("mouseleave", () => {
        el.style.transform = "";
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- AUDIO PREVIEW ---------- */
let previewAudio = null;
let previewBtnActive = null;

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".preview-btn");
    if (!btn) return;

    const src = btn.getAttribute("data-src");

    if (previewBtnActive === btn && previewAudio && !previewAudio.paused) {
        previewAudio.pause();
        btn.textContent = "▶ Preview";
        previewBtnActive = null;
        return;
    }

    if (previewAudio) {
        previewAudio.pause();
    }
    if (previewBtnActive) {
        previewBtnActive.textContent = "▶ Preview";
    }

    previewAudio = new Audio(src);
    previewBtnActive = btn;
    btn.textContent = "⏸ Playing...";

    previewAudio.play().catch(() => {
        btn.textContent = "▶ Preview";
    });

    previewAudio.addEventListener("ended", () => {
        btn.textContent = "▶ Preview";
        previewBtnActive = null;
    });
});

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
        celebrateFirstDownload();
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

    let shootingStars = [];

    function spawnShootingStar() {
        const startX = Math.random() * canvas.width;
        shootingStars.push({
            x: startX,
            y: -20,
            len: Math.random() * 80 + 60,
            speed: Math.random() * 8 + 10,
            angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
            life: 1
        });
    }

    setInterval(() => {
        if (Math.random() < 0.6) spawnShootingStar();
    }, 4000);

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

        shootingStars.forEach(s => {
            const dx = Math.cos(s.angle) * s.len;
            const dy = Math.sin(s.angle) * s.len;

            const grad = ctx.createLinearGradient(s.x, s.y, s.x - dx, s.y - dy);
            grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
            grad.addColorStop(1, "rgba(255,255,255,0)");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - dx, s.y - dy);
            ctx.stroke();

            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
            s.life -= 0.012;
        });

        shootingStars = shootingStars.filter(s => s.life > 0 && s.y < canvas.height + 100);

        requestAnimationFrame(frame);
    }
    frame();
}

initStars();
loadData();
initPlanetTracker();
initIntroLoader();
initCursorGlow();
initParallaxPlanets();
initScrollTop();
initSearchShortcut();
initThemes();
initLinksToggle();

function initLinksToggle() {
    const btn = document.getElementById("linksToggle");
    const grid = document.getElementById("linksGrid");
    const chevron = document.getElementById("linksChevron");
    if (!btn || !grid) return;

    btn.addEventListener("click", () => {
        const isOpen = grid.style.display !== "none";
        grid.style.display = isOpen ? "none" : "flex";
        chevron.textContent = isOpen ? "▸" : "▾";
    });
}

/* ---------- THEME SYSTEM ---------- */
function initThemes() {
    const toggle = document.getElementById("settingsToggle");
    const panel = document.getElementById("settingsPanel");
    const grid = document.getElementById("themeGrid");
    if (!toggle || !panel || !grid) return;

    const themes = [
        { name: "Neptune",   accent: "#5b8cff", accent2: "#9b6bff", bg: "#060814", g1: "#5b8cff", g2: "#9b6bff", g3: "#00d4ff" },
        { name: "Mars",      accent: "#ff5b5b", accent2: "#ff9b5b", bg: "#1a0707", g1: "#ff5b5b", g2: "#ff9b5b", g3: "#ff2e2e" },
        { name: "Saturn",    accent: "#e8c27a", accent2: "#caa15a", bg: "#1a1407", g1: "#e8c27a", g2: "#caa15a", g3: "#fff0c2" },
        { name: "Venus",     accent: "#4fbf7a", accent2: "#2f8f5a", bg: "#06140c", g1: "#4fbf7a", g2: "#2f8f5a", g3: "#9bffcf" },
        { name: "Sakura",    accent: "#ff8fc6", accent2: "#ff5ba0", bg: "#1a0712", g1: "#ff8fc6", g2: "#ff5ba0", g3: "#ffd1e8" },
        { name: "Cyberpunk", accent: "#ff2ec4", accent2: "#2ee9ff", bg: "#08060f", g1: "#ff2ec4", g2: "#2ee9ff", g3: "#ffe62e" },
        { name: "Mono",      accent: "#cfcfcf", accent2: "#8a8a8a", bg: "#0a0a0a", g1: "#cfcfcf", g2: "#8a8a8a", g3: "#ffffff" },
        { name: "Sunset",    accent: "#ff7a4f", accent2: "#ffb84f", bg: "#1a0b06", g1: "#ff7a4f", g2: "#ffb84f", g3: "#ff4f9b" },
        { name: "Vaporwave", accent: "#ff6ad5", accent2: "#7a5cff", bg: "#0c0620", g1: "#ff6ad5", g2: "#7a5cff", g3: "#5cf0ff" },
        { name: "Midnight",  accent: "#7a5cff", accent2: "#3a2a8f", bg: "#05040d", g1: "#7a5cff", g2: "#3a2a8f", g3: "#b29bff" },
        { name: "Emerald",   accent: "#2ee9a0", accent2: "#1a9f6e", bg: "#04140e", g1: "#2ee9a0", g2: "#1a9f6e", g3: "#9bffe0" },
        { name: "BloodMoon", accent: "#d63b3b", accent2: "#7a1f1f", bg: "#100404", g1: "#d63b3b", g2: "#7a1f1f", g3: "#ff8a8a" },
        { name: "Arctic",    accent: "#7ad7ff", accent2: "#bfe9ff", bg: "#04101a", g1: "#7ad7ff", g2: "#bfe9ff", g3: "#ffffff" },
        { name: "Lava",      accent: "#ff4500", accent2: "#ffae00", bg: "#140402", g1: "#ff4500", g2: "#ffae00", g3: "#ff0000" },
        { name: "GalaxyTeal",accent: "#2ed6c7", accent2: "#5b8cff", bg: "#04141a", g1: "#2ed6c7", g2: "#5b8cff", g3: "#9bffe9" }
    ];

    function applyTheme(t) {
        const root = document.documentElement.style;
        root.setProperty("--accent", t.accent);
        root.setProperty("--accent-2", t.accent2);
        root.setProperty("--bg", t.bg);
        root.setProperty("--g1", t.g1);
        root.setProperty("--g2", t.g2);
        root.setProperty("--g3", t.g3);
        localStorage.setItem("neptuneTheme", JSON.stringify(t));

        grid.querySelectorAll(".theme-swatch").forEach(s => s.classList.remove("active"));
        const match = grid.querySelector(`[data-name="${t.name}"]`);
        if (match) match.classList.add("active");
    }

    themes.forEach(t => {
        const sw = document.createElement("div");
        sw.className = "theme-swatch";
        sw.title = t.name;
        sw.dataset.name = t.name;
        sw.style.background = `linear-gradient(135deg, ${t.g1}, ${t.g2}, ${t.g3})`;
        sw.addEventListener("click", () => applyTheme(t));
        grid.appendChild(sw);
    });

    toggle.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.getElementById("applyCustom").addEventListener("click", () => {
        const c1 = document.getElementById("c1").value;
        const c2 = document.getElementById("c2").value;
        const c3 = document.getElementById("c3").value;
        const c4 = document.getElementById("c4").value;
        const accent = document.getElementById("accentPick").value;
        const accent2 = document.getElementById("accent2Pick").value;

        applyTheme({
            name: "Custom",
            accent, accent2,
            bg: c4,
            g1: c1, g2: c2, g3: c3
        });
    });

    const saved = localStorage.getItem("neptuneTheme");
    if (saved) {
        try { applyTheme(JSON.parse(saved)); } catch (e) {}
    }
}

/* ---------- INTRO LOADER ---------- */
function initIntroLoader() {
    const loader = document.getElementById("introLoader");
    if (!loader) return;
    setTimeout(() => loader.classList.add("hide"), 1100);
}

/* ---------- CURSOR GLOW ---------- */
function initCursorGlow() {
    const glow = document.getElementById("cursorGlow");
    if (!glow) return;
    window.addEventListener("mousemove", (e) => {
        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";
    });
    window.addEventListener("mouseleave", () => { glow.style.opacity = "0"; });
    window.addEventListener("mouseenter", () => { glow.style.opacity = "1"; });
}

/* ---------- PARALLAX FLOATING PLANETS ---------- */
function initParallaxPlanets() {
    const container = document.getElementById("parallaxPlanets");
    if (!container) return;

    const emojis = ["🪐", "🌑", "✨", "🌌", "⭐"];
    const count = 6;

    for (let i = 0; i < count; i++) {
        const el = document.createElement("span");
        el.className = "parallax-planet";
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `${Math.random() * 100}%`;
        el.style.fontSize = `${Math.random() * 30 + 20}px`;
        el.style.animationDuration = `${Math.random() * 20 + 15}s`;
        el.style.animationDirection = Math.random() > 0.5 ? "alternate" : "alternate-reverse";
        container.appendChild(el);
    }
}

/* ---------- SCROLL TO TOP ---------- */
function initScrollTop() {
    const btn = document.getElementById("scrollTop");
    if (!btn) return;

    window.addEventListener("scroll", () => {
        btn.classList.toggle("visible", window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* ---------- "/" FOCUSES SEARCH ---------- */
function initSearchShortcut() {
    window.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement.id !== "search") {
            e.preventDefault();
            document.getElementById("search").focus();
        }
    });
}



/* ---------- PLANET SCROLL TRACKER ---------- */
function initPlanetTracker() {
    const rail = document.getElementById("planetRail");
    if (!rail) return;

    const planets = [
        { name: "Sun", emoji: "☀️" },
        { name: "Mercury", emoji: "🪨" },
        { name: "Venus", emoji: "🟠" },
        { name: "Earth", emoji: "🌍" },
        { name: "Mars", emoji: "🔴" },
        { name: "Jupiter", emoji: "🟤" },
        { name: "Saturn", emoji: "🪐" },
        { name: "Uranus", emoji: "🩵" },
        { name: "Neptune", emoji: "🔵" },
        { name: "Pluto", emoji: "⚪" }
    ];

    planets.forEach((p, i) => {
        const dot = document.createElement("div");
        dot.className = "planet-dot";
        dot.dataset.index = i;
        dot.innerHTML = `<span class="emoji">${p.emoji}</span><span class="tooltip">${p.name}</span>`;
        dot.addEventListener("click", () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const targetPct = (i + 0.5) / planets.length;
            window.scrollTo({ top: docHeight * targetPct, behavior: "smooth" });
        });
        rail.appendChild(dot);
    });

    const dots = rail.querySelectorAll(".planet-dot");
    let lastIndex = -1;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? scrollTop / docHeight : 0;

        const index = Math.min(
            planets.length - 1,
            Math.floor(pct * planets.length)
        );

        if (index !== lastIndex) {
            lastIndex = index;
            dots.forEach((d, i) => d.classList.toggle("active", i === index));
        }
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
}
