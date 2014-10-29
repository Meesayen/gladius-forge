es6-gulp-boilerplate
=================

Prebuilt Gulp environment for ES6 web app boilerplates.

It comes with an ES6 to ES5-ish (as IE8 compatible as possible) compilation
process, together with a Browserify bundling and Uglifyjs compression.

Plus a CSS compilation task, to choose from one of the following:

- LESS
- SASS
- SASS + Compass
- Myth
- Stylus

as well as an Autoprefixer, post compilation, process (bye bye vendor prefixes).

Also, templates precompilation process, to choose from one of the following:

- Handlebars
- Dust
- Dot.js
- Jade

the task compiles templates in JST format, namespaces them under a `R.templates`
globally accessible variable and serve it to you in the form of a `template.js`
module inside your static scripts folder.

You can also rely on a Karma task runner, with PhantomJS and Google Chrome
engines (bring your own karma.config.js file), plus JSHint code check and
JSValidate safety checks on critical tasks.

It also gives you the possibility to serve your own instance of a Node.js server,
plus watchers and livereloading for, well, everything really.

**Bonus:** version bumping and git tagging/pushing tasks.

**TODO:**

- Find a better name.
- Split compiled templates on a per-page basis (base folder separation).
- Introduce a super light static page server (now it relies on the final user
  to feed it one)


Usage
-------------------

Copy the `gulpfile-sample.js` in your app folder and configure it the way you
like. The configuration is pretty straightforward and the comments will help you
out on every bits of it.

You can also take a look at the [es6-boilerplate][1]'s `gulpfile.js` to see how
you can extend default tasks, add your own tasks or watchers, etc.

By default, the boilerplate will come with the following tasks, which you can
extend or override as you please:

**DEFAULTS**

`production`: it will run the basic compilation + compression tasks, without tests
other than the JSValidate one to make sure everything worked fine.
`development`: it will run compilation tasks (no compression) with sourcemaps
support, plus it will run watchers to recompile and livereload everything as soon
as you make some changes, plus Karma in watch mode.
`test`: it will just run the tests without watchers (useful for CI engines).

`release`, `feature` and `patch` are special tasks that handle the bump od the
version on the package.json as well as the bower.json if present, plus the tagging
on your git repo, and the push to master of the newly generated tag.

**TODO**

- List all the other tasks

Notes
---------------------

The boilerplate comes with a very basic set of dependencies installed via NPM.
The remaining modules needed by each task will be lazily installed during the
pre-process phase of each default task.
This way makes it possible to have the smallest amount of dependencies needed to
be installed for the `production` task, that reflects on an massive reduction of
the installation footprint on production environment.


[1]:http://github.com/Meesayen/es6-boilerplate
