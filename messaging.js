const request = require("request")

// Function to send correctly formatted responses to Dialogflow which are then sent to the user
let sendResponse = (responseToUser, res) => {
// if the response is a string send it as a response to the user
    let responseJson = {}
    if (typeof responseToUser === "string") {
        responseJson.speech = responseToUser // spoken response
        responseJson.displayText = responseToUser // displayed response
    } else if (Object.prototype.toString.call(responseToUser) === "[object Array]") {
        let responseCompound = responseToUser.join("\n")
        responseJson.speech = responseCompound// spoken response
        responseJson.displayText = responseCompound // displayed response
    } else {

        // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
        responseJson.speech = responseToUser.speech || responseToUser.displayText
        responseJson.displayText = responseToUser.displayText || responseToUser.speech

        // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
        responseJson.data = responseToUser.richResponses

        // Optional: add contexts (https://dialogflow.com/docs/contexts)
        responseJson.contextOut = responseToUser.outputContexts
    }
    res.json(responseJson) // Send response to Dialogflow
}

let sendMessage = (userId, message, callback) => {
    let messageObj = {}
    if (typeof message === "string") {
        messageObj = {"text": message}
    } else messageObj = message
    let url = "https://graph.facebook.com/v2.6/me/messages"
    let postData = {
        "access_token": process.env.PAGE_ACCESS_TOKEN,
        "recipient": JSON.stringify({"id": userId}),
        "message": JSON.stringify(messageObj)
    }
    request.post({
        url,
        formData: postData
    }, callback)
}
module.exports = {sendMessage, sendResponse}
