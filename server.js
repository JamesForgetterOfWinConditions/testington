// File: /api/[...path].js

// Simple episode data registry
const episodeRegistry = {
    "RO_1": {
        "streams": [
            {
                "infoHash": "cdab4a928dbbff643bbe5531f216eb36a60c85af",
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

// Main handler function
export default function handler(req, res) {
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

        // Stream endpoint - simplified version without Torbox for now
        if (fullPath.startsWith('stream/series/')) {
            // For now, return empty streams - we'll add Torbox integration once basic functionality works
            return res.json({ streams: [] });
        }

        // Health check
        if (fullPath === 'health') {
            return res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                path: fullPath,
                query: req.query
            });
        }

        // 404 for unknown paths
        return res.status(404).json({ error: 'Endpoint not found', path: fullPath });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message,
            stack: error.stack
        });
    }
}
