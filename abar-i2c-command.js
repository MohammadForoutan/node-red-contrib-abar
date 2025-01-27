const SHT31 = require('i2c-bus');

module.exports = function (RED) {
  function ABAR_SHT31Node(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.status({});

    node.on('input', function (msg, send, done) {
      if (config.device) {
        this.device = parseInt(config.device ?? 0x44, 16);
      }

      if (config.i2c) {
        this.i2c = parseInt(config.i2c ?? 0);
      }

      node.status({ fill: 'yellow', shape: 'dot', text: 'querying...' });

      // Instantiate the SHT31 class with the saved configuration
      const sht31 = new SHT31(this.device ?? parseInt('0x44'), this.i2c ?? 0);

      // Read temperature and humidity
      sht31
        .readSensorData()
        .then(d => {
          const tempFa = Math.round(d.temperature * 1.8 + 32);
          const tempCe = Math.round(d.temperature);
          const humidity = Math.round(d.humidity);

          msg.payload = { tempFa, tempCe, humidity };

          node.status({ fill: 'green', shape: 'dot', text: 'Done' });
          setTimeout(() => {
            node.status({});
          }, 500);
          node.send(msg);
        })
        .catch(err => {
          node.status({
            fill: 'red',
            shape: 'dot',
            text: 'no sensor at ' + (!!config.device ? config.device : '0x44'),
          });
          done(err);
          node.error;
        });
    });
  }

  RED.nodes.registerType('abar-sht31', ABAR_SHT31Node);
};
