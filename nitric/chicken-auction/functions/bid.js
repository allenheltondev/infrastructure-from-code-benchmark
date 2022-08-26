// import { collection, queue } from "@nitric/sdk";

// const bidQueue = queue('bids').for('receiving');
// const db = collection('chickens').for('reading', 'writing');

// const bids = await bidQueue.receive();
// await Promise.all(bids.map(async (bid) => {
//   try {
//     const details = bid.payload;
//     const auction = await db.doc(details.auctionId).get();
//     if(auction.status == 'in progress' && (details.bid > auction.currentBid?.price || !auction.currentBid ) && details.bid >= auction.startingPrice){
//       await db.doc(details.auctionId).set({
//         ...auction,
//         currentBid: {
//           price: details.bid,
//           userId: details.userId
//         }
//       });
//     }
//   } catch (err) {
//     console.error(err);
//   } finally {
//     bid.complete();
//   }
// }));