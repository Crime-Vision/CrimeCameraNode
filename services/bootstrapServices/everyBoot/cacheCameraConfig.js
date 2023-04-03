require('dotenv').config();

const axios = require('axios').default;
var fs = require('fs');
const debug = require('debug')('cacheConfig');
debug.enabled = true

async function cacheConfig() {
  debug('Beginning Cache Config Procedure');

  var url = `${process.env.NODE_SERVER}/api/nodes/${process.env.NODE_IDENTIFIER}`;

  debug("Fetching config from: ")
  debug(`  ${url}`)

  var response = await axios.get(url);

  config = response.data;
  fs.writeFileSync('/mnt/ramdisk/config.json', JSON.stringify(config));
  debug('Completed Cache Config Procedure');
}

async function run() {
  await cacheConfig();
}

module.exports = {
  run
}
