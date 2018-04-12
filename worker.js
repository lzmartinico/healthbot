const messaging = require("./messaging.js")
const mongo = require("./mongo.js")
const STRINGS = require("./strings.js")

let noLogReminder = (db) => {
    let today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(today.getDate()-1)
    let yesterday = new Date()
    yesterday.setHours(0, 0, 0, 0)
    yesterday.setDate(yesterday.getDate()-2)
    db.collection("users").aggregate([
        {$match: {}},
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
                                        yesterday
                                    ]
                                },
                                {
                                    $lt: [
                                        "$$meal.date",
                                        today
                                    ]
                                }
                            ]
                        }
                    }
                },
                "dialogflow_id": 1,
                "counters": 1
            }
        }
    ])
    .each((err, result) => {
        if (err) console.log("noLogReminder each error" + err)
        else if (result) {
            let counter = result.counters.no_log
            if (!result.meals || result.meals.length === 0 || [
                1,
                2,
                4,
                7,
                15
            ].indexOf(counter) > -1) {
                //messaging.sendMessage(result.dialogflow_id, "Hey there" + STRINGS.NO_LOG_PROD)
                console.log("If this were active, I would have sent a no_log message to " + result.dialogflow_id)
                db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$inc: {"counters.no_log": 1}})
                .then(() => console.log(result.dialogflow_id + " updated no_log counter"), (err) => console.log(result.dialogflow_id + " failed to update no_log counter: " + err))
            } else if (counter === 3 || counter === 5 || counter === 6 || counter > 7) {
                db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$inc: {"counters.no_log": 1}})
                .then(() => console.log(result.dialogflow_id + " updated no_log counter"), (err) => console.log(result.dialogflow_id + " failed to update no_log counter: " + err))
            } else {
                db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$set: {"counters.no_log": 0}})
                .then(() => console.log(result.dialogflow_id + " resetd no_log counter"), (err) => console.log(result.dialogflow_id + " failed to reset no_log counter: " + err))
            }
            console.log(result)
        }
    })
}

let feedbackReminder = (db) => {
    db.collection("users").find({})
    .each((err, result) => {
        if (err) console.log("feedbackReminder each error: " + err)
        else if (result && result.counters.feedback === 3) {
            messaging.sendMessage(result.dialogflow_id, "Hey there" + STRINGS.ASK_FEEDBACK, (err) => {
                if (err) console.log(result.dialogflow_id + "Messenger error from feedbackReminder: " + err)
            })
        } else if (result) {
            db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$inc: {"counters.feedback": 1}})
            .then(() => console.log(result.dialogflow_id + " updated feedback counter"), (err) => console.log(result.dialogflow_id + " failed to update feedback counter: " + err))
        }
    })
}

let greensReminder = (db) => {
    // based on max confidence for each user, trigger appropriate reminder
    db.collection("users").find({})
    .each((err, result) => {
        if (err) console.log("greensReminder each error: " + err)
        else if (result) {
            let reminderCounter = result.counters.greens
            let nologCounter = result.counters.no_log
            if ([
                3,
                5,
                7,
                10
            ].indexOf(reminderCounter) > -1 && [
                1,
                2,
                4,
                7,
                15
            ].indexOf(nologCounter) > -1) {
                messaging.sendMessage(result.dialogflow_id, "Hey there" + STRINGS.GREEN_LEAF_PROD + " a few " + STRINGS.GREEN_LEAF_PROD_CONT, (err) => {
                    if (err) {
                        console.log(result.dialogflow_id + " Messenger error: " + err)
                    } else {
                        db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$inc: {"counters.greens": 1}})
                        .then(() => console.log(result.dialogflow_id + " updated greens counter"), (err) => console.log(result.dialogflow_id + " failed to update greens counter: " + err))
                    }
                })
            } else {
                db.collection("users").updateOne({"dialogflow_id": result.dialogflow_id}, {$inc: {"counters.greens": 1}})
                .then(() => console.log(result.dialogflow_id + " updated greens counter"), (err) => console.log(result.dialogflow_id + " failed to update greens counter: " + err))
            }
        }
    })
}

let finalFeedback = (db) => {
    db.collection("users").find({})
    .each((err, result) => {
        if (err) console.log("greensReminder each error: " + err)
        else if (result) {
            messaging.sendMessage(result.dialogflow_id, "Hey " + result.name + STRINGS.FEEDBACK_FORM)
        }
    })
}

mongo.mongoConnect().then((db) => {
    greensReminder(db)
    //feedbackReminder(db)
    noLogReminder(db)
    //finalFeedback(db)
}, (err) => console.log("worker.js database error: " + err))
