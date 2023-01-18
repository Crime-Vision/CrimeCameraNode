// bootstrap
//  - every boot
//    - setup ramdisk
//    - pull config from server, cache in ramdisk
//  - begin one time services
//    - setup Firewall
//    - setup Storage
//    - update Hosts file
//    - update POE DHCP (for PoE cameras)
//
// operational:
//  - critical services: 
//    - Store Video: NVR-JS handles this
//    - Stream Video: restreamer handles this, see RtspToWEB, 
//    - clean storage 
//    - heartbeat: Critical for map functionality and monitoring


const debug = require('debug')('CrimeCameraNodeSlim');
debug.enabled = true

require('dotenv').config();

if(typeof(process.env.CAMERA_NETWORK_INTERFACE_NAME) == 'undefined' || 
   typeof(process.env.NODE_IDENTIFIER) == 'undefined' || 
   typeof(process.env.NODE_SERVER) == 'undefined' || 
   typeof(process.env.ZEROTIER_INTERFACE_NAME) == 'undefined') {
  debug("!!! ERROR:")
  debug("You MUST fill out the following fields in a .env before proceeding!")
  debug("NODE_IDENTIFIER, NODE_SERVER, ZEROTIER_INTERFACE_NAME, CAMERA_NETWORK_INTERFACE_NAME")
  debug("See README")
  return;
}


async function main() {
  while(true) {
    debug("Beginning main() procedure")

    debug("Bootstrapping...");
    await require('./services/bootstrapServices/bootstrapServices.js').run();

    debug("Completed main() procedure");

    debug("✅ You are safe to begin operating.");
    debug("⚠️  You must still setup pm2 services if you have not already.");

    debug("Run 'pm2 start <file.js>' for each file in the operational folder.");
    debug("After doing so, run pm2 save to make it permanent.");

    debug("Bootstrapping completed. Sleeping for 10 minutes.");
    await new Promise(resolve => setTimeout(resolve, 600000));
  }
}

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
})

main()
