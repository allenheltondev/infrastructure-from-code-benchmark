import { api, collection, topic, queue } from "@nitric/sdk";
import ULID from 'ulid';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { StatusCodes } from 'http-status-codes';
import auctionSchema from '../data-model/auction.json' assert { type: 'json' };

const ajv = new Ajv();
addFormats(ajv);

const db = collection('chickens').for('reading', 'writing');
const auctionApi = api('auctions');
const bidQueue = queue('bids').for('sending');

auctionApi.post('/', async (context) => {
  try {
    const input = context.req.json();
    const validate = ajv.compile(auctionSchema);
    const valid = validate(input);
    if (!valid) {
      context.res.status = StatusCodes.BAD_REQUEST;
      context.res.json({ message: validate.errors.map(e => e.message).join(', ') });
      return context;
    }

    try {
      await db.doc(input.chickenId).get();
    } catch (err) {
      context.res.status = StatusCodes.NOT_FOUND;
      context.res.json({ message: 'A chicken with the provided id does not exist in the system.' });
      return context;
    }

    const id = ULID.ulid();
    await db.doc(id).set({
      ...input,
      id,
      type: 'auction'
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

auctionApi.get('/:id', async (context) => {
  try {
    const { id } = context.req.params;

    const auction = await db.doc(id).get();
    delete auction.type;
    context.res.json(auction);
    context.res.status = StatusCodes.OK;

    return context;
  } catch (err) {
    context.res.status = StatusCodes.NOT_FOUND;
    context.res.json({ message: 'An auction with the provided id could not be found' });
    return context;
  }
});

auctionApi.post('/:id/statuses', async (context) => {
  try {
    const input = context.req.json();
    if (!input.status || !['pending', 'in progress', 'closed'].includes(input.status)) {
      context.res.status = StatusCodes.BAD_REQUEST;
      context.res.json({ message: 'A status of "pending", "in progress", or "closed" must be provided' });
      return context;
    }

    const { id } = context.req.params;

    let auction;
    try {
      auction = await db.doc(id).get();
    }
    catch (err) {
      context.res.status = StatusCodes.NOT_FOUND;
      context.res.json({ message: 'An auction with the provided id could not be found' });
      return context;
    }

    if (auction.status != input.status) {
      await db.doc(id).set({
        ...auction,
        status: input.status
      });

      if (input.status == 'in progress') {
        const chicken = await db.doc(auction.chickenId).get();
        const alertSubscribers = topic(chicken.subscriptionId).for('publishing');
        await alertSubscribers.publish({
          payload: {
            auctionId: auction.id,
            event: 'Auction started'
          }
        });
      }
    }

    context.res.status = StatusCodes.NO_CONTENT;
    return context;
  } catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});

auctionApi.post('/:id/bids', async (context) => {
  try {
    const { id } = context.req.params;
    const userId = context.req.headers.userid;

    const input = context.req.json();
    if (isNaN(input.bid)) {
      context.res.status = StatusCodes.BAD_REQUEST;
      context.res.json({ message: 'An invalid bid was supplied. The bid must be a number' });
      return context;
    }

    if (!userId) {
      context.res.status = StatusCodes.BAD_REQUEST;
      context.res.json({ message: 'You must provide a "userId" header when adding a bid' });
      return context;
    }

    let auction;
    try {
      auction = await db.doc(id).get();
    }
    catch (err) {
      context.res.status = StatusCodes.NOT_FOUND;
      context.res.json({ message: 'An auction with the provided id could not be found' });
      return context;
    }

    if (!auction.status == 'in progress') {
      context.res.status = StatusCodes.CONFLICT;
      context.res.json({ message: 'The auction is not currently in progress and is not accepting bids' });
      return context;
    }


    await bidQueue.send([{
      payload: {
        auctionId: id,
        bid: input.bid,
        userId: userId
      }
    }]);

    context.res.status = StatusCodes.ACCEPTED;
    return context;
  } catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});

auctionApi.get('/:id/bids', async (context) => {
  try {
    const bids = queue('bids').for('receiving');
    const item = await bids.receive(1);
    context.res.status = StatusCodes.OK;
    context.res.json(item[0].payload);
    return context;
  }
  catch (err) {
    console.error(err);
    context.res.status = StatusCodes.INTERNAL_SERVER_ERROR;
    context.res.json({ message: err.message });
    return context;
  }
});