/**
 * @klotho::execution_unit {
 *   id = "auctions"
 * }
 */

const router = require('express').Router();
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const auctionSchema = require('./auction-schema.json');
const ULID = require('ulid');
const { emitter } = require('../events/emitter');

const ajv = new Ajv();
addFormats(ajv);

/* @klotho::persist {
 * id = "auctions"
 * }
 */
const auctions = new Map();

async function addAuction(request, response) {
  try {
    const id = ULID.ulid();
    const validate = ajv.compile(auctionSchema);
    const valid = validate(request.body);
    if (!valid) {
      response.status(500).send({ message: validate.errors.map(e => e.message).join(', ') });
      return;
    }

    await auctions.set(id, request.body);
    response.status(201).send({ id });
  }
  catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function getAuction(request, response) {
  try {
    const auction = auctions.get(request.params.auctionId);
    if (!auction) {
      response.status(404).send({ message: 'Auction not found' });
      return;
    }

    auction.id = request.params.auctionId;

    response.status(200).send(auction);

  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function getAllAuctions(request, response) {
  try {
    const allAuctions = Object.fromEntries(await auctions.entries());

    const auctionList = [];
    for (const [id, details] of Object.entries(allAuctions)) {
      auctionList.push({
        id: id,
        ...details
      })
    }

    response.status(200).send({ items: auctionList });
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function updateAuctionStatus(request, response) {
  try {
    const auction = await auctions.get(request.params.auctionId);
    if (!auction) {
      response.status(404).send({ message: 'Auction not found' });
      return;
    }

    const status = request.body.status;
    if (!status || !['pending', 'in progress', 'closed'].includes(status)) {
      response.status(400).send({ message: 'Invalid status' });
      return;
    }

    if (status == auction.status) {
      response.status(204).send();
      return;
    }

    if (['in progress', 'pending'].includes(status) && auction.status == 'closed') {
      response.status(400).send({ message: 'Auction is closed' });
      return;
    }

    auction.status = status;
    await auctions.set(auction.id, auction);
    if (status == 'in progress') {
      emitter.emit('auction-in-progress', auction.chickenId);
    }

    response.status(204).send();
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

async function addBid(request, response) {
  try {
    const auction = await auctions.get(request.params.auctionId);
    if (!auction) {
      response.status(404).send({ message: 'Auction not found' });
      return;
    }

    if (!auction.status == 'in progress') {
      response.status(400).send({ message: 'Auction is not in progress' });
      return;
    }

    const bid = Number(request.body.bid);
    if (isNaN(bid) || (auction.currentBid && auction.currentBid.price >= bid) || (!auction.currentBid && bid < auction.startingPrice)) {
      response.status(400).send({ message: 'Bid is not higher than current or starting price' });
      return;
    }

    auction.currentBid = {
      price: bid,
      userId: request.get('userId')
    }

    console.log(auction);

    await auctions.set(auction.id, auction);

    response.status(204).send();
  } catch (err) {
    console.error(err);
    response.status(500).send({ message: 'Something went wrong' });
  }
}

router.post('/auctions', addAuction);
router.get('/auctions/:auctionId', getAuction);
router.get('/auctions', getAllAuctions);
router.post('/auctions/:auctionId/statuses', updateAuctionStatus);
router.post('/auctions/:auctionId/bids', addBid); 

exports.router = router;