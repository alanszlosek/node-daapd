var daap = require('../lib/daap');
var Song = require('../lib/song').Song;

daap.createServer({
  advertise:true,
  songs: [new Song({
          file: 'music/short.mp3'
        })],
  name:"spruce"
}).listen(3689);
