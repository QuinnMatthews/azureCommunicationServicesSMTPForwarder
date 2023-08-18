require("dotenv").config();
const { SMTPServer } = require("smtp-server");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");
const simpleParser = require('mailparser').simpleParser;

//Variables
const authOptional = process.env['SMTP_AUTH_OPTIONAL'] ?? true;
const secure = process.env['SMTP_SECURE'] ?? false;
const allowInsecureAuth = process.env['SMTP_ALLOW_INSECURE_AUTH'] ?? false;
const hostname = process.env['SMTP_LISTEN_ADDRESS'] ?? '0.0.0.0';
const port = process.env['SMTP_PORT'] ?? 25;
const connectionString = process.env['COMMUNICATION_SERVICES_CONNECTION_STRING'] ?? null;
const endpoint = process.env['COMMUNICATION_SERVICES_ENDPOINT'] ?? null;
const sender = process.env['SENDER_EMAIL_ADDRESS'];

if (!sender) {
    console.error("Please set the SENDER_EMAIL_ADDRESS environment variable.");
    process.exit(1);
}

if (!connectionString && !endpoint) {
    console.error("Please set either the COMMUNICATION_SERVICES_CONNECTION_STRING or COMMUNICATION_SERVICES_ENDPOINT environment variable.");
    process.exit(1);
}

const azureEmailClient = (() => {
    if (connectionString) {
        return new EmailClient(connectionString);
    }

    return new EmailClient(endpoint, new DefaultAzureCredential());
})();

//Receive Email
const server = new SMTPServer({
    authOptional: authOptional,
    secure: secure,
    allowInsecureAuth: allowInsecureAuth,
    onAuth(auth, _, callback) {
        callback(null, { user: auth.username });
    },
    onData(stream, session, callback) {
        console.log("Received email from: " + session.envelope.mailFrom.address);

        //Parse email
        simpleParser(stream, {}).then(async parsed => {
            const emailMessage = {
                senderAddress: sender,
                content: {
                    subject: parsed.subject,
                    plainText: parsed.text,
                    html: typeof parsed.html == 'string' ? parsed.html : ''
                },
                recipients: {
                    to: parsed.to.value.map(recipient => ({
                        address: recipient.address,
                        displayName: recipient.name
                    }))
                }
            }

            // Send email
            const poller = await azureEmailClient.beginSend(emailMessage);
            const result = await poller.pollUntilDone();
            console.log("Finished sending email", result);
        })
        .catch(err => {
            console.log(err);
        })
        .finally(() => {
            callback();
        });
    }
});

server.listen(port, hostname);
console.log(`SMTP server listening on ${hostname}:${port}`);
