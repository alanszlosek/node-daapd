var CC = require('../lib/contentCodes');
var fs = require('fs');
var async = require('async');
var path = require('path');
var unknown = {};
var dat = {};

function readTagLength(buffer, from){
  return [null,buffer.toString('ascii', from, from + 4), buffer.readUInt32BE(from + 4)];
}

function readData(buffer, from, length, tagName){
  var type = 13; // standard not defined will resolve to string
  if(CC.lookUp(tagName)){
    type = CC.lookUp(tagName).type;
  }
  if(length == 0){
    return [null,true,type];
  }
  var str = "(empty)";
  switch(type%13){
    case 1: // 1 byte boolean?
      str = buffer.readUInt8(from);
      break;
    case 3: // 2 byte short
      str = buffer.readUInt16BE(from);
      break;
    case 5: // 4 byte int
      str = buffer.readUInt32BE(from);
      break;// 3522317294003940547 = 
    case 7: // 8-byte integer, tends to be represented in hex rather than numerical form
      
      //console.log("tagName:", tagName); // 3522317294003940547
      //console.log("buf:", buffer.toString('hex', 4, 8));
      //console.log("diff:", 3522317294003940547 - buffer.readUInt32BE(from) * 4294967295 + buffer.readUInt32BE(from + 4));
      //console.log("nummer:",buffer.readUInt32BE(from) * 4294967295 + buffer.readUInt32BE(from + 4));
      str = buffer.toString('hex', from, from + length);
      break;
    default:
    case 13: // unclear
      str = buffer.toString('hex', from, from + length)
      break;
    case 9: //string of characters (UTF-8)
      str = buffer.toString('UTF-8', from, from + length);
      break;
    case 10: // date 4-byte integer with seconds since 1970 (standard UNIX time format)
      str = buffer.readUInt32BE(from);
      break;
    case 11: // version 2-bytes major version, next byte minor version, last byte patchlevel
      str = [buffer.readUInt8(from)*256 + buffer.readUInt8(from + 1), buffer.readUInt8(from + 2), buffer.readUInt8(from + 3)] ;
      break;
    case 12: // container contains a series of other chunks, one after the other
      throw new Error("should not try to get data from a container")
      break;
    // other numbers (2,4,6,8) are not defined
  }// 
  return [null,str,type];
}

module.exports.read = function exportRead(buffer){
  return read(buffer, 0, buffer.length, false);
  
}


function read(buffer, from, toRead,isList){
  var readBytes = 0;
  var curData = [];
  if(!isList){
    curData = {};
  }
  while(readBytes < toRead){
    var errTagLength = readTagLength(buffer, from + readBytes);
    var err = errTagLength[0];
    var tagName = errTagLength[1];
    var length = errTagLength[2];
    readBytes += 8;
    if(CC.lookUp(tagName) && CC.lookUp(tagName).type == 12){
      // console.log("list", tagName);
      var errCur = read(buffer, readBytes + from, length, true);
      readBytes += length;
      if(isList){
        curData[curData.length] = {};
        curData[curData.length-1][tagName] = errCur[1];
      }
      else{
        curData[tagName] = errCur[1];
      }
      
    }
    else{     
      var errDataType = readData(buffer, readBytes + from, length, tagName);
      readBytes += length;
      if(isList){
        curData[curData.length] = {};
        curData[curData.length-1][tagName] = errDataType[1];
      }
      else{
        curData[tagName] = errDataType[1];
      }
      
      if(errDataType[2] == 13){
        if(unknown[tagName] == undefined){
          unknown[tagName] = 0;
          console.log("unknown tagName:",tagName);
          process.exit(0);
        }
        unknown[tagName]++;
      }
      // console.log("dat", tagName + "(" +length + ", "+ type +")", data);
    }
  } 
  return [err,curData];
}

function readFile(fileName,cb){
  fs.open(fileName, 'r', function(err, fd) {
    if(err) throw err;
    fs.stat(fileName,function(err,stats){
      buffer = new Buffer(stats.size);
      fs.read(fd,buffer,0,stats.size,0,function(err,bytesRead,buffer){
        var errData = read(buffer, 0, stats.size);
        console.log("finished with", path.basename(fileName,'.x-dmap-tagged')[0]);
        fs.close(fd);
        cb(errData[0],errData[1]);
      });// fs.read    
    });//fs.stat
  });// fs.open
}
if(!module.parent){
  fs.readdir( __dirname+'/sessions',function(err,files){
    console.log("files",files);
    var i = 0;
    async.whilst(function(){
      return i < files.length;
    },function(callback){
      if(files[i][0] == "."){
        i++;
        return callback();
      }
      console.log("open and process", files[i][0]);
      readFile(__dirname+'/sessions/'+files[i], function(err,data){
        if(err) throw err;
        dat[files[i][0]] = data;
        i++;
        console.log("i:",i,files.length);
        return callback();
      });
    },
    function(err){
      if(err) throw err;
      console.log("Completed!!!");
      fs.writeFile(__dirname+'/unknown.txt', JSON.stringify(unknown,undefined,2), function (err) {
        if (err) throw err;
        console.log('It\'s saved! unknown');
      });
      fs.writeFile(__dirname+'/dat.txt', JSON.stringify(dat,undefined,1), function (err) {
        if (err) throw err;
        console.log('It\'s saved! dat');
      });
      //console.log("dat", dat);
      //console.log("unknown",unknown);
        // tags not in ytrack: asgr, asse, aeMQ, aeFR, aeTR, aeSL, aeSR, aeFP, aeSX, ppro, msed, msed, msml, msma, weitere
    });
  });
}
