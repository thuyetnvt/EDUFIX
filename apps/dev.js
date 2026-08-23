const { spawn } = require("node:child_process");
const children = [
  spawn(process.execPath, ["apps/api/server.js"], { stdio: "inherit" }),
  spawn(process.execPath, ["apps/web/server.js"], { stdio: "inherit" }),
];
for (const child of children)
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
process.on("SIGINT", () => children.forEach((child) => child.kill("SIGINT")));
