const WebSocket = require('ws')
const fs = require('fs')

const stringIsnullOrEmpty = (str) => {
    if (str == null || str == undefined || str == "") return true
    return false
}

/**
 * @param {string} path 
 * @returns {string}
 */
const ReadFile = (path) => {
    if (!fs.existsSync(path)) {
        return ""
    }
    const main = fs.readFileSync(path, "utf-8")
    return main
}

exports.stringIsnullOrEmpty = stringIsnullOrEmpty
exports.ReadFile = ReadFile
