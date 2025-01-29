module.exports = function (RED) {
  const i2c = require('i2c-bus');

  function I2CCommandNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.on('input', function (msg, send, done) {
      const i2cBusNumber = parseInt(config.i2cBus);
      const deviceAddress = parseInt(config.deviceAddress, 16);
      const command = msg.payload || config.command;
      const timeout = parseInt(config.timeout);
      const bufferSize = parseInt(config.bufferSize);

      if (!command) {
        node.error('No command provided', msg);
        return done();
      }

      try {
        const bus = i2c.openSync(i2cBusNumber);

        let buffer = Buffer.from([parseInt(command, 16)]);

        // Send the command
        bus.i2cWriteSync(deviceAddress, buffer.length, buffer);

        // Wait for response
        setTimeout(() => {
          let responseBuffer = Buffer.alloc(bufferSize);
          bus.i2cReadSync(deviceAddress, bufferSize, responseBuffer);

          msg.payload = responseBuffer.toJSON();
          send(msg);

          bus.closeSync();
          done();
        }, timeout);
      } catch (err) {
        node.error('I2C communication error: ' + err.message, msg);
        done(err);
      }
    });
  }

  RED.nodes.registerType('i2c-command', I2CCommandNode);
};
