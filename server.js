
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const PORT = process.env.PORT || 8000;

const otpStore = new Map();

const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4"
};

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10000) {
      throw new Error("Request too large");
    }
  }

  return JSON.parse(body);
}

http.createServer(async (req, res) => {

  let pathname;

  try {
    pathname = decodeURIComponent(
      req.url.split("?")[0]
    );
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }

  // STEP 1: Health check
  if (pathname === "/api/health") {
    return json(res, 200, {
      success: true,
      message: "Westers Backend Working"
    });
  }

  // STEP 2: Generate OTP (local testing)
  if (
    pathname === "/api/send-otp" &&
    req.method === "POST"
  ) {
    try {
      const data = await readBody(req);

      if (!data.phone && !data.email) {
        return json(res, 400, {
          success: false,
          message: "Phone or email required"
        });
      }

      const otp = String(
        crypto.randomInt(100000, 1000000)
      );

      const requestId = crypto.randomUUID();

      otpStore.set(requestId, {
        otp,
        expires: Date.now() + 300000,
        attempts: 0
      });

      console.log("Development OTP:", otp);

      return json(res, 200, {
        success: true,
        requestId,
        message: "OTP generated for local testing"
      });

    } catch (error) {
      return json(res, 400, {
        success: false,
        message: "Invalid request"
      });
    }
  }

  // STEP 3: Verify OTP
  if (
    pathname === "/api/verify-otp" &&
    req.method === "POST"
  ) {
    try {
      const { requestId, otp } = await readBody(req);
      const saved = otpStore.get(requestId);

      if (!saved || Date.now() > saved.expires) {
        otpStore.delete(requestId);

        return json(res, 400, {
          success: false,
          message: "OTP expired or not found"
        });
      }

      saved.attempts++;

      if (saved.attempts > 5) {
        otpStore.delete(requestId);

        return json(res, 429, {
          success: false,
          message: "Too many attempts"
        });
      }

      const valid = saved.otp === String(otp);

      if (!valid) {
        return json(res, 400, {
          success: false,
          message: "Incorrect OTP"
        });
      }

      otpStore.delete(requestId);

      return json(res, 200, {
        success: true,
        message: "OTP verified successfully"
      });

    } catch {
      return json(res, 400, {
        success: false,
        message: "Invalid verification request"
      });
    }
  }

  if (pathname.startsWith("/api/")) {
    return json(res, 404, {
      success: false,
      message: "API endpoint not found"
    });
  }

  // Existing website routes
  const cleanRoutes = {
    "/": "/index.html",
    "/admin": "/admin/login.html",
    "/admin/": "/admin/login.html"
  };

  if (pathname.endsWith(".html")) {
    const cleanPath =
      pathname === "/index.html"
        ? "/"
        : pathname.slice(0, -5);

    res.writeHead(301, {
      Location: cleanPath
    }).end();
    return;
  }

  let requested = cleanRoutes[pathname] || pathname;

  if (!path.extname(requested)) {
    requested += ".html";
  }

  const file = path.resolve(root, "." + requested);

  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404).end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type":
        types[path.extname(file).toLowerCase()] ||
        "application/octet-stream"
    });

    res.end(data);
  });

}).listen(PORT, "127.0.0.1", () => {
  console.log(
    `Westers server running at http://127.0.0.1:${PORT}`
  );
});
