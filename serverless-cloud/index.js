import { api } from "@serverless/cloud";
import { Chicken } from './chickens/chicken';
import { Auction } from './auctions/auction';

api.get("/chickens", async (req, res) => {
  try {
    const chickens = await Chicken.loadAll();
    res.status(200).send(chickens);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong.' });
  }
});

api.get('/chickens/:chickenId', async (req, res) => {
  try {
    const chicken = await Chicken.load(req.params.chickenId);
    res.status(200).send(chicken);
  } catch (err) {
    switch (err.cause) {
      case 404:
        res.status(err.cause).send({ message: err.message });
        return;
      default:
        console.error(err);
        res.status(500).send({ message: 'Something went wrong.' });
        return;
    }
  }
});

api.post('/chickens', async (req, res) => {
  try {
    const validationErrors = Chicken.validate(req.body);
    if (validationErrors) {
      res.status(400).send({ message: validationErrors });
    }

    const id = await Chicken.save(req.body);
    res.status(201).send({ id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong.' });
  }
});

api.post('/chickens/:chickenId/alerts', async (req, res) => {
  try {
    await Chicken.subscribe(req.params.chickenId, req.body.email);
    res.status(204).send();
  } catch (err) {
    switch (err.cause) {
      case 404:
        res.status(err.cause).send({ message: err.message });
        return;
      default:
        console.error(err);
        res.status(500).send({ message: 'Something went wrong.' });
        return;
    }
  }
});

api.get('/auctions', async (req, res) => {
  try {
    const auctions = await Auction.loadAll();
    res.status(200).send(auctions);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong.' });
  }

});

api.get('/auctions/:auctionId', async (req, res) => {
  try {
    const auction = await Auction.load(req.params.auctionId);
    res.status(200).send(auction);
  } catch (err) {
    switch (err.cause) {
      case 404:
        res.status(err.cause).send({ message: err.message });
        return;
      default:
        console.error(err);
        res.status(500).send({ message: 'Something went wrong.' });
        return;
    }
  }
});

api.post('/auctions', async (req, res) => {
  try {
    const validationErrors = Auction.validate(req.body);
    if (validationErrors) {
      res.status(400).send({ message: validationErrors });
      return;
    }

    const id = await Auction.save(req.body);
    res.status(201).send({ id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong.' });
  }
});

api.post('/auctions/:auctionId/bids', async (req, res) => {
  try {
    await Auction.addBid(req.params.auctionId, req.headers.userId, req.body.bid);
    res.status(204).send();
  } catch (err) {
    switch (err.cause) {
      case 400:
      case 404:
      case 409:
        res.status(err.cause).send({ message: err.message });
        return;
      default:
        console.error(err);
        res.status(500).send({ message: 'Something went wrong.' });
        return;
    }
  }
});

api.post('/auctions/:auctionId/statuses', async (req, res) => {
  try {
    await Auction.updateStatus(req.params.auctionId, req.body.status);
    res.status(204).send();
  } catch (err) {
    switch (err.cause) {
      case 400:
      case 404:
      case 409:
        res.status(err.cause).send({ message: err.message });
        return;
      default:
        console.error(err);
        res.status(500).send({ message: 'Something went wrong.' });
        return;
    }
  }
});