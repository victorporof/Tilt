"use strict";

(function() {

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

    let file = e.dataTransfer.files[0];
    if (!file.name.match(/\.obj$/)) {
      return;
    }

    let reader = new FileReader();
    reader.onload = function(e) {
      let text = e.target.result;
      let mesh = new Mesh(text).export();
    };

    reader.readAsText(file);
  }

  let dropbox = document.body;
  dropbox.addEventListener("dragenter", dragenter, false);
  dropbox.addEventListener("dragover", dragover, false);
  dropbox.addEventListener("drop", drop, false);
})();
