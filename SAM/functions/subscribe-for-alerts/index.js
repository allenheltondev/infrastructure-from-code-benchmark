const { SNSClient, SubscribeCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient();
const sns = new SNSClient();

exports.handler = async (event) => {
  try {
    const input = JSON.parse(event.body);
    const chickenId = event.pathParameters.chickenId;
    const topicArn = await exports.getTopicForChickenId(chickenId);
    if (!topicArn) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'A chicken with the provided id could not be found' });
      }
    }

    await exports.subscribeTopic(topic, input.email);
    return {
      statusCode: 204
    };
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' })
    };
  }
};

exports.getTopicForChickenId = async (chickenId) => {
  const command = new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: chickenId,
      sk: 'chicken#'
    })
  })
    ;
  const result = await ddb.send(command);
  if (result?.Item) {
    const chicken = unmarshall(result.Item);
    return chicken.topic.arn;
  }
};

exports.subscribeTopic = async (topic, email) => {
  const command = new SubscribeCommand({
    TopicArn: topic,
    Protocol: 'email',
    Endpoint: email
  });

  await sns.send(command);
};