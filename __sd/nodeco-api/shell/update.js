/*jshint esversion: 8 */
const fs = require('fs-extra');

function isFile(file) {
    try {
        fs.statSync(file);
        return true;
    } catch(e) {
        return false;
    }
}

if(isFile("/release/")) {
    
}
