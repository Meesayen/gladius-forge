/* jshint -W079 */
var
  gulp = require('gulp'),
  gladius = require('gladius-forge'),
  server = require('./app');


/**
 * Here you can configure the gulp build system with custom folders, different
 * build modules, etc.
 * ------------------------------------------------------------------------- */
gladius.config(gulp, {
  modules: {
    // module to use to preprocess your stylesheets. default: less
    // possible values: less, sass, sassCompass, stylus, myth.
    styles: '',
    // module to use to preprocess your stylesheets. default: handlebars
    // possible values: handlebars, jade, dust, dot.
    templates: ''
  },
  paths: {
    src: {
      // folder home of your source files (less, js, etc). default: src/
      base: '',

      // styles sources folder. default: styles/
      styles: '',

      // scripts folder. default: scripts/
      scripts: '',

      // file extension for es6+ scripts. default: .es6
      esnextExtension: '',

      // templates and partials folder: default: ../views/, partials/
      templates: '',
      partials: null
    },

    out: {
      // folder destination for built bundles. default: public/
      base: '',

      // production ready styles folder. default: css/
      styles: '',

      // production ready scripts folder. default: js/
      scripts: ''
    }
  },
  // if the gulpfile is located in a different folder to the one which contains
  // your scripts, a force clean is required, to wipe the temp folder.
  forceClean: false,
  // express web server to use while developing.
  // port default: 3000
  // liveReloadPort default: 35729
  server: server,
  port: null,
  liveReloadPort: null
});




/**
 * Here you can hook extra tasks as dependency for predefined tasks (insert
 * a leading '!' to remove dependencies) or add additional sources (insert a
 * leading '!' to the path to delcare sources which should be ignored).
 * ------------------------------------------------------------------------- */
gladius.setupTasks({
  'bundle-js': {
    deps: [],
    src: []
  },
  'bundle-js:dev': {
    deps: [],
    src: []
  },
  'lint': {
    deps: [],
    src: []
  }
});


/**
 * Add extra gulp tasks below
 * ------------------------------------------------------------------------- */
var $ = gladius.getPlugins();

// Check the Meesayen/es6-boilerplate repository on github for a sample usage.



/**
 * Here you plug additional watchers to gulp.
 * ------------------------------------------------------------------------- */
gladius.setupWatchers(function(gulp) {
  // Add wathers here.
});



/**
 * Here you can inject extra tasks into the main tasks. Those will be appendend
 * and concurrently run with other tasks.
 * ------------------------------------------------------------------------- */
gladius.setupMain({
  'development': [],
  'test': [],
  'production': []
});
