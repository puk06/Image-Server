const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const RequestUtils = require("./Utils/RequestUtils");
const LogUtils = require("./Utils/LogUtils");

const API_KEY = process.env.API_KEY;
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 8000;
const cacheDuration = process.env.CACHE_DURATION ? parseInt(process.env.CACHE_DURATION) * 60 * 1000 : 10 * 60 * 1000; // Default to 10 minutes
const IMAGE_PATH = path.join(__dirname, process.env.UPLOAD_DIR_NAME || "uploads");
const AUTO_DELETE = process.env.AUTO_DELETE === "true";
const AUTO_DELETE_DURATION = process.env.AUTO_DELETE_DURATION ? parseInt(process.env.AUTO_DELETE_DURATION) : 8; // days
const LIMIT_REQUEST = process.env.LIMIT_REQUEST === "true";
const REQUEST_LIMIT_PER_MINUTE = parseInt(process.env.REQUEST_LIMIT_PER_MINUTE) || 60; // Default to 60 requests per minute
let BYPASS_IP = [];

const IP_FILE_PATH = path.join(__dirname, "bypass_ips.txt");
if (!fs.existsSync(IP_FILE_PATH)) {
    fs.writeFileSync(IP_FILE_PATH, "", "utf-8");
} else {
    BYPASS_IP = fs.readFileSync(IP_FILE_PATH, "utf-8").split("\n").map(ip => ip.trim());
}

// Config File Console
LogUtils.serverMessage(`API_KEY: ${API_KEY}`);
LogUtils.serverMessage(`SERVER_PORT: ${SERVER_PORT}`);
LogUtils.serverMessage(`CACHE_DURATION: ${cacheDuration / (60 * 1000)} minutes`);
LogUtils.serverMessage(`IMAGE_PATH: ${IMAGE_PATH}`);
LogUtils.serverMessage(`AUTO_DELETE: ${AUTO_DELETE}`);
LogUtils.serverMessage(`AUTO_DELETE_DURATION: ${AUTO_DELETE_DURATION} days`);
LogUtils.serverMessage(`LIMIT_REQUEST: ${LIMIT_REQUEST}`);
LogUtils.serverMessage(`REQUEST_LIMIT_PER_MINUTE: ${REQUEST_LIMIT_PER_MINUTE}`);
// End of Config File Console

const imageCache = [];
const requestCounts = {};

if (!fs.existsSync(IMAGE_PATH)) {
    fs.mkdirSync(IMAGE_PATH, { recursive: true });
}

setInterval(async () => {
    const now = Date.now();
    for (let i = imageCache.length - 1; i >= 0; i--) {
        if (now - imageCache[i].timestamp > cacheDuration) {
            imageCache.splice(i, 1);
        }
    }

    await deleteOldImages();
}, cacheDuration);

async function deleteOldImages() {
    if (!AUTO_DELETE) return;

    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - AUTO_DELETE_DURATION);

    try {
        const files = fs.readdirSync(IMAGE_PATH);
        for (const file of files) {
            const filePath = path.join(IMAGE_PATH, file);
            try {
                const stats = fs.statSync(filePath);
                if (stats.mtime < deleteDate) {
                    fs.unlinkSync(filePath);
                    LogUtils.serverMessage(`Deleted old image: ${file}`);
                }
            } catch (err) {
                LogUtils.serverMessage(`Error checking file ${file}: ${err.message}`);
            }
        }
    } catch (err) {
        LogUtils.serverMessage("Error reading directory:", err);
    }
}

async function handleImageRequest(res, url, logger) {
    const [, encodedUrl] = url.split("?url=");

    if (!encodedUrl) {
        logger.log("Missing URL parameter");
        return RequestUtils.sendError(res, 400, "Missing parameters");
    }

    const imageUrl = decodeURIComponent(encodedUrl);

    const cachedImage = imageCache.find(item => item.url === imageUrl);
    if (cachedImage) {
        logger.log(`Serving cached image from ${imageUrl}`);
        return RequestUtils.sendImage(res, cachedImage.buffer);
    }

    try {
        const { status, data: rawImage } = await axios.get(imageUrl, { responseType: "arraybuffer" });
        if (status !== 200) throw new Error("Invalid image");

        const resized = await resizeImage(rawImage);
        if (!resized) throw new Error("Resize failed");

        imageCache.push({ url: imageUrl, buffer: resized, timestamp: Date.now() });

        logger.log(`Fetched and resized image from ${imageUrl}`);
        RequestUtils.sendImage(res, resized);
    } catch (err) {
        logger.log(`Error fetching image from ${imageUrl}: ${err.message}`);
        RequestUtils.sendError(res, 400, "Invalid image");
    }
}

