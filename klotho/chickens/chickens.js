/**
 * @klotho::execution_unit {
 *   id = "chickens"
 * }
 */

const router = require('express').Router();
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const chickenSchema = require('./chicken-schema.json');
const ULID = require('ulid');
const { emitter } = require('../events/emitter');

const ajv = new Ajv();
addFormats(ajv);

/* @klotho::persist {
 * id = "chickens"
 * }
 */
const chickens = new Map();

async function addChicken(request, response) {
  try {
    const id = ULID.ulid();
    const validate = ajv.compile(chickenSchema);
    const valid = validate(request.body);
    if (!valid) {
      response.status(500).send({ message: validate.errors.map(e => e.message).join(', ') });
      return;
    }

    await chickens.set(id, request.body);
    response.status(201).send({ id });
  }
  catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function getChicken(request, response) {
  try {
    const chicken = chickens.get(request.params.chickenId);
    if (!chicken) {
      response.status(404).send({ message: 'Chicken not found' });
      return;
    }

    chicken.id = request.params.chickenId;

    response.status(200).send(chicken);

  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function getAllChickens(request, response) {
  try {
    const allChickens = Object.fromEntries(await chickens.entries());

    const chickenList = [];
    for (const [id, details] of Object.entries(allChickens)) {
      chickenList.push({
        id: id,
        breed: details.breed,
        sex: details.sex
      })
    }

    response.status(200).send({ items: chickenList });
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function subscribeForAlerts(request, response) {
  try {
    if (!request.body.email) {
      response.status(400).send({ message: 'A valid email address is required to subscribe for alerts' });
      return;
    }

    const chickenId = request.params.chickenId;
    let subscriptions = chickens.get(`${chickenId}#subscriptions`);
    if (!subscriptions) {
      subscriptions = [];
    }

    subscriptions.push(request.body.email);
    chickens.set(`${chickenId}#subscriptions`, subscriptions);
    response.status(204).send();
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }  
}

emitter.on('auction-in-progress', async (chickenId) => {
  try{
    const subscriptions = chickens.get(`${chickenId}#subscriptions`);
    if(subscriptions){
      for (const subscription of subscriptions) {
        console.log(`Sending notification to ${subscription}`); 
      }
    }
  }catch(err){
    console.error(err);
  }
});

router.post('/chickens', addChicken);
router.get('/chickens/:chickenId', getChicken);
router.get('/chickens', getAllChickens);
router.post('/chickens/:chickenId/alerts', subscribeForAlerts); 

exports.router = router;