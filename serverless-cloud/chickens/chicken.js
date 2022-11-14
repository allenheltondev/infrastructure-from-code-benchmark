import { data } from '@serverless/cloud';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import chickenSchema from './chicken-schema.json';
import ULID from 'ulid';

const errors = {
  NotFound: 'Chicken not found'
};

const ajv = new Ajv();
addFormats(ajv);

const validate = (input) => {
  const validate = ajv.compile(chickenSchema);
  const valid = validate(input);
  if (!valid) {
    return validate.errors.map(e => e.message).join(', ');
  }
};

const save = async (input) => {
  const id = ULID.ulid();
  input.id = id;
  await data.set(`${id}:detail`, input, {
    label1: 'chickens'
  });

  return id;
};

const subscribe = async (chickenId, email) => {
  const chickenData = await data.get(`${chickenId}:*`);
  if (!chickenData.items) {
    throw new Error(errors.NotFound, { cause: 404 });
  }

  let subscriptions = chickenData.items.find(item => item.key == `${chickenId}:subscriptions`);
  if (!subscriptions || !subscriptions.value) {
    subscriptions = [] ;
  } else {
    subscriptions = subscriptions.value;
  }

  if (!subscriptions.includes(email)) {
    subscriptions.push(email);
  }

  await data.set(`${chickenId}:subscriptions`, subscriptions);
};

const notify = async (chickenId) => {
  const subscriptions = await data.get(`${chickenId}:subscriptions`);
  if (subscriptions?.length) {
    for (const subscriber of subscriptions) {
      // Send email to subscriber in real implementation
      console.log(`Sending email to ${subscriber} to notify them an auction has begin for chicken ${chickenId}`);
    }
  }
};

const load = async (chickenId) => {
  const detail = await data.get(`${chickenId}:detail`);
  if (!detail) {
    throw new Error(errors.NotFound, { cause: 404 });
  }

  return detail;
};

const loadAll = async () => {
  const chickens = await data.getByLabel('label1', 'chickens');
  return { items: chickens?.items?.map(c => c.value) ?? []};
};

data.on('updated:auction:*', async (event) => {
  if (event.item.status == 'in progress' && event.previous.status != 'in progress') {
    notify(event.item.chickenId);
  }
});

export const Chicken = {
  validate,
  save,
  subscribe,
  load,
  loadAll,
  errors
};