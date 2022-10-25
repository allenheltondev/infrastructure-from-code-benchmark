const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require("@aws-sdk/util-dynamodb");
const ddb = new DynamoDBClient();

exports.handler = async (event, context, callback) => {
  try {
    for (const record of event.Records) {
      const details = JSON.parse(record.body);
      await exports.addBidToAuction(details.auctionId, details.bid, details.userId);
    }
  } catch (err) {
    console.error(err);
    callback(Error(err))
  }
};

exports.addBidToAuction = async (auctionId, bid, userId) => {
  const currentBid = {
    price: Number(bid),
    userId
  };

  const command = new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: auctionId,
      sk: 'auction#'
    }),
    UpdateExpression: 'SET #currentBid = :currentBid',
    ConditionExpression: 'attribute_exists(#pk) and #data.#status = :inprogress and ((attribute_not_exists(#currentBid) and :bid > #startingPrice) or (attribute_exists(#currentBid) and :bid > #currentBid.#price))',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#currentBid': 'currentBid',
      '#startingPrice': 'startingPrice',
      '#price': 'price',
      '#data': 'data',
      '#status': 'status'
    },
    ExpressionAttributeValues: marshall({
      ':currentBid': currentBid,
      ':bid': bid,
      ':inprogress': 'in progress'
    })
  });

  try {
    await ddb.send(command);
  } catch (err) {
    console.log(err);
  }
};