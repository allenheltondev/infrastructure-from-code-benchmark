const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require("@aws-sdk/util-dynamodb");
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const auctionId = event.pathParameters.auctionId;

    await exports.updateStatus(auctionId, input.status);
    return {
      statusCode: 204
    };
  } catch (err) {
    console.error(err);
    if (err.code == 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'The auction with the provided id either does not exist or is not in a valid status to update' })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' })
    };
  }
};

exports.updateStatus = async (auctionId, status) => {
  let params = {
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: auctionId,
      sk: 'auction#'
    }),
    UpdateExpression: 'SET #data.#status = :status',
    ConditionExpression: 'attribute_exists(#pk)',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#data': 'data',
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status
    }
  }

  if (status == 'in progress') {
    params.ConditionExpression = `${params.ConditionExpression} and NOT #data.#status = :closed`;
    params.ExpressionAttributeValues[':closed'] = 'closed';
    params.ExpressionAttributeValues = marshall(params.ExpressionAttributeValues);
  }

  await ddb.send(new UpdateItemCommand(params));
};