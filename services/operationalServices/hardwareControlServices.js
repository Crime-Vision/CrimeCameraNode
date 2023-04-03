require('dotenv').config();

const { WebSocketServer } = require('ws');

const debug = require('debug')('hardwareControlService');

debug.enabled = true;
 
const socketServer = new WebSocketServer({ port: 80 });

async function run() {
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
