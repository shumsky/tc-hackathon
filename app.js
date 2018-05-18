const AMQP = require('amqplib');
const request = require('request');

AMQP.connect('amqp://localhost')
    .then(conn => {
        return conn.createChannel();
    }).then(async ch => {
        await ch.assertExchange('insta-photos', 'fanout', {durable: true});
        await ch.assertQueue('insta-photos:q', {durable: true});
        await ch.bindQueue('insta-photos:q', 'insta-photos');
        ch.consume('insta-photos:q', async msg => {
            try {
                const payload = JSON.parse(msg.content.toString());
                await processMessage(payload);
            } catch (e) {
                console.log('Failed to process message: ' + e);
            } finally {
                ch.ack(msg);
            }
        });
    });

async function processMessage(payload) {
    const photos = await Promise.all(payload.photoLinks.map(downloadImage));
    const s3Links = await Promise.all(photos.map(saveToS3));
    publish({
        userId: payload.userId,
        s3Links
    });
}

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        request(url, (err, res) => {
            if (err) {
                return reject(new Error(err));
            }
            if (res.statusCode !== 200) {
                return reject(new Error('Invalid status code: ' + res.statusCode));
            }
            resolve(Buffer.from(res.body, 'utf8'));
        });
    });
}

async function saveToS3(name, imageData) {
    console.log('Saving: ' + imageData.toString());
    return 's3Name';
}

function publish(payload) {
    console.log('publish: ' + JSON.stringify(payload));
}