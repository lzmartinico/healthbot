"use strict"

const STRINGS = require("./strings.js")
const mongo = require("./mongo.js")
const analysis = require("./analysis.js")
const messaging = require("./messaging.js")

const Clarifai = require("clarifai");
const clarifaiApp = new Clarifai.App({apiKey: process.env.ClarifaiKEY})
const foodmodel = "bd367be194cf45149e75f01d59f77ba7"

const FOOD_CORRECTNESS_TRESH = 0.97

let receiveFoodPic = (req, res) => {
    let imageURL = req.body.originalRequest.data.message.attachments[0].payload.url
    clarifaiApp.models.predict(foodmodel, imageURL).then(
        (response) => {
            // do something with response
            let guesses = response.outputs[0].data.concepts
            let confidentGuesses = guesses.filter((x) => x.value > FOOD_CORRECTNESS_TRESH)
            if (confidentGuesses.length == 1) {
                let bestGuess = JSON.stringify(guesses[0]);
                messaging.sendResponse(STRINGS.PHOTO_FEEDBACK_ASK1 + bestGuess.name+ STRINGS.PHOTO_FEEDBACK_ASK2)
                analysis.getFoodInfo(null, bestGuess).then((foodObject) => {
                    analysis.analyseFood([
                        foodObject,
                        null
                    ])
                }, (err) => console.log(mongo.getUserId(req) + " getFoodInfo error: " + err))
            } else {
                res.json({
                    "followupEvent": {"name": "sendfoodpic-no", },
                    "contextOut": [{"name": "picture-guesses", "lifespan": 2, "parameters": {"guesses": confidentGuesses}}]
                })
            }
        },
        (err) => {
            console.log(mongo.getUserId(req) + " Clarifai error: " + err)
        }
    );
}

let foodPicSentFailure = (req) => {
    let guesses = req.body.result.contexts.filter((x) => x["name"] == "picture-guesses")[0]["parameters"]["guesses"]
    let message = {
        "text": STRINGS.PHOTO_FEEDBACK_WRONG,
        "quick_replies": guesses.map(
            (x) => JSON.stringify({ "content_type": "text", "title": x.name, "payload": "messenger-button " + x.name +  " size picture" })
        )
    }
    let userId = mongo.getUserId(req)
    messaging.sendMessage(userId, message, (err) => {
        if (err) console.log(userId + " multiple choice foodPicSentFailure error: " + err)
    })
}

let clarifyFoodPic = (parameters, res) => {
    let postData = {
        "followupEvent": {
            "name": "process-text-food",
            "data": {
                "meal": "picture of " + parameters["meal"],
                "food": "picture of " + parameters["food"],
                "quantity": parameters["quantity"]
            }
        },

    }
    res.json(postData)
}

let analyseFoodPic = (req) => {
    let userId = mongo.getUserId(req)
    if (req.body.result.resolvedQuery) {
        let food = req.body.result.resolvedQuery
        mongo.mongoConnect().then((db) => {
            db.collection("users").updateOne({"dialogflow_id": userId}, {$push: {"meals": {date: new Date(), "foods": [{"type": food, "meal": "undefined"}]}}})
            .then(function(result) {
                analysis.analyseFood([
                    food,
                    null
                ])
            }, (err) => console.log(userId + " analyseFoodPic update error: " + err))
        }, (err) => console.log(userId + " analyseFoodPic connection error: " + err))
    }
}

module.exports = {receiveFoodPic, foodPicSentFailure, clarifyFoodPic, analyseFoodPic}
