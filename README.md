node-daapd
==========

A DAAP Server written for Node.js

Required modules: mdns, walk, musicmetadata (for reading metadata from mp3, ogg, flac files)

Start the server with: node eg/server.js MUSICFOLDER
It only takes one argument, the music folder to serve music from.

WHAT I'M WORKING ON
====

- Finding more things to optimize and clean up, especially with regard to dmap and binary logic
- Caching song info in sqlite3 to cut down on memory usage and startup time
