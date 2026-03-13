import http from "http";

const port = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from multi-stage Node.js build!\n");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
