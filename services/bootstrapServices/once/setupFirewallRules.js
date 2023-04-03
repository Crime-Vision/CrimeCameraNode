const debug = require('debug')('setupFirewallRules');

debug.enabled = true

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs')
const dedent = require('dedent-js');

var config = {}

async function run() {
  debug("Beginning setupFirewallRules procedures");

  debug("Reading config...");

  configString = fs.readFileSync('/mnt/ramdisk/config.json', 'utf8');

  config = JSON.parse(configString).config;

  debug('Loaded config. Setting up firewall rules...');

  var command = dedent`
    sudo sysctl net.ipv4.conf.eth0.forwarding=1;
    sudo sysctl net.ipv4.conf.eth1.forwarding=1;
    sudo sysctl net.ipv4.conf.wlan0.forwarding=1;
    sudo sysctl net.ipv4.conf.${process.env.ZEROTIER_INTERFACE_NAME}.forwarding=1;
  `

  config.cameras.forEach(camera => {
    command += "\n" + dedent`
      sudo iptables -t nat -A PREROUTING -p tcp -s 0/0 -d ${config.ip} --dport ${553 + parseInt(camera.cameraNumber)} -j DNAT --to ${camera.localIP}:554;
      sudo iptables -A FORWARD -p tcp -d ${config.ip} --dport  -j ACCEPT;
      sudo iptables -t nat -A PREROUTING -p tcp -s 0/0 -d ${config.ip} --dport ${80 + parseInt(camera.cameraNumber)} -j DNAT --to ${camera.localIP}:80;
      sudo iptables -A FORWARD -p tcp -d ${config.ip} --dport ${80 + parseInt(camera.cameraNumber)} -j ACCEPT;
    `
  });

  command += "\n" + dedent`
    sudo iptables -t nat -A POSTROUTING -j MASQUERADE;
  `

  debug(command)
  var {stdout, stderr} = await exec(command);

  debug(stdout);
  debug(stderr);
}

module.exports = {
  run
}
