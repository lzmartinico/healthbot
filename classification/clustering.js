// https://github.com/tayden/clusterfck
const fs = require('fs');
const request = require("request")
const clusterfck = require("tayden-clusterfck")
const NUTRITION_API_URL = "https://trackapi.nutritionix.com"
const NUTRITION_API_NATURAL_ENDPOINT = "/v2/natural/nutrients"
const NUTRITION_API_SEARCH_ENDPOINT = "/v2/search/instant"
const async = require('async')

let n = 5
let filename = "common_foods.txt"
let array = fs.readFileSync(filename).toString().split("\n");
if (array[array.length-1] === "" || array[array.length-1] === undefined || !array[array.length-1]) {
    array.pop()
}

let clusters = []
let kmeans = new clusterfck.Kmeans();

let fetchData = (query, cb) => {
    let local_data = new Array(150).fill(0);
    let options = {
        uri: NUTRITION_API_URL +  NUTRITION_API_NATURAL_ENDPOINT,
        headers: {
            "x-app-id": "5770dcdf",
            "x-app-key": "0cb7bea0a4f8361d2360040e3204e459",
            "x-remote-user-id": 0
        },
        json: true,
        body: {query}
    }
    request.post(options, (error, response, body) => {
        if (error || !('foods' in body) || body['foods'].length < 1 || !('full_nutrients' in body['foods'][0]))
            cb(error) 
        else {
            let nutrient_list = body['foods'][0]['full_nutrients']
            for (n in nutrient_list) {
                attr_id = nutrient_list[n]["attr_id"] 
                value = nutrient_list[n]["value"] 
                console.log(attr_id + " : " + value + " -> "  + nutrient_offset(attr_id))
                local_data[nutrient_offset(attr_id)] = value
            }
            cb(null,local_data)
        }
    })
}
let data = []
if (fs.existsSync("./data.json")) {
    data = JSON.parse(fs.readFileSync("data.json").toString())
} else {
    async.map(array, fetchData, function(error, returnData) {
        if (error) {
            console.log(error)
        } else {
            data = returnData
            fs.writeFileSync('./data.json', JSON.stringify(data) , 'utf-8'); 
        }
    })
}

// decide on n (iteratively?)
clusters = kmeans.cluster(data,n)
console.log(kmeans.toJSON())
fetchData('cheesecake', (error, response) => {
    console.log(classify(response))
})


let classify = function(vector) {
    return kmeans.classify(vector);
}

let nutrient_offset = function(id_string) {
    let id = parseInt(id_string)
    if (id >= 203 && id < 206)
        return id - 203
    else if (id > 206 && id < 215) 
        return id - 204
    else if (id > 302 && id < 308)
        return id - 282
    else if (id > 316 && id < 327)
        return id - 286
    else if (id > 340 && id < 348)
        return id - 297
    else if (id > 403 && id < 407)
        return id - 356
    else if (id > 427 && id < 433)
        return id - 372
    else if (id > 500 && id < 519)
        return id - 438
    else if (id > 604 && id < 616)
        return id - 520
    else if (id > 616 && id < 622)
        return id - 521
    else if (id > 623 && id < 632)
        return id - 523
    else if (id > 651 && id < 655)
        return id - 537
    else if (id > 661 && id < 667)
        return id - 544
    else if (id > 668 && id < 677)
        return id - 546
    else if (id > 694 && id < 698)
        return id - 560
    else if (id > 850 && id < 854)
        return id - 713
    else if (id > 854 && id < 860)
        return id - 714
    else {
        let singles = {
            221: 11,
			255: 12,
			257: 13,
            262: 14,
            263: 15,
			268: 16,
			269: 17,
			287: 18,
			291: 19,
			301: 20,
			309: 26,
			312: 27,
			313: 28,
			315: 29,
			328: 40,
			334: 41,
			337: 42,
			338: 43,
			401: 47,
			410: 51,
			415: 52,
			417: 53,
			418: 54,
			421: 55,
			435: 61,
			454: 62,
			521: 81,
			573: 82,
			578: 83,
			601: 84,
			636: 109,
			638: 110,
			639: 111,
			641: 112,
			645: 113,
			646: 114,
			685: 131,
			687: 132,
			689: 133,
			693: 134
        }
        if (id in singles)
            return singles[id]
        else console.log("Out of range id: " + id)
    }
}
