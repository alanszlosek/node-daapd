// Copyright 2010 Matthew Wood
//
// Licensed under the Apache License, Version 2.0

var fs = require('fs');
var mm = require('musicmetadata');

var Song = exports.Song = function(file, name, size, format) {
  var song = this;
  this.file = file;
  this.size = size;
  this.format = format;
  // from ID3 tags
  this.name = this.artist = this.album = name; // will replace this with mp3 tag title later
  this.year = 0;
  this.time = 0;
  this.genre = '';

  this.read_tags = function(next) {
    if (song.format == 'jpg') {
      next();
      return;
    }

    var readStream = fs.createReadStream(song.file);
    var parser = mm(readStream, {duration:true});
    parser.on('metadata', function (tags) {
      //console.log(tags);

      song.name = tags.title || song.name;
      // artist is an array
      song.artist = tags.artist[0] || song.artist;
      song.album = tags.album || song.album;
      song.year = tags.year || song.year;
      song.genre = tags.genre || song.genre;
      // duration isn't quite working yet ... is it supposed to be in seconds?
      song.time = tags.duration || song.time;
    });
    parser.on('done', function (err) {
      if (err) {
        return next();
      }
      readStream.destroy();
      next();
    });
  };
};

