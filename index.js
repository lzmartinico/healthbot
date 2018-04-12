"use strict"

const STRINGS = require("./strings.js")
const mongo = require("./mongo.js")
const messaging = require("./messaging.js")
const pictures = require("./pictures.js")
const analysis = require("./analysis.js")

const express = require("express")
const bodyParser = require("body-parser")
const request = require("request")
const DialogflowApp = require("actions-on-google").DialogflowApp // Google Assistant helper library

let randomString = (stringArray) => stringArray[Math.floor(Math.random()*stringArray.length)]
let dateFromString = (dateObj) => {
    let date = null
    if (dateObj === "today") {
        date = new Date()
    } else if (dateObj == "yesterday") {
        date = new Date();
        date.setDate(date.getDate() - 1);
    } else {
        date = new Date(dateObj["date"])
    }

    return date
}
const app = express()
app.use(bodyParser.json())
app.set("port", (process.env.PORT || 5000))
const REQUIRE_AUTH = true

app.get("/", function (req, res) {
    res.send("Use the /webhook endpoint.")
})
app.get("/webhook", function (req, res) {
    res.send("You must POST your request")
})

//respond to the instagram auth request

app.post("/webhook", function (req, res) {

    // we have a simple authentication
    if (REQUIRE_AUTH) {
        if (req.headers["auth-token"] !== process.env.AUTH_TOKEN) {
            return res.status(401).send("Unauthorized")
        }
    }

    // and some validation too
    if (!req.body || !req.body.result || !req.body.result.parameters) {
        return res.status(400).send("Bad Request")
    }

    // An action is a string used to identify what needs to be done in fulfillment
    let action = req.body.result.action

    // Parameters are any entites that Dialogflow has extracted from the request.
    const parameters = req.body.result.parameters // https://dialogflow.com/docs/actions-and-parameters

    // Contexts are objects used to track and store conversation state
    const inputContexts = req.body.result.contexts // https://dialogflow.com/docs/contexts

    // Get the request source (Google Assistant, Slack, API, etc) and initialize DialogflowApp
    const dialogflowApp = new DialogflowApp({request: req, response: res})

    const actionHandlers = {
        // Asking for help
        "help": () => {
            let responses = [
                STRINGS.HELP_INTRO,
                STRINGS.HELP_FIRST,
                STRINGS.HELP_MAIN
            ]
            messaging.sendResponse(responses, res)
        },
        // When I want to know what my name is (DEBUG mostly)
        "namequery": () => {
            let reply = STRINGS.UNKNOWN_NAME
            let userId = mongo.getUserId(req)
            mongo.mongoConnect().then((db) => {
                db.collection("users").findOne({"dialogflow_id": userId})
                .then(function(result) {
                    reply = "Your name is " +result.name + ", right?"
                    messaging.sendResponse(reply, res)
                })
                .catch(function(error) {
                    console.log("namequery error for " + userId + ": " + error)
                    messaging.sendResponse(reply, res)
                }, () => messaging.sendResponse(reply, res))
            })
        },
        // Creates the user instance after a name is received
        "namesave": () => {
            let userId = mongo.getUserId(req)
            let userName = req.body.result.parameters.name
            mongo.mongoConnect().then((db) => {
                db.collection("users").findOne(
                    {"dialogflow_id": userId}
                )
                .then(function(result) {
                    if (result === null) {
                        let numUsers = 0
                        db.collection("users").stats()
                        .then(function(s) {
                            numUsers = s.count
                        }, (err) => console.log("cannot create first user" + err))
                        if (!numUsers) {
                            db.collection("users").createIndex(
                                { "dialogflow_id": 1 }, { unique: true }
                            )
                        }
                        db.collection("users").insertOne(
                            {
                                "dialogflow_id": userId,
                                "name": userName,
                                "counters": {"no_log": 0, "greens": 0, "feedback": 0},
                            }
                        )
                    }
                })
            })
            let postData = {
                "followupEvent": {
                    "name": "namesave-confirm",
                    "data": {"name": userName}
                },

            }
            res.json(postData)
        },
        // React to a message (text) containing a food report
        "process-text-food": () => {
            let userId = mongo.getUserId(req)
            let date = dateFromString(parameters["date"])
            if (date === "") date = new Date()
            let query = req.body.result.resolvedQuery.toLowerCase()
            let index = query.indexOf("i had ");
            if (index != -1) query = query.substr(index)
            index = query.indexOf("i ate ");
            if (index != -1) query = query.substr(index)
            index = query.indexOf("messenger-button ")
            if (index != -1) query = query.substring(index, query.indexOf("picture"))
            if (query.indexOf("less") != -1|| query.indexOf("more") != -1 || query.indexOf("same") != -1) query = null
            parameters["food"].forEach((param) => {
                analysis.getFoodInfo(query, param).then(function(foodObject){
                    let quantity = parameters["quantity"]
                    let meal = "meal" in parameters ? parameters["meal"] : "undefined"
                    let foodName = foodObject["foods"] ? foodObject["foods"][0]["food_name"] : foodObject["common"][0]["food_name"]
                    mongo.mongoConnect().then((db) => {
                        db.collection("users").updateOne({"dialogflow_id": userId}, {
                            $push: {
                                "meals": {
                                    "date": new Date(),
                                    "foods": [{"type": foodName, meal, quantity}]
                                }
                            }
                        })
                        .then((result) => {
                            analysis.analyseFood([
                                foodObject,
                                quantity
                            ], req)
                            messaging.sendResponse(randomString(STRINGS.INPUT_ACKNOWLEDGE), res)
                        }, (error) => {
                            console.log(userId + " couldn't update db: " + error)
                        })
                    }, (err) => messaging.sendResponse(err, res))
                }, (err) => console.log(userId + " couldn't retrieve food " + param + " for query " + query + ": " + err))
                .catch((err) => console.log(userId + "process-text-food failure " + err))
            })
        },
        // React to receiving a food picture
        "receive-food-pic": () => pictures.receiveFoodPic(req, res),
        // React to user confirming that the guess for the food picture was correct
        "sendfoodpic-yes": () => {
            // confirm that the food pic was correctly recognised
            res.json({"followupEvent": {"name": "analyse-food-pic"}})
        },
        // React to user confirming that the guess for the food picture was incorrect
        "sendfoodpic-no": () => pictures.foodPicSentFailure(req),
        // User clarifies by texting what food picture actually is
        "clarify-food-pic": () => pictures.clarifyFoodPic(parameters, res),
        // Given a correctly identified food pic, save meal and do data analysis
        "analyse-food-pic": () => pictures.analyseFoodPic(req),
        "date-retrieval": () => {
            let dateObj = req.body.result.parameters.date
            let date = dateFromString(dateObj)
            let today = new Date()
            if (date.getUTCFullYear() > today.getUTCFullYear()) {
                date.setFullYear(date.getFullYear()-1)
            }
            mongo.mongoConnect().then((db) => {
                date.setHours(0, 0, 0, 0)
                let dayAfter = new Date(date)
                dayAfter.setDate(dayAfter.getDate() + 1)
                dayAfter.setHours(0, 0, 0, 0)
                let userId = mongo.getUserId(req)
                let reply = ""
                let report = []
                db.collection("users").aggregate([
                    {$match: {"dialogflow_id": userId}},
                    {
                        $project:
                        {
                            meals: {
                                $filter:
                                {
                                    input: "$meals",
                                    as: "meal",
                                    cond: {
                                        $and: [
                                            {
                                                $gte: [
                                                    "$$meal.date",
                                                    date
                                                ]
                                            },
                                            {
                                                $lt: [
                                                    "$$meal.date",
                                                    dayAfter
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ])
                .forEach((result) => {
                    if (result) {
                        if ("meals" in result) {
                            for (let i = 0; i < result["meals"].length; i++) {
                                for (let j = 0; j < result["meals"][i]["foods"].length; j++) {
                                    let foodType = result["meals"][i]["foods"][j]["type"]
                                    reply += foodType
                                    let quantity = result["meals"][i]["foods"][j]["quantity"]
                                    report.push((foodType, quantity))
                                    if (typeof quantity === "object" && "approximate-quantifier" in quantity) {
                                        let conn = quantity["approximate-quantifier"] === "the same" ? " as " : " than "
                                        reply += " ("  + quantity["approximate-quantifier"] + conn + "usual)"
                                    } else if (typeof quantity === "object") {
                                        let num = 1
                                        let vol = ""
                                        if (quantity["number"]) num = quantity["number"]
                                        if (quantity["unit-volume-name"]) vol = quantity["unit-volume-name"] + ", "
                                        reply += ", (" + vol + num +  ")"
                                    } else if (typeof quantity === "string") {
                                        reply += ", ("  + quantity + ")"
                                    }
                                    reply += "\n"
                                }
                            }
                            let dayAnalysis = analysis.dailyRecapAnalysis(userId, report, date)
                            if (dayAnalysis) reply += dayAnalysis
                        }
                    }
                }, (error) => {
                    if (error) console.log(userId + " date retrieval error:" + error)
                    if (reply === "") reply = STRINGS.NO_FOOD_ON + date.toDateString()
                    else reply = "On " + date.toDateString() + ", you had:\n" + reply
                    messaging.sendResponse(reply, res)//{"speech": reply, "outputContexts": report}, res)
                })
            })
        },
        "Dateretrieval.false-info": () => {
            // actually maybe just set output context to [(_id, food)] and just a list of options of what to delete
            console.log(JSON.stringify(inputContexts))
            messaging.sendResponse(randomString(STRINGS.APOLOGY), res)
        },
        "Dateretrieval.delete-request": () => {
            console.log(JSON.stringify(inputContexts))
            let dateObject = inputContexts.find((x) => x.name === "dateretrieval-followup")
            if (dateObject) console.log("with date " + dateObject.parameters.date)
            messaging.sendResponse("consider it done", res)
        },
        "default": () => {
            let responseToUser = {
                speech: "This action was not recognised",
                displayText: "This action was not recognised"
            }
            messaging.sendResponse(responseToUser, res)
        }
    }

    // If undefined or unknown action use the default handler
    if (!actionHandlers[action]) {
        action = "default"
    }

    // Run the proper handler function to handle the request from Dialogflow
    actionHandlers[action]()


    //res.status(200).json({
    //  source: 'webhook',
    //  speech: webhookReply,
    //  displayText: webhookReply
    //})
})

app.listen(app.get("port"), function () {
    console.log("* Webhook service is listening on port:" + app.get("port"))
})
