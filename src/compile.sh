#!/bin/bash
find chrome/content/engine -name \*.js -exec cat > Tilt.js {} \;
cat Tilt.js > chrome/content/Tilt.js
java -jar compiler.jar --language_in ECMASCRIPT5_STRICT --compilation_level SIMPLE_OPTIMIZATIONS --warning_level QUIET --js Tilt.js --js_output_file Tilt-min.js
cat Tilt-min.js > chrome/content/Tilt-min.js