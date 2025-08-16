// File: /api/[...path].js
const axios = require('axios');

// Torbox API configuration
const TORBOX_API_URL = 'https://api.torbox.app/v1/api';
const TORBOX_API_KEY = process.env.TORBOX_API_KEY;

// Episode data registry
const episodeRegistry = {
    "RO_1": {
        "streams": [
            {
                "infoHash": "cdab4a928dbbff643bbe5531f216eb36a60c85af",
                "fileIdx": 0
            }
        ]
    }
    // Add more episodes here...
};

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
            { "season": 1, "episode": 1, "id": "RO_1", "title": "Romance Dawn, the Dawn of an Adventure" },
            { "season": 1, "episode": 2, "id": "RO_2", "title": "Romance Dawn, Enter the Great Pirate Era" },
            { "season": 1, "episode": 3, "id": "RO_3", "title": "Romance Dawn, Defeat the Pirate Ganzack" },
            { "season": 2, "episode": 1, "id": "OT_1", "title": "Orange Town, Buggy the Clown" },
            { "season": 2, "episode": 2, "id": "OT_2", "title": "Orange Town, The Great Swordsman Appears" },
            { "season": 3, "episode": 1, "id": "SV_1", "title": "Syrup Village, Usopp the Liar" },
            { "season": 3, "episode": 2, "id": "SV_2", "title": "Syrup Village, The Weird Butler Klahadore" },
            { "season": 3, "episode": 3, "id": "SV_3", "title": "Syrup Village, Expose the Plot" },
            { "season": 3, "episode": 4, "id": "SV_4", "title": "Syrup Village, The Battle on the Slope" },
            { "season": 4, "episode": 1, "id": "BA_1", "title": "Baratie, The Cook and the Pirate" },
            { "season": 4, "episode": 2, "id": "BA_2", "title": "Baratie, The Strongest Swordsman in the World" },
            { "season": 4, "episode": 3, "id": "BA_3", "title": "Baratie, Hawk-Eye Mihawk" },
            { "season": 4, "episode": 4, "id": "BA_4", "title": "Baratie, Gin the Demon" },
            { "season": 4, "episode": 5, "id": "BA_5", "title": "Baratie, Pearl-man's Iron Wall" },
            { "season": 4, "episode": 6, "id": "BA_6", "title": "Baratie, Don't Take My Dream Away" }
        ]
    }
};

// Function to load episode data
function loadEpisodeData(episodeId) {
    return episodeRegistry[episodeId] || null;
}

// Helper function to make authenticated requests to Torbox
async function torboxRequest(endpoint, method = 'GET', data = null) {
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
}

// Get or create torrent in Torbox
async function getTorboxStream(infoHash, fileIdx = 0) {
    const torrents = await torboxRequest('/torrents');
    let existingTorrent = torrents.data?.find(t => t.hash === infoHash);

    if (!existingTorrent) {
        const addResult = await torboxRequest('/torrents/createtorrent', 'POST', {
            magnet: `magnet:?xt=urn:btih:${infoHash}`,
            seed: 1
        });
        
        if (addResult.success) {
            existingTorrent = addResult.data;
        } else {
            throw new Error('Failed to add torrent to Torbox');
        }
    }

    if (existingTorrent.download_state === 'downloaded') {
        const downloadInfo = await torboxRequest(`/torrents/requestdl?token=${existingTorrent.id}&file_id=${fileIdx}`);
        if (downloadInfo.success) {
            return downloadInfo.data;
        }
    }

    return null;
}

// Main handler function
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { path } = req.query;
        const fullPath = Array.isArray(path) ? path.join('/') : (path || '');

        // Root path - return manifest
        if (fullPath === '' || fullPath === 'manifest.json') {
            return res.json(manifest);
        }

        // Catalog endpoint
        if (fullPath === 'catalog/series/onepace.json') {
            return res.json(seriesCatalog);
        }

        // Meta endpoint
        if (fullPath === 'meta/series/pp_onepace.json') {
            return res.json(onePaceMeta);
        }

        // Stream endpoint
        const streamMatch = fullPath.match(/^stream\/series\/(.+)\.json$/);
        if (streamMatch) {
            const id = streamMatch[1];
            const idParts = id.split(':');
            
            if (idParts.length !== 3 || idParts[0] !== 'pp_onepace') {
                return res.status(404).json({ error: 'Invalid stream ID format' });
            }

            const [seriesId, season, episode] = idParts;
            
            const episodeData = onePaceMeta.meta.videos.find(v => 
                v.season === parseInt(season) && v.episode === parseInt(episode)
            );

            if (!episodeData) {
                return res.status(404).json({ error: 'Episode not found' });
            }

            // Load episode torrent data
            const episodeFileData = loadEpisodeData(episodeData.id);
            if (!episodeFileData || !episodeFileData.streams || episodeFileData.streams.length === 0) {
                return res.json({ streams: [] });
            }

            // Process streams
            const streams = [];
            for (const streamData of episodeFileData.streams) {
                if (streamData.infoHash && TORBOX_API_KEY) {
                    try {
                        const streamUrl = await getTorboxStream(streamData.infoHash, streamData.fileIdx || 0);
                        
                        if (streamUrl) {
                            streams.push({
                                name: `One Pace - ${episodeData.title}`,
                                title: `S${season}E${episode} - ${episodeData.title}`,
                                url: streamUrl,
                                behaviorHints: {
                                    bingeGroup: "one-pace",
                                    notWebReady: false
                                }
                            });
                        }
                    } catch (torboxError) {
                        console.error('Torbox error:', torboxError.message);
                        // Continue to next stream instead of failing completely
                    }
                }
            }

            return res.json({ streams });
        }

        // Health check
        if (fullPath === 'health') {
            return res.json({ status: 'OK', timestamp: new Date().toISOString() });
        }

        // 404 for unknown paths
        return res.status(404).json({ error: 'Endpoint not found' });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
