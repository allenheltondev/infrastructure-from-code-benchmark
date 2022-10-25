const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require("@aws-sdk/util-dynamodb");
const { ulid, decodeTime } = require('ulid');
const ddb = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);

    const isValid = await exports.chickenIsValid(input.chickenId);
    if (isValid) {
      const id = await exports.saveAuction(input);
      return {
        statusCode: 201,
        body: JSON.stringify({ id })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'A chicken with the provided id is not valid.' })
    };
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' })
    };
  }
};

exports.chickenIsValid = async (chickenId) => {
  const response = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({ 
      pk: chickenId,
      sk: 'chicken#'
    })
  }));
  return response.Item !== undefined;
};

exports.saveAuction = async (input) => {
  const id = ulid();
  const command = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: id,
      sk: 'auction#',
      GSI1PK: 'auction#',
      GSI1SK: id,
      data: {
        status: input.status ?? 'pending',
        startingPrice: input.startingPrice,
        chickenId: input.chickenId,
        createdDate: new Date(decodeTime(id)).toISOString()
      }
    })
  });

  await ddb.send(command);

  return id;
}
