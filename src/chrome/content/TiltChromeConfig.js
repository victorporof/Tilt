/***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Tilt: A WebGL-based 3D visualization of a webpage.
 *
 * The Initial Developer of the Original Code is The Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Victor Porof <victor.porof@gmail.com> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 ***** END LICENSE BLOCK *****/
"use strict";

var TiltChrome = TiltChrome || {};
var EXPORTED_SYMBOLS = ["TiltChrome.Config.UI"];

/**
 * Configuration parameters regarding the user interface.
 */
TiltChrome.Config = {};
TiltChrome.Config.UI = {

  /**
   * Properties defining how the visualization mesh is colored and drawn.
   */
  viewMode: {
    initial: {
      hueSlider: {
        value: 50
      },
      saturationSlider: {
        value: 0
      },
      brightnessSlider: {
        value: 100
      },
      alphaSlider: {
        value: 80
      },
      textureSlider: {
        value: 100
      },
      mesh: {
        outline: [0, 0, 0, 0.25]
      }
    },
    normal: {
      hueSlider: {
        value: 50
      },
      saturationSlider: {
        value: 0
      },
      brightnessSlider: {
        value: 100
      },
      alphaSlider: {
        value: 80
      },
      textureSlider: {
        value: 100
      },
      mesh: {
        outline: [0, 0, 0, 0.25]
      }
    },
    wireframe: {
      hueSlider: {
        value: 57.5
      },
      saturationSlider: {
        value: 50
      },
      brightnessSlider: {
        value: 100
      },
      alphaSlider: {
        value: 7.5
      },
      textureSlider: {
        value: 100
      },
      mesh: {
        outline: [1, 1, 1, 0.7]
      }
    }
  },

  /**
   * Specific colors for each handled element in the dom strips.
   */
  domStrips: {
    stripButton: {
      stroke: "#fff3"
    },
    "html": {
      fill: "#FFF"
    },
    "head/body": {
      fill: "#E667AF"
    },
    "title": {
      fill: "#CD0074"
    },
    "script": {
      fill: "#A64B00"
    },
    "style": {
      fill: "#FF9640"
    },
    "div": {
      fill: "#5DC8CD"
    },
    "span": {
      fill: "#67E46F"
    },
    "table": {
      fill: "#FF0700"
    },
    "tr": {
      fill: "#FF4540"
    },
    "td": {
      fill: "#FF7673"
    },
    "ul": {
      fill: "#4671D5"
    },
    "li": {
      fill: "#6C8CD5"
    },
    "p": {
      fill: "#888"
    },
    "a": {
      fill: "#123EAB"
    },
    "img": {
      fill: "#FFB473"
    },
    "iframe": {
      fill: "#85004B"
    },
    "other": {
      fill: "#666"
    }
  }
};
