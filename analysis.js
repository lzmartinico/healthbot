const mongo = require("./mongo.js")
const STRINGS = require("./strings.js")
const messaging = require("./messaging.js")

const request = require("request")
const Promise = require("promise");

const NUTRITION_API_URL = "https://trackapi.nutritionix.com"
const NUTRITION_API_NATURAL_ENDPOINT = "/v2/natural/nutrients"
const NUTRITION_API_SEARCH_ENDPOINT = "/v2/search/instant"

/*
Possible patterns:
Not enough carbs today
Not enough proteins today
Not enough fruits/veggies today
Too much sugar lately
Too much sodium lately
Eating too much
Eating too little - needs to have seen some logging, in insufficient quantities
Not logging

const interestingNutrients = [
    {name: "Protein", idx: 0, maxObserved: 163.254},
    {name: "Total lipid", idx: 1, maxObserved: 95.3694},
    {name: "Carbohydrate, by difference", idx: 2, maxObserved: 429.2608},
    {name: "Sugars, total", idx: 17, maxObserved: 19.388},
    {name: "Manganese", idx: 29, maxObserved: 1959.76},
    {name: "Vitamin D", idx: 37, maxObserved: 83.1572},
    {name: "Folate, total", idx: 57, maxObserved: 99.8},
    {name: "Choline, total", idx: 59, maxObserved: 48.3365},
    {name: "Cholesterol", idx: 88, maxObserved: 43.1023},
    {name: "omega-3 alpha-linolenic acid", idx: 142, maxObserved: 19.9136},
]
*/

let greeny = [
    "celery",
    "chard",
    "cress",
    "rutabaga",
    "rape kale",
    "kale",
    "wild cabbage",
    "cauliflower",
    "cabbage",
    "brussel sprouts",
    "broccoli",
    "turnip",
    "bok choi",
    "napa cabbage",
    "caper",
    "quinoa",
    "endive",
    "radicchio",
    "gourd",
    "rocket",
    "arugula",
    "fennel",
    "sweet potato",
    "lettuce",
    "watercress",
    "parsnip",
    "parsley",
    "garden pea",
    "plantain",
    "radish",
    "spinach",
]

// Given a text query and a food item, find information about it
let getFoodInfo = (query, food) => new Promise((resolve, reject) => {
    let options = {
        uri: NUTRITION_API_URL +  NUTRITION_API_SEARCH_ENDPOINT + "?query=" +  encodeURIComponent(food), // + "&branded=false&detailed=true",
        headers: {
            "x-app-id": "5770dcdf",
            "x-app-key": "0cb7bea0a4f8361d2360040e3204e459",
            "x-remote-user-id": 0,
            "Content-type": "application/x-www-form-urlencoded"
        },
        json: true

    }
    request.get(options, (error, response, body) => {
        if (error) {
            messaging.sendResponse("Sorry, I didn't understand what food you had")
            reject(error)
        } else if (body["message"]) {
            console.log("Parameter search failed for food " + food+ ": " + body["message"])
            if (query) {
                options["uri"] = NUTRITION_API_URL +  NUTRITION_API_NATURAL_ENDPOINT
                options["body"] = {query}
                request.post(options, (error, response, body) => {
                    if (error) {
                        messaging.sendResponse("Sorry, I didn't understand what kind of food you had")
                        reject(error)
                    } else {
                        resolve(body)
                    }
                })
            } else reject(body["message"])
        } else {
            resolve(body)
            // returns list of recognised foods, food_nutrients field contains object that specify the USDA NUTR_DEF table IDs
            // https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/asc/NUTR_DEF.txt
            // https://github.com/nutritionix/api-documentation/blob/master/v2/natural.md
        }
    })
})

let analyseFood = (foodTuple, req) => {
    let [
        food,
        quantity
    ] = foodTuple

    /*for (let nut in interestingNutrients) {
        if (food[nut["idx"]] > nut["maxObserved"]*0.7) {
            // increase risk percentage for that nutrient
        }
    }*/
    //
    //classify food as green leafy vegetable
    let foodName = food["foods"] ? food["foods"][0]["food_name"] : food["common"][0]["food_name"]
    let userId = mongo.getUserId(req)
    if (greeny.map((x) => foodName.search(x)).some((x) => x > -1)) {
        mongo.mongoConnect().then((db) => {
            db.collection("users").updateOne({"dialogflow_id": userId}, {$set: {"counters.greens": 0}})
        })
    }
}
let dailyRecapAnalysis = (userId, recap, day) => {
    //recap is a list of tuples, first element being a food string, the second being a quantity object or string
    // the quantity object can contain an "approximate-quantifier" key (with string values more,  less, the same
    // or keys "number" and "unit-volume-name"
    let large = 0
    let small = 0
    recap.forEach((food) => {
        let quantity = food[1]
        if (typeof quantity === "object" && "approximate-quantifier" in quantity) {
            if (quantity["approximate-quantifier"] === "more") large += 1
            else if (quantity["approximate-quantifier"] === "less") small += 1
        } // else lookup portion size and compare ingredients
    })
    if ((recap.length < 3 && new Date().getHours() >= 22 && new Date().getDate() == day.getDate()) || small > 2/3 * recap.length) {
        return STRINGS.NOT_MUCH_FOOD
    } else if ((recap.length > 10 && large > 1 && small < 2/3 * recap.length) ||
        large > 2/3 * recap.length) {
        return STRINGS.TOO_MUCH_FOOD
    }
}

module.exports = {analyseFood, getFoodInfo, dailyRecapAnalysis}
