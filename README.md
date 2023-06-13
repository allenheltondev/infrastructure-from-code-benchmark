# Infrastructure From Code Benchmark

This solution is intended to show how three different infrastructure from code frameworks work. The three frameworks being tested are:

* [Serverless Cloud](https://www.serverless.com/cloud)
* [Klotho](https://klo.dev/)
* [Nitric](https://nitric.io/)

## The Experiment

In this repository you will find the same API built four times. Once in each of the three IfC frameworks and once built with SAM as a control. The API being built over and over manage chicken auctions. It allows users to add chickens and auctions, and place bids on live auctions.

*You can view the full details [on my blog!](https://www.readysetcloud.io/blog/allen.helton/infrastructure-from-code-benchmark/)*

Available endpoints:

* `POST /chickens` - *Add a new chicken to the system*
* `GET /chickens` - *Get all chickens*
* `GET /chickens/:id` - *Get details on a specific chicken*
* `POST /chickens/:id/alerts` - *Register for alerts when a specific chicken goes up for auction*
* `POST /auctions` - *Add a new auction to the system*
* `GET /auctions` - *Get all auctions*
* `GET /auction/:id` - *Get details on a specific auction*
* `POST /auctions/:id/statuses` - *Update the status of a specific auction*
* `POST /auctions/:id/bids` - *Place a bid on a chicken in a live auction*

To view the API documentation, [click here](https://itchy-swan-43.redoc.ly/).

## Model Architecture

The version of this API in the [SAM directory](/SAM) is the control. This is how I would traditionally build this API. The architecture is outlined below.

![Architecture diagram for control experiment](/documentation//architecture_diagram.png)

A FIFO queue is used to guarantee bid order when people place bids on a chicken. The rest of the architecture is a basic API Gateway to Lambda function or direct connection to DynamoDB. 

When an auction is started, any users who subscribed for alerts on a specific chicken will be emailed via SNS.

This is how I would design an API with these basic requirements. But the test is to see how these infrastructure from code frameworks would do it given the code.

## Deployment

If you'd like to deploy these into your accounts and try it yourself, you must create an account on each of the framework websites and follow the deploy instructions. 

Interested in what was created without doing it yourself? [Check out the blog post!](https://www.readysetcloud.io/blog/allen.helton/infrastructure-from-code-benchmark/)
