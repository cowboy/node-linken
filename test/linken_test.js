'use strict';

// Nodejs libs.
var fs = require('fs');
var path = require('path');

// External libs.
var rimraf = require('rimraf').sync;
var mkdirp = require('mkdirp').sync;

var linken = require('../lib/linken').linken;

var base = 'test/fixtures';
var dirs = [
  'foo',
  'foo-new',
  'foo-old',
  'bar',
  'bar-old',
  'baz',
  'qux',
];

var clean = function(dir) {
  (dir ? [dir] : dirs).forEach(function(dir) {
    rimraf(path.join(base, dir, 'node_modules'));
  });
};

var exists = function() {
  var filepath = path.join.apply(path, arguments);
  return fs.existsSync(filepath);
};

var getDirs = function() {
  return [].slice.call(arguments).map(function(dirname) {
    return path.join(base, dirname);
  });
};

var getLinks = function(dest) {
  var nm = path.join(base, dest, 'node_modules');
  if (!exists(nm)) { return false; }
  return fs.readdirSync(nm).map(function(filename) {
    var filepath = path.join(nm, filename);
    return fs.lstatSync(filepath).isSymbolicLink() && fs.realpathSync(filepath);
  }).filter(Boolean).map(function(filepath) {
    return path.relative(path.resolve(base), filepath);
  }).sort();
};

exports['linken'] = {
  setUp: function(done) {
    clean();
    done();
  },
  tearDown: function(done) {
    clean();
    done();
  },
  'single dest': function(test) {
    test.expect(4);
    linken([base], getDirs('foo'), {log: null});
    linken([base], getDirs('bar'), {log: null});
    linken([base], getDirs('baz'), {log: null});
    linken([base], getDirs('qux'), {log: null});
    test.deepEqual(getLinks('foo'), ['qux'], 'qux should have been linked into foo');
    test.deepEqual(getLinks('bar'), ['baz', 'foo-new'], 'baz and foo-new should have been linked into bar');
    test.deepEqual(getLinks('baz'), ['foo-old', 'qux'], 'foo-old and qux should have been linked into baz');
    test.deepEqual(getLinks('qux'), false, 'nothing should have been linked into qux, node_modules should not have been created');
    test.done();
  },
  'multiple dest': function(test) {
    test.expect(7);
    linken([base], getDirs.apply(null, dirs), {log: null});
    // same tests as before
    test.deepEqual(getLinks('foo'), ['qux'], 'qux should have been linked into foo');
    test.deepEqual(getLinks('bar'), ['baz', 'foo-new'], 'baz and foo-new should have been linked into bar');
    test.deepEqual(getLinks('baz'), ['foo-old', 'qux'], 'foo-old and qux should have been linked into baz');
    test.deepEqual(getLinks('qux'), false, 'nothing should have been linked into qux, node_modules should not have been created');
    // additional tests
    test.deepEqual(getLinks('foo-new'), ['qux'], 'qux should have been linked into foo-new');
    test.deepEqual(getLinks('foo-old'), false, 'nothing should have been linked into foo-old, node_modules should not have been created');
    test.deepEqual(getLinks('bar-old'), ['baz', 'foo-old'], 'baz and foo-new should have been linked into bar-old');
    test.done();
  },
  'unlink': function(test) {
    test.expect(3);
    linken([base], getDirs.apply(null, dirs), {log: null});
    linken([base], getDirs('foo'), {log: null, unlink: true});
    linken([base], getDirs('bar'), {log: null, unlink: true});
    linken([base], getDirs('baz'), {log: null, unlink: true});
    test.deepEqual(getLinks('foo'), [], 'nothing should be linked into foo');
    test.deepEqual(getLinks('bar'), [], 'nothing should be linked into bar');
    test.deepEqual(getLinks('baz'), [], 'nothing should be linked into baz');
    test.done();
  },
  'unlink - overwrite': function(test) {
    test.expect(2);
    mkdirp(path.join(base, 'bar/node_modules/baz'));
    fs.writeFileSync(path.join(base, 'bar/node_modules/foo-new'), 'TEST');
    linken([base], getDirs('bar'), {log: null});
    test.deepEqual(getLinks('bar'), ['baz', 'foo-new'], 'baz and foo-new should have been linked into bar');

    mkdirp(path.join(base, 'bar/node_modules/baz'));
    fs.writeFileSync(path.join(base, 'bar/node_modules/foo-new'), 'TEST');
    linken([base], getDirs('bar'), {log: null, unlink: true});
    test.deepEqual(getLinks('bar'), [], 'baz and foo-new should have been unlinked from bar');
    test.done();
  },
};
