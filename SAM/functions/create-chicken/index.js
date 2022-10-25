const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { SNSClient, CreateTopicCommand } = require('@aws-sdk/client-sns');
const ULID = require('ulid');

const ddb = new DynamoDBClient();
const sns = new SNSClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const chickenId = ULID.ulid();
    const topicArn = await exports.createTopic(chickenId);

    await exports.saveChicken(chickenId, input, topicArn);

    return {
      statusCode: 201,
      body: JSON.stringify({ id: chickenId })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' })
    };
  }
};

exports.createTopic = async (chickenId) => {
  const command = new CreateTopicCommand({ Name: `chicken-${chickenId}` });
  const result = await sns.send(command);

  return result.TopicArn;
};

exports.saveChicken = async (chickenId, input, topicArn) => {
  const command = new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: chickenId,
      sk: 'chicken#',
      GSI1PK: 'chicken#',
      GSI1SK: input.breed.toLowerCase(),
      data: {
        breed: input.breed,
        sex: input.sex,
        color: input.color,
        ...input.hatchDate && { hatchDate: input.hatchDate }
      },
      topic: {
        arn: topicArn
      }
    })
  });

  await ddb.send(command);
};