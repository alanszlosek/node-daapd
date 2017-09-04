var walk = require('walk'),
  fs = require('fs'),
  arguments = process.argv.splice(2),
  directory = arguments[0],
  daap = require('./lib/daap'),
  Song = require('./lib/song').Song;

if (!directory) {
  console.log('usage: node server.js FOLDER');
  return;
}

var previousSongMap = {}; // we read songs.json into here on startup
// This is the data structure that is persisted to songs.json. Reduces startup time
var songMap = {}; // holds intersection of previousSongMap/songs.json and filesystem contents
// This is the songs "database" that daap cares about
var songs = [];
var songsChanged = false;
var verbose = false;

var addFolder = function(folder, callback) {
  var options = {
    followLinks: false,
  };
  var walker = walk.walk(folder, options);
  console.log('Walking ' + folder);
  walker.on("file", function (root, fileStats, next) {
    var filename = root + '/' + fileStats.name;
    // Do we have this file in our JSON cache?
    if (filename in previousSongMap) {
      if (verbose) {
        console.log('File already present in songs.json: ' + fileStats.name);
      }
      var song = songMap[filename] = previousSongMap[filename];
      songs.push(song);
      next();
      return;
    }

    var format;
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
      if (verbose) {
        console.log('Adding new song: ' + fileStats.name);
      }
      /*
      This is a bit convoluted ... call this function, and it gives us the song structure when it's done
      Might be better to use "new Song()" and then set an optional listener for when this song has its metadata parsed,
      which might not happen
      */
      Song(
        root,
        fileStats.name,
        fileStats.size,
        format,
        function(err, song) {
          if (err) {
            console.log(err);
            next();
          }
          // Did musicmetadata find any metadata?
          songMap[song.file] = song;
          songs.push(song);
          songsChanged = true;

          next();
        }
      );
    
    } else {
      next();
    }
  });

  walker.on("errors", function (root, nodeStatsArray, next) {
    console.log('errors', nodeStatsArray);
    next();
  });

  walker.on("end", callback);
};


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

if (directory[0] != '/') {
  console.log('Please specify an absolute path. Relative paths are not supported yet');
} else {

  fs.stat('./songs.json', function(err, stats) {
    if (!err) {
      previousSongMap = require('./songs.json');
    } else {
      console.log('songs.json will be created');
    }

    addFolder(
      directory,
      function() {
        previousSongMap = {}; // When we're done walking the music folder, there's no need for the old songs.json contents
        daap.createServer({
          advertise: true,
          songs: songs
        }).listen(3689);

        setTimeout(persistSongs, 5000);
      }
    );

  });
}
