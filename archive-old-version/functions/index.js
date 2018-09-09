'use strict';

const STRINGS = {}
STRINGS.BOTNAME= "[botname]",
STRINGS.INTRO = "I am " + STRINGS.BOTNAME + ". I will be your personal diet assistant"
STRINGS.INTRO_DESCRIPTION1 = "You can tell me what you are eating and how much, or send me a picture of your food, and I will record it so we can try to understand how you eat better!"
STRINGS.INTRO_DESCRIPTION2 = "You can also ask me for the nutritional value of food, or for some healthy eating tips, at any time!"
STRINGS.INSTAGRAM_LINK_ASK = "Before we get started though, if you are one of the cool kids who snaps their food pics on Instagram, I can link to your account and automatically log any food you put on there? Would you like me to do that?"
STRINGS.INSTAGRAM_LINK_Y = "Sounds good"
STRINGS.INSTAGRAM_LINK_N = "I don't use Instagram"
STRINGS.INSTAGRAM_DENY = "That's all right, you can always send me a picture or type your name in"
STRINGS.INSTAGRAM_LOGIN = "Cool, let me take you to the login screen 😎"
STRINGS.TYPED_INPUT_REPLY = "Nice! Can you remember how much [food1] you had today, compared to how much you had recently? More, less, or pretty much the same?"
STRINGS.TYPED_INPUT_REPLY2 = "How about [food2]?"
STRINGS.PHOTO_INPUT_REPLY = "Ok, let's have a look...."
STRINGS.PHOTO_FEEDBACK_ASK = "mmm, that looks like [food1] and [food2]. Is that right?"
STRINGS.PHOTO_FEEDBACK_Y = "You got it!"
STRINGS.PHOTO_FEEDBACK_N = "Not quite..."
STRINGS.PHOTO_FEEDBACK_WRONG = "Ah darn it! I am still learning 👶 Could you please tell me what's actually in the picture?"
STRINGS.PHOTO_FEEDBACK_SUGGESTION = "That's great to hear buddy! But if anything else feels different, make sure to let me know. I would recommend you tried [recommendation]"
STRINGS.HELP_INTRO = "Hey you seem to be having some difficulties. Let me run through what I can do"
STRINGS.HELP_MAIN = "You can tell me what food you are having via message, or snap a picture. [if not linked to insta: You can ask me to connect to your instagram account, so I can automatically scan your pictures; else: and remember, all the pics you upload to instagram will be logged automatically, so you don't have to send it again]. \nOnce I have enough food logged, I'll start sending you my observations on what you are eating.\n If you always have the same lunch or breakfast, you can set a recurring meal, which will make it easier for both of us to keep your food diary in check (but remember to let me know if you skip it)\n You can also ask me about any food's nutritional value, or for some advice on your current diet.\n If you are feeling like having a challenge, I can set one for you. Or if you want to throw in some good old fashioned competition, just invoke me within a group chat, and I will assign a big challenge to all your friends!"

STRINGS.CHALLENGE_PROMPT = "Great I love challenges! 😎 How about...[challenge] Sounds good? "
STRINGS.CHALLENGE_ACCEPT = "Sure!"
STRINGS.CHALLENGE_WHY = "Why that?"
STRINGS.CHALLENGE_POST_ACCEPT = "All right! I'll keep sending you reminders on how you are doing throughout"
STRINGS.CHALLENGE_REMINDER = "Hey, remember you are in a challenge! You are stll in time to eat something with [food] today!"
STRINGS.CHALLENGE_CONGRATS = "Wohoo nice! Way to go, "
STRINGS.CHALLENGE_ACCEPT2 = "Sounds good"
STRINGS.CHALLENGE_DENY = "Mmm, maybe another day"
STRINGS.CHALLENGE_DENIED = "No problem! But even if you are not in a challenge, remember that you should be [advice]. You can always ask me for advice on what kind of nutrients you can get with any food"
STRINGS.GROUP_INTRO = "Hi everyone, thanks for inviting me! I'm [botname], a nutritional bot who can help you log and reflect on your food. So, looking for a challenge? How about, everyone has to eat at least three different veggies every day for the next week? Say I'm in if you want to be counted in the challenge"

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())
app.set('port', (process.env.PORT || 5000))
const http = require('http');
const DialogflowApp = require('actions-on-google').DialogflowApp; // Google Assistant helper library

