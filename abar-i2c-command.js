const bus = require('i2c-bus');
const TIMEOUT = 5000; // Timeout in milliseconds for reading JSON response

async function requestJson(device_address, buffer_size) {
  await sendCommand('REQUEST_JSON');
  await setTimeout(1000); // Small delay to allow for response

  let jsonResponse = '';
  const startTime = Date.now();

  while (true) {
    const responseBuffer = Buffer.alloc(buffer_size); // Adjust size as needed
    const bytesRead = bus.i2cReadSync(
      device_address,
      responseBuffer.length,
      responseBuffer
    );
    jsonResponse += responseBuffer.toString('utf-8', 0, bytesRead);

    // Check if we have a complete JSON response
    if (
      jsonResponse.includes('{') &&
      jsonResponse.includes('}') &&
      jsonResponse
    ) {
      break;
    }

    // Check for timeout
    if (Date.now() - startTime > TIMEOUT) {
      console.log('Timeout while waiting for JSON response.');
      return null;
    }
  }

  try {
    jsonResponse = jsonResponse.split('}')[0] + '}';
    const data = JSON.parse(jsonResponse);
    console.log(`Received JSON:`, data);
    node.status({ fill: 'green', shape: 'dot', text: 'Done' });
    setTimeout(() => {
      node.status({});
    }, 500);
  } catch (error) {
    console.log({ jsonResponse });

    console.error('Failed to decode JSON response:', error);
    node.status({
      fill: 'red',
      shape: 'dot',
      text: error + '  , in json parsing',
    });
  }
}

async function sendCommand(command, device_address, buffer_size, node) {
  const commandBuffer = Buffer.from(command, 'utf-8');
  bus.i2cWriteSync(DEVICE_ADDR, commandBuffer.length, commandBuffer);
  requestJson(device_address, buffer_size);
  console.log(`Sent command: ${command}`);
}

module.exports = async function (RED) {
  function ABAR_I2C_COMMAND(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.status({});

    node.on('input', async function (msg, send, done) {
      if (config.device) {
        this.device = parseInt(config.device ?? 0x44, 16);
      }

      if (config.i2c) {
        this.i2c = parseInt(config.i2c ?? 0);
      }

      node.status({ fill: 'yellow', shape: 'dot', text: 'querying...' });

      try {
        await sendCommand(
          config.command,
          config.device,
          config.buffer_size,
          node
        );
      } catch (error) {
        done(err);
        node.error;
      }
    });
  }

  RED.nodes.registerType('abar-i2c-command', ABAR_I2C_COMMAND);
};