function UploadImage(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", chunk => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

async function handleUploadImage(req, res, logger) {
    try {
        const data = await UploadImage(req);
        const resized = await resizeImage(data);

        let fileName = GenerateRandomString(10);
        while (fs.existsSync(path.join(IMAGE_PATH, `${fileName}.jpg`))) {
            fileName = GenerateRandomString(10);
        }

        const filePath = path.join(IMAGE_PATH, `${fileName}.jpg`);

        fs.writeFile(filePath, resized, err => {
            if (err) {
                logger.log(`Error saving image: ${err.message}`);
                return RequestUtils.sendError(res, 500, "Failed to save image");
            }

            logger.log(`Image uploaded and saved as ${fileName}.jpg`);
            RequestUtils.sendResponse(res, 200, { message: "Success", fileName });
        });
    } catch (err) {
        logger.log(`Error during upload: ${err.message}`);
        RequestUtils.sendError(res, 500, "Failed to process image");
    }
}

function handleGetImage(req, res, logger) {
    const imageId = req.url.split("?id=")[1];

    if (!imageId) {
        logger.log("Missing image ID");
        return RequestUtils.sendError(res, 400, "Missing image ID");
    }

    const filePath = path.join(IMAGE_PATH, `${imageId}.jpg`)
    if (!fs.existsSync(filePath)) {
        logger.log(`Image not found: ${imageId}`);
        return RequestUtils.sendError(res, 404, "Image not found");
    }

    const cached = imageCache.find(item => item.url === imageId);
    if (cached) {
        logger.log(`Serving cached image: ${imageId}`);
        return RequestUtils.sendImage(res, cached.buffer);
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            logger.log(`Error reading image file: ${err.message}`);
            RequestUtils.sendError(res, 404, "Image not found");
        } else {
            logger.log(`Serving image from disk: ${imageId}`);
            RequestUtils.sendImage(res, data);

            imageCache.push({ url: imageId, buffer: data, timestamp: Date.now() });
        }
    });
}

require("http").createServer(async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
    
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
        const Logger = new LogUtils(ip);

        // Rate limiting
        const currentTime = Date.now();

        if (LIMIT_REQUEST && !BYPASS_IP.includes(ip)) {

            if (!requestCounts[ip]) {
                requestCounts[ip] = [];
            }

            requestCounts[ip].push(currentTime);
            requestCounts[ip] = requestCounts[ip].filter(timestamp => currentTime - timestamp < 60 * 1000);

            if (requestCounts[ip].length > REQUEST_LIMIT_PER_MINUTE) {
                Logger.log(`Rate limit exceeded for IP: ${ip}`);
                RequestUtils.sendError(res, 429, "Too many requests");
                return;
            }
        }

        const urlParts = req.url.split("?");
        const endpoint = urlParts[0];

        switch (endpoint) {
            case "/resize":
            case "/resize/":
                handleImageRequest(res, req.url, Logger);
                break;

            case "/upload":
            case "/upload/": {
                const apiKey = req.headers.authorization;
                if (!apiKey || apiKey !== API_KEY) {
                    Logger.log(`Unauthorized access attempt`);
                    RequestUtils.sendError(res, 403, "Forbidden");
                    return;
                }

                if (req.method === "POST") {
                    handleUploadImage(req, res, Logger);
                } else {
                    Logger.log(`Method not allowed: ${req.method}`);
                    RequestUtils.sendError(res, 405, "Method not allowed");
                }
                break;
            }

            case "/get":
            case "/get/":
                handleGetImage(req, res, Logger);
                break;
            
            default:
                Logger.log(`Endpoint not found: ${req.url}`);
                RequestUtils.sendError(res, 404, "Endpoint not found");
                break;
        }
    } catch (err) {
        logger.log(`Error handling request: ${err.message}`);
        RequestUtils.sendError(res, 500, "Internal server error");
    }
}).listen(SERVER_PORT, async () => {
    LogUtils.serverMessage(`Server is running on port ${SERVER_PORT}`);
});

function resizeImage(imageData) {
    return sharp(imageData)
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
}

function GenerateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}
