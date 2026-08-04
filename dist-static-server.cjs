const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 4175;
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/' || urlPath === '/tiantu-next-copy' || urlPath === '/tiantu-next-copy/') {
    urlPath = '/index.html';
  } else if (urlPath.startsWith('/tiantu-next-copy/')) {
    urlPath = urlPath.slice('/tiantu-next-copy'.length);
  } else {
    urlPath = '/index.html';
  }

  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(path.normalize(root))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, 'index.html'), (indexError, indexData) => {
        if (indexError) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {'Content-Type': types['.html'], 'Cache-Control': 'no-cache'});
        res.end(indexData);
      });
      return;
    }

    res.writeHead(200, {'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`dist server http://0.0.0.0:${port}/tiantu-next-copy/`);
});
