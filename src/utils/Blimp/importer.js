"use strict";

/**
 * Function handling messages sent from the main thread.
 */
self.onmessage = function(event) {
  var data = event.data;
  var mesh = data.mesh;
  var method = data.method;
  var params = data.params;

  self.postMessage({
    signature: method,
    response: new Importer(mesh)["get " + method](params) // cool protocol bro'
  });

  close();
};

const EPSILON = 0.001;

/**
 * A tridimensional vector.
 *
 * @param Number x
 * @param Number y
 * @param Number z
 */
function Vector3(x, y, z)
{
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
}

Vector3.prototype = {

  /**
   * Assigns the x, y and z fields from an array.
   *
   * @param Array arr
   *        The [x, y, z] array to be used.
   * @return Vector3
   *         The same object.
   */
  fromArray: function(arr)
  {
    this.x = arr[0];
    this.y = arr[1];
    this.z = arr[2];
    return this;
  },

  /**
   * Assigns the x, y and z fields from another vector.
   *
   * @param Vector3 vec3
   *        The source vector to be used.
   * @return Vector3
   *         The same object.
   */
  fromVec3: function(vec3)
  {
    this.x = vec3.x;
    this.y = vec3.y;
    this.z = vec3.z;
    return this;
  },

  /**
   * Turns the x, y and z fields into integers.
   * This is especially nifty when dealing with voxels.
   *
   * @return Vector3
   *         The same object.
   */
  toInteger: function()
  {
    this.x = parseInt(this.x);
    this.y = parseInt(this.y);
    this.z = parseInt(this.z);
    return this;
  },

  /**
   * Adds two vectors togeher, creates a new one to store the result in.
   *
   * @param Vector3 that
   *        The vector to add this vector to.
   * @return Vector3
   *         The operation result.
   */
  add: function(that)
  {
    return new Vector3(this.x + that.x, this.y + that.y, this.z + that.z);
  },

  /**
   * Subtracts this vector with another, creates a new one to store the result.
   *
   * @param Vector3 that
   *        The vector to subtract this vector with.
   * @return Vector3
   *         The operation result.
   */
  subtract: function(that)
  {
    return new Vector3(this.x - that.x, this.y - that.y, this.z - that.z);
  },

  /**
   * Multiplies this vector with a scalar, creates a new one to store the result.
   *
   * @param Number scalar
   *        The scalar to multiply this vector with.
   * @return Vector3
   *         The operation result.
   */
  multiply: function(scalar)
  {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  },

  /**
   * Interpolates this vector with another, creates a new one to store the result.
   *
   * @param Vector3 that
   *        The vector to multiply this vector with.
   * @param Number scalar
   *        The interpolation abount. Must be between [0..1] to work properly.
   * @return Vector3
   *         The operation result.
   */
  lerp: function(that, scalar)
  {
    return new Vector3(this.x + scalar * (that.x - this.x),
                       this.y + scalar * (that.y - this.y),
                       this.z + scalar * (that.z - this.z));
  },

  /**
   * It dots!
   *
   * @param Vector3 that
   *        The vector to dot this vector with. Lololo.
   * @return Number
   *         The operation result.
   */
  dot: function(that)
  {
    return this.x * that.x + this.y * that.y + this.z * that.z;
  },

  /**
   * Gets this vector's length.
   * @return Number
   */
  get length()
  {
    return Math.sqrt(this.dot(this));
  },

  /**
   * Calculates the distance between this vector (point) to another.
   *
   * @param Vector3 that
   *        The vector to calculate the distance to
   * @return Number
   *         The operation result.
   */
  distanceTo: function(that)
  {
    return that.subtract(this).length;
  },

  /**
   * Calculates the distance between this vector (point) to a plane.
   *
   * @param Plane that
   *        The plane to calculate the distance to
   * @return Number
   *         The operation result.
   */
  distanceToPlane: function(plane)
  {
    return this.dot(plane.N) + plane.D;
  }
};

/**
 * This is basically a specialized type a vector, which includes a 'size' field.
 *
 * @param Number size
 * @param Number x
 * @param Number y
 * @param Number z
 */
function Voxel(size, x, y, z)
{
  Vector3.call(this, x, y, z);
  this.size = size;
}

Voxel.prototype = new Vector3();
Voxel.prototype.constructor = Voxel;

/**
 * Constrains the x, y and z fields of this voxel to particular bounds. For
 * example, if this voxel's size is 10 and its position is [4, 5, 6], the
 * new position will become [0, 0, 0]. Similarily, if the original position
 * was [14, 15, 16], the new position will become [10, 10, 10].
 *
 * @return Voxel
 *         The same object.
 */
