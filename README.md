node-daapd
==========

A DAAP Server written for Node.js

Make sure you have: python2, gcc, make, nss-mdns, avahi. You may also need to install dbus and libavahi-compat-libdnssd-dev.
Make sure avahi is running. On arch linux, I had to restart dbus.

Required npm modules: mdns, walk, musicmetadata (for reading metadata from mp3, ogg, flac files)

It only takes one argument, the music folder to serve music from. Start the server with: `node index.js MUSICFOLDER`

## What I'm working on

- Seeing if there are other things that can be optimized, perhaps dmap and binary logic
- Caching song info in sqlite3 to cut down on memory usage and startup time
- banshee keeps requesting /update. workaround: leave the socket open on the 2nd request
- Generate unique sessions, destroy upon logout, track /update request state per session
