var cursor = db.products.find({$and: [{$or: [{"" :  {$ne: "", '$exists':true}},{"generic_name_en": {$ne: "", '$exists':true}}]}, {"countries" : {$regex: "en|UK|United States|Canada"}}]},{"generic_name":1,  "generic_name_en": 1});
while (cursor.hasNext()) {    print(tojson(cursor.next().generic_name_en)); }
