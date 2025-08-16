const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Torbox API configuration
const TORBOX_API_URL = 'https://api.torbox.app/v1/api';
const TORBOX_API_KEY = process.env.TORBOX_API_KEY; // Set this in your Vercel environment variables

// Addon manifest
const manifest = {
    id: "community.onepace.torbox",
    version: "1.0.0",
    name: "One Pace (Torbox)",
    description: "One Pace episodes streamed through Torbox",
    logo: "https://onepace.net/_next/static/media/logo.0bbcd6da.svg",
    resources: ["catalog", "meta", "stream"],
    types: ["series"],
    catalogs: [
        {
            type: "series",
            id: "onepace",
            name: "One Pace"
        }
    ]
};

// One Pace series catalog
const seriesCatalog = {
    "metas": [
        {
            "type": "series",
            "id": "pp_onepace",
            "name": "One Pace",
            "poster": "https://i.pinimg.com/originals/eb/85/c4/eb85c4376b474030b80afa80ad1cd13a.jpg",
            "genres": [
                "Adventure",
                "Fantasy"
            ]
        }
    ]
};

// One Pace series metadata with episodes
const onePaceMeta = {
    "meta": {
        "id": "pp_onepace",
        "type": "series",
        "name": "One Pace",
        "poster": "https://i.pinimg.com/originals/eb/85/c4/eb85c4376b474030b80afa80ad1cd13a.jpg",
        "genres": ["Animation", "Comedy", "Adventure", "Action"],
        "description": "One Pace is a fan project that recuts the One Piece anime in an endeavor to bring it more in line with the pacing of the original manga by Eiichiro Oda. The team accomplishes this by removing filler scenes not present in the source material. This process requires meticulous editing and quality control to ensure seamless music and transitions.",
        "director": ["Toei Animation"],
        "logo": "https://onepace.net/_next/static/media/logo.0bbcd6da.svg",
        "background": "https://wallpaperaccess.com/full/17350.jpg",
        "videos": [
            // Romance Dawn Arc (Season 1)
            { "season": 1, "episode": 1, "id": "RO_1", "title": "Romance Dawn, the Dawn of an Adventure" },
            { "season": 1, "episode": 2, "id": "RO_2", "title": "Romance Dawn, Enter the Great Pirate Era" },
            { "season": 1, "episode": 3, "id": "RO_3", "title": "Romance Dawn, Defeat the Pirate Ganzack" },
            
            // Orange Town Arc (Season 2)
            { "season": 2, "episode": 1, "id": "OT_1", "title": "Orange Town, Buggy the Clown" },
            { "season": 2, "episode": 2, "id": "OT_2", "title": "Orange Town, The Great Swordsman Appears" },
            
            // Syrup Village Arc (Season 3)
            { "season": 3, "episode": 1, "id": "SV_1", "title": "Syrup Village, Usopp the Liar" },
            { "season": 3, "episode": 2, "id": "SV_2", "title": "Syrup Village, The Weird Butler Klahadore" },
            { "season": 3, "episode": 3, "id": "SV_3", "title": "Syrup Village, Expose the Plot" },
            { "season": 3, "episode": 4, "id": "SV_4", "title": "Syrup Village, The Battle on the Slope" },
            
            // Baratie Arc (Season 4)
            { "season": 4, "episode": 1, "id": "BA_1", "title": "Baratie, The Cook and the Pirate" },
            { "season": 4, "episode": 2, "id": "BA_2", "title": "Baratie, The Strongest Swordsman in the World" },
            { "season": 4, "episode": 3, "id": "BA_3", "title": "Baratie, Hawk-Eye Mihawk" },
            { "season": 4, "episode": 4, "id": "BA_4", "title": "Baratie, Gin the Demon" },
            { "season": 4, "episode": 5, "id": "BA_5", "title": "Baratie, Pearl-man's Iron Wall" },
            { "season": 4, "episode": 6, "id": "BA_6", "title": "Baratie, Don't Take My Dream Away" },
            
            // Add more episodes as needed...
        ]
    }
};

