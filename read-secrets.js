const fs = require('fs');
const path = require('path');

function readSecret(secretName) {
    const secretPath = path.join('/run/secrets', secretName);
    if (fs.existsSync(secretPath)) {
        return fs.readFileSync(secretPath, 'utf8').trim();
    }
    return process.env[secretName] || '';
}

module.exports = { readSecret };