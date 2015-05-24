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

var songMap = {};
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
    // Do we have this file in our JSON cache?
    var file = root + '/' + fileStats.name;
    if (file in songMap) {
      callback(songMap[file]);
      songs.push(songMap[file]);
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
    songMap = require('./songs.json');
  } else {
    console.log('songs.json cache not found');
    songs = [];
  }

  cache.addFolder(
    directory,
    function() {
      
      daap.createServer({
        advertise: true,
        songs: cache.getAll()
      }).listen(3689);


      setInterval(persistSongs, 5000);
    }
  );

});
