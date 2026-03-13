const http = require("http");

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello, Docker!\n");
});

server.listen(PORT, () => {
  console.log(`Node app is running on port ${PORT}`);
});
