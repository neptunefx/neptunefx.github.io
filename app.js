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

        const liveCount = document.getElementById("liveCount");
        if (liveCount) liveCount.textContent = `• ${data.length} files`;

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

    items.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "card";
        div.style.animationDelay = `${Math.min(idx * 0.03, 0.6)}s`;

        const fileName = item.file.split("/").pop();
        const isAudio = /\.(mp3|wav|ogg|m4a|flac)$/i.test(fileName);

        div.innerHTML = `
            <div class="card-name">${escapeHtml(item.name)}</div>
            <div class="card-meta">${escapeHtml(item.category)}</div>
            ${isAudio ? `<button class="preview-btn" data-src="${item.file}">▶ Preview</button>` : ""}
            <a class="download-btn" href="${item.file}" data-filename="${escapeHtml(fileName)}">⬇ Download</a>
            <div class="progress-track" style="display:none;">
                <div class="progress-fill"></div>
            </div>
        `;

        addTilt(div);
        grid.appendChild(div);
    });
}

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
