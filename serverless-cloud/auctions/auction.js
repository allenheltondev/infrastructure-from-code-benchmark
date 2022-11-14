import { data } from '@serverless/cloud';
import Ajv  from 'ajv';
import addFormats from 'ajv-formats';
import auctionSchema from './auction-schema.json';
import ULID  from 'ulid';

const ajv = new Ajv();
addFormats(ajv);

const errors = {
  NotFound: 'Auction not found',
  InvalidAuctionStatus: 'The auction is not in a valid status for the operation requested',
  InvalidStatus: 'The provided status is not supported. Accepted statuses are "in progress" and "closed".',
  InvalidBid: 'The provided bid is invalid'
};

const validate = (input) => {
  const validate = ajv.compile(auctionSchema);
  const valid = validate(input);
  if (!valid) {
    return validate.errors.map(e => e.message).join(', ');
  }
};

const save = async (input) => {
  const id = ULID.ulid();
  input.id = id;
  await data.set(`auction:${id}`, input, {
    label1: 'auctions'
  });

  return id;
};

const addBid = async (auctionId, userId, bid) => {
  const auction = await data.get(`auction:${auctionId}`);
  if (!auction) {
    throw new Error(errors.NotFound, { cause: 404 });
  }

  if (auction.status != 'in progress') {
    throw new Error(errors.InvalidAuctionStatus, { cause: 409 });
  }

  if ((!auction.currentBid && bid < auction.startingPrice) || (auction.currentBid && bid <= auction.currentBid.price)) {
    throw new Error(errors.InvalidBid, { cause: 400 });
  }

  auction.currentBid = {
    userId,
    price: bid
  };

  await data.set(`auction:${auctionId}`, auction);
};

const updateStatus = async (auctionId, status) => {
  const auction = await data.get(`auction:${auctionId}`);
  if (!auction) {
    throw new Error(errors.NotFound, { cause: 404 });
  }

  if (!status || !['pending', 'in progress', 'closed'].includes(status)) {
    throw new Error(errors.InvalidStatus, { cause: 400 });
  }

  if (status == auction.status) {
    return;
  }

  if (['in progress', 'pending'].includes(status) && auction.status == 'closed') {
    throw new Error(errors.InvalidAuctionStatus, { cause: 409 });
  }

  auction.status = status;
  await data.set(`auction:${auctionId}`, auction);  
};

const load = async (auctionId) => {
  const detail = await data.get(`auction:${auctionId}`);
  if (!detail) {
    throw new Error(errors.NotFound, { cause: 404 });
  }

  return detail;
};

const loadAll = async () => {
  const auctions = await data.getByLabel('label1', 'auctions');
  return { items: auctions?.items?.map(a => a.value) || [] };
};

export const Auction = {
  validate,
  save,
  addBid,
  load,
  loadAll,
  updateStatus
};