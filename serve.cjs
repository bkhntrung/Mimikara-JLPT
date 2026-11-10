const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4173;
const distDir = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function openBrowser(url) {
  const startCmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(startCmd, (err) => {
    if (err) {
      console.log(`[*] Vui lòng mở thủ công trình duyệt tại: ${url}`);
    }
  });
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let filePath = path.join(distDir, reqPath);

    // If file doesn't exist or is directory, fallback to index.html (SPA)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi máy chủ: ' + err.message);
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const url = `http://localhost:${port}/`;
      console.log('===============================================================');
      console.log(`[*] May chu Mimikara da dang chay san tai: ${url}`);
      console.log(`[*] Giu nguyen Origin ${url} de bao toan lich su hoc SRS & Starred.`);
      console.log('[*] Dang tu dong mo lai trinh duyet web...');
      console.log('===============================================================');
      openBrowser(url);
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } else {
      console.error('[!] Lỗi máy chủ:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log('===============================================================');
    console.log('    MIMIKARA OBOERU JLPT (N3 - N2 - N1) FLASHCARD');
    console.log('===============================================================');
    console.log(`  Dia chi may chu: ${url}`);
    console.log('  Cap do: N3 (871 tu), N2 (1,160 tu), N1 (1,170 tu)');
    console.log('  Tong cong: 3,201 tu vung & 8,543 cau vi du co Furigana');
    console.log('  Tien do SRS & yeu thich duoc luu truc tiep tren may cua ban.');
    console.log('===============================================================');
    console.log('  Dang tu dong mo trinh duyet web...');
    console.log('  (Giu cua so nay mo trong suot buoi hoc, dong de ket thuc)');
    console.log('===============================================================');

    setTimeout(() => {
      openBrowser(url);
    }, 500);
  });
}

startServer(PORT);
