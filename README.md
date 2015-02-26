node-daapd
==========

A DAAP Server written for Node.js

Required modules: mdns, walk, musicmetadata (for reading metadata from mp3, ogg, flac files)

It only takes one argument, the music folder to serve music from. Start the server with: `node eg/server.js MUSICFOLDER`

## What I'm working on

- Seeing if there are other things that can be optimized, perhaps dmap and binary logic
- Caching song info in sqlite3 to cut down on memory usage and startup time
