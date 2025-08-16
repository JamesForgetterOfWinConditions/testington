// File: /api/[...path].js
const axios = require('axios');

// Torbox API configuration
const TORBOX_API_URL = 'https://api.torbox.app/v1/api';
const TORBOX_API_KEY = process.env.TORBOX_API_KEY;

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
            { "season": 4, "episode": 6, "id": "BA_6", "title": "Baratie, Don't Take My Dream Away" }
        ]
    }
};

// Function to load episode torrent data from JSON files
async function loadEpisodeData(episodeId) {
    try {
        // In Vercel, we need to use dynamic imports or include files in the deployment
        // For now, we'll use a simple mapping approach that can be extended
        const fs = require('fs');
        const path = require('path');
        
        // Try to read the episode file from the episodes folder
        const episodeFilePath = path.join(process.cwd(), 'episodes', `${episodeId}.json`);
        
        if (fs.existsSync(episodeFilePath)) {
            const episodeData = JSON.parse(fs.readFileSync(episodeFilePath, 'utf8'));
            return episodeData;
        }
        
        return null;
    } catch (error) {
        console.error(`Error loading episode data for ${episodeId}:`, error);
        return null;
    }
}

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
async function getTorboxStream(infoHash, fileIdx = 0) {
    try {
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
            // Use the specific file index from the episode data
            const downloadInfo = await torboxRequest(`/torrents/requestdl?token=${existingTorrent.id}&file_id=${fileIdx}`);
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

    const { path } = req.query;
    const fullPath = Array.isArray(path) ? path.join('/') : (path || '');

    try {
        // Root path - return manifest
        if (fullPath === '' || fullPath === 'manifest.json') {
            return res.json(manifest);
        }

        // Catalog endpoint
        if (fullPath.match(/^catalog\/series\/onepace\.json$/)) {
            return res.json(seriesCatalog);
        }

        // Meta endpoint
        if (fullPath.match(/^meta\/series\/pp_onepace\.json$/)) {
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

            // Load episode torrent data from JSON file
            const episodeFileData = await loadEpisodeData(episodeData.id);
            if (!episodeFileData || !episodeFileData.streams || episodeFileData.streams.length === 0) {
                return res.json({ streams: [] });
            }

            // Process all streams from the episode file
            const streams = [];
            for (const streamData of episodeFileData.streams) {
                if (streamData.infoHash) {
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
        return res.status(500).json({ error: 'Internal server error' });
    }
}
