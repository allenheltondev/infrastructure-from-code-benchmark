const events = require('events');

/*
 * @klotho::pubsub {
 * id = "default-emitter"
 * }
*/
const emitter = new events.EventEmitter();
exports.emitter = emitter;

require('../chickens/chickens');
require('../auctions/auctions');