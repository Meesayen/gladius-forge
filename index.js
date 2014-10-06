/* jshint -W079 */
var
  path = require('path'),
  $ = require('gulp-load-plugins')(),
  del = require('del'),
  semver = require('semver');


var
  cleanTmp = null,
  paths = {},
  config = {},
  lrport = 35729,
  serverport = 3000,
  server = null,
  gulp = null,
  plugins = {};


var handleError = function(message) {
  $.util.log($.util.colors.red(message));
  this.end();
};

// paths normalization helper
var elaboratePaths = function() {
  var src = config.paths.src;
  var out = config.paths.out;

  src.base = src.base || 'src/';
  src.styles = src.styles || 'styles/';
  src.scripts = src.scripts || 'scripts/';
  src.views = src.views || '../views/';
  src.partials = src.partials || 'partials/';

  out.base = out.base || 'public/';

  var processed = {
    src: {
      styles: src.base + src.styles + '**/*' + plugins.styles.ext,
      scripts: src.base + src.scripts,
      es6: src.base + src.scripts + '**/*.es6',
      js: src.base + src.scripts + '**/*.js',
      views: src.base + src.views + '**/*',
      partials: src.base + src.views + src.partials + '**/*' + plugins.tpls.ext,
      tmp: src.base + 'temp/'
    },
    out: {
      base: out.base,
      styles: out.base + (out.styles || 'css/'),
      js: out.base + (out.scripts || 'js/')
    }
  };

  return processed;
};

var elaboratePlugins = function() {
  return {
    styles: (function() {
      var type = (config.modules && config.modules.styles) || 'less';
      return (type === 'less' && { ext: '.less', cmd: $['less'],
            config: { compress: true }
          }) ||
          (type === 'sass' && { ext: '.sass', cmd: $['rubySass'],
            config: { style: 'compressed' }
          }) ||
          (type === 'sassCompass' && { ext: '.scss', cmd: $['rubySass'],
            config: { style: 'compressed', compass: true }
          }) ||
          (type === 'stylus' && { ext: '.styl', cmd: $['stylus'],
            config: { compress: true }
          }) ||
          (type === 'myth' && { ext: '.css', cmd: $['myth'],
            config: { sourcemap: true }
          });
    })(),
    tpls: (function() {
      var type = (config.modules && config.modules.templates) || 'handlebars';
      return (type === 'handlebars' && { ext: '.hbs', cmd: $['handlebars'],
            config: { }
          }) ||
          (type === 'jade' && { ext: '.jade', cmd: $['jade'],
            config: { client: true }
          }) ||
          (type === 'dust' && { ext: '.html', cmd: $['dust'],
            config: {
              name: function(f) { return f.relative.replace('.html',''); }
            }
          }) ||
          (type === 'dot' && { ext: '.dot', cmd: $['dotPrecompiler'],
            config: { separator: '/', dictionary: 'R.templates', varname: 'it' }
          });
    })(),
  };
};


var extendDeps = function(deps, extra) {
  if (!extra) {
    return deps;
  }
  extra = extra.deps || [];
  deps = deps.filter(function(el) {
    return extra.indexOf('!' + el) === -1;
  });
  extra = extra.filter(function(el) {
    return el.indexOf('!') !== 0;
  });
  return deps.concat(extra);
};

var extendSrcs = function(srcs, extra) {
  if (!extra) {
    return srcs;
  }
  return srcs.concat(extra.src || []);
};


/**
 * Gulp Boilerplate configuration function.
 * @param  {Object} _gulp: The gulp instance created from the gulpfile.js
 * @param  {Object} config: Configuration object
 */
var gulpConfig = function(_gulp, _config) {
  gulp = _gulp;
  config = _config;

  plugins = elaboratePlugins();
  paths = elaboratePaths();

  lrport = _config.liveReloadPort || lrport;
  server = _config.server || (console.error(
      'An Express server should be passed in the configuration.')),
  serverport = _config.port || serverport;

  cleanTmp = function(done) {
    del(paths.src.tmp, done);
  };
};


/**
 * Gulp Boilerplate default tasks setup function.
 */
