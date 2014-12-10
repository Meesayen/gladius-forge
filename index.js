/* jshint -W079 */
var
  path = require('path'),
  $ = require('gulp-load-plugins')({
    scope: ['dependencies', 'lazyDependencies']
  }),
  lazyDependencies = require('./package.json').lazyDependencies,
  del = require('del'),
  semver = require('semver'),
  addons = require('./addons.json');


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
  src.esnextExtension = src.esnextExtension || '.es6';
  src.views = src.templates || '../views/';
  src.partials = src.partials !== null ? src.partials : 'partials/';

  out.base = out.base || 'public/';

  var processed = {
    src: {
      styles: src.base + src.styles + '**/*' + plugins.styles.ext,
      scripts: src.base + src.scripts,
      es6: src.base + src.scripts + '**/*' + src.esnextExtension,
      esnextExt: src.esnextExtension,
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
      return (type === 'less' && {
          ext: '.less',
          get cmd() { return $.less; },
          config: { compress: true }
        }) ||
        (type === 'sass' && {
          ext: '.sass',
          get cmd() { return $.rubySass; },
          config: { style: 'compressed' }
        }) ||
        (type === 'scssCompass' && {
          ext: '.scss',
          get cmd() { return $.rubySass; },
          config: { style: 'compressed', compass: true }
        }) ||
        (type === 'stylus' && {
          ext: '.styl',
          get cmd() { return $.stylus; },
          config: { compress: true }
        }) ||
        (type === 'myth' && {
          ext: '.css',
          get cmd() { return $.myth; },
          config: { sourcemap: true }
        });
    })(),
    tpls: (function() {
      var type = (config.modules && config.modules.templates) || 'handlebars';
      return (type === 'handlebars' && {
          ext: '.hbs',
          get cmd() { return $.handlebars; },
          config: { }
        }) ||
        (type === 'jade' && {
          ext: '.jade',
          get cmd() { return $.jade; },
          config: { client: true }
        }) ||
        (type === 'dust' && {
          ext: '.html',
          get cmd() { return $.dust; },
          config: {
            name: function(f) { return f.relative.replace('.html',''); }
          }
        }) ||
        (type === 'dot' && {
          ext: '.dot',
          get cmd() { return $.dotPrecompiler; },
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
 * Gladius Forge configuration function.
 * @param  {Object} _gulp: The gulp instance created from the gulpfile.js
 * @param  {Object} config: Configuration object
 */
var gulpConfig = function(_gulp, _config) {
  if (!_gulp) {
    throw 'Error: A Gulp instance should be passed to the gulpConfig method.';
  }
  gulp = _gulp;
  config = _config || { paths: { src: {}, out: {} } };

  plugins = elaboratePlugins();
  paths = elaboratePaths();

  lrport = _config.liveReloadPort || lrport;
  server = _config.server || (console.error(
      'An Express server should be passed in the configuration.')),
  serverport = _config.port || serverport;

  cleanTmp = function(done) {
    del(paths.src.tmp, { force: _config.forceClean || false }, done);
  };
};


/**
 * Gladius Forge default tasks setup function.
 */

/* Version bumping --------------------------------------------------------- */
var _setupVersioningTasks = function() {
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

  gulp.task('post-install-patch', [
    'lint:blocker',
    'jsvalidate:blocker:clean'
  ], function() {
    return inc('patch');
  });
  gulp.task('post-install-feature', [
    'lint:blocker',
    'jsvalidate:blocker:clean'
  ], function() {
    return inc('minor');
  });
  gulp.task('post-install-release', [
    'lint:blocker',
    'jsvalidate:blocker:clean'
  ], function() {
    return inc('major');
  });
  gulp.task('patch', ['install-dev-dep'], function() {
    return gulp.start('post-install-patch');
  });
  gulp.task('feature', ['install-dev-dep'], function() {
    return gulp.start('post-install-feature');
  });
  gulp.task('release', ['install-dev-dep'], function() {
    return gulp.start('post-install-release');
  });
};

/* Plugins Loading --------------------------------------------------------- */
var _setupLazyPluginLoadingTasks = function() {
  var originalPackageJson;
  var cleanPackageJson = function() {
    return gulp.src([__dirname + '/package.json'])
    .pipe($.jsonEditor(function(){
      return originalPackageJson;
    }, {
      'end_with_newline': true
    }))
    .pipe(gulp.dest(__dirname + '/'));
  };

  /* Lazy dependencies installation */
  gulp.task('dirty-install-dep', function() {
    return gulp.src([__dirname + '/package.json'])
    .pipe($.jsonEditor(function(json) {
      var
        tplName = addons.templates[
          (config.modules && config.modules.templates) || 'handlebars'
        ].name,
        styleName = addons.styles[
          (config.modules && config.modules.styles) || 'less'
        ].name;
      originalPackageJson = JSON.parse(JSON.stringify(json));
      json.dependencies[tplName] = lazyDependencies[tplName];
      json.dependencies[styleName] = lazyDependencies[styleName];
      return json;
    }))
    .on('error', handleError)
    .pipe(gulp.dest(__dirname + '/'))
    .pipe($.install())
    .on('error', handleError);
  });
  gulp.task('install-dep', ['dirty-install-dep'], cleanPackageJson);

  /* Lazy dev dependencies installation */
  gulp.task('dirty-install-dev-dep', ['dirty-install-dep'], function() {
    return gulp.src([__dirname + '/package.json'])
    .pipe($.jsonEditor(function(json) {
      addons.dev.forEach(function(moduleName) {
        json.dependencies[moduleName] = lazyDependencies[moduleName];
      });
      return json;
    }))
    .on('error', handleError)
    .pipe(gulp.dest(__dirname + '/'))
    .pipe($.install())
    .on('error', handleError);
  });
  gulp.task('install-dev-dep', ['dirty-install-dev-dep'], cleanPackageJson);
};

/* Styles compilation ------------------------------------------------------ */
var _setupCssTasks = function() {
  gulp.task('styles', function() {
    return gulp.src([paths.src.styles])
    .pipe(plugins.styles.cmd(plugins.styles.config))
    .on('error', handleError)
    .pipe($.autoprefixer('last 2 version', 'ie 8', 'ie 9'))
    .pipe(gulp.dest(paths.out.styles));
  });
};

/* Templates precompilation  */
var _setupTemplatesTasks = function() {
  gulp.task('tpl-precompile', function() {
    return gulp.src([paths.src.partials])
    .pipe($.htmlmin({
      removeComments: true,
      collapseWhitespace: plugins.tpls.ext === '.jade' ? false : true
    }))
    .pipe(plugins.tpls.cmd(plugins.tpls.config))
    .on('error', handleError)
    .pipe($.defineModule('plain'))
    .pipe($.declare({
      namespace: 'R.templates',
      processName: function(file) {
        var dir = config.paths.src.partials || config.paths.src.templates;
        return file.slice(file.indexOf(dir) + dir.length).replace('.js', '');
      }
    }))
    .pipe($.concat('templates.js'))
    .pipe(gulp.dest(paths.out.js));
  });

  /* Template livereloading  */
  gulp.task('tpl-reload', ['tpl-precompile'], function() {
    return gulp.src([paths.src.views])
    .pipe($.livereload(lrport));
  });
};

/* Tests tasks ------------------------------------------------------------- */
var _setupTestsTasks = function(tasksConfig) {
  /* JS linting  */
  gulp.task('lint', extendDeps([], tasksConfig.lint), function() {
    return gulp.src(extendSrcs([
      paths.src.js,
      paths.src.es6
    ], tasksConfig.lint))
    .pipe($.jshint({
      lookup: true
    }))
    .pipe($.jshint.reporter('jshint-stylish'));
  });
  gulp.task('lint:blocker', extendDeps([], tasksConfig.lint), function() {
    return gulp.src(extendSrcs([
      paths.src.js,
      paths.src.es6
    ], tasksConfig.lint))
    .pipe($.jshint({
      lookup: true
    }))
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'));
  });

  /* JS validation  */
  gulp.task('jsvalidate:blocker', ['esnext'], function () {
    return gulp.src(extendSrcs([
      paths.src.tmp + '**/*.js',
      paths.src.tmp + '**/*' + paths.src.esnextExt,
      '!' + paths.src.tmp + '**/*.test.js',
      '!' + paths.src.tmp + '**/*.test' + paths.src.esnextExt
    ], tasksConfig.lint))
    .pipe($.jsvalidate());
  });
  gulp.task('jsvalidate:blocker:clean', ['jsvalidate:blocker'], cleanTmp);

  /* JS unit tests runner  */
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
};

/* Scripts tasks ----------------------------------------------------------- */
var _setupScriptsTasks = function(tasksConfig) {
  /* ES6 Syntax transpilation */
  gulp.task('esnext', ['copy'], function () {
    return gulp.src([
      paths.src.es6
    ])
    .pipe($.es6mt({
      formatter: new $.es6mt.formatters.commonjs()
    }))
    .on('error', handleError)
    .pipe($.esnext())
    .on('error', handleError)
    .pipe($.jsvalidate())
    .on('error', handleError)

    // Needed to support IE8. Get rid of it ASAP.
    .pipe($.replace(/\.(catch|throw|return|default)\b/g, "['$1']"))

    .pipe(gulp.dest(paths.src.tmp));
  });

  /* JS modules bundling */
  gulp.task('bundle-js',
      extendDeps(['esnext'], tasksConfig['bundle-js']), function() {
    var
      ext = paths.src.esnextExt,
      extPrefix = ext.slice(0, ext.lastIndexOf('.'));
    return gulp.src(extendSrcs([
      paths.src.tmp + 'pages/**/*.js',
      paths.src.tmp + 'pages/**/*' + ext,
      '!' + paths.src.tmp + 'pages/**/*.test.js',
      '!' + paths.src.tmp + 'pages/**/*.test' + ext
    ], tasksConfig['bundle-js']))
    .pipe($.browserify({
      insertGlobals: false,
      debug: false
    }))
    .on('error', handleError)
    .pipe($.uglify())
    .pipe($.rename(function (path) {
      var n = path.basename;
      path.basename = n.slice(0, n.lastIndexOf(extPrefix));
      path.extname = '.js';
    }))
    .pipe(gulp.dest(paths.out.js));
  });
  gulp.task('bundle-js:dev',
      extendDeps(['esnext'], tasksConfig['bundle-js:dev']), function() {
    var
      ext = paths.src.esnextExt,
      extPrefix = ext.slice(0, ext.lastIndexOf('.'));
    return gulp.src(extendSrcs([
      paths.src.tmp + 'pages/**/*.js',
      paths.src.tmp + 'pages/**/*' + ext,
      '!' + paths.src.tmp + 'pages/**/*.test.js',
      '!' + paths.src.tmp + 'pages/**/*.test' + ext
    ], tasksConfig['bundle-js:dev']))
    .pipe($.browserify({
      insertGlobals: false,
      debug: true
    }))
    .on('error', handleError)
    .pipe($.rename(function (path) {
      var n = path.basename;
      path.basename = n.slice(0, n.lastIndexOf(extPrefix));
      path.extname = '.js';
    }))
    .pipe(gulp.dest(paths.out.js));
  });
};

/* Utils tasks ------------------------------------------------------------- */
var _setupUtilsTasks = function() {
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

/* Setup all tasks --------------------------------------------------------- */
var gulpSetupTasks = function(tasksConfig) {
  _setupVersioningTasks();
  _setupLazyPluginLoadingTasks();
  _setupCssTasks();
  _setupTemplatesTasks();
  _setupTestsTasks(tasksConfig);
  _setupScriptsTasks(tasksConfig);
  _setupUtilsTasks();
};


/**
 * Gladius Forge watchers setup function. It takes a list of extra watchers
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
 * Gladius Forge main tasks setup function. It can extend main tasks with
 * extra externally defined tasks via an "extension" parameter.
 * @param  {Object} extensions: object descriptor of extra tasks to add for
 *                              each main task.
 */
var gulpSetupMainTasks = function(extensions) {
  var
    extensions = extensions || {},
    devExts = extensions.development || [],
    testExts = extensions.test || [],
    prodExts = extensions.production || [];

  gulp.task('default', ['development']);

  gulp.task('post-install-development', [
    'karma:dev',
    'styles',
    'bundle-js:dev:clean',
    'tpl-precompile',
    'watch'
  ].concat(devExts));
  gulp.task('development', ['install-dev-dep'], function() {
    gulp.start('post-install-development');
  });

  gulp.task('post-install-test', [
    'lint',
    'karma'
  ].concat(testExts), cleanTmp);
  gulp.task('test', ['install-dev-dep'], function() {
    gulp.start('post-install-test');
  });

  gulp.task('post-install-production', [
    'styles',
    'bundle-js:clean',
    'tpl-precompile'
  ].concat(prodExts));
  gulp.task('production', ['install-dep'], function() {
    gulp.start('post-install-production');
  });
};

module.exports = {
  config: gulpConfig,
  setupTasks: gulpSetupTasks,
  setupWatchers: gulpSetupWatchers,
  setupMain: gulpSetupMainTasks,
  getPlugins: function() {
    return {
      get del () { return del; },
      get clean() { return $.clean; },
      get cached() { return $.cached; },
      get jshint() { return $.jshint; },
      get jsvalidate() { return $.jsvalidate; },
      get esnext() { return $.esnext; },
      get es6ModuleTranspiler() { return $.es6ModuleTranspiler; },
      get rename() { return $.rename; },
      get styles() { return plugins.styles.cmd; },
      get karma() { return $.karma; },
      get uglify() { return $.uglify; },
      get replace() { return $.replace; },
      get livereload() { return $.livereload; },
      get autoprefix() { return $.autoprefixer; },
      get browserify() { return $.browserify; },
      get handlebars() { return $.handlebars; },
      get defineModule() { return $.defineModule; },
      get declare() { return $.declare; },
      get concat() { return $.concat; },
      get git() { return $.git; },
      get bump() { return $.bump; },
      get semver() { return semver; },
      get tagVersion() { return $.tagVersion; }
    };
  }
};
