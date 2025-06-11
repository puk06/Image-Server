const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const RequestUtils = require("./Utils/RequestUtils");
const LogUtils = require("./Utils/LogUtils");

const API_KEY = process.env.API_KEY;
const imageCache = [];
const cacheDuration = 10 * 60 * 1000; // 10 minutes
const IMAGE_PATH = path.join(__dirname, "uploads");
const SERVER_PORT = 8000;

const AUTO_DELETE = false;
const AUTO_DELETE_DURATION = 8; // days

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

        if (!ip) {
            Logger.log("IP address not found");
            RequestUtils.sendError(res, 400, "IP address not found");
            return;
        }

        const urlParts = req.url.split("?");
        const endpoint = urlParts[0];

        switch (endpoint) {
            case "/resize":
            case "/resize/":
                await handleImageRequest(res, req.url, Logger);
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
