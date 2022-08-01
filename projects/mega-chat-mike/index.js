// не забудьте сделать npm install ;)

const http = require('http');
const Index = require('ws');
// const util = require('util');
const fs = require('fs');
const path = require('path');

const host = 'localhost';
const port = 8282;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let dataRaw = '';

    req.on('data', (chunk) => (dataRaw += chunk));
    req.on('error', reject);
    req.on('end', () => resolve(JSON.parse(dataRaw)));
  });
}

const publicPath = path.resolve('./public');

const server = http.createServer(async (req, res) => {
  let filepath = path.join(publicPath, req.url);

  try {
    if (/\/photos\/.+\.png/.test(req.url)) {
      const [, imageName] = req.url.match(/\/photos\/(.+\.png)/) || [];
      const fallBackPath = path.resolve(__dirname, './public/no-photo.png');
      const filePath = path.resolve(__dirname, './public/photos', imageName);

      if (fs.existsSync(filePath)) {
        return fs.createReadStream(filePath).pipe(res);
      } else {
        return fs.createReadStream(fallBackPath).pipe(res);
      }
    } else if (req.url.endsWith('/upload-photo')) {
      const body = await readBody(req);
      const name = body.name.replace(/\.\.\/|\//, '');
      const [, content] = body.image.match(/data:image\/.+?;base64,(.+)/) || [];
      const filePath = path.resolve(__dirname, './public/photos', `${name}.png`);

      if (name && content) {
        fs.writeFileSync(filePath, content, 'base64');

        broadcast(connections, { type: 'photo-changed', data: { name } });
      } else {
        return res.end('fail');
      }
    } else {
      if (filepath.endsWith('/')) filepath = filepath + 'index.html';
      console.log(filepath);
      //if (!fs.lstatSync(filepath).isDirectory && fs.existsSync(filepath)) {
      const content = await fs.readFileSync(filepath);

      if (filepath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
      if (filepath.endsWith('.js'))
        res.setHeader('Content-Type', 'application/javascript');

      res.writeHead(200);
      res.write(content);
      //}
    }

    res.end();
  } catch (e) {
    console.error(e);
    res.end('fail');
  }
});

const wss = new Index.Server({ server });
const connections = new Map();

wss.on('connection', (socket) => {
  connections.set(socket, {});
  // console.log(socket);
  socket.on('message', (messageData) => {
    const message = JSON.parse(messageData);
    let excludeItself = false;

    if (message.type === 'hello') {
      excludeItself = true;
      connections.get(socket).userName = message.data.name;
      sendMessageTo(
        {
          type: 'user-list',
          data: [...connections.values()].map((item) => item.userName).filter(Boolean),
        },
        socket
      );
    }

    sendMessageFrom(connections, message, socket, excludeItself);
  });

  socket.on('close', () => {
    sendMessageFrom(connections, { type: 'bye-bye' }, socket);
    connections.delete(socket);
  });
});

function sendMessageTo(message, to) {
  to.send(JSON.stringify(message));
}

function broadcast(connections, message) {
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}

function sendMessageFrom(connections, message, from, excludeSelf) {
  const socketData = connections.get(from);

  if (!socketData) {
    return;
  }

  message.from = socketData.userName;

  for (const connection of connections.keys()) {
    if (connection === from && excludeSelf) {
      continue;
    }

    connection.send(JSON.stringify(message));
  }
}

server.listen(port, host, () => {
  console.log(`Сервер запущен: http://${host}:${port}`);
});