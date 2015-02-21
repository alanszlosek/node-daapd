var walk = require('walk'),
  fs = require('fs'),
  options,
  songs = [],
  walker,
  arguments = process.argv.splice(2),
  directory = arguments[0],
  daap = require('../lib/daap'),
  Song = require('../lib/song').Song;

options = {
  followLinks: false,
};
if (!directory) {
  console.log('usage: node server.js FOLDER');
  return;
}

console.log('Sourcing from ' + directory);
walker = walk.walk(directory, options);

var counter = 0;
walker.on("file", function (root, fileStats, next) {
  var format,
    song;
  // do we need to check that fileStats.type == 'file'?

  // For now, we'll support jpg covert art, mp3 and flac files
  if (fileStats.name.match(/\.mp3$/i)) {
    format = 'mp3';
  } else if (fileStats.name.match(/\.flac$/i)) {
    format = 'flac';
  } else if (fileStats.name.match(/cover\.jpg$/i)) {
    // covert art
    format = 'jpg';
  }
  if (format) {
    song = new Song(
      root + '/' + fileStats.name,
      fileStats.name,
      fileStats.size,
      format
    );
    songs.push(song);
    song.read_tags(next);
  
  } else {
    next();
  }
});

walker.on("errors", function (root, nodeStatsArray, next) {
  next();
});

walker.on("end", function () {
  daap.createServer({
    advertise: true,
    songs:songs 
  }).listen(3689);
});