const REQUIRE_AUTH = true
const AUTH_TOKEN = 'INSERT AUTHTOKEN HERE'
const googleAssistantRequest = 'google'; // Constant to identify Google Assistant requests

app.get('/', function (req, res) {
  res.send('Use the /webhook endpoint.')
})
app.get('/webhook', function (req, res) {
  res.send('You must POST your request')
})

app.post('/webhook', function (req, res) {

// we have a simple authentication
  if (REQUIRE_AUTH) {
    if (req.headers['auth-token'] !== AUTH_TOKEN) {
      return res.status(401).send('Unauthorized')
    }
  }

  // and some validation too
  if (!req.body || !req.body.result || !req.body.result.parameters) {
    return res.status(400).send('Bad Request')
  }

  // the value of Action from api.ai is stored in req.body.result.action
  console.log('* Received action -- %s', req.body.result.action)

  // parameters are stored in req.body.result.parameters
  var userName = "Bob" //req.body.result.parameters['given-name']
  var webhookReply = 'Hello ' + userName + '! Welcome from the webhook.'

  // the most basic response
  res.status(200).json({
    source: 'webhook',
    speech: webhookReply,
    displayText: webhookReply
  })
})

app.listen(app.get('port'), function () {
  console.log('* Webhook service is listening on port:' + app.get('port'))
})
/*
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));

  // An action is a string used to identify what needs to be done in fulfillment
  let action = request.body.result.action; // https://dialogflow.com/docs/actions-and-parameters

  // Parameters are any entites that Dialogflow has extracted from the request.
  const parameters = request.body.result.parameters; // https://dialogflow.com/docs/actions-and-parameters

  // Contexts are objects used to track and store conversation state
  const inputContexts = request.body.result.contexts; // https://dialogflow.com/docs/contexts

  // Get the request source (Google Assistant, Slack, API, etc) and initialize DialogflowApp
  const requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;
  const app = new DialogflowApp({request: request, response: response});

  // Create handlers for Dialogflow actions as well as a 'default' handler
  const actionHandlers = {
    // The default welcome intent has been matched, welcome the user (https://dialogflow.com/docs/events#default_welcome_intent)
    'input.welcome': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
      } else {
        sendResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
      }
    },
    // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'input.unknown': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
      } else {
        sendResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
      }
    },
    'namequery': () => {
      let userId = request.body.originalRequest.data.user;
      var usersRef = db.ref("users/"+userId);
      usersRef.once('value').then((snapshot) => {
        let reply = snapshot.val() ? 'Your name is '+ snapshot.val().name + ', right?' : 'Sorry, I don\'t believe we have met';
        if (requestSource === googleAssistantRequest) {
            sendGoogleResponse(reply); // Send simple response to user
        } else {
            sendResponse(reply); // Send simple response to user
        }
      });  
    },
    'namesave': () => {
        // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      let userId = request.body.originalRequest.data.user;
      var usersRef = db.ref("users/"+userId);
      usersRef.set({'name': parameters.name});
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hi '+ parameters.name + ', good to meet you!'); // Send simple response to user
      } else {
        sendResponse('Hi '+ parameters.name + ', good to meet you!'); // Send simple response to user
      }
    },
    'eating': () => {
         // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        let responseToUser = {
          //googleRichResponse: googleRichResponse, // Optional, uncomment to enable
          //googleOutputContexts: ['weather', 2, { ['city']: 'rome' }], // Optional, uncomment to enable
          speech: 'I like food as well', // spoken response
          displayText: 'I like food as well' // displayed response
        };
        sendGoogleResponse(responseToUser);
      } else {
        let responseToUser = {
          //richResponses: richResponses, // Optional, uncomment to enable
          //outputContexts: [{'name': 'weather', 'lifespan': 2, 'parameters': {'city': 'Rome'}}], // Optional, uncomment to enable
          speech: 'I like food as well', // spoken response
          displayText: 'I like food as well' // displayed response
        };
        sendResponse(responseToUser);
     }
    },
    'ask-portion-size': () => {
        const NUTRITION_API_URL = "https://trackapi.nutritionix.com"
        const NUTRITION_API_ENDPOINT = "/v2/search/instant"
        let options = {
            host: NUTRITION_API_URL,
            path: NUTRITION_API_ENDPOINT,
            headers: {
                "x-app-id": "5770dcdf",
                "x-app-key": "INSERT KEY HERE",
                "x-remote-user-id": 0
            },
            query:"bacon"
        }
        http.get(options, (response) => {
           res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      sendResponse(parsedData);
    } catch (e) {
      sendRepsonse(e.message);
    }
  });
        }).on('error', (e) => {
			sendResponse(e.message)
		})
        //sendResponse(STRINGS.TYPED_INPUT_REPLY); 
    },
    'analyse_food_pic': () => {
        sendResponse(request.body)
    },
    // Default handler for unknown or undefined actions
    'default': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        let responseToUser = {
          //googleRichResponse: googleRichResponse, // Optional, uncomment to enable
          //googleOutputContexts: ['weather', 2, { ['city']: 'rome' }], // Optional, uncomment to enable
          speech: 'This message is from Dialogflow\'s Cloud Functions for Firebase editor!', // spoken response
          displayText: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
        };
        sendGoogleResponse(responseToUser);
      } else {
        let responseToUser = {
          //richResponses: richResponses, // Optional, uncomment to enable
          //outputContexts: [{'name': 'weather', 'lifespan': 2, 'parameters': {'city': 'Rome'}}], // Optional, uncomment to enable
          speech: 'This message is from Dialogflow\'s Cloud Functions for Firebase editor!', // spoken response
          displayText: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
        };
        sendResponse(responseToUser);
      }
    }
  };

  // If undefined or unknown action use the default handler
  if (!actionHandlers[action]) {
    action = 'default';
  }

  // Run the proper handler function to handle the request from Dialogflow
  actionHandlers[action]();
  // Function to send correctly formatted Google Assistant responses to Dialogflow which are then sent to the user
  function sendGoogleResponse (responseToUser) {
    if (typeof responseToUser === 'string') {
      app.ask(responseToUser); // Google Assistant response
    } else {
      // If speech or displayText is defined use it to respond
      let googleResponse = app.buildRichResponse().addSimpleResponse({
        speech: responseToUser.speech || responseToUser.displayText,
        displayText: responseToUser.displayText || responseToUser.speech
      });

      // Optional: Overwrite previous response with rich response
      if (responseToUser.googleRichResponse) {
        googleResponse = responseToUser.googleRichResponse;
      }

      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      if (responseToUser.googleOutputContexts) {
        app.setContext(...responseToUser.googleOutputContexts);
      }

      app.ask(googleResponse); // Send response to Dialogflow and Google Assistant
    }
  }

  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse (responseToUser) {
    // if the response is a string send it as a response to the user
    if (typeof responseToUser === 'string') {
      let responseJson = {};
      responseJson.speech = responseToUser; // spoken response
      responseJson.displayText = responseToUser; // displayed response
      response.json(responseJson); // Send response to Dialogflow
    } else {
      // If the response to the user includes rich responses or contexts send them to Dialogflow
      let responseJson = {};

      // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
      responseJson.speech = responseToUser.speech || responseToUser.displayText;
      responseJson.displayText = responseToUser.displayText || responseToUser.speech;

      // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
      responseJson.data = responseToUser.richResponses;

      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      responseJson.contextOut = responseToUser.outputContexts;

      response.json(responseJson); // Send response to Dialogflow
    }
  }
  
});

// Construct rich response for Google Assistant
const app = new DialogflowApp();
const googleRichResponse = app.buildRichResponse()
  .addSimpleResponse('This is the first simple response for Google Assistant')
  .addSuggestions(
    ['Suggestion Chip', 'Another Suggestion Chip'])
    // Create a basic card and add it to the rich response
  .addBasicCard(app.buildBasicCard(`This is a basic card.  Text in a
 basic card can include "quotes" and most other unicode characters
 including emoji 📱.  Basic cards also support some markdown
 formatting like *emphasis* or _italics_, **strong** or __bold__,
 and ***bold itallic*** or ___strong emphasis___ as well as other things
 like line  \nbreaks`) // Note the two spaces before '\n' required for a
                        // line break to be rendered in the card
    .setSubtitle('This is a subtitle')
    .setTitle('Title: this is a title')
    .addButton('This is a button', 'https://assistant.google.com/')
    .setImage('https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
      'Image alternate text'))
  .addSimpleResponse({ speech: 'This is another simple response',
    displayText: 'This is the another simple response 💁' });

            'default_action': {
              'type': 'web_url',
              'url': 'https://assistant.google.com/'
            },
            'buttons': [
              {
                'type': 'web_url',
                'url': 'https://assistant.google.com/',
                'title': 'This is a button'
              }
            ]
          }
        ]
      }
    }
  }
};
*/
