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

// Simple Torbox request function using fetch
async function torboxRequest(endpoint, method = 'GET', data = null) {
    if (!TORBOX_API_KEY) {
        throw new Error('Torbox API key not configured');
    }

    const config = {
        method,
        headers: {
            'Authorization': `Bearer ${TORBOX_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }

    const fullUrl = `${TORBOX_API_URL}${endpoint}`;
    console.log('Making Torbox request to:', fullUrl);
    
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Torbox API response:', response.status, errorText);
        throw new Error(`Torbox API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Get or create torrent in Torbox and return stream URL
async function getTorboxStream(infoHash, fileIdx = 0) {
    if (!TORBOX_API_KEY) {
        console.log('No Torbox API key configured');
        return null;
    }

    try {
        console.log('Getting Torbox stream for hash:', infoHash, 'fileIdx:', fileIdx);
        
        // First, check if torrent already exists
        const torrents = await torboxRequest('/torrents');
        let existingTorrent = torrents.data?.find(t => t.hash === infoHash);

        if (!existingTorrent) {
            console.log('Torrent not found, adding to Torbox...');
            // Add torrent to Torbox
            const addResult = await torboxRequest('/torrents/createtorrent', 'POST', {
                magnet: `magnet:?xt=urn:btih:${infoHash}`,
                seed: 1
            });
            
            if (addResult.success) {
                existingTorrent = addResult.data;
                console.log('Torrent added successfully:', existingTorrent.id);
            } else {
                console.error('Failed to add torrent:', addResult);
                return null;
            }
        } else {
            console.log('Found existing torrent:', existingTorrent.id, 'state:', existingTorrent.download_state);
        }

        // Check if torrent is ready for streaming
        if (existingTorrent.download_state === 'downloaded') {
            console.log('Torrent is ready, getting download link...');
            const downloadInfo = await torboxRequest(`/torrents/requestdl?token=${existingTorrent.id}&file_id=${fileIdx}`);
            if (downloadInfo.success) {
                console.log('Got stream URL from Torbox');
                return downloadInfo.data;
            } else {
                console.error('Failed to get download link:', downloadInfo);
                return null;
            }
        } else {
            console.log('Torrent not ready yet, state:', existingTorrent.download_state);
            return null;
        }

    } catch (error) {
        console.error('Error getting Torbox stream:', error.message);
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
        // Use req.url instead of query params for more reliable path parsing
        let fullPath = req.url;
        
        // Remove query parameters and leading slash
        if (fullPath.includes('?')) {
            fullPath = fullPath.split('?')[0];
        }
        if (fullPath.startsWith('/')) {
            fullPath = fullPath.substring(1);
        }
        
        // Remove /api/ prefix if present
        if (fullPath.startsWith('api/')) {
            fullPath = fullPath.substring(4);
        }
        
        console.log('Request URL:', req.url, 'Parsed path:', fullPath, 'Query:', req.query);

        // Root path - return manifest
        if (!fullPath || fullPath === '' || fullPath === 'manifest.json') {
            console.log('Serving manifest');
            return res.json(manifest);
        }

        // Health check - must come before other checks
        if (fullPath === 'health') {
            console.log('Serving health check');
            return res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                torboxConfigured: !!TORBOX_API_KEY,
                path: fullPath,
                rawPath: req.url
            });
        }

        // Catalog endpoint
        if (fullPath === 'catalog/series/onepace.json') {
            console.log('Serving catalog');
            return res.json(seriesCatalog);
        }

        // Meta endpoint
        if (fullPath === 'meta/series/pp_onepace.json') {
            console.log('Serving meta');
            return res.json(onePaceMeta);
        }

        // Stream endpoint
        if (fullPath.startsWith('stream/series/')) {
            console.log('Processing stream request for:', fullPath);
            const streamMatch = fullPath.match(/^stream\/series\/(.+)\.json$/);
            if (streamMatch) {
                const id = streamMatch[1];
                console.log('Stream ID:', id);
                
                // Handle both formats: "pp_onepace:1:1" and direct episode IDs like "RO_1"
                let episodeData;
                
                if (id.includes(':')) {
                    // Standard format: pp_onepace:season:episode
                    const idParts = id.split(':');
                    if (idParts.length !== 3 || idParts[0] !== 'pp_onepace') {
                        console.log('Invalid stream ID format:', idParts);
                        return res.status(404).json({ error: 'Invalid stream ID format' });
                    }

                    const [seriesId, season, episode] = idParts;
                    console.log('Parsed:', { seriesId, season, episode });
                    
                    episodeData = onePaceMeta.meta.videos.find(v => 
                        v.season === parseInt(season) && v.episode === parseInt(episode)
                    );
                } else {
                    // Direct episode ID format: RO_1, OT_1, etc.
                    console.log('Direct episode ID format:', id);
                    episodeData = onePaceMeta.meta.videos.find(v => v.id === id);
                }

                if (!episodeData) {
                    console.log('Episode not found for ID:', id);
                    return res.status(404).json({ error: 'Episode not found' });
                }

                console.log('Found episode:', episodeData.id);

                // Load episode torrent data
                const episodeFileData = loadEpisodeData(episodeData.id);
                if (!episodeFileData || !episodeFileData.streams || episodeFileData.streams.length === 0) {
                    console.log('No stream data for episode:', episodeData.id);
                    return res.json({ streams: [] });
                }

                console.log('Episode stream data:', episodeFileData);

                // Process streams
                const streams = [];
                
                for (const streamData of episodeFileData.streams) {
                    if (streamData.infoHash) {
                        const streamUrl = await getTorboxStream(streamData.infoHash, streamData.fileIdx || 0);
                        
                        if (streamUrl) {
                            streams.push({
                                name: `One Pace - ${episodeData.title}`,
                                title: `${episodeData.title}`,
                                url: streamUrl,
                                behaviorHints: {
                                    bingeGroup: "one-pace",
                                    notWebReady: false
                                }
                            });
                        }
                    }
                }

                console.log('Returning streams:', streams.length);
                return res.json({ streams });
            }
            
            console.log('Stream request did not match pattern');
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
