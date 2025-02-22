require('dotenv').config();
const fs = require('fs');
const { spawn, spawnSync } = require("child_process");


const WebSocketServer = require('ws').Server;

const debug = require('debug')('hardwareControlService');

debug.enabled = true;
 
var socketServer = null;
var isBroadcasting = false;
var isReadyToBroadcast = false;
var audioPlayerProcess = null;
var lightIsFlashing = false;
var soundCard = 0;

const soundRegex = /card (\d+): sndrpihifiberry/;



function writeAudioToDisk(data) {
  console.log("Saving buffer to disk as a .wav");

  fs.writeFileSync("/tmp/broadcast.wav", data);
  console.log("Wrote file to /tmp/broadcast.wav");

  isReadyToBroadcast = true;
}

function stopBroadcast(ws) {
  if(isBroadcasting && audioPlayerProcess != null) {
    console.log("Killing broadcast process");
    audioPlayerProcess.stdin.write("q");
  }
}

function startBroadcast(ws) {
  if(isReadyToBroadcast && !isBroadcasting) {
    if(audioPlayerProcess == null) {
      var aplayProcess = spawnSync('aplay', ['-l']);

      const match = soundRegex.exec(aplayProcess.stdout);

      if (match) {
        const cardNumber = match[1];
      	
        audioPlayerProcess = spawn("sudo", ["mplayer", "-ao", `alsa:device=hw=${cardNumber}.0`, "/tmp/broadcast.wav"]);

        isBroadcasting = true;

        ws.send("broadcast: started");
     
        audioPlayerProcess.stdout.on("data", data => {
          console.log(`stdout: ${data}`);
        });
     
        audioPlayerProcess.stderr.on("data", data => {
          console.log(`stderr: ${data}`);
        });
     
        audioPlayerProcess.on('error', (error) => {
          console.log(`error: ${error.message}`);
        });
     
        audioPlayerProcess.on("close", code => {
          console.log(`child process exited with code ${code}`);
          audioPlayerProcess = null;
          isBroadcasting = false;
          ws.send("broadcast: stopped");
        });
      } else { 
	console.log('No matching audio card found.'); 
      }
    } else {
      console.log("audioPlayerProcess was not null.");
    }
  } else {
    console.log(`isReadyToBroadcast: ${isReadyToBroadcast} | isBroadcasting: ${isBroadcasting}`);
  }

}

async function run() {
  socketServer = new WebSocketServer({port: 8888});

  socketServer.on('connection', ws => {
    console.log('New Client.');
    ws.send('Connection Established.');

    ws.on('close', () => { 
      console.log("Client has disconnected!.") 
      isReadyToBroadcast = false;
      isBroadcasting = false;
    });

    ws.on('message', event => {
      console.log('Received message');
      console.log(event);

      if(event instanceof Buffer) {
        console.log("Recognized blob data");
        writeAudioToDisk(event);
        ws.send("broadcast: ready");
      }

      if(event.toString().startsWith("light: ")) {
        var cmd = event.toString().replace("light: ", "");
        console.log("Received Lighting CMD: " + cmd);

        if(cmd == "start") {
          spawn("raspi-gpio", ["set", "4", "op"]);
          spawn("raspi-gpio", ["set", "4", "dh"]);
          lightIsFlashing = true;
          ws.send("light: flashing");
        }

        if(cmd == "stop") {
          spawn("raspi-gpio", ["set", "4", "op"]);
          spawn("raspi-gpio", ["set", "4", "dl"]);
          lightIsFlashing = false;
          ws.send("light: stopped");
        }

      }

      if(event.toString().startsWith("broadcast: ")) {
        var cmd = event.toString().replace("broadcast: ","");
        console.log("Received Broadcast CMD: " + cmd);

        if(cmd == "start") {
          console.log("Toggling broadcast from 'start'");
          startBroadcast(ws); 
        }

        if(cmd == "stop") {
          console.log("Toggling broadcast from 'stop'");
          stopBroadcast(ws); 
        }
      }
    });

    ws.onerror = function() {
      console.log('websocket error');
    }
  });
}

if (require.main === module) {
  run(); 
}
