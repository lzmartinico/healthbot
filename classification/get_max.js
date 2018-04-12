const fs = require('fs');
let filename = "data.json"
let array = JSON.parse(fs.readFileSync(filename).toString())
let nutrient_inds = [0,1,2,17,29,37,57,59,88,142]
let relevant_nutrients = {}
for (let j = 0; j < nutrient_inds.length; j++) {
    let idx = nutrient_inds[j]
    relevant_nutrients[idx] = []
    for (let i = 0; i < array.length; i++) {
        relevant_nutrients[idx].push(array[i][j])
    }
}
max_values = []
for (let j in relevant_nutrients) {
    max_values.push(Math.max.apply(null,relevant_nutrients[j]))
}
console.log(max_values)
