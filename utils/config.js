const db = require('./db');

module.exports = {
    get textCommandsEnabled() {
        const data = db.read();
        return data.config?.textCommandsEnabled ?? true;
    },
    set textCommandsEnabled(value) {
        const data = db.read();
        if (!data.config) {
            data.config = {};
        }
        data.config.textCommandsEnabled = value;
        db.write(data);
    }
};
