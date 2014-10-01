/* jshint -W079 */
var
  gulp = require('gulp'),
  semver = require('semver'),
  $ = require('gulp-load-plugins')();

var inc = function(importance) {
  return gulp.src(['./package.json'])
  .pipe($.bump({type: importance}))
  .pipe(gulp.dest('./'))
  .pipe($.git.commit('Release v' + semver.inc(
      require(__dirname + '/package.json').version,
      importance)))
  .pipe($.tagVersion())
  .pipe($.git.push('origin', 'master', { args: '--tags' }));
};


/* JS linting ------------------------------------------------------------ */
gulp.task('lint', function() {
  return gulp.src('./index.js')
  .pipe($.jshint({
    lookup: true
  }))
  .pipe($.jshint.reporter('jshint-stylish'))
  .pipe($.jshint.reporter('fail'))
  .pipe($.jsvalidate());
});


/* Version bumping ------------------------------------------------------- */
gulp.task('patch', ['lint'], function() { return inc('patch'); });
gulp.task('feature', ['lint'], function() { return inc('minor'); });
gulp.task('release', ['lint'], function() { return inc('major'); });
