require('dotenv').config();

const WebSocketServer = require('ws').Server;

const debug = require('debug')('hardwareControlService');

debug.enabled = true;
 
var socketServer = null;

async function run() {
  socketServer = new WebSocketServer({port: 8888});

  socketServer.on('connection', ws => {
    console.log('New Client.');
    ws.send('Connection Established.');

    ws.on('close', () => console.log("Client has disconnected!."));
    ws.on('message', data => {
      console.log('Received message');
      console.log(data);
    });

    ws.onerror = function() {
      console.log('websocket error');
    }
  });
}

if (require.main === module) {
  run(); 
}
