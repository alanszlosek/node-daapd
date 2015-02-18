// Copyright 2010 Matthew Wood
//
// Licensed under the Apache License, Version 2.0

var http = require('http');
var sys = require('sys');
var fs = require('fs');
var dmap = require('./dmap');
var url = require('url');
var Buffer = require('buffer').Buffer;
var Router = require('./router').Router;
var mdns;
try {
  mdns = require('mdns');
} catch (e) {
  sys.log('[startup] mdns not loaded: ' + e);
}
var Song = require('./song').Song;

function DaapServer(options) {
  options = options || {};

  var name = options.name || 'daap.js';
  this.state = {
    sessions: 0,
    revision: 2, // itunes doesn't show files if this is 1
    name: name,
    databases: [
      {
        name: name,
        songs: [],
        playlists: [{
          name: name,
          songs: []
        }],
      }
    ]
  };

  var target = this;
  if (options.songs) {
    var i = 0;
    options.songs.forEach(function(song) {
      target.state.databases[0].songs.push(song);
      target.state.databases[0].playlists[0].songs.push(i++);
    });
  }

  this.advertise = (options.advertise == true);

  this._http = http.createServer(function (req, res) {
      DaapServer.router().exec(req, res, target);
  });
}

exports.createServer = function(options) {
  return new DaapServer(options);
};

DaapServer.prototype.listen = function(port) {
  // iTunes 12 won't consider us without a txtRecord
  var txt = {
    "txtvers": 1,
    "Version": 196610,
    "iTSh Version": 131073,
    "Database ID": 1,
  };

  port = port || 3689;

  this._http.listen(port);

  if (mdns && this.advertise) {
    sys.log('[mdns] advertising _daap._tcp on port ' + port);
    var mdnsAdvert = mdns.createAdvertisement(mdns.tcp('daap'), port, {txtRecord: txt});
    mdnsAdvert.start();
  }
}

DaapServer.router = function() {
  return DaapServer.prototype._router;
};

DaapServer.prototype._router = new Router();
DaapServer.prototype._router.add_route('/server-info', function(context) {
  reply(context.response, 
    ["msrv",[
      ["mstt", 200],
      ["apro", {"major":3,"minor":0}],
      ["msix", 0], // indexing?
      ["msex", 0],
      ["msup", 0], // support update?
      ["msal", 0], // autologout
      ["mstm", 1800], // timeout
      ["mslr", 0], // login required?
      ["msqy", 0], // supports queries?
      ["minm", this.state.name], // server name
      ["msrs", 0], // supports resolve
      ["msbr", 0], // supports browsing?
      ["mspi", 1], // persistent ids?

      ["mpro", {"major":2,"minor":0}],
      //["msau", 0],
      //["msdc", this.state.databases.length]
    ]]
  ,true);
});

DaapServer.prototype._router.add_route("/content-codes", function(context) {
  reply(context.response,
    ['mccr',[
      ["mstt", 200],
      dmap.contentCodes.getAllTags().map(function(tag) {
        var defn = dmap.contentCodes.definition(tag);

        return ['mdcl', [
          ['mcna', defn.name],
          ['mcnm', tag],
          ['mcty', defn.type]
        ]]
      })
    ]], true);
});

DaapServer.prototype._router.add_route("/login", function(context) {
  reply(context.response, 
    ["mlog",[
      ["mstt", 200],
      // perhaps we should hardcode the session id while debugging ...
      // itunes won't continue if it gets a 0 sessionid, so do pre-increment
      ["mlid", ++this.state.sessions]
    ]]
  ,true);
});

DaapServer.prototype._router.add_route("/update", function(context) {
  if(context.params['delta'] > 0) {
    /*
    reply(context.response, 
      ["mupd",[
        ["mstt", 200],
        ["musr", this.state.revision]
      ]]
    ,true);
    */
    // iTunes expects library updates to be streamed in response
    // close this connection and playbakc seems to stop
    context.response.setTimeout(0);
  } else {
    reply(context.response, 
      ["mupd",[
        ["mstt", 200],
        ["musr", this.state.revision]
      ]]
    ,true);
  }
});

DaapServer.prototype._router.add_route('/databases', function(context) {
  reply(context.response, 
    ["avdb", [
      ["mstt", 200],
      ["muty", 0],
      ["mtco", this.state.databases.length],
      ["mrco", this.state.databases.length],
      ["mlcl", this.state.databases.map(function(db, i) {
        return ["mlit", [
                 ["miid", indexToUrlkey(i)],
                 ["mper", indexToUrlkey(i)],
                 ["minm", db.name],
                 ["mimc", db.songs.length],
                 ["mctc", db.playlists.length]
        ]];
      })]
    ]]
   ,true);
});

