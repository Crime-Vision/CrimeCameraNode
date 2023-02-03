require('dotenv').config()
var fs = require('fs');
var ejs = require('ejs');

const debug = require('debug')('writeNvrJsConfig');

debug.enabled = true

async function overwriteConfig() {
  debug("Beginning NVRJS config overwrite.")
  
  debug("Reading Template.")

  let template = await fs.readFileSync('/home/pi/CrimeCameraNode/nvrjs_config.ejs', 'utf-8')

  debug("Reading Config")

  let config = JSON.parse(await fs.readFileSync('/mnt/ramdisk/config.json'))

  debug("Rendering config to variable")

  let results = ejs.render(template, config)

  debug("Writing config to /home/pi/nvrjs.config.js")

  await fs.writeFileSync('/home/pi/nvrjs.config.js', results)
  
  debug("Wrote /home/pi/nvrjs.config.js successfully")
}

async function run() {
  await overwriteConfig();
}

module.exports = {
  run
}
