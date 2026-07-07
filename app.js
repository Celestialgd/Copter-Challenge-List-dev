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
    "Spidercopter": "badge-spider",
    "Varied": "badge-varied"
};

// Calculate points dynamically based on level placement (rank)
function calculateLevelPoints(rank) {
    const x = Number(rank);
    if (isNaN(x) || x <= 0) return 0;
    
    // S = 150 * (1/3)^((x-1)/25) + 50
    const points = 150 * Math.pow((1 / 3), ((x - 1) / 25)) + 50;
    return Number(points.toFixed(2));
}

// Dynamically calculate a player's total points based on their completions
function getPlayerTotalPoints(player) {
    if (!player.completed || !Array.isArray(player.completed)) return 0;
    
    let total = 0;
    player.completed.forEach(completion => {
        // Find the level in your global state to check its current rank/placement
        const globalLevel = state.levels.find(l => l.name === completion.levelName);
        if (globalLevel) {
            total += calculateLevelPoints(globalLevel.rank);
        }
    });
    
    return Number(total.toFixed(2));
}

// Helper Function to Extract YouTube ID and Convert to Borderless Embed Link
function getEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';
    
    // Check for standard watch?v= format
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    } 
    // Check for mobile/shortened youtu.be/ sharing links
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } 
    // If it's already an embed link, leave it completely alone
    else if (url.includes('youtube.com/embed/')) {
        return url; 
    } 
    // Fallback for non-YouTube links if you host files elsewhere later
    else {
        return url; 
    }
    
    // Returns a clean embed string with player parameters to reduce UI clutter
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

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
        // Safe, Case-Insensitive Mode Badge Lookup to prevent pipeline crashes
        const matchedKey = Object.keys(modeClassMap).find(key => key.toLowerCase() === (level.mode || '').toLowerCase());
        const badgeClass = matchedKey ? modeClassMap[matchedKey] : 'badge-ship';

        // Dynamically grab point values to show next to the challenge name
        const pointsForThisLevel = calculateLevelPoints(level.rank);

        const levelItem = document.createElement('div');
        levelItem.className = `level-item ${state.activeLevelId === level.rank ? 'active' : ''}`;
        levelItem.id = `level-item-${level.rank}`;
        levelItem.onclick = () => selectLevel(level.rank);

        levelItem.innerHTML = `
            <div class="level-info-meta">
                <div class="level-title-row">
                    <span class="level-rank">#${level.rank}</span>
                    <span>${level.name} (${pointsForThisLevel.toFixed(1)} pts)</span>
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
    
    // Video Embed Setup using our smart converter helper
    let videoHTML = `<div class="video-container"><div class="no-video">No Video Available</div></div>`;
    if (level.video && level.video.trim() !== "") {
        // Run the raw JSON string through the converter first!
        const cleanEmbedUrl = getEmbedUrl(level.video);
        
        videoHTML = `
            <div class="video-container">
                <iframe src="${cleanEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    }

    // Safe, Case-Insensitive Mode Badge Lookup for detail panel header
    const matchedKey = Object.keys(modeClassMap).find(key => key.toLowerCase() === (level.mode || '').toLowerCase());
    const badgeClass = matchedKey ? modeClassMap[matchedKey] : 'badge-ship';

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
            <span class="badge ${badgeClass}" style="display:inline-block; margin-top:10px;">${level.mode}</span>
        </div>

        ${videoHTML}

        <div class="detail-description">
            <p>${level.description || 'No descriptive evaluation logs submitted for this challenge layout.'}</p>
        </div>

        <h3 style="margin-bottom:15px; font-size:1.2rem; border-bottom: 1px solid var(--border-color); padding-bottom:8px;">Records Verified</h3>
        <div class="records-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${(() => {
                // Filter to find players who have this specific level inside their completed array
                const verifiedRecords = [];
                
                state.players.forEach(p => {
                    if (p.completed && Array.isArray(p.completed)) {
                        const match = p.completed.find(c => c.levelName === level.name);
                        if (match) {
                            verifiedRecords.push({
                                name: p.name,
                                video: match.video || level.video || '#'
                            });
                        }
                    }
                });
                
                if (verifiedRecords.length === 0) {
                    return `<p style="color:var(--text-muted); font-size:0.95rem;">No verified records for this challenge yet.</p>`;
                }
                
                return verifiedRecords.map(record => {
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
                            <span style="font-weight: 600;">${record.name}</span>
                            <a href="${record.video}" target="_blank" style="color: var(--teal); font-size: 0.9rem; text-decoration: none; font-weight: 600;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                                100% Complete 🔗
                            </a>
                        </div>
                    `;
                }).join('');
            })()}
        </div>
    `;
}

// Populate Leaderboards Data Board Automatically with Formula Sorting & Alphabetical Tie-Breaker
function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '';

    if (state.players.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No records found in player profiles.</td></tr>';
        return;
    }

    // Map players to include their live calculated scores, then sort highest to lowest
    const sortedPlayers = state.players.map(player => {
        return {
            ...player,
            livePoints: getPlayerTotalPoints(player)
        };
    }).sort((a, b) => {
        // 1. Sort by points (highest first)
        if (b.livePoints !== a.livePoints) {
            return b.livePoints - a.livePoints;
        }
        // 2. Tie-breaker: Alphabetical order (A-Z)
        return a.name.localeCompare(b.name);
    });

    sortedPlayers.forEach((player, index) => {
        const levelNamesList = player.completed && Array.isArray(player.completed) 
            ? player.completed.map(c => c.levelName).join(', ') 
            : 'No completions';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 800; color: var(--teal);">#${index + 1}</td>
            <td style="font-weight: 600;">${player.name}</td>
            <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${levelNamesList}">
                ${levelNamesList}
            </td>
            <td style="font-weight: 800; color: var(--teal);">${player.livePoints.toFixed(2)}</td>
        `;
        container.appendChild(row);
    });
}

// Clean, Case-Insensitive Filtering Engine (No Console Logs Spammer)
function filterMode(mode) {
    const buttons = document.querySelectorAll('.filter-bar button');
    
    // 1. Update button styling states safely
    buttons.forEach(btn => {
        const onClickAttr = btn.getAttribute('onclick') || '';
        if (onClickAttr.toLowerCase().includes(mode.toLowerCase())) {
            btn.style.background = 'var(--teal)';
            btn.style.color = '#000';
            btn.style.border = 'none';
        } else {
            btn.style.background = 'var(--bg-card)';
            btn.style.color = 'var(--text-color)';
            btn.style.border = '1px solid var(--border-color)';
        }
    });

    // 2. Filter list layout elements directly
    const container = document.getElementById('levels-container');
    if (!container) return;
    
    const levelCards = container.children;

    for (let card of levelCards) {
        const badge = card.querySelector('.badge') || card.querySelector('span');
        
        if (!badge) {
            card.style.display = 'block';
            continue;
        }
        
        const cardMode = badge.textContent.trim().toLowerCase();
        const searchMode = mode.toLowerCase();

        if (searchMode === 'all' || cardMode.includes(searchMode) || searchMode.includes(cardMode)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    }
}