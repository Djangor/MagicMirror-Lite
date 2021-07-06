const config = require('./config/config');
const https = require('https');


module.exports.sendSlackNotification = function(text) {
    const data = JSON.stringify({text: text});
    const options = {
        hostname: 'https://hooks.slack.com',
        port: 443,
        path: config.slackLink,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    }

    const req = https.request(options, res => {
        console.log('slackMessage: ' + text + ' sent');

        res.on('data', d => {
            console.log('result' + d);
        })
    })

    req.on('error', error => {
        console.error(error)
    })

    req.write(data)
    req.end();
}