// Episode to torrent hash mapping (you'll need to populate this with actual hashes)
const episodeTorrents = {
    "RO_1": "cdab4a928dbbff643bbe5531f216eb36a60c85af",
    "RO_2": "cdab4a928dbbff643bbe5531f216eb36a60c85af",
    "RO_3": "actual_torrent_hash_for_romance_dawn_3",
    "OT_1": "actual_torrent_hash_for_orange_town_1",
    "OT_2": "actual_torrent_hash_for_orange_town_2",
    // Add more mappings as needed...
};

// Helper function to make authenticated requests to Torbox
async function torboxRequest(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${TORBOX_API_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${TORBOX_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Torbox API error: ${error.message}`);
        throw error;
    }
}

// Get or create torrent in Torbox
async function getTorboxStream(torrentHash) {
    try {
        // First, check if torrent already exists
        const torrents = await torboxRequest('/torrents');
        let existingTorrent = torrents.data?.find(t => t.hash === torrentHash);

        if (!existingTorrent) {
            // Add torrent to Torbox
            const addResult = await torboxRequest('/torrents/createtorrent', 'POST', {
                magnet: `magnet:?xt=urn:btih:${torrentHash}`,
                seed: 1
            });
            
            if (addResult.success) {
                existingTorrent = addResult.data;
            } else {
                throw new Error('Failed to add torrent to Torbox');
            }
        }

        // Wait for torrent to be ready and get download link
        if (existingTorrent.download_state === 'downloaded') {
            const downloadInfo = await torboxRequest(`/torrents/requestdl?token=${existingTorrent.id}&file_id=1`);
            if (downloadInfo.success) {
                return downloadInfo.data;
            }
        }

        return null;
    } catch (error) {
        console.error(`Error getting Torbox stream: ${error.message}`);
        return null;
    }
}

// Routes

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});

app.get('/', (req, res) => {
    res.json(manifest);
});

// Catalog endpoint
app.get('/catalog/:type/:id.json', (req, res) => {
    const { type, id } = req.params;
    
    if (type === 'series' && id === 'onepace') {
        res.json(seriesCatalog);
    } else {
        res.status(404).json({ error: 'Catalog not found' });
    }
});

// Meta endpoint
app.get('/meta/:type/:id.json', (req, res) => {
    const { type, id } = req.params;
    
    if (type === 'series' && id === 'pp_onepace') {
        res.json(onePaceMeta);
    } else {
        res.status(404).json({ error: 'Meta not found' });
    }
});

// Stream endpoint
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (type !== 'series') {
        return res.status(404).json({ error: 'Only series type supported' });
    }

    // Parse the ID to extract series ID and episode info
    // Expected format: pp_onepace:season:episode
    const idParts = id.split(':');
    if (idParts.length !== 3 || idParts[0] !== 'pp_onepace') {
        return res.status(404).json({ error: 'Invalid stream ID format' });
    }

    const [seriesId, season, episode] = idParts;
    
    // Find the episode in our metadata
    const episodeData = onePaceMeta.meta.videos.find(v => 
        v.season === parseInt(season) && v.episode === parseInt(episode)
    );

    if (!episodeData) {
        return res.status(404).json({ error: 'Episode not found' });
    }

    const torrentHash = episodeTorrents[episodeData.id];
    if (!torrentHash) {
        return res.status(404).json({ error: 'Torrent not available for this episode' });
    }

    try {
        const streamUrl = await getTorboxStream(torrentHash);
        
        if (streamUrl) {
            res.json({
                streams: [
                    {
                        name: `One Pace - ${episodeData.title}`,
                        title: `S${season}E${episode} - ${episodeData.title}`,
                        url: streamUrl,
                        behaviorHints: {
                            bingeGroup: "one-pace",
                            notWebReady: false
                        }
                    }
                ]
            });
        } else {
            res.json({ streams: [] });
        }
    } catch (error) {
        console.error(`Stream error: ${error.message}`);
        res.json({ streams: [] });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`One Pace Stremio addon running on port ${PORT}`);
        console.log(`Manifest: http://localhost:${PORT}/manifest.json`);
    });
}

// Export for Vercel
module.exports = app;
