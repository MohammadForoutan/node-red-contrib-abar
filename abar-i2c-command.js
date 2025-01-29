module.exports = function(RED) {
    const i2c = require('i2c-bus');

    function extractJson(responseString) {

        console.log({ first: responseString })
        // Remove null characters and extra whitespace
        responseString = responseString.replace(/\0/g, "").trim();

        // Try to find the first valid JSON object
        let start = responseString.indexOf("{");
        let end = responseString.lastIndexOf("}");
        
        console.log({ second: responseString })
        if (start !== -1 && end !== -1 && end > start) {
            let jsonString = responseString.substring(start, end + 1);
            try {
                return JSON.parse(jsonString);
            } catch (e) {
                return { raw: responseString, error: "Partial or malformed JSON" };
            }
        }

        return { raw: responseString, error: "No valid JSON found" };
    }

    function I2CCommandNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg, send, done) {
            const i2cBusNumber = parseInt(config.i2cBus);
            const deviceAddress = parseInt(config.deviceAddress, 16);
            let command = config.command;
            const timeout = parseInt(config.timeout);
            const bufferSize = parseInt(config.bufferSize);

            if (!command || typeof command !== "string") {
                msg.payload = { error: "Invalid command. Expected a string." };
                send(msg);
                return done();
            }

            try {
                const bus = i2c.openSync(i2cBusNumber);
                let buffer = Buffer.from(command, "utf-8");

                // Send the command
                bus.i2cWriteSync(deviceAddress, buffer.length, buffer);

                // Wait for response
                setTimeout(() => {
                    let responseBuffer = Buffer.alloc(bufferSize);
                    bus.i2cReadSync(deviceAddress, bufferSize, responseBuffer);

                    // Convert buffer to string and extract JSON
                    let responseString = responseBuffer.toString("utf-8").trim();
                    const extracted = extractJson(responseString);
                    console.log({responseBuffer, responseString, buffer, extracted })
                    msg.payload = extracted;

                    send(msg);
                    bus.closeSync();
                    done();
                }, timeout);
            } catch (err) {
                msg.payload = { error: "I2C communication failed", details: err.message };
                send(msg);
                done();
            }
        });
    }

    RED.nodes.registerType("i2c-command", I2CCommandNode);
};

