node-daapd
==========

A DAAP Server written for Node.js

Make sure you have: python2, gcc, make, nss-mdns, avahi. You may also need to install dbus and libavahi-compat-libdnssd-dev.
Make sure avahi is running. On arch linux, I had to restart dbus.

Required npm modules: mdns, walk, musicmetadata (for reading metadata from mp3, ogg, flac files)

The only argument it takes is the absolute path to your music folder. Start the server with: `node index.js MUSICFOLDER`
