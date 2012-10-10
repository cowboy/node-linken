'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      stuff: {
        src: [
          'Gruntfile.js',
          'bin/*',
          'lib/*.js'
        ]
      },
    },
    nodeunit: {
      tests: ['test/*_test.js'],
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Default task.
  grunt.registerTask('default', ['jshint', 'nodeunit']);

};
