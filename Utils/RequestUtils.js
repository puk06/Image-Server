class RequestUtils {
    static sendImage(res, buffer) {
        const headers = { "Content-Type": "image/jpeg" };
        res.writeHead(200, headers);
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
