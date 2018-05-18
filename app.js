const AMQP = require('amqplib');
const AWS = require('aws-sdk');
const request = require('request');
const mime = require('mime-types')
const uuid = require('uuid/v1');

AWS.config.update({region:'us-west-2'});
const s3 = new AWS.S3();

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
                console.error(e, 'Failed to process message');
            } finally {
                ch.ack(msg);
            }
        });
    });

async function processMessage(payload) {
    const s3Keys = await Promise.all(payload.photoLinks.map(downloadToS3));
    publish({
        userId: payload.userId,
        s3Keys
    });
}

async function downloadToS3(url) {
    const [data, type] = await new Promise((resolve, reject) => {
        request({url, encoding: null}, (err, res) => {
            if (err) {
                return reject(new Error(err));
            }
            if (res.statusCode !== 200) {
                return reject(new Error('Invalid status code: ' + res.statusCode));
            }
            resolve([res.body, res.headers['content-type']]);
        });
    });
    
    const name = uuid() + '.' + mime.extension(type);
    await saveToS3(name, data, type);
    
    return name;
}

async function saveToS3(name, data, type) {
    const params = {
        Body: data,
        Bucket: 'tc-hackathon',
        Key: name,
        ACL: 'public-read',
        ContentType: type
    };
    return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

function publish(payload) {
    console.log('publish: ' + JSON.stringify(payload));
}