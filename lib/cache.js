/*
FEATURES
* cache file names, and music metadata
  * reduce node-daapd startup time ... if file in our database exists where we expect it to in the filesystem, we don't have to re-extract mp3 tags

TODO
* watch for changes on certain folders

*/

var walk = require('walk'),
  fs = require('fs');

module.exports = function(saveCallback, readCallback) {
  var cache = {};
  var files = [];

  // TODO: Don't allow params to be null

  return {
    addFolders: function(folders) {
      for (var i = 0; i < folders.length; i++) {
        this.addFolder(folders[i]);
      }
    },
    addFolder: function(folder, callback) {
      var options = {
        followLinks: false,
      };
      var walker = walk.walk(folder, options);
      //console.log('Walking ' + folder);
      // Should we keep a handle to this? Might not need it
      walker.on("file", function (root, fileStats, next) {
        var closure = function(root, fileStats, next) {
          var filename = root + '/' + fileStats.name;
          return function(metadata) {
            if (!metadata) {
              // File not found in our cache, save it
              //console.log('found ' + fileStats.name);
              saveCallback(
                root,
                fileStats,
                function(metadata) {
                  if (!metadata) {
                    return next();
                  }

                  // File not skipped, so cache locally
                  if (!(root in cache)) {
                    cache[root] = {};
                  }
                  //console.log('caching locally');
                  cache[root][filename] = metadata;
                  files.push(metadata);
                  next();
                }
              );

            } else {
              if (!(root in cache)) {
                cache[root] = {};
              }
              //console.log('caching locally');
              cache[root][filename] = metadata;
              files.push(metadata);
              next();
            }
          }
        };
        readCallback(root, fileStats, closure(root, fileStats, next));
      });

      walker.on("errors", function (root, nodeStatsArray, next) {
        next();
      });

      walker.on("end", callback);
    },

    getAll: function() {
      return files;
    }
  };

};

