# Tilt: a WebGL-based 3D visualization of a Webpage
#### [Development Blog](http://blog.mozilla.com/tilt/)
#### [Tilt Project Page](https://wiki.mozilla.org/Tilt_Project_Page)

### Firefox integration
Tilt is currently implemented natively in Firefox starting with version 11, part of the Developer Tools -> Inspector. You can track the development in the [mozilla-central branch](https://github.com/victorporof/Tilt/tree/mozilla-central). If you have a Bugzilla account, [here are all the known bugs and features](https://bugzilla.mozilla.org/buglist.cgi?cmdtype=runnamed&namedcmd=tilt&list_id=1947264) we're working on - you're welcome to file new requests in there or even help out if you want to!

Take a look at [Firefox Aurora](http://www.mozilla.org/en-US/firefox/channel/) or [Firefox Nightly](http://nightly.mozilla.org/) to try out the new and improved Tilt!

### Help
If you have any questions, ping anyone on IRC in `#devtools` or `#tilt` on [irc.mozilla.org](irc://irc.mozilla.org).

### Installation
In the bin folder you will find the latest [Tilt.xpi](https://github.com/victorporof/Tilt/raw/master/bin/Tilt.xpi) extension build. Download, then drag and drop it to Firefox. After the installation is complete, restart, and open the extension using `Ctrl+Shift+M` (or `Cmd+Shift+M` if you're on a mac), or find it inside the Tools menu. Close it at any time with the `Esc` key.

### Description
> Tilt represents a new way of visualizing a web page. This tool creates a 3D representation of the document, with the purpose of displaying, understanding and easily analyzing the DOM. It will take advantage of the great tools Firefox has to offer, as it is an extension which contains a WebGL implementation, providing rich user-experience, fun interaction and useful information, while taking full advantage of 3D hardware acceleration, GLSL shaders and what OpenGL ES 2.0 has to offer.

> The implementation consists of a Firefox extension containing a 3D representation of a web page, as both a fun visualization tool and a developer-friendly environment for debugging the document’s structure, contents and nesting of the DOM tree. Various information besides the actual contents will be displayed on request, regarding each node’s type, class, id, and other attributes if available. The rendering will be dynamic, in-browser, using WebGL and GLSL shaders.

> It is being developed by [Victor Porof](http://twitter.com/victorporof) (3D developer responsible with the Firefox extension itself), along with [Cedric Vivier](https://github.com/neonux) (creating a WebGL optimized equivalent to the privileged canvas.drawWindow, see [#653656](https://bugzilla.mozilla.org/show_bug.cgi?id=653656)) and [Rob Campbell](https://github.com/robcee) (who first thought about creating a 3D visualization of a webpage). Everything started initially as a [Google Summer of Code](http://www.google-melange.com/gsoc/proposal/review/google/gsoc2011/victorporof/1#) project, but now, with an enthusiastic team behind it and so many new features and ideas, it has become an active Developer Tools project.

<center>![Screenshot](http://dl.dropbox.com/u/2388316/tilt/tilt02.png)</center>

### License
Tilt is licensed as Mozilla Public License Version 1.1, like any other Mozilla
product. See [mozilla.org/MPL](http://www.mozilla.org/MPL/) for more information.

## How to build
Building is done using the [build script](https://github.com/victorporof/Tilt/blob/master/src/build). There are two parts of the project which can be used: the engine and the extension itself. To build everything and also minify the sources, run the following `./build` command from a terminal:

```
./build all minify
```

Alternatively, you can just use the `engine` or `extension` param to build only a part of the project.

```
./build engine
./build extension
```

You can append the `minify` and/or `optimize` parameter to minify and optimize the sources when building, but this is recommended only for a final release, as it takes quite a lot of time.
The output files are in the [bin](https://github.com/victorporof/Tilt/tree/master/bin) folder. If the extension was also built, inside [build](https://github.com/victorporof/Tilt/tree/master/bin/build) you can find the unpacked [Tilt.xpi](https://github.com/victorporof/Tilt/raw/master/bin/Tilt.xpi) archive.

Tilt uses the [Google Closure compiler](https://github.com/victorporof/Tilt/tree/master/bin/google-closure) to optimize the Javascript files, with the `--compilation_level ADVANCED_OPTIMIZATIONS` flag. Therefore, some [Javascript externs](https://github.com/victorporof/Tilt/blob/master/bin/google-closure/tilt-externs.jsext) must be specified so important variable names are not renamed.

## How to automatically install
To install the extension automatically in Firefox with the `make install` or `./build` command, first edit the [makefile](https://github.com/victorporof/Tilt/blob/master/src/Makefile) and change the `profile_dir` to match your profile in Firefox. If you don't do this, installation will fail. Additionally, you may need to have the `tilt@mozilla.com` folder created in the extension profile directory, depending on the OS and Firefox version. After this quick setup (provided you already compiled everything with `./build`), run the following command to install the extension:

```
export OSTYPE; make install;
```

Or, to automatically minify everything, optimize and also install:

```
./build all minify optimize install
```

## WebGL engine
The extension is based on a custom engine (having a syntax similar to [processing.js](https://github.com/jeresig/processing-js), but with specialized features destined for DOM visualizations). Feel free to contribute to the engine in any way! You can find the sources in the [src/chrome/content/engine](https://github.com/victorporof/Tilt/tree/master/src/chrome/content/engine) folder. To use it outside the extension, get the [latest build](https://github.com/victorporof/Tilt/blob/master/bin/Tilt-engine-min.js) (unminified version [here](https://github.com/victorporof/Tilt/blob/master/bin/Tilt-engine.js)), and use it in a plain webpage like this:

```
var canvas, tilt;

function setup() {
  canvas = Tilt.Document.initFullScreenCanvas();
  tilt = new Tilt.Renderer(canvas);
}

function draw() {
  tilt.loop(draw);
  tilt.clear(1, 0, 0, 1);
}

setup();
draw();
```

## Controls
Controlling the visualization is achieved using a virtual trackball (arcball), which rotates around the X and Y axes. Other mouse events exist to control yaw, pitch, roll, pan, zoom, as well as various additional keyboard shortcuts (arrow keys for translation, wasd for rotation). The controller is not tied to these peripherals only however, making it accessible and easily scalable for other input methods or devices. Double clicking a node brings up the Ace Cloud9 IDE editor, showing more useful information about the node and the inner HTML. <b>Current implementation may change!</b>

## Implement a custom controller
The controller is initialized in [browserOverlay.js](https://github.com/victorporof/Tilt/blob/master/src/chrome/content/browserOverlay.js) when constructing the visualization:

```
this.visualization =
  new TiltChrome.Visualization(this.canvas,
  new TiltChrome.Controller.MouseAndKeyboard(),
  new TiltChrome.UI.Default());
```

The current mouse and keyboard implementation is in [TiltChromeController.js](https://github.com/victorporof/Tilt/blob/master/src/chrome/content/TiltChromeController.js). You can implement your own controller by creating a new object respecting a predefined interface. Each controller should have the `init`, `update`, `resize` and `destroy` functions, and you can access the public delegate methods in the visualization using `this.visualization`. Generally, you should need to handle only the following events:

* `this.visualization.setTranslation(translation)`
* `this.visualization.setRotation(quaternion)`
* `this.visualization.performMeshPick(x, y)`

The controller pattern is:

```
TiltChrome.Controller.MyCustomController = function() {

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    // perform custom initialization, add event listeners...
  };

  /**
   * Function called automatically by the visualization each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.update = function(frameDelta) {
    // access the visualization using this.visualization
    // manipulate the current model view transformation using
    //  this.visualization.setTranslation(translation) and
    //  this.visualization.setRotation(quaternion)
  };

  /**
   * Delegate method, called when the controller needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
  };

  /**
   * Destroys this object and sets all members to null.
   * @param {HTMLCanvasElement} canvas: the canvas dom element
   */
  this.destroy = function(canvas) {
    // remove any events listeners and do the cleanup
  };
};
```

## Implement a custom UI
Just like the controller, the user interface is initialized when constructing the visualization. The current <b>work in progress</b> implementation is in [TiltChromeUI.js](https://github.com/victorporof/Tilt/blob/master/src/chrome/content/TiltChromeUI.js). You can implement your own user interface by creating a new object respecting a predefined interface.

Each UI should have the `init`, `draw`, `resize` and `destroy` functions. Moreover, you can specify events like `domVisualizationMeshNodeCallback` or `meshNodeCallback`, or `meshReadyCallback` handled automatically by the visualization.

The UI pattern is:

```
TiltChrome.UI.MyCustomUserInterface = function() {

  /**
   * Function called automatically by the visualization at the setup().
   * @param {HTMLCanvasElement} canvas: the canvas element
   */
  this.init = function(canvas) {
    // access the visualization using this.visualization
    // and the controller using this.controller
    // initialize all the UI components here
  };

  /**
   * Called automatically by the visualization after each frame in draw().
   * @param {Number} frameDelta: the delta time elapsed between frames
   */
  this.draw = function(frameDelta) {
  };

  /**
   * Delegate method, called when the user interface needs to be resized.
   *
   * @param width: the new width of the visualization
   * @param height: the new height of the visualization
   */
  this.resize = function(width, height) {
  };

  /**
   * Destroys this object and sets all members to null.
   */
  this.destroy = function(canvas) {
    // destroy all the UI components here
  };
};
```

## Principles
Before developing this extension, I’ve experimented with various techniques of achieving the desired visualization results and polished user experience, by implementing a few of the required features and asking for feedback from knowledgeable people working in the domain. As a result, some key aspects must be pointed out:

* Building an internal representation of the DOM shall be achieved by creating an iframe overlay in XUL as a Firefox extension. From experience, other techniques like injecting code into a web page, using already existing extensions (like Firebug), or depending on cloud services or CGI scripts are all bad ideas, as they are not scalable, deliver inconsistent user experience and don’t leave the original DOM intact.
* Each node will be rendered as a stack element, roughly described as representing a “box”, having the X and Y positions grabbed from the object’s off-screen rendered coordinates using HTML5 canvas functions (therefore avoiding manually redrawing the entire web-page), and distributed on the Z depth axis based on the actual node depth in the DOM tree.
* The base node will be represented by the BODY, upon which the child elements are layered to form a 3D stack of platforms. These platforms shall be build at the addition of DIVS, ULs or other nodes containing children.
* Some elements are positioned in absolute or floating manners; these could be graphically represented in different ways, like a shadowing plane, or by graphically adding a floating animation.
* Various other minimal information, characteristics or attributes will be visually attached to each stack representation of a node, with the possibility of displaying these properties more in depth at the user’s interaction with the visualization. Therefore, it’s a good idea to implement features that help understanding and analyzing the DOM, not just displaying it.
* If required, a useful “map” of the DOM tree will be available, used for rapid navigation/orientation through the visualization.
* The display will require intuitive controls, therefore an arcball controlled camera will be used, from the papers of Ken Shoemake, describing general purpose 3D rotation. Moreover, panning will be required for navigation, and other yaw, pitch and roll controls could be implemented.
* Sliders or other UI elements could be used for modifying or setting the visualization parameters, like the distance between node layers, auto-rotation, and other effects.
* The tool will be used as part of a web-page inspector, therefore a clean visualization will be more suited. A polished representation, not a bloated one, with subtle screen space ambient occlusion, a bit of lighting and shadowing is more appropriate and visually pleasing, adding a “stark” feel to it, thus focusing on the beauty of the web page itself and the DOM, and not on the achievable effects.
* Ways of exporting the visualization to other WebGL compatible browsers should be implemented, for cross-platform and cross-browser user experience. This can be done by saving the representation parameters and passing them to other browsers. In the end, the export feature will actually be an URL.
* As Tilt is designed to also be fun, a few easter-eggs could be implemented :)

> [Additional info](http://www.google-melange.com/gsoc/proposal/review/google/gsoc2011/victorporof/1#)

#### Contents
1. A stand-alone Firefox extension which will contain the visualization
2. A WebGL javascript library designed to facilitate creating web page DOM visualizations
3. Examples, test-cases, stress-tests and documentation, so that the tool will continue to be developed even after the finalization of GSoC, both by me and the desiring community.
