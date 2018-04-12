const MongoClient = require("mongodb").MongoClient;
const mongoURI = process.env.MongoURL

exports.mongoConnect = () => new Promise((success, error) => {
    MongoClient.connect(mongoURI, function(err, db) {
        if (err) {
            console.log("Mongo connect error: " + err)
            error(err)
        } else {
            success(db)
        }
    })
})


exports.getUserId = (req) => {
    let userId = undefined
    const requestSource = (req.body.originalRequest) ? req.body.originalRequest.source : undefined
    if (requestSource == "facebook") {
        userId = req.body.originalRequest.data.sender.id
    } else {
        userId = "agentdialogflow"
    }

    return userId
}

