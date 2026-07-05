// Global State Storage
let state = {
    levels: [],
    players: [],
    activeLevelId: null
};

// Mode mapping helper for CSS classes
const modeClassMap = {
    "Shipcopter": "badge-ship",
    "Swingcopter": "badge-swing",
    "Ufocopter": "badge-ufo",
    "Cubecopter": "badge-cube",
    "Robotcopter": "badge-robot",
    "RobTop Swing": "badge-robtop",
    "Spidercopter": "badge-spider"
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initRouter();
    loadData();
});

// SPA Hash Routing Engine
function initRouter() {
    const handleRoute = () => {
        const hash = window.location.hash || '#home';
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        const navbar = document.getElementById('main-nav');

        if (hash === '#home') {
            document.getElementById('view-home').classList.remove('hidden');
            navbar.classList.remove('in-use');
        } else if (hash === '#list') {
            document.getElementById('view-list').classList.remove('hidden');
            document.getElementById('nav-list').classList.add('active');
            navbar.classList.add('in-use');
            if (state.levels.length > 0 && state.activeLevelId === null) {
                selectLevel(state.levels[0].rank);
            }
        } else if (hash === '#leaderboard') {
            document.getElementById('view-leaderboard').classList.remove('hidden');
            document.getElementById('nav-leaderboard').classList.add('active');
            navbar.classList.add('in-use');
        } else if (hash === '#submit') {
            document.getElementById('view-submit').classList.remove('hidden');
            document.getElementById('nav-submit').classList.add('active');
            navbar.classList.add('in-use');
        }
    };

    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Execute on initial load
}

// Fetch Data Pipelines
async function loadData() {
    try {
        const [levelsResponse, playersResponse] = await Promise.all([
            fetch('./data/levels.json'),
            fetch('./data/players.json')
        ]);

        state.levels = await levelsResponse.json();
        state.players = await playersResponse.json();

        renderListSidebar();
        renderLeaderboard();
        
        // Auto-select first item if on list view
        if(window.location.hash === '#list' && state.levels.length > 0) {
            selectLevel(state.levels[0].rank);
        }

    } catch (error) {
        console.error("Error reading JSON databases:", error);
        document.getElementById('levels-container').innerHTML = `<p style="padding:20px; color:red;">Failed to build data tree from GitHub repository arrays.</p>`;
    }
}

// Render Main List Navigation panel
function renderListSidebar() {
    const container = document.getElementById('levels-container');
    container.innerHTML = '';

    if (state.levels.length === 0) {
        container.innerHTML = '<p class="panel-placeholder">No entry layers uploaded to repository data.</p>';
        return;
    }

    state.levels.forEach(level => {
        const badgeClass = modeClassMap[level.mode] || 'badge-ship';
        const levelItem = document.createElement('div');
        levelItem.className = `level-item ${state.activeLevelId === level.rank ? 'active' : ''}`;
        levelItem.id = `level-item-${level.rank}`;
        levelItem.onclick = () => selectLevel(level.rank);

        levelItem.innerHTML = `
            <div class="level-info-meta">
                <div class="level-title-row">
                    <span class="level-rank">#${level.rank}</span>
                    <span>${level.name}</span>
                </div>
                <div class="level-creator">by ${level.author}</div>
            </div>
            <span class="badge ${badgeClass}">${level.mode}</span>
        `;
        container.appendChild(levelItem);
    });
}

// Select Profile Focus Target
function selectLevel(rank) {
    state.activeLevelId = rank;
    
    // Update active visual classes in layout
    document.querySelectorAll('.level-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`level-item-${rank}`);
    if (activeEl) activeEl.classList.add('active');

    const level = state.levels.find(l => l.rank === rank);
    if (!level) return;

    const detailPanel = document.getElementById('level-detail-panel');
    
    // Video Embed Setup
    let videoHTML = `<div class="video-container"><div class="no-video">No Video Available</div></div>`;
    if (level.video && level.video.trim() !== "") {
        videoHTML = `
            <div class="video-container">
                <iframe src="${level.video}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    }

    detailPanel.innerHTML = `
        <div class="detail-header">
            <h2 class="detail-title"><span class="level-rank">#${level.rank}</span> ${level.name}</h2>
            
            <div class="level-id" 
     onclick="navigator.clipboard.writeText('${level.id || ''}'); alert('Level ID Copied to Clipboard!');" 
     style="font-size: 0.95rem; color: var(--text-muted); margin-top: -4px; margin-bottom: 8px; font-family: monospace; cursor: pointer; display: inline-block;" 
     title="Click to copy ID">
    ID: ${level.id || 'Unassigned'} 📋
</div>

            <p class="level-creator" style="font-size:1rem; margin-top: 4px;">Published by <strong>${level.author}</strong></p>
            <span class="badge ${modeClassMap[level.mode] || 'badge-ship'}" style="display:inline-block; margin-top:10px;">${level.mode}</span>
        </div>

        ${videoHTML}

        <div class="detail-description">
            <p>${level.description || 'No descriptive evaluation logs submitted for this challenge layout.'}</p>
        </div>

        <h3 style="margin-bottom:15px; font-size:1.2rem; border-bottom: 1px solid var(--border-color); padding-bottom:8px;">Records Verified</h3>
        <div class="records-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${(() => {
                const verifiedPlayers = state.players.filter(p => p.completed && p.completed.includes(level.name));
                
                if (verifiedPlayers.length === 0) {
                    return `<p style="color:var(--text-muted); font-size:0.95rem;">No verified records for this challenge yet.</p>`;
                }
                
                return verifiedPlayers.map(p => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
        <span style="font-weight: 600;">${p.name}</span>
        <a href="${p.proofVideo || level.video}" target="_blank" style="color: var(--teal); font-size: 0.9rem; text-decoration: none; font-weight: 600;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
            100% Complete 🔗
        </a>
    </div>
`).join('');
            })()}
        </div>
    `;
}



// Populate Leaderboards Data Board
function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '';

    if (state.players.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No records found in player profiles.</td></tr>';
        return;
    }

    state.players.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 800; color: var(--teal);">#${player.rank}</td>
            <td style="font-weight: 600;">${player.name}</td>
            <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${player.completed.join(', ')}
            </td>
            <td style="font-weight: 800; color: var(--teal);">${player.points.toFixed(1)}</td>
        `;
        container.appendChild(row);
    });
}
