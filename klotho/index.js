const express = require('express');
const cors = require('cors');
const chickens = require('./chickens/chickens');
const auctions = require('./auctions/auctions');

const {router, app} = setupExpressApp();

/* @klotho::expose {
 * id = "chicken-auction-api"
 * target = "public"
 * description = "API for managing chickens at auction"
}
*/
app.listen(3000, () => { });

function setupExpressApp() {
  const app = express();
  const router = express.Router();
  router.use(cors());
  router.use(express.urlencoded({ extended: true }));
  router.use(express.json());
  return { router, app };
}

app.use(router);
app.use(chickens.router);
app.use(auctions.router);

exports.app = app;