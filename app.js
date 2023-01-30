require("dotenv").config();
const { SMTPServer } = require("smtp-server");
const { EmailClient } = require("@azure/communication-email");
const simpleParser = require('mailparser').simpleParser;

//Variables
const authOptional = process.env['SMTP_AUTH_OPTIONAL'] ?? true;
const secure = process.env['SMTP_SECURE'] ?? false;
const allowInsecureAuth = process.env['SMTP_ALLOW_INSECURE_AUTH'] ?? false;
const hostname = process.env['SMTP_LISTEN_ADDRESS'] ?? '127.0.0.1';
const port = process.env['SMTP_PORT'] ?? 25;
const connectionString = process.env['COMMUNICATION_SERVICES_CONNECTION_STRING'];
const sender = process.env['SENDER_EMAIL_ADDRESS'];

const AzureEmailClient = new EmailClient(connectionString);

//Receive Email
const server = new SMTPServer({
    authOptional: authOptional,
    secure: secure,
    allowInsecureAuth: allowInsecureAuth,
    onData(stream, session, callback) {
        console.log("Received email from: " + session.envelope.mailFrom.address);

        //Parse email
        simpleParser(stream, {})
        .then(parsed => {
            const emailMessage = {
                sender: sender,
                content: {
                    subject: parsed.subject,
                    plainText: parsed.text
                },
                recipients: {
                    to: [],
                }
            }
            //Add recipients to emailMessage
            parsed.to.value.forEach(recipient => {
                emailMessage.recipients.to.push({ email: recipient.address});
            });
            //Send email
            AzureEmailClient.send(emailMessage);
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