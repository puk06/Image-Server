class LogUtils {
    constructor(ip) {
        this.ip = ip;
    }

    log(message) {
        const timestamp = new Date().toLocaleString();
        const logMessage = `[${timestamp}] ${message} from IP (${this.ip})`;
        console.log(logMessage);
    }

    static serverMessage(message) {
        const timestamp = new Date().toLocaleString();
        const logMessage = `[${timestamp}] SERVER: ${message}`;
        console.log(logMessage);
    }
}

module.exports = LogUtils;
