const AMQP = require('amqplib');
const AWS = require('aws-sdk');

AWS.config.update({region: 'us-west-2'});
const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

let amqpConnection;

const categories = {
  bedroomOrApartment: ['Bed', 'Furniture', 'Bedroom', 'Indoors', 'Room'],
  poolAndSpa: ['Pool', 'Water', 'Hotel', 'Resort', 'Swimming Pool'],
  outdoors: ['Beach', 'Coast', 'Ocean', 'Sea', 'Water', 'Outdoors'],
  foodAndDrink: ['Dinner', 'Food', 'Meal', 'Supper', 'Glass', 'Cutlery']
}

AMQP.connect('amqp://localhost').then(async conn => {
  amqpConnection = conn;
  const ch = await conn.createChannel();
  await ch.assertExchange('s3-photos', 'fanout', {durable: true});
  await ch.assertQueue('s3-photos:q', {durable: true});
  await ch.bindQueue('s3-photos:q', 's3-photos');
  ch.consume('s3-photos:q', async msg => {
    try {
        console.log('Received: ' + msg.content.toString());
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
    const categorizedPhotos = {};
    Object.keys(categories).forEach((categoryName) => categorizedPhotos[categoryName] = []);
    
    for (let photoKey of payload.s3Keys) {
      const photoLabels = await getLabels(photoKey);
      const photoCategoryName = categorize(photoLabels);
      categorizedPhotos[photoCategoryName].push(`https://tc-hackathon.s3-us-west-2.amazonaws.com/${photoKey}`);
      console.log('Categorized image: ' + photoKey);
    }
    await publish({
      userId: payload.userId,
      photos: categorizedPhotos
    });
}

async function getLabels(s3Key) {
  return new Promise((resolve, reject) => {
    const params = {
      Image: {
          S3Object: {
              Bucket: 'tc-hackathon',
              Name: s3Key
          }
      },
      MaxLabels: 20,
      MinConfidence: 70
    };

    rekognition.detectLabels(params, (err, res) => {
        if (err) return reject(err);
        resolve(res.Labels.map(label => label.Name));
    });      
  }).catch(() => null);
}

function categorize(photoLabels) {
  let selectedCategory;
  let selectedCategoryMatches = 0;

  for (let categoryName of Object.keys(categories)) {
    const categoryLabels = categories[categoryName];
    let matches = 0;
    photoLabels.forEach(label => {
      if (categoryLabels.includes(label)) {
        matches++;
      }
    });
    if (matches > selectedCategoryMatches) {
      selectedCategoryMatches = matches;
      selectedCategory = categoryName;
    }
  }
  return selectedCategory;
}

async function publish(payload) {
  const ch = await amqpConnection.createChannel();
  await ch.assertExchange('labeled-photos', 'fanout', {durable: true});
  await ch.publish('labeled-photos', '', Buffer.from(JSON.stringify(payload), 'utf8'));
  console.log('Published: ' + JSON.stringify(payload));
}
