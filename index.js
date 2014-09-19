var
  path = require('path'),
  clean = require('gulp-rimraf'),
  cache = require('gulp-cached'),
  jshint = require('gulp-jshint'),
  esnext = require('gulp-esnext'),
  nextModule = require('gulp-es6-module-transpiler'),
  rename = require('gulp-rename'),
  less = require('gulp-less'),
  karma = require('gulp-karma'),
  uglify = require('gulp-uglify'),
  replace = require('gulp-replace'),
  livereload = require('gulp-livereload'),
  autoprefix = require('gulp-autoprefixer'),
  browserify = require('gulp-browserify'),
  handlebars = require('gulp-handlebars'),
  defineModule = require('gulp-define-module'),
  declare = require('gulp-declare'),
  concat = require('gulp-concat'),
  git = require('gulp-git'),
  bump = require('gulp-bump'),
  semver = require('semver'),
  tagVersion = require('gulp-tag-version');


var
  cleanTmp = null,
  paths = {},
  lrport = 35729,
  serverport = 3000,
  server = null,
  gulp = null,

  // paths normalization helper
  elaboratePaths = function(paths) {
    var src = paths.src;
    var out = paths.out;

    src.base = src.base || 'src/';
    src.css = src.css || 'less/';
    src.scripts = src.scripts || 'scripts/';
    src.views = src.views || '../views/';
    src.partials = src.partials || 'partials/';

    out.base = out.base || 'public/';

    var processed = {
      src: {
        css: src.base + src.css + '**/*.less',
        scripts: src.base + src.scripts,
        es6: src.base + src.scripts + '**/*.es6',
        js: src.base + src.scripts + '**/*.js',
        views: src.base + src.views + '**/*.hbs',
        mocks: src.base + src.views + '**/*.json',
        partials: src.base + src.views + src.partials + '**/*.hbs',
        tmp: src.base + 'temp/'
      },
      out: {
        base: out.base,
        css: out.base + (out.css || 'css/'),
        js: out.base + (out.js || 'js/')
      }
    };

    return processed;
  };


/**
 * Gulp Boilerplate configuration function.
 * @param  {Object} _gulp: The gulp instance created from the gulpfile.js
 * @param  {Object} config: Configuration object
 */
var gulpConfig = function(_gulp, config) {
  gulp = _gulp;
  paths = elaboratePaths(config.paths);
  lrport = config.liveReloadPort || lrport;
  server = config.server || (console.error(
      'An Express server should be passed in the configuration.')),
  serverport = config.port || serverport;

  cleanTmp = function() {
    gulp.src(paths.src.tmp, {read: false})
    .pipe(clean());
  };
};


/**
 * Gulp Boilerplate default tasks setup function.
 */
