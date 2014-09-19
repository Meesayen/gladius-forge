var
  gulp = require('gulp'),
  gulpBoilerplate = require('es6-gulp-boilerplate'),
  server = require('./app');


/**
 * Here you can configure the gulp build system with custom folders etc.
 */
gulpBoilerplate.config(gulp, {
  paths: {
    src: {
      // folder home of your source files (less, js, etc). default: src/
      base: '',

      // css sources folder. default: less/
      css: '',

      // scripts folder. default: scripts/
      scripts: '',

      // templates and partials folder: default: ../views/, partials/
      templates: '',
      partials: '',

    },

    out: {
      // folder destination for built bundles. default: public/
      base: '',

      // production ready css folder. default: css/
      css: '',

      // production ready scripts folder. default: js/
      scripts: ''
    }
  },
  // express web server to use while developing.
  // port default: 3000
  // liveReloadPort default: 35729
  server: server,
  port: null,
  liveReloadPort: null
});


// TODO make it possible to hook into predefined tasks
gulpBoilerplate.setupTasks();


/**
 * Add extra gulp tasks below
 */

/* Handlebars helpers bundling --------------------------------------------- */
gulp.task('publish-helpers', function() {
  return gulp.src(['handlebars.helpers.js'])
  .pipe(gulpBoilerplate.plugins.uglify())
  .pipe(gulp.dest('public/js/'));
});


/**
 * Add extra gulp watchers below
 */
var extraWatchers = [
  function(gulp) {
    gulp.watch('handlebars.helpers.js', ['publish-helpers']);
  }
];

gulpBoilerplate.setupWatchers(extraWatchers);



/**
 * Here you can inject extra tasks into the main tasks. Those will be appendend
 * and concurrently run with other tasks.
 * If you need to hook a particular task into another one, wait for the next
 * release of this build environment. :)
 */
gulpBoilerplate.setupMain({
  'development': [
    'publish-helpers'
  ],
  'test': [],
  'production': [
    'publish-helpers'
  ]
});
