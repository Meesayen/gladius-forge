gladius-forge
=================

Prebuilt Gulp environment for cutting edge web app boilerplates.

Why Gladius? Because I wanted to emphasize the "bleeding edge" aspect of this
tool, and what's better than a sword name to describe cutting edges? Plus I'm
roman, hence "Gladius" (and also because Katana was already taken :P)

It comes with an ES6+ (ES7 async/await are there) to ES3-ish (as IE8 compatible
as possible, but you may have to import polyfills, shims and shams accordingly)
compilation process, together with a Browserify bundling and Uglifyjs compression.

Plus a CSS compilation task, to choose from one of the following:

- LESS
- Sass
- SCSS + Compass
- Myth
- Stylus

as well as an Autoprefixer, post compilation, process (bye bye vendor prefixes).

Also, templates precompilation process, to choose from one of the following:

- Handlebars
- Dust
- Dot.js
- Jade

the task compiles templates in JST format, namespaces them under an `R.templates`
globally accessible variable and serves it to you in the form of a `template.js`
module inside your static scripts folder.

You can also rely on a Karma tests runner, with PhantomJS and Google Chrome
engines (bring your own karma.config.js file, though), plus JSHint code check and
JSValidate safety checks on critical tasks.

It also gives you the possibility to serve your own instance of a Node.js server,
plus watchers and livereloading for, well, everything really.

**Bonus:** version bumping and git tagging/pushing tasks.

**TODO:**

- Split compiled templates on a per-page basis (base folder separation).
- Introduce a super light static page server (now it relies on the final user
  to feed it one)


Usage
-------------------

The easiest way to use `gladius-forge` is via the [sluch-gladius][9] slush generator,
otherwise proceed manually, folling the instructions below.

Install `gladius-forge` into your project directory:

```
npm install --save gladius-forge
```

Copy the `gulpfile-sample.js` from `node_modules/gladius-forge` into your app folder
and configure it the way you like. The configuration is pretty straightforward and
the comments will help you out on every bits of it.

You can also take a look at the [gladius-draft][1]'s `gulpfile.js` to see how
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

`release`, `feature` and `patch` are special tasks that handle the bump of the
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


Thanks
---------------------

This boilerplate of mine is just a combination of great tools put together to
achieve higher goals (using cutting edge technologies today, greatly simplifying
a developer's workflow, etc), and if it weren't for the people who built those
tools, I wouldn't have made this little thing so far.

So, thanks goes to:

- [esnext][2] developers and contributors, that are giving us the possibility to use
  ES6 syntax today, in the most lightweight way possible.
- Facebook developers working on the [Regenerator][3] compiler, that are giving ES6
  generators to us, today (also `async` and `await` statements <3).
- The [Gulp][4] developers. Keep up the good work, looking forward for the v4.0.
- People behind [Browserify][5], because CommonJS is the right thing!
- [Karma][6], [JSHint][7] and [gulp-jsvalidate][8] developers, keeping our code safe.
- All the great guys that brought to us those awesome gulp plugins, the list is
  long, so thank you all.


[1]:http://github.com/Meesayen/gladius-draft
[2]:http://github.com/esnext/esnext
[3]:http://github.com/facebook/regenerator
[4]:http://github.com/gulpjs/gulp
[5]:http://github.com/substack/node-browserify
[6]:http://github.com/karma-runner/karma
[7]:http://github.com/jshint/jshint
[8]:http://github.com/sindresorhus/gulp-jsvalidate
[9]:http://github.com/Meesayen/slush-gladius