var gulpSetupTasks = function() {
  /* Helpers --------------------------------------------------------------- */
  var inc = function(importance) {
    return gulp.src(['./package.json'])
    .pipe(bump({type: importance}))
    .pipe(gulp.dest('./'))
    .pipe(git.commit('Release v' + semver.inc(
        require(path.dirname(module.parent.filename) + '/package.json').version,
        importance)))
    .pipe(tagVersion())
    .pipe(git.push('origin', 'master', { args: '--tags' }));
  };

  /* Version bumping ------------------------------------------------------- */
  gulp.task('patch', function() { return inc('patch'); });
  gulp.task('feature', function() { return inc('minor'); });
  gulp.task('release', function() { return inc('major'); });


  /*
    CSS TASKS
              */

  /* LESS compilation ------------------------------------------------------ */
  gulp.task('less', function() {
    return gulp.src([paths.src.css])
    .pipe(less({
      compress: true
    }))
    .pipe(autoprefix('last 2 version', 'ie 8', 'ie 9'))
    .pipe(gulp.dest(paths.out.css));
  });


  /*
    TEMPLATES TASKS
                    */

  /* Handlebars templates precompilation ----------------------------------- */
  gulp.task('tpl-precompile', function() {
    return gulp.src([paths.src.partials])
    .pipe(handlebars())
    .pipe(defineModule('plain'))
    .pipe(declare({
      namespace: 'Handlebars.templates'
    }))
    .pipe(concat('templates.js'))
    .pipe(gulp.dest(paths.out.js));
  });

  /* Handlebars template livereloading ------------------------------------- */
  gulp.task('tpl-reload', ['tpl-precompile'], function() {
    return gulp.src([
      paths.src.views,
      paths.src.mocks
    ])
    .pipe(livereload(lrport));
  });



  /*
    SCRIPTS TASKS
                  */

  /* JS linting ------------------------------------------------------------ */
  gulp.task('lint', function() {
    return gulp.src([
      paths.src.js,
      paths.src.es6,
      '!' + paths.src.scripts + 'vendor/**/*',
      '!' + paths.src.scripts + 'mock/lib/**/*'
    ])
    .pipe(jshint({
      lookup: true
    }))
    .pipe(jshint.reporter('jshint-stylish'));
  });

  /* ES6 Syntax transpilation ---------------------------------------------- */
  gulp.task('esnext', ['copy'], function () {
    return gulp.src([
      paths.src.es6
    ])
    // .pipe(cache('esnexting'))
    .pipe(esnext())
    .pipe(nextModule({
      type: 'cjs'
    }))

    // Needed to support IE8. Get rid of it ASAP.
    .pipe(replace(/\.catch/g, "['catch']"))
    .pipe(replace(/\.throw/g, "['throw']"))
    .pipe(replace(/\.return/g, "['return']"))

    .pipe(gulp.dest(paths.src.tmp));
  });


  /* JS modules bundling --------------------------------------------------- */
  gulp.task('bundle-js', ['esnext'], function() {
    return gulp.src([
      paths.src.tmp + 'pages/**/*.js',
      '!' + paths.src.tmp + 'pages/**/*.test.js'
    ])
    .pipe(browserify({
      insertGlobals: false,
      debug: !gulp.env.production
    }))
    .pipe(uglify())
    .pipe(gulp.dest(paths.out.js));
  });
  gulp.task('bundle-js:dev', ['bundle-mock-server'], function() {
    return gulp.src([
      paths.src.tmp + 'pages/**/*.js',
      '!' + paths.src.tmp + 'pages/**/*.test.js'
    ])
    .pipe(browserify({
      insertGlobals: false,
      debug: !gulp.env.production
    }))
    .pipe(gulp.dest(paths.out.js));
  });
  gulp.task('bundle-mock-server', ['lint', 'esnext'], function() {
    return gulp.src([paths.src.tmp + '/mock/server.js'])
    .pipe(browserify({
      insertGlobals: false,
      debug: true
    }))
    .pipe(rename(function (path) {
      path.basename = 'mock-server';
    }))
    .pipe(gulp.dest(paths.out.js));
  });

  /* JS unit tests runner -------------------------------------------------- */
  gulp.task('karma', function() {
    return gulp.src([
      'temp/vendor/handlebars.runtime.js',
      'temp/**/*.test.js'
    ])
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }))
    .on('error', function(/*err*/) {
      // throw err;
    });
  });
  gulp.task('karma:dev', function() {
    return gulp.src([
      'temp/vendor/handlebars.runtime.js',
      'temp/**/*.test.js'
    ])
    .pipe(karma({
      configFile: 'karma.conf.js',
      action: 'watch'
    }))
    .on('error', function(/*err*/) {
      // throw err;
    });
  });


  /*
    UTILS
          */

  /* Lightweight frontend development server ------------------------------- */
  gulp.task('serve', function() {
    server.listen(serverport);
  });

  gulp.task('copy', function() {
    return gulp.src([paths.src.scripts + '**/*'])
    .pipe(gulp.dest(paths.src.tmp));
  });

  gulp.task('bundle-js:dev:clean', [
    'bundle-js:dev'
  ], cleanTmp);

  gulp.task('reload', function() {
    gulp.src(paths.out.base + '**/*')
    .pipe(cache('reloading'))
    .pipe(livereload(lrport));
  });
};


/**
 * Gulp Boilerplate watchers setup function. It takes a list of extra watchers
 * to add to the process.
 * @param  {list<function>} extraWatchers: List of extra watchers to add.
 */
var gulpSetupWatchers = function(extraWatchers) {
  /* Watchers -------------------------------------------------------------- */
  gulp.task('watch', ['serve'], function () {
    gulp.watch(paths.src.es6, ['bundle-js:dev:clean']);
    gulp.watch(paths.src.scripts + '*.js', ['bundle-js:dev:clean']);
    gulp.watch(paths.src.scripts + '!(mock)/*.js', ['bundle-js:dev:clean']);
    gulp.watch(paths.src.scripts + 'mock/*.js', ['lint', 'bundle-js:dev:clean']);
    gulp.watch(paths.src.css, ['less']);
    gulp.watch(paths.src.views, ['tpl-reload']);
    gulp.watch(paths.src.mocks, ['tpl-reload']);
    gulp.watch(paths.out.base + '**/*', ['reload']);

    for (var i = 0, w; (w = extraWatchers[i]); i++) {
      w(gulp);
    }
  });
};


/**
 * Gulp Boilerplate main tasks setup function. It can extend main tasks with
 * extra externally defined tasks via an "extension" parameter.
 * @param  {Object} extensions: object descriptor of extra tasks to add for
 *                              each main task.
 */
var gulpSetupMainTasks = function(extensions) {
  var
    devExts = extensions.development || [],
    testExts = extensions.test || [],
    prodExts = extensions.production || [];

  gulp.task('default', ['development']);

  gulp.task('development', [
    'karma:dev',
    'less',
    'bundle-js:dev:clean',
    'tpl-precompile',
    'watch'
  ].concat(devExts));

  gulp.task('test', [
    'lint',
    'karma'
  ].concat(testExts), cleanTmp);

  gulp.task('production', [
    'less',
    'bundle-js',
    'tpl-precompile'
  ].concat(prodExts));
};

module.exports = {
  config: gulpConfig,
  setupTasks: gulpSetupTasks,
  setupWatchers: gulpSetupWatchers,
  setupMain: gulpSetupMainTasks,
  plugins: {
    clean: clean,
    cache: cache,
    jshint: jshint,
    esnext: esnext,
    nextModule: nextModule,
    rename: rename,
    less: less,
    karma: karma,
    uglify: uglify,
    replace: replace,
    livereload: livereload,
    autoprefix: autoprefix,
    browserify: browserify,
    handlebars: handlebars,
    defineModule: defineModule,
    declare: declare,
    concat: concat,
    git: git,
    bump: bump,
    semver: semver,
    tagVersion: tagVersion
  }
};
