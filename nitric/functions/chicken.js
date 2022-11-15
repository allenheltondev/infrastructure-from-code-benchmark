import { api, collection, topic } from "@nitric/sdk";
import ULID from 'ulid';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { StatusCodes } from 'http-status-codes';
import chickenSchema from '../data-model/chicken.json' assert { type: 'json' };

const ajv = new Ajv();
addFormats(ajv);

const chickenDb = collection('chickens').for('reading', 'writing');
const chickenApi = api('chickens');

chickenApi.post('/', async (context) => {
  try {
    const data = context.req.json();
    const validate = ajv.compile(chickenSchema);
    const valid = validate(data);
    if (!valid) {
      context.res.status = StatusCodes.BAD_REQUEST;
      context.res.json({ message: validate.errors.map(e => e.message).join(', ') });
      return context;
    }

    const id = ULID.ulid();
    const chickenTopic = topic(`chicken-${id}`).for('publishing');
    await chickenDb.doc(id).set({
      ...data,
      id,
      type: 'chicken',
      subscriptionId: chickenTopic.name
    });

    const response = { id };
    context.res.status = StatusCodes.CREATED;
    context.res.json(response);


    return context;
  } catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});

chickenApi.get('/', async (context) => {
  try {
    const query = chickenDb.query().where('type', '==', 'chicken');
    const chickens = [];
    const results = await query.fetch();
    for (const record of results.documents) {
      const chicken = record.content;
      delete chicken.type;
      delete chicken.subscriptionId;
      chickens.push(chicken);
    }

    context.res.status = StatusCodes.OK;
    context.res.json({ items: chickens });
    return context;
  } catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});

chickenApi.get('/:id', async (context) => {
  try {
    const { id } = context.req.params;

    const chicken = await chickenDb.doc(id).get();
    delete chicken.type;
    context.res.json(chicken);
    context.res.status = StatusCodes.OK;

    return context;
  } catch (err) {
    context.res.status = StatusCodes.NOT_FOUND;
    context.res.json({ message: 'A chicken with the provided id could not be found' });
    return context;
  }
});

chickenApi.post('/:id/alerts', async (context) => {
  try {
    const { id } = context.req.params;

    let chicken;
    try {
      chicken = await chickenDb.doc(id).get();
    } catch (err) {
      context.res.status = StatusCodes.NOT_FOUND;
      context.res.json({ message: 'A chicken with the provided id could not be found' });
      return context;
    }

    topic(chicken.subscriptionId).subscribe(async (ctx) => {
      // send an email to the subscriber
      console.log(ctx.req.json());
    });

    context.res.status = StatusCodes.NO_CONTENT;
    return context;
  } catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});