const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const file = path.join(__dirname, "index.html");
http
  .createServer((req, res) => {
    if (req.url === "/manifest.webmanifest") {
      res.writeHead(200, { "Content-Type": "application/manifest+json" });
      return res.end(
        JSON.stringify({
          name: "EduFix",
          short_name: "EduFix",
          start_url: "/",
          display: "standalone",
          background_color: "#f5f7fb",
          theme_color: "#233b78",
        }),
      );
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
  })
  .listen(Number(process.env.WEB_PORT || 3000), () =>
    console.log("EduFix web running at http://localhost:3000"),
  );
