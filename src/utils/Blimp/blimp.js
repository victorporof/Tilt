"use strict";

(function() {
  let $sadpanda = document.getElementById("sadpanda");
  let $progress = document.getElementById("progress");
  let $importing = document.getElementById("importing");
  let $bound = document.getElementById("bound");

  // we'll need some features that started being availalbe only in Nightlies
  // (currently Firefox 13+), mostly related to bug 726634
  if (parseInt(navigator.userAgent.replace(/.*Firefox\//, "")
                                  .replace(/[^0-9.]+\d+$/, "")) < 14) {
    return; // :(
  } else {
    $sadpanda.style.display = "none"; // :)
  }

  /**
   * Mesh constructor, containing the model strings. Currently, only 'obj' is
   * used, but we may tackle with the 'mtl' at some point.
   *
   * @param String obj
   *        The model obj file contents (vertices, faces etc.)
   * @param String mtl
   *        Optional, the material file contents. Unused.
   */
  function Mesh(obj, mtl) {
    this.obj = obj || "";
    this.mtl = mtl || "";
    this.importer = new ImporterWorker(this);
  }

  Mesh.prototype = {

    /**
     * Talks to a worker responsible with creating the html representing a
     * voxelized version of the mesh.
     */
    export: function()
    {
      let bound = parseInt($bound.value);
      let size = 15; // magic constant, the thickness of a stack node in Tilt

      this.importer.request("export", { bound: bound, size: size }, function(data) {
        document.head.innerHTML = data.css;
        document.body.innerHTML = data.html;
      });
    }
  };

  /**
   * A wrapper around the importer.js worker.
   *
   * @param Mesh mesh
   *        The mesh containing the model 'obj' and 'mtl' strings.
   */
  function ImporterWorker(mesh) {
    this.mesh = mesh;
  }

  ImporterWorker.prototype = {

    /**
     * Sends a generic request message to the worker and issues a callback when
     * ready. See importer.js for more goodies. Possible requests could be:
     *
     * @param String method
     *        The method name in the importer. Either "vertices",
     *                                                "triangles",
     *                                                "bounds",
     *                                                "intersections",
     *                                                "xyzscan",
     *                                                "voxels" or
     *                                                "export".
     * @param Object params
     *        An object containing stuff to be sent as params for the method.
     * @param Function callback
     *        To be called when worker finished working.
     */
    request: function(method, params, callback)
    {
      let worker = new Worker("importer.js");

      // cool animation bro'
      let spinner = ["|", "/", "–", "\\", "|", "/", "–", "\\"];
      let count = 0;

      worker.addEventListener("message", function(event) {
        let data = event.data;

        if (data.signature === method) {
          // the response is exactly what we wanted, callback!
          callback(event.data.response);
        } else {
          // sometimes bad stuff may happen in the importer worker, or maybe
          // simple status report messages can be sent; deal with this here
          console.log(JSON.stringify(data));
          $progress.textContent = spinner[(count++) % spinner.length];
          $importing.style.visibility = "visible";
        }
      });

      worker.postMessage({
        mesh: this.mesh,
        method: method,
        params: params
      });
    }
  };

  window.Mesh = Mesh;
})();
