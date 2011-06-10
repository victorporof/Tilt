/*
 * testTiltInitialization.js - Tests if Tilt is able to initialize properly
 * version 0.1
 *
 * Copyright (c) 2011 Victor Porof
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var setupModule = function(module) {
  module.controller = mozmill.getBrowserController();
}

var setupTest = function(test) {
  // finding the new tab menu item
  var newTab = controller.menus['file-menu']['menu_newNavigatorTab'];
  
  // opening a new tab with to a certain link
  controller.click(new elementslib.Elem(newTab));
  controller.open('http://www.mozilla.org/');
  
  // before continuing, we wait for the page load to finish
  controller.waitForPageLoad();
}

var teardownTest = function(test) {
  // finding the Tilt initialization menu item
  var tiltInitialize = 
    controller.menus['tools-menu']['tilt-menu']['tilt-menuItemInitialize'];

  // leave Tilt working for a while, then close the visualization
  controller.window.setTimeout(function destroy() {
    controller.click(new elementslib.Elem(tiltInitialize));
  }, 2000);
}

var testTiltInitialization = function() {
  // finding the Tilt initialization menu item
  var tiltInitialize = 
    controller.menus['tools-menu']['tilt-menu']['tilt-menuItemInitialize'];

  // initialize Tilt
  controller.click(new elementslib.Elem(tiltInitialize));
}