Voxel.prototype.normalize = function()
{
  this.x = this.x - (this.x % this.size);
  this.y = this.y - (this.y % this.size);
  this.z = this.z - (this.z % this.size);
  return this;
};

/**
 * A segment, basically a line between two vectors (points).
 *
 * @param Vector3 v1
 * @param Vector3 v2
 */
function Segment(v1, v2)
{
  this.left = v1;
  this.right = v2;
}

/**
 * A triangle (orly?).
 *
 * @param Vector3 v1
 * @param Vector3 v2
 * @param Vector3 v3
 */
function Triangle(v1, v2, v3)
{
  this.v1 = v1;
  this.v2 = v2;
  this.v3 = v3;
}

/**
 * A plane (not the flying kind!), defined in the purest mathematical way
 *
 * @param Vector3 vecN
 *        The plane normal vector.
 * @param Number scalarD
 *        The normal length.
 */
function Plane(vecN, scalarD)
{
  this.N = vecN;
  this.D = scalarD;
}

/**
 * A bounding box, defined by the minimum and maximum values in all three
 * dimensions. Initially, all these values are undefined.
 */
function BoundingBox()
{
  this.X = { min: undefined, max: undefined };
  this.Y = { min: undefined, max: undefined };
  this.Z = { min: undefined, max: undefined };
}

BoundingBox.prototype = {

  /**
   * Gets the largest distance from the bounding box center to the outer edge
   * on the X axis.
   */
  get outerX()
  {
    return Math.max(Math.abs(this.X.min), Math.abs(this.X.max));
  },

  /**
   * Gets the largest distance from the bounding box center to the outer edge
   * on the Y axis.
   */
  get outerY()
  {
    return Math.max(Math.abs(this.Y.min), Math.abs(this.Y.max));
  },

  /**
   * Gets the largest distance from the bounding box center to the outer edge
   * on the Z axis.
   */
  get outerZ()
  {
    return Math.max(Math.abs(this.Z.min), Math.abs(this.Z.max));
  }
}

/**
 * This is where all the magic happens!
 *
 * @param Mesh mesh
 *        The mesh containing the model 'obj' and 'mtl' strings.
 */
function Importer(mesh)
{
  this.mesh = mesh;
}

