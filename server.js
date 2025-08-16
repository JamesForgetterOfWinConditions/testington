// File: /api/[...path].js

// Torbox API configuration
const TORBOX_API_URL = 'https://api.torbox.app/v1/api';
const TORBOX_API_KEY = process.env.TORBOX_API_KEY;

// Simple episode data registry
const episodeRegistry = {
    "RO_1": {
        "streams": [
            {
                "infoHash": "cdab4a928dbbff643bbe5531f216eb36a60c85af",
                "fileIdx": 0
            }
        ]
    },
    "RO_2": {
        "streams": [
            {
                "infoHash": "your_hash_for_ro_2",
                "fileIdx": 0
            }
        ]
    },
    "RO_3": {
        "streams": [
            {
                "infoHash": "your_hash_for_ro_3",
                "fileIdx": 0
            }
        ]
    }
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
        "description": "One Pace is a fan project that recuts the One Piece anime in an endeavor to bring it more in line with the pacing of the original manga by Eiichiro Oda.",
        "director": ["Toei Animation"],
        "logo": "https://onepace.net/_next/static/media/logo.0bbcd6da.svg",
        "background": "https://wallpaperaccess.com/full/17350.jpg",
        "videos": [
            { "season": 1, "episode": 1, "id": "RO_1", "title": "Romance Dawn, the Dawn of an Adventure" },
            { "season": 1, "episode": 2, "id": "RO_2", "title": "Romance Dawn, Enter the Great Pirate Era" },
            { "season": 1, "episode": 3, "id": "RO_3", "title": "Romance Dawn, Defeat the Pirate Ganzack" }
        ]
    }
};

// Function to load episode data
function loadEpisodeData(episodeId) {
    return episodeRegistry[episodeId] || null;
}

// Simple Torbox request function
async function getTorboxStream(infoHash, fileIdx = 0) {
    if (!TORBOX_API_KEY) {
        console.log('No Torbox API key configured');
        return null;
    }

    try {
        // For now, return a mock stream URL to test the structure
        // We'll add real Torbox integration once this works
        return `https://mock-stream-url.com/${infoHash}/${fileIdx}`;
    } catch (error) {
        console.error('Torbox error:', error.message);
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
        if (fullPath.startsWith('stream/series/')) {
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

                // Process streams - start with mock URLs
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
            
            return res.json({ streams: [] });
        }

        // Health check
        if (fullPath === 'health') {
            return res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                torboxConfigured: !!TORBOX_API_KEY,
                path: fullPath
            });
        }

        // 404 for unknown paths
        return res.status(404).json({ error: 'Endpoint not found', path: fullPath });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message
        });
    }
}
