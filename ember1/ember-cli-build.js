/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');

var mergeTrees = require('broccoli-merge-trees');
var pickFiles = require('broccoli-static-compiler');
var mvcCommon = pickFiles('node_modules/todomvc-common', {
  srcDir: '/',
  files: ['**/*'],
  destDir: '/todomvc-common/'
});
var mvcAppCss = pickFiles('node_modules/todomvc-app-css', {
  srcDir: '/',
  files: ['**/*'],
  destDir: '/todomvc-app-css/'
});

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    // Add options here
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return mergeTrees([app.toTree(), mvcCommon, mvcAppCss]);
};
