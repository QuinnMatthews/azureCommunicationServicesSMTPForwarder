require("dotenv").config();
const { SMTPServer } = require("smtp-server");
const { EmailClient } = require("@azure/communication-email");
const simpleParser = require('mailparser').simpleParser;

const hostname = '127.0.0.1';
const port = 2525;

const connectionString = process.env['COMMUNICATION_SERVICES_CONNECTION_STRING'];
const sender = process.env['SENDER_EMAIL_ADDRESS'];

const AzureEmailClient = new EmailClient(connectionString);

//Receive Email
const server = new SMTPServer({
    authOptional: true,
    async onData(stream, session, callback) {
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
                console.log("Sending email to: " + recipient.address)
                emailMessage.recipients.to.push({ email: recipient.address});
            });
            //Send email
            AzureEmailClient.send(emailMessage);
        })
        .catch(err => {})
        .finally(() => {
            callback();
        });
    }
  });

server.listen(port, hostname);


  /*
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
*/