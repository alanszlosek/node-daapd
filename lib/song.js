// Copyright 2010 Matthew Wood
//
// Licensed under the Apache License, Version 2.0

var fs = require('fs');
var mm = require('musicmetadata');

exports.Song = function(folder, basename, size, format, callback) {
  var song = {
    folder: folder,
    filepath: folder + '/' + basename,
    size: size,
    format: format,
    // from ID3 tags
    name: basename, // will replace this with mp3 tag title later
    artist: basename,
    album: basename,
    year: 0,
    time: 0,
    genre: '',
    tracknumber: '',
    trackcount: '',
    discnumber: 1,
    disccount: 1
  };

  if (song.format == 'jpg') {
    callback(null, song);
    return;
  }

  var readStream = fs.createReadStream(song.filepath);
  var parser = mm(readStream, {duration:true}, function (err, tags) {
    if (err) {
      return callback(err);
    }

    song.name = tags.title || song.name;
    // artist is an array
    song.artist = tags.artist[0] || song.artist;
    song.album = tags.album || song.album;
    song.year = tags.year || song.year;
    song.genre = tags.genre[0] || song.genre;
    // duration isn't quite working yet ... is it supposed to be in seconds?
    song.time = tags.duration || song.time;
    if (tags.track) {
      song.tracknumber = tags.track.no;
      song.trackcount = tags.track.of;
    }
    if (tags.disk) {
      song.discnumber = tags.disk.no;
      song.disccount = tags.disk.of;
    }
    readStream.destroy();
    callback(null, song);
  });
};

