class RequestUtils {
    static sendImage(res, buffer) {
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(buffer);
    }

    static sendResponse(res, statusCode, message) {
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(message));
    }

    static sendError(res, statusCode, message) {
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
    }
}

module.exports = RequestUtils;