DaapServer.prototype._router.add_route('/databases/:dbid/items', function(context) {
  var meta = context.params['meta'].split(',');

  var songs = this.state.databases[urlkeyToIndex(context.params['dbid'])].songs;

  reply(context.response,
    ["adbs",[
      ["mstt", 200],
      ["muty", 0],
      ["mtco", songs.length],
      ["mrco", songs.length],
      ["mlcl", songs.map(function(song, i) {
        var urlkey = indexToUrlkey(i);
        return ["mlit", [
          ['miid', urlkey], // daap.itemid
          ['minm', song.name], // daap.itemname
          //['mikd', 2], // daap.itemkind
          ['mper', urlkey], // daap.persistenid
          ['asal', song.album], // daap.songalbum
          ['asar', song.artist], // daap.songartist
          // daap.songalbumartist
          // daap.songbitrate
          //['ascm', ''], // daap.songcomment
          // daap.songcomposer
          //['asda', song.dateAdded], // daap.songdateadded
          //['asdm', song.dateModified], // daap.songdatemodified
          //['asdc', 1], // songdisccount
          //['asdn', 1], // daap.songdiscnumber
          //['asdb', 0], // daap.songdisabled
          ['asfm', 'mp3'], // daap.songformat
          //['asgn', ''], // daap.songgenre
          //['asdt', 'song description'], // daap.songdescription
          // daap.songrelativevolume
          // songsamplerate
          ['assz', song.size], // daap.songsize
          /*
          ['asst', 0], // daap.songstarttime
          ['assp', 0], // daap.songstoptime
          ['astm', 1000], // daap.songtime
          ['astc', 1], // daap.songtrackcount
          ['astn', 1], // daap.songtracknumber
          // songuserrating
          ['asyr', song.dateAdded.getFullYear()] // daap.songyear
          */
          //['asdk', 0], // daap.songdatakind
          //['asul', ''] // daap.songdataurl
        ].filter(function(item) {
          return (meta.indexOf(dmap.contentCodes.definition(dmap.tag(item)).name) > -1);
        })];
      })]
    ]]
  ,true);
},{
  pattern:{
    dbid: '(\\d+)'
  },
  type:{
    dbid: Number
  }
});

DaapServer.prototype._router.add_route('/databases/:dbid/containers', function(context) {
  var playlists = this.state.databases[urlkeyToIndex(context.params['dbid'])].playlists;
 
  reply(context.response, 
    ["aply", [
      ["mstt",200],
      ["muty",0],
      ["mtco", playlists.length],
      ["mrco", playlists.length],
      ["mlcl", playlists.map(function(playlist, i) {
          return ['mlit', [
            ["miid", indexToUrlkey(i)],
            ["minm", "Sample Playlist"],
            ["mper", indexToUrlkey(i)],
            //["mimc", playlist.songs.length]
            ["mpco", 0],
        ]];
      })]
    ]]
  ,true);
}, {
  pattern: {
    dbid: '(\\d+)'
  },
  type: {
    dbid: Number
  }
});

DaapServer.prototype._router.add_route('/databases/:dbid/containers/:playlistid/items', function(context) {
  var songs = this.state.databases[urlkeyToIndex(context.params['dbid'])].playlists[urlkeyToIndex(context.params['playlistid'])].songs;

  reply(context.response, 
    ["apso",[
      ["mstt",200],
      ["muty",0],
      ["mtco",songs.length],
      ["mrco",songs.length],
      ["mlcl", songs.map(function(song, i) {
        return ["mlit", [
          //["mikd", 2],
          ["miid", indexToUrlkey(i)],
          ["mcti", indexToUrlkey(i)]
        ]];
      })]
    ]]
  ,true);
}, {
  pattern: {
    dbid: '(\\d+)',
    playlistid: '(\\d+)'
  },
  type: {
    dbid: Number,
    playlistid: Number
  }
});

DaapServer.prototype._router.add_route('/databases/:dbid/items/:songid', function(context) {
  var song = this.state.databases[urlkeyToIndex(context.params['dbid'])].songs[urlkeyToIndex(context.params['songid'])];

  context.response.connection.setTimeout(0);

  var streamHeaders = {
      'Content-Type': 'audio/mp3',
      'Accept-Range': 'bytes',
      'Connection': 'Close'
  };

  var status, label, offset;
  var end  = song.size - 1;
  if (context.request.headers.range) {
    status = 206;
    label = 'Partial Content';

    var range = context.request.headers.range.split('=');
    offset = Number(range[1].split('-')[0]);

    streamHeaders['Content-Range'] = 'bytes ' + offset + '-' + end + '/' + song.size;
  } else {
    status = 200;
    label = 'OK';

    offset = 0;
  }

  streamHeaders['Content-Length'] = song.size - offset;
  context.response.writeHead(status, label, headers(streamHeaders));

  sys.log('[streaming] ' + song.file + ' from byte ' + offset);
  var reader = fs.createReadStream(song.file, {
    start: offset,
    end: end,
    bufferSize: 512}
  );

  reader.pipe(context.response);

}, {pattern: {
  dbid: '(\\d+)',
  songid: '(\\d+).mp3'
}, type: {
  dbid: Number,
  songid: Number
}});

function reply(response, item, debug) {
  var label;
  var buffer;

  if (item.constructor == Buffer) {
    label = '<binary>';
    buffer = item;
  } else {
    label = dmap.tag(item);
    buffer = new Buffer(dmap.encodedLength(item));
    dmap.encode(item, buffer);
  }

  response.writeHead(200, headers({
    'Content-Length': buffer.length
  }));

  response.end(buffer);

  sys.log('[reply] ' + label + ' ' + buffer.length + ' bytes');
  if(debug){
    var reader = require('./reader.js');
    console.log(JSON.stringify(reader.read(buffer)[1],null,1));
  }
}

function headers(extra) {
  var headers = {
    'Date': new Date().toString(),
    'Content-Type': 'application/x-dmap-tagged',
    'DAAP-Server': 'daap.js/0.0'
  };

  for(var key in extra) {
    headers[key] = extra[key];
  }

  return headers;
}

function indexToUrlkey(i) {
  return i + 1;
}

function urlkeyToIndex(k) {
  return k - 1;
}
