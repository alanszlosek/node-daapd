var daap = require('../lib/daap');
var Song = require('../lib/song').Song;

daap.createServer({
  advertise:true,
  songs: [
    new Song({
      file: 'music/short.mp3'
    }),
    new Song({
      file: '/home/alan/Music3/Dillinger_Escape_Plan-When_Good_Dogs_Do_Bad_Things.mp3'
    }),
  ]
}).listen(3689);
