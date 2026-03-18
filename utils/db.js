const fs = require('fs');

module.exports = {
    read: () => JSON.parse(fs.readFileSync('./data.json', 'utf8')),
    write: (data) => fs.writeFileSync('./data.json', JSON.stringify(data, null, 2))
};