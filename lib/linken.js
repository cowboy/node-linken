/*
 * linken
 * https://github.com/cowboy/node-linken
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman
 * Licensed under the MIT license.
 */

'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');
var url = require('url');

// External libs.
var semver = require('semver');
var mkdirp = require('mkdirp').sync;
var rimraf = require('rimraf').sync;

// Does it exist?
var exists = function() {
  var filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath);
};

// Is it a directory?
var isDir = function() {
  var dirpath = path.join.apply(path, arguments);
  return exists(dirpath) && fs.statSync(dirpath).isDirectory();
};

// For each child subdirectory of each --src path, add any valid npm
// modules (those with a package.json file) to a master "modules" object.
var getModules = function(srcs, opts) {
  var modules = {};
  srcs.forEach(function(src) {
    if (!exists(src)) {
      opts.log('Ignoring invalid --src path "%s".', src);
      return;
    }
    src = path.resolve(src);
    fs.readdirSync(src).forEach(function(dirname) {
      if (!isDir(src, dirname)) { return; }
      var pkgpath = path.join(src, dirname, 'package.json');
      if (!exists(pkgpath)) { return; }
      var pkg = require(pkgpath);
      var mod = modules[pkg.name];
      if (!mod) {
        mod = modules[pkg.name] = {versions: []};
      }
      mod.versions.push(pkg.version);
      mod[pkg.version] = path.join(src, dirname);
    });
  });

  modules._names = Object.keys(modules);

  // Sort module versions, descending.
  modules._names.forEach(function(name) {
    modules[name].versions.sort(semver.rcompare);
  });

  var versionCount = 0;
  var output = [];
  if (opts.debug) {
    modules._names.forEach(function(name) {
      var versions = modules[name].versions;
      versionCount += versions.length;
      output.push(['* %s (%s)', name, versions.join(', ')]);
    });
    if (versionCount !== modules._names.length) {
      opts.log('Found %d versions of %d modules:', versionCount, modules._names.length);
    } else {
      opts.log('Found %d modules:', modules._names.length);
    }
    output.forEach(Function.apply.bind(opts.log, null));
    opts.log('');
  }

  return modules;
};

var getVersionRange = function (input) {
  var parsed;
  var result = input;
  if (input) {
    if (!semver.valid(input)) {
      // parse to see if input is a git url
      parsed = url.parse(input);
      // if it parsed, we should get a hash property and we can assume it was
      if (parsed.hash) {
        // check everything after the hash as a version
        parsed = parsed.hash.substring(1);
        // if it still isn't valid, use a wildcard version
        if (!semver.valid(parsed)) {
          result = '*';
        } else {
          // otherwise use the version from the hash
          result = parsed;
        }
      }
    }
  }
  return result;
};

var getLinks = function(pkg, modules) {
  // Determine which (if any) modules should be linked locally.
  var links = {};
  ['dependencies', 'devDependencies'].forEach(function(prop) {
    var dependencies = pkg[prop];
    if (!dependencies) { return; }
    modules._names.forEach(function(name) {
      var range = getVersionRange(dependencies[name]);
      if (!range) { return; }
      modules[name].versions.forEach(function(version) {
        if (!links[name] && semver.satisfies(version, range)) {
          links[name] = version;
        }
      });
    });
  });

  links._names = Object.keys(links);

  return links;
};

// For each destination directory, link or unlink any appropriate modules from
// any --src directory.
var linkModule = function(dest, modules, links, opts) {
  if (links._names.length > 0 || opts.debug) {
    opts.log('%s: ' + (opts.unlink ? 'un' : '') + 'linking %d module' +
      (links._names.length === 1 ? '' : 's'), path.basename(dest), links._names.length);
  }

  if (links._names.length > 0) {
    // Create node_modules subdirectory if needed.
    mkdirp(path.join(dest, 'node_modules'));

    // Actually unlink / link modules into node_modules directory.
    links._names.forEach(function(name) {
      var version = links[name];
      var linkSrc = modules[name][version];
      var linkDest = path.join(dest, 'node_modules', name);
      if (opts.debug) {
        opts.log('* %s@%s (%s)', name, version, linkSrc);
      }
      // Remove any existing directory or link.
      rimraf(linkDest);
      // Create symbolic link.
      if (!opts.unlink) {
        fs.symlinkSync(linkSrc, linkDest, 'dir');
      }
    });
  }
};

exports.linken = function(srcs, dests, opts) {
  if (!opts) { opts = {}; }
  if (!opts.log) { opts.log = 'log' in opts ? function(){} : console.log; }

  // Remove invalid destination directories.
  if (dests) {
    dests = dests.filter(function(dirpath) {
      if (!isDir(dirpath)) {
        opts.log('Ignoring invalid path "%s".', dirpath);
      } else if (!exists(dirpath, 'package.json')) {
        opts.log('Missing package.json file in path "%s".', dirpath);
      } else {
        return true;
      }
    });
  }

  if (!dests || dests.length === 0) {
    throw new TypeError('You must specify at least one valid destination path.');
  }

  if (!srcs || srcs.length === 0) {
    throw new TypeError('You must specify at least one --src path.');
  }

  var modules = getModules(srcs, opts);

  dests.forEach(function(dest, i) {
    dest = path.resolve(dest);

    var pkg = require(path.join(dest, 'package.json'));
    var links = getLinks(pkg, modules);

    linkModule(dest, modules, links, opts);

    if (opts.debug && i < dests.length - 1) {
      opts.log('');
    }
  });
};
