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
 */

(function() {
  "use strict";

  var detail = 30,      // how big is one dom pixel relative to the image size
      elevation = -1,   // maximum elevation, -1 means unlimited
      sensitivity = 4,  // steepness based on pixel brightness
      negative = false; // set true to invert brightness

  function createDocument(canvas, data, width, height) {
    var html = [],
        css = [],
        doc = [],
        dim = Math.min(width, height) / detail,
        i, k, x, y, cls, index, red, green, blue, alpha, average, brightness;

    css.push(
      "<style>",
      "body {",
      "  margin: 0;",
      "  padding: 0;",
      "  width: " + width + "px;",
      "  height: " + height + "px;",
      "  position: absolute;",
      "}",
      ".px {",
      "  width: " + dim + "px;",
      "  height: " + dim + "px;",
      "  position: absolute;",
      "}");

    for (x = 0, i = 0; x < width - dim / 2; x += dim) {
      for (y = 0; y < height - dim / 2; y += dim, i++) {

        cls = "_" + Number(i).toString(16);
        index = (Math.floor(x) + Math.floor(y) * width) * 4;

        red = data[index];
        green = data[index + 1];
        blue = data[index + 2];
        alpha = data[index + 3];

        average = (red + green + blue + alpha) / 4;
        brightness = negative ? 255 - average : average;

        if ((negative && brightness < 1) || brightness > 254) {
          continue;
        }
        else {
          brightness = Math.min(
            brightness * sensitivity / 100, elevation > -1 ? elevation : 255);
        }

        css.push(
        "." + cls + " {",
        "  left: " + x + "px;",
        "  top: " + y + "px;",
        "  background: rgba(" + red + "," + green + "," + blue + ",0.5);",
        "}");

        html.push("<ins class=\"" + cls + " px\">");
        for (k = 2; k < brightness - 1; k++) {
          html.push("<ins>");
        }

        html.push("<section class=\"px\"></section>");

        for (k = 2; k < brightness - 1; k++) {
          html.push("</ins>");
        }
        html.push("</ins>");
      }
    }

    html.push("<img src=\"" + data + "\"/>");
    css.push("</style>");

    doc.push(css.join("\n"));
    doc.push(html.join("\n"));

    (function(el, html) {
      var oldEl = typeof el === "string" ? document.getElementById(el) : el,
          newEl = oldEl.cloneNode(false);

      newEl.innerHTML = html;
      oldEl.parentNode.replaceChild(newEl, oldEl);

    })(document.body, doc.join("\n"));
    document.body.appendChild(canvas);
  }

  function handleImage(image) {
    var width = image.width,
        height = image.height,
        canvas, context, data;

    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);

    data = context.getImageData(0, 0, width, height).data;
    createDocument(canvas, data, width, height);
  }

  function handleFile(file) {
    var imageType = /image.*/,
        img, reader;

    if (!file.type.match(imageType)) {
      return;
    }

    img = document.createElement("img");
    img.onload = (function(_img) {
      return function() {
        handleImage(_img);
      };
    })(img);

    reader = new FileReader();
    reader.onload = (function(_img) {
      return function(e) {
        _img.src = e.target.result;
      };
    })(img);

    reader.readAsDataURL(file);
  }

  function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  function drop(e) {
    e.stopPropagation();
    e.preventDefault();

    handleFile(e.dataTransfer.files[0]);
  }

  var dropbox = document.body;
  dropbox.addEventListener("dragenter", dragenter, false);
  dropbox.addEventListener("dragover", dragover, false);
  dropbox.addEventListener("drop", drop, false);

})();