var gulpSetupTasks = function(tasksConfig) {
  /* Helpers --------------------------------------------------------------- */
  var inc = function(importance) {
    return gulp.src([
      './package.json',
      './bower.json'
    ])
    .pipe($.bump({type: importance}))
    .pipe(gulp.dest('./'))
    .pipe($.filter('package.json'))
    .pipe($.git.commit('Release v' + semver.inc(
        require(path.dirname(module.parent.filename) + '/package.json').version,
        importance)))
    .pipe($.tagVersion())
    .pipe($.git.push('origin', 'master', { args: '--tags' }));
  };

  /* Version bumping ------------------------------------------------------- */
  gulp.task('patch', ['lint:blocker', 'jsvalidate:blocker:clean'], function() {
    return inc('patch');
  });
  gulp.task('feature', ['lint:blocker', 'jsvalidate:blocker:clean'], function() {
    return inc('minor');
  });
  gulp.task('release', ['lint:blocker', 'jsvalidate:blocker:clean'], function() {
    return inc('major');
  });


  /*
    CSS TASKS
              */

  /* Styles compilation ------------------------------------------------------ */
  gulp.task('styles', function() {
    return gulp.src([paths.src.styles])
    .pipe(plugins.styles.cmd(plugins.styles.config))
    .pipe($.autoprefixer('last 2 version', 'ie 8', 'ie 9'))
    .pipe(gulp.dest(paths.out.styles));
  });


  /*
    TEMPLATES TASKS
                    */

  /* Handlebars templates precompilation ----------------------------------- */
  gulp.task('tpl-precompile', function() {
    return gulp.src([paths.src.partials])
    .pipe(plugins.tpls.cmd(plugins.tpls.config))
    .pipe($.defineModule('plain'))
    .pipe($.declare({
      namespace: 'R.templates',
      processName: function(file) {
        return file.slice(file.indexOf(config.paths.src.partials) +
            config.paths.src.partials.length).replace('.js', '');
      }
    }))
    .pipe($.concat('templates.js'))
    .pipe(gulp.dest(paths.out.js));
  });

  /* Handlebars template livereloading ------------------------------------- */
  gulp.task('tpl-reload', ['tpl-precompile'], function() {
    return gulp.src([paths.src.views])
    .pipe($.livereload(lrport));
  });



  /*
    SCRIPTS TASKS
                  */

  /* JS linting ------------------------------------------------------------ */
  gulp.task('lint', extendDeps([], tasksConfig['lint']), function() {
    return gulp.src(extendSrcs([
      paths.src.js,
      paths.src.es6
    ], tasksConfig['lint']))
    .pipe($.jshint({
      lookup: true
    }))
    .pipe($.jshint.reporter('jshint-stylish'));
  });
  gulp.task('lint:blocker', extendDeps([], tasksConfig['lint']), function() {
    return gulp.src(extendSrcs([
      paths.src.js,
      paths.src.es6
    ], tasksConfig['lint']))
    .pipe($.jshint({
      lookup: true
    }))
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'));
  });

  gulp.task('jsvalidate:blocker', ['esnext'], function () {
    return gulp.src(extendSrcs([
      paths.src.tmp + '**/*.js',
      paths.src.tmp + '**/*.es6',
      '!' + paths.src.tmp + '**/*.test.js',
      '!' + paths.src.tmp + '**/*.test.es6'
    ], tasksConfig['lint']))
    .pipe($.jsvalidate());
  });

  gulp.task('jsvalidate:blocker:clean', ['jsvalidate:blocker'], cleanTmp);


  /* ES6 Syntax transpilation ---------------------------------------------- */
  gulp.task('esnext', ['copy'], function () {
    return gulp.src([
      paths.src.es6
    ])
    .pipe($.es6ModuleTranspiler({
      type: 'cjs'
    }))
    .on('error', handleError)
    .pipe($.esnext())
    .on('error', handleError)
    .pipe($.jsvalidate())
    .on('error', handleError)

    // Needed to support IE8. Get rid of it ASAP.
    .pipe($.replace(/\.catch\b/g, "['catch']"))
    .pipe($.replace(/\.throw\b/g, "['throw']"))
    .pipe($.replace(/\.return\b/g, "['return']"))

    .pipe(gulp.dest(paths.src.tmp));
  });


  /* JS modules bundling --------------------------------------------------- */
  gulp.task('bundle-js',
      extendDeps(['esnext'], tasksConfig['bundle-js']), function() {
    return gulp.src(extendSrcs([
      paths.src.tmp + 'pages/**/*.js',
      paths.src.tmp + 'pages/**/*.es6',
      '!' + paths.src.tmp + 'pages/**/*.test.js',
      '!' + paths.src.tmp + 'pages/**/*.test.es6'
    ], tasksConfig['bundle-js']))
    .pipe($.browserify({
      insertGlobals: false,
      debug: !gulp.env.production
    }))
    .pipe($.uglify())
    .pipe($.rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest(paths.out.js));
  });
  gulp.task('bundle-js:dev',
      extendDeps(['esnext'], tasksConfig['bundle-js:dev']), function() {
    return gulp.src(extendSrcs([
      paths.src.tmp + 'pages/**/*.js',
      paths.src.tmp + 'pages/**/*.es6',
      '!' + paths.src.tmp + 'pages/**/*.test.js',
      '!' + paths.src.tmp + 'pages/**/*.test.es6'
    ], tasksConfig['bundle-js:dev']))
    .pipe($.browserify({
      insertGlobals: false,
      debug: !gulp.env.production
    }))
    .pipe($.rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest(paths.out.js));
  });


  /* JS unit tests runner -------------------------------------------------- */
  gulp.task('karma', function() {
    return gulp.src([
      'tricky/freaky/trick/**/*.js'
    ])
    .pipe($.karma({
      configFile: 'karma.conf.js',
      action: 'run'
    }))
    .on('error', function(/*err*/) {
      // throw err;
    });
  });
  gulp.task('karma:dev', function() {
    return gulp.src([
      'tricky/freaky/trick/**/*.js'
    ])
    .pipe($.karma({
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

  gulp.task('bundle-js:clean', [
    'bundle-js'
  ], cleanTmp);

  gulp.task('bundle-js:dev:clean', [
    'bundle-js:dev'
  ], cleanTmp);

  gulp.task('reload', function() {
    gulp.src(paths.out.base + '**/*')
    .pipe($.cached('reloading'))
    .pipe($.livereload(lrport));
  });
};


/**
 * Gulp Boilerplate watchers setup function. It takes a list of extra watchers
 * to add to the process.
 * @param  {list<function>} extraWatchers: List of extra watchers to add.
 */
var gulpSetupWatchers = function(addExtraWatchers) {
  /* Watchers -------------------------------------------------------------- */
  gulp.task('watch', ['serve'], function () {
    gulp.watch(paths.src.es6, ['bundle-js:dev:clean']);
    gulp.watch(paths.src.js, ['bundle-js:dev:clean']);
    gulp.watch(paths.src.styles, ['styles']);
    gulp.watch(paths.src.views, ['tpl-reload']);
    gulp.watch(paths.out.base + '**/*', ['reload']);

    addExtraWatchers && addExtraWatchers(gulp);
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
    'styles',
    'bundle-js:dev:clean',
    'tpl-precompile',
    'watch'
  ].concat(devExts));

  gulp.task('test', [
    'lint',
    'karma'
  ].concat(testExts), cleanTmp);

  gulp.task('production', [
    'styles',
    'bundle-js:clean',
    'tpl-precompile'
  ].concat(prodExts));
};

module.exports = {
  config: gulpConfig,
  setupTasks: gulpSetupTasks,
  setupWatchers: gulpSetupWatchers,
  setupMain: gulpSetupMainTasks,
  getPlugins: function() {
    return {
      del: del,
      clean: $.clean,
      cached: $.cached,
      jshint: $.jshint,
      jsvalidate: $.jsvalidate,
      esnext: $.esnext,
      es6ModuleTranspiler: $.es6ModuleTranspiler,
      rename: $.rename,
      styles: plugins.styles.cmd,
      karma: $.karma,
      uglify: $.uglify,
      replace: $.replace,
      livereload: $.livereload,
      autoprefix: $.autoprefixer,
      browserify: $.browserify,
      handlebars: $.handlebars,
      defineModule: $.defineModule,
      declare: $.declare,
      concat: $.concat,
      git: $.git,
      bump: $.bump,
      semver: semver,
      tagVersion: $.tagVersion
    };
  }
};
