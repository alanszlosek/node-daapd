var walk = require('walk'),
  fs = require('fs'),
  metadataCache = require('./lib/cache'),
  arguments = process.argv.splice(2),
  directory = arguments[0],
  daap = require('./lib/daap'),
  Song = require('./lib/song').Song;

if (!directory) {
  console.log('usage: node server.js FOLDER');
  return;
}

var previousSongMap = {}; // we read songs.json into here on startup
var songMap = {}; // holds intersection of previousSongMap/songs.json and filesystem contents
var songs = [];
var songsChanged = false;

var cache = metadataCache(
  // Save callback
  function(root, fileStats, callback) {
    var format,
      song;
    // do we need to check that fileStats.type == 'file'?

    // For now, we'll support jpg covert art, mp3 and flac files
    if (fileStats.name.match(/\.mp3$/i)) {
      format = 'mp3';
    } else if (fileStats.name.match(/\.ogg$/i)) {
      format = 'ogg';
    } else if (fileStats.name.match(/\.flac$/i)) {
      format = 'flac';
    } else if (fileStats.name.match(/cover\.jpg$/i)) {
      // covert art
      //format = 'jpg';
    }
    if (format) {
      Song(
        root + '/' + fileStats.name,
        fileStats.name,
        fileStats.size,
        format,
        function(err, song) {
          if (err) {
            return console.log(err);
          }
          songMap[song.file] = song;
          songs.push(song);
          songsChanged = true;
          callback(song);
        }
      );
    
    } else {
      // Don't cache this file
      callback(null);
    }
  },
  // Read callback
  function(root, fileStats, callback) {
    var file = root + '/' + fileStats.name;
    // Do we have this file in our JSON cache?
    if (file in previousSongMap) {
      var song = songMap[file] = previousSongMap[file];
      callback(song);
      songs.push(song);
    } else {
      callback(null);
    }
  }
);

var persistSongs = function() {
  if (songsChanged) {
    fs.writeFile('./songs.json', JSON.stringify(songMap), function(err) {
      if (err) {
        console.log('Failed to persist songs JSON cache: ' + err);
        return;
      }
      console.log('Saved songs');
    });
    songsChanged = false;
  }
};

fs.stat('./songs.json', function(err, stats) {
  if (!err) {
    previousSongMap = require('./songs.json');
  } else {
    console.log('songs.json cache not found');
  }

  cache.addFolder(
    directory,
    function() {
      previousSongMap = {}; // When we're done walking the music folder, there's no need for the old songs.json contents
      daap.createServer({
        advertise: true,
        songs: cache.getAll()
      }).listen(3689);

      setInterval(persistSongs, 5000);
    }
  );

});
