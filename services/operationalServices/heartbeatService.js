const tx2 = require('tx2')

require('dotenv').config();
const axios = require('axios').default;

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const debug = require('debug')('heartbeatService')
debug.enabled = true
const fs = require('fs')

const dedent = require('dedent-js');

var config = {}

async function run() {
  while(true) {
    debug("Collecting heartbeat checks.");

    var data = { 
      node: `${process.env.NODE_IDENTIFIER}`,
      health: {
        ramdiskHealthy: await ramdiskHealthy(),
        configHealthy: await configHealthy(),
        //TODO:
        //firewallHealthy: await firewallHealthy(),
        drivesHealthy: await drivesHealthy(),
        videosAreRecording: await videosAreRecording()
      }
    }

    debug("Completed. Data:");
    debug(data);

    try {
      await axios.post(`${process.env.NODE_SERVER}/api/nodes/checkin/${process.env.NODE_IDENTIFIER}`, data)

      debug("Heartbeat Completed. Sleeping 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
    } catch (e) {
      debug("Heartbeat Failure!");
      debug(e);
      debug("Sleeping 10 seconds and trying again.") 
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

  }
}

async function ramdiskHealthy() {
  mounted = true

  try {
    var {stdout, stderr} = await exec(`mount | grep 'tmpfs on /mnt/ramdisk'`);
  } catch(error) {
    mounted = false
  }

  debug(`Ramdisk Healthy? ${mounted}`);

  tx2.metric({
    name: 'Ramdisk Healty?',
    value: mounted
  });

  return mounted;
}

async function configHealthy() {
  configWorks = true

  try {
    configString = fs.readFileSync('/mnt/ramdisk/config.json', 'utf8');

    config = JSON.parse(configString).config;
  } catch(error) {
    configWorks = false
  }

  debug(`Config Healthy? ${configWorks}`);

  tx2.metric({
    name: 'Config Works?',
    value: configWorks
  });

  return configWorks;
}

async function firewallHealthy() {
  return true;
}

async function drivesHealthy() {
  var videoMountWorking = false;

  try {
    var {stdout, stderr} = await exec(`sudo lsblk -o NAME,TYPE,SIZE,MODEL | grep ${config.videoDriveEncryptionKey}`);
  } catch(e) {

  }

  if (stdout && stdout.includes(config.videoDriveEncryptionKey)) {
    videoMountWorking = true; 
  }

  var buddyMountWorking = false;

  try {
    var {stdout, stderr} = await exec(`sudo lsblk -o NAME,TYPE,SIZE,MODEL | grep ${config.buddyDriveEncryptionKey}`);
  } catch(e) {

  }

  if (stdout && stdout.includes(config.buddyDriveEncryptionKey)) {
    buddyMountWorking = true; 
  }

  var result = videoMountWorking && buddyMountWorking;

  debug(`Drives Healthy? ${result}`);
  
  tx2.metric({
    name: 'Drives Healthy?',
    value: result
  });

  if(!result) {
    debug("!!! Drives not healthy.");
  
    tx2.issue(`Host: ${config.hostName} |  Drives are not healthy.`);
  }


  return result;
}

async function videosAreRecording() {
  var camerasRecording = [false, false, false];

  for(i = 1; i < 4; i++) {
    try {
      var {stdout, stderr} = await exec(`ls -t /home/pi/videos/NVRJS_SYSTEM/camera${i} | head -n 1`);

      const file_fd = fs.openSync(`/home/pi/videos/NVRJS_SYSTEM/camera${i}/${stdout.replace("\n", "")}`, 'r');

      var stats = fs.fstatSync(file_fd);

      var mtime = stats.mtime;

      var testDate = (Date.now() - 15 * 60000)

      if(mtime > testDate) {
        camerasRecording[i - 1] = true    
      } else {
        camerasRecording[i - 1] = false
      }

    } catch(e) {
      //Do nothing - if something failed, it will fail below too.
    } 
  }

  var result = camerasRecording[0] && camerasRecording[1] && camerasRecording[2];

  debug(`Cameras Recording? ${result}`);
  
  tx2.metric({
    name: 'Cameras Recording?',
    value: result
  });

  if(!result) {
    debug("!!! Cameras are not recording. Creating an issue to trigger alerts.");
    tx2.issue(`Host: ${config.hostName} |  Cameras are not recording.`);
  }
  
  return result;
}

run()