Importer.prototype = {

  /**
   * Gets all the vertices in the mesh and stores them as Vector3 instances.
   *
   * @return Array
   *         A list with all the vertices.
   */
  "get vertices": function()
  {
    if (this.vertices) {
      return;
    }
    var vertices = [];

    try {
      var lines = this.mesh.obj.replace(/\ \ /g, " ").split("\n");

      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];

        if (line[0] === "v") {
          var data = this._splitData(line);
          vertices.push(new Vector3(parseFloat(data[0]),
                                    parseFloat(data[1]),
                                    parseFloat(data[2])));
        }
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get vertices finished");
    return (this.vertices = vertices);
  },

  /**
   * Gets all the triangles in the mesh and stores them as Triangle instances.
   *
   * @return Array
   *         A list with all the triangles.
   */
  "get triangles": function()
  {
    if (this.triangles) {
      return;
    }
    this["get vertices"](); // we'll need all the vertices first!
    var triangles = [];

    try {
      var lines = this.mesh.obj.replace(/\ \ /g, " ").split("\n");
      var vertices = this.vertices;

      for (var i = 0, l = lines.length; i < l; i++) {
        var line = lines[i];

        if (line[0] === "f") {
          var data = this._splitData(line);
          var v0, v1, v2;

          for (var v = 0, step = 0, dl = data.length; v < dl && dl >= 3;) {
            if (step++ === 0) {
              v0 = vertices[parseInt(data[v    ]) - 1];
              v1 = vertices[parseInt(data[v + 1]) - 1];
              v2 = vertices[parseInt(data[v + 2]) - 1];
              v += 3;
            } else {
              v0 = vertices[parseInt(data[v - 3]) - 1];
              v1 = vertices[parseInt(data[v - 1]) - 1];
              v2 = vertices[parseInt(data[v    ]) - 1];
              v++;
            }
            triangles.push(new Triangle(v0, v1, v2));
          }
        }
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get triangles finished");
    return (this.triangles = triangles);
  },

  /**
   * Calculates the bounding box for the mesh.
   * @return BoundingBox
   */
  "get bounds": function()
  {
    if (this.bounds) {
      return;
    }
    this["get vertices"]();
    var bounds = new BoundingBox();

    try {
      var vertices = this.vertices;
      var boundsX = bounds.X;
      var boundsY = bounds.Y;
      var boundsZ = bounds.Z;

      for (var i = 0, l = vertices.length; i < l; i++) {
        var vertex = vertices[i];
        var x = vertex.x;
        var y = vertex.y;
        var z = vertex.z;

        if (boundsX.min === undefined || boundsX.min > x) { // wow this is ugly
          boundsX.min = x;
        }
        if (boundsY.min === undefined || boundsY.min > y) {
          boundsY.min = y;
        }
        if (boundsZ.min === undefined || boundsZ.min > z) {
          boundsZ.min = z;
        }
        if (boundsX.max === undefined || boundsX.max < x) {
          boundsX.max = x;
        }
        if (boundsY.max === undefined || boundsY.max < y) {
          boundsY.max = y;
        }
        if (boundsZ.max === undefined || boundsZ.max < z) {
          boundsZ.max = z;
        }
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get bounds finished");
    return (this.bounds = bounds);
  },

  /**
   * Calculates intersections between the mesh and a plane, defined by the
   * N and D params.
   *
   * @param Object params
   *        An object containing the
   *          -- Array N
   *             The nnormal (as a [x, y, z] array)
   *          -- Number D
   *             Scalar, used to define the plane which will intersect the mesh.
   * @param Array out
   *        Optional, storage for the intersections
   * @return Array
   *         An outline defining the plane-mesh intersection, as a list of segments.
   */
  "get intersections": function(params, out)
  {
    this["get triangles"]();
    var intersections = out || [];

    try {
      var triangles = this.triangles;
      var normal = new Vector3().fromArray(params.N);
      var plane = new Plane(normal, params.D);

      for (var i = 0, l = triangles.length; i < l; i++) {
        var triangle = triangles[i];
        var segment = this._planeTriangleIntersection(plane, triangle);

        if (segment) {
          intersections.push(segment);
        }
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get intersections finished");
    return (this.intersections = intersections);
  },

  /**
   * Calculates all intersections between the mesh and a number of planes
   * situated at regular distances on the X, Y and Z axes, contained in the
   * mesh bounding box.
   * In other words: chop chop chop.
   *
   * @param Object params
   *        An object containing the following fields:
   *          -- Number size
   *             The intervals in which to perform the mesh-plane intersections.
   *          -- Number scale
   *             Optional, a scalar to scale the entire mesh with.
   *             If unspecified, it will default to 1.
   * @return Array
   *         An outline defining the plane-mesh intersection, as a list of segments.
   */
  "get xyzscan": function(params)
  {
    if (this.xyzscan) {
      return;
    }
    this["get bounds"]();
    var xyzscan = [];

    try {
      var bounds = this.bounds;
      var boundsX = bounds.X;
      var boundsY = bounds.Y;
      var boundsZ = bounds.Z;
      var step = params.size / (params.scale || 1);

      for (var height = boundsX.min - EPSILON;
           height <= boundsX.max + EPSILON;
           height += step) {
        this["get intersections"]({ N: [1, 0, 0], D: height }, xyzscan);
      }
      for (height = boundsY.min - EPSILON;
           height <= boundsY.max + EPSILON;
           height += step) {
        this["get intersections"]({ N: [0, 1, 0], D: height }, xyzscan);
      }
      for (height = boundsZ.min - EPSILON;
           height <= boundsZ.max + EPSILON;
           height += step) {
        this["get intersections"]({ N: [0, 0, 1], D: height }, xyzscan);
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get xyzscan finished");
    return (this.xyzscan = xyzscan);
  },

  /**
   * Creates a voxelized representation of the mesh based on all the outline
   * intersections on the X, Y and Z axes.
   *
   * @param Object params
   *        An object containing the following fields:
   *          -- Number size
   *             The size of a voxel (basically the width/height/depth of a cube).
   *          -- Number scale
   *             Optional, a scalar to scale the entire mesh with.
   *             If unspecified, it will default to 1.
   * @return Array
   *         A list of voxels which define a *hollow* version of the object.
   */
  "get voxels": function(params)
  {
    if (this.voxels) {
      return;
    }
    this["get xyzscan"](params);
    var voxels = [];

    try {
      var cache = {};
      var xyzscan = this.xyzscan;
      var scale = params.scale;
      var size = params.size;

      for (var i = 0, l = xyzscan.length; i < l; i++) {
        var segment = xyzscan[i];
        var v1 = segment.left.multiply(scale);
        var v2 = segment.right.multiply(scale);

        var step = 1 / (v1.distanceTo(v2) / (size / 2));
        var lerp = step;

        if (i % 100 === 0) {
          self.postMessage(voxels.length + ", " + i + "/" + l);
        }
        do {
          var loc = v1.lerp(v2, lerp);
          var voxel = new Voxel(size).fromVec3(loc).normalize().toInteger();
          var key = "" + voxel.x + voxel.y + voxel.z;

          if (!cache[key]) {
            cache[key] = true;
            voxels.push(voxel);
          }
        } while ((lerp += step) <= 1);
      }
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get voxels finished");
    return (this.voxels = voxels);
  },

  /**
   * Creates a html + css string representing a voxelized version of the mesh.
   * This will look good only in Tilt (for now).
   *
   * @param Object params
   *        An object containing the follwing fields:
   *          -- Number size
   *             The size of a voxel (basically the width/height/depth of a cube).
   *          -- Number bound
   *             A scalar (roughly) determining the size of the exported model.
   *             Theoretically, no voxel should exceed the edges defined by this
   *             scalar, but stranger things have happened.
   * @return Object
   *         An object containing a list of all the voxels, the html and css
   *         represeting the mesh. It looks like { voxels, html, css }.
   */
  "get export": function(params)
  {
    this["get bounds"]();
    params = {
      size: params.size,
      scale: params.bound * 3 / (this.bounds.outerX +
                                 this.bounds.outerY +
                                 this.bounds.outerZ)
    };

    if (this.html) {
      return;
    }
    this["get voxels"](params);
    var css = [""];
    var html = [""];

    try {
      var voxels = this.voxels;
      var scale = params.scale;
      var size = params.size;
      var layers = {};

      var top = -parseInt(this.bounds.Z.min * scale);
      var left = -parseInt(this.bounds.X.min * scale);
      var right = parseInt(this.bounds.X.max * scale);

      voxels.sort(function(a, b) {
        return a.y > b.y;
      });

      for (var i = 0, l = voxels.length; i < l; i++) {
        var voxel = voxels[i];
        var depth = voxel.y / size;

        if (!layers[depth]) {
          layers[depth] = {};
        }
        layers[depth][i] = voxel;
      }

      css.push(
        "<style>",
          "body {",
          "  background: #000;",
          "  margin: 0;",
          "}",
          "#model {",
          "  position: relative;",
          "  top: " + size + "px;",
          "  width: " + (left + right) + "px;",
          "  margin: 0 auto;",
          "}",
          ".px {",
          "  position: absolute;",
          "  width: " + size + "px;",
          "  height: " + size + "px;",
          "  background: #fff;",
          "}",
        "</style>", "");

      html.push("<div id='model'>");

      for (var depth in layers) {
        var layer = layers[depth];
        html.push("<div>");

        for (var index in layer) {
          var voxel = layer[index];
          var position = [
            "top: ", (top + voxel.z), "px; ",
            "left: ", (left + voxel.x), "px;"].join("");

          html.push("<div class='px' style='" + position + "'></div>");
        }
      }
      for (var depth in layers) {
        html.push("</div>");
      }
      html.push("</div>");
    } catch (e) {
      self.postMessage(e);
    }

    self.postMessage("get export finished");
    return {
      voxels: this.voxels,
      css: css.join("\n"),
      html: html.join("\n")
    };
  },

  _planeTriangleIntersection: function(plane, triangle)
  {
    var point = null;
    var edges = [];
    var v1 = triangle.v1;
    var v2 = triangle.v2;
    var v3 = triangle.v3;

    if ((point = this._planeSegmentIntersection(plane, v1, v2))) {
      edges.push(point);
    }
    if ((point = this._planeSegmentIntersection(plane, v2, v3))) {
      edges.push(point);
    }
    if ((point = this._planeSegmentIntersection(plane, v3, v1))) {
      edges.push(point);
    }

    return edges.length === 2 ? new Segment(edges[0], edges[1]) : null;
  },

  _planeSegmentIntersection: function(plane, v1, v2)
  {
    var d1 = v1.distanceToPlane(plane);
    var d2 = v2.distanceToPlane(plane);

    if (d1 * d2 > 0) {
      return null;
    }

    var t = d1 / (d1 - d2);
    return v1.add(v2.subtract(v1).multiply(t));
  },

  _splitData: function(line, offset)
  {
    var data = line.substring(offset || 1).trim().split(" ");

    for (var i = 0, l = data.length; i < l; i++) {
      data[i] = data[i].split("/")[0];
    }
    return data;
  }
};
