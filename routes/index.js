var express = require('express');
var router = express.Router();
var csvToJson = require('convert-csv-to-json');
var mongoose = require("mongoose");
var _=require("lodash");
var jwt = require('jsonwebtoken');
const excelToJson = require('convert-excel-to-json');
let secrete = "vs";
// mongoose.connect("mongodb://localhost:27017/myappdatabase")
mongoose.connect('mongodb://vasu058:Vasu058@ds163330.mlab.com:63330/db058')
  // uri_decode_auth: true 
  // })
.catch(err => { // mongoose connection error will be handled here
  console.error('DB connection error:', err);
  process.exit(1);
});
var db=mongoose.connection;
db.on('error',err=>{
  console.log("Error while making DB connection");
});
db.once('open',()=>{
  console.log("DB Connected successfully");
})

var Schema = mongoose.Schema;
//schema creation
var battleschema = new Schema({
    name: String,
    year: { type: String },
    battle_number: { type: Number, unique: true },
    attacker_king: String,
    defender_king: String,
    attacker_1: String,
    ttacker_2: String,
    attacker_3: String,
    attacker_4: String,
    defender_1: String,
    defender_2: String,
    defender_3: String,
    defender_4: String,
    attacker_outcome: String,
    battle_type: String,
    major_death: Number,
    major_capture: Number,
    attacker_size: Number,
    defender_size: Number,
    attacker_commander: String,
    defender_commander: String,
    summer: Number,
    location: String,
    region: String,
    note: String,
})
var BattleSChema = mongoose.model('Battles', battleschema); // model creation



router.get('/',function(req,res){
  console.log("Get render api called")
  res.render('home.html')
})




/* /insertData -> it is for load data into DB */
router.post('/login', (req, res) => {
  console.log("login api called");
  if((req.body.username && req.body.username == "vasu") && (req.body.password && req.body.password == "Vasu")){
       
       var payload = {
        name:req.body.username,
        password:req.body.password
       }
       jwt.sign(payload, secrete,{
          expiresIn: '1d' // expires in 365 days
        }, (error, token) => {
         if (error) {
           console.log("Error while generating token");
           res.send({ "message": "Error while generating token", status: 500 })
         }
         res.send({token:token})
       })
    }
    else{
      res.send({status:400,"message":"Bad request data: required username and password"})
    }
});


/* /insertData -> it is for load data into DB */
router.post('/insertData',validateAuthentication, (req, res) => {
  console.log("insert data api called");
  const result = excelToJson({
    sourceFile: './battles.xlsx'
  });
  var final_array = []
  var array = result.battles;
  array.forEach((element, index) => {
    var keysArray = result.battles[0];
    var obj = {};
    if (index != 0) {

      for (key in keysArray) {
        obj[keysArray[key]] = element[key] != undefined ? element[key] : null
      }
      final_array.push(obj);
    }
  });
  var processItems = function (i) {
    if (i < final_array.length) {
      var battleData = new BattleSChema(final_array[i]);
      battleData.save(final_array, (err) => {
        if (err) {
          console.log("Error while inserting data into DB");
          res.send({"message":"Error while Inserting data into DB ",status:500})
        }
        i++;
        processItems(i);
      });
    } else {
      console.log('Data created!');
      res.send({ success: "Data inserted successfully" });
    }
  }
  processItems(0)
});

/* /getdetails -> for get the all the records from db  */
router.get('/getdetails',validateAuthentication, (req, res) => {
  BattleSChema.find({}, (err, response) => {
    if (err) {
      console.log("Error while getting data from DB");
      res.send({ "message": "Error while getting data from DB ", status: 500 })
    }
    console.log(response);
    res.send(response);
  })
})

/* /search -> for search the from DB based on query params  */
router.get('/search',validateAuthentication,(req,res)=>
{
  var query1,query2;
  if(req.query.hasOwnProperty("king")){
     query1= {$or:[{attacker_king:{$regex: req.query.king, $options: 'i'}},{defender_king:{$regex: req.query.king, $options: 'i'}}]}
    delete req.query.king;
  }
  if(req.query.hasOwnProperty("type")){
    query2= {battle_type:{$regex: req.query.type, $options: 'i'}}
   delete req.query.type;
  }

  // var query = (query1 && query2) ? {...query1, ...query2, ...req.query } : (query1 ? { ...query1, ...req.query } : (query2 ? { ...query2, ...req.query } : req.query))
  
  
//above Extended Parameter Handling is not workign in my system. as i sont have much time, so am not gonna do experiments, so commented
  var query = (query1&&query2) ? Object.assign({},query1,query2) : (query1 ? Object.assign({},query1,req.query):(query2 ? Object.assign({}.query2,req.query):req.query))
  BattleSChema.find(query, (err, response) => {
    if (err) {
      console.log("Error while searching data from DB");
      res.send({ "message": "Error while searching data from DB ", status: 500 })
    }
    console.log(response);
    res.send(response);
  })
})

/* /list -> it returns list of all locations  */
router.get('/list',validateAuthentication,(req,res)=>
{
  BattleSChema.find({},{'_id': 0,"location":1},(err,response)=>{
    if (err) {
      console.log("Error while getting list of location from DB");
      res.send({ "message": "Error while getting list od location from DB ", status: 500 })
    }
    console.log(response);
    var Result = response.map(ele=>{
      return ele.location;
    })
    res.send(_.uniq(_.compact(Result)));
  })
})

/* /count -> it returns count of battles occured  */
router.get('/count',validateAuthentication,(req,res)=>
{
  BattleSChema.count({},(err,response)=>{
    if (err) {
      console.log("Error while getting count from DB");
      res.send({ "message": "Error while getting count from DB ", status: 500 })
    }
    console.log(response);
    res.send({status:200,"Total Number of Battles Occurred":response})
  })
})

/* /stats -> it return stats of battle data  */
router.get('/stats', validateAuthentication,(req, res) => {
  BattleSChema.find({}, (err, response) => {
    if (err) {
      console.log("Error while getting stats from DB");
      res.send({ "message": "Error while getting stats from DB ", status: 500 })
    }
    console.log(response);
    var totalWins = 0, totalLoss = 0, defender_size = [], attacker_activeCount = {}, defender_activeCount = {}, region_activeCount = {}, name_activeCount = {}
    var battle_type = []
    response.forEach((ele) => {
      battle_type.push(ele.battle_type);
      if (ele.attacker_outcome == "win")
        totalWins++;
      else
        totalLoss++;
      defender_size.push((ele.defender_size ? ele.defender_size : 0));
      if (attacker_activeCount[ele.attacker_king]) {
        attacker_activeCount[ele.attacker_king]++
      } else {
        attacker_activeCount[ele.attacker_king] = 1;
      }
      if (defender_activeCount[ele.defender_king]) {
        defender_activeCount[ele.defender_king]++
      } else {
        defender_activeCount[ele.defender_king] = 1;
      }
      if (region_activeCount[ele.region]) {
        region_activeCount[ele.region]++
      } else {
        region_activeCount[ele.region] = 1;
      }
      if (name_activeCount[ele.name]) {
        name_activeCount[ele.name]++
      } else {
        name_activeCount[ele.name] = 1;
      }
    })

    var active_attacker = _.maxBy(_.keys(attacker_activeCount), function (o) { return attacker_activeCount[o]; });
    var active_defender = _.maxBy(_.keys(defender_activeCount), function (o) { return defender_activeCount[o]; });
    var active_region = _.maxBy(_.keys(region_activeCount), function (o) { return region_activeCount[o]; });
    var active_name = _.maxBy(_.keys(name_activeCount), function (o) { return name_activeCount[o]; });

    var finalResult = {
      most_active: {
        attacker_king: active_attacker,
        defender_king: active_defender,
        region: active_region,
        name: active_name
      },
      attacker_outcome: {
        win: totalWins,
        loss: totalLoss
      },
      battle_type: _.compact(_.uniq(battle_type)),
      defender_size: {
        max: (Math.max.apply(0, defender_size)),
        min: (Math.min.apply(0, defender_size)),
        average: Math.round(_.mean(defender_size))
      }
    }
    res.send(finalResult);
  })
})


/* /deletedetails -> this api is to delete records from Db  */

//sample Api
router.delete('/deletedetails',validateAuthentication,(req,res)=>
{
  BattleSChema.remove({},(err,response)=>{
    if (err) {
      console.log("Error while deleting data from DB");
      res.send({ "message": "Error while deleting data from DB ", status: 500 })
    }
    console.log(response);
    res.send(response);
  })
})

function validateAuthentication(req,res,next){
    if(req.headers.authorization){
    jwt.verify(req.headers.authorization, secrete, function (err, decoded) {
      if (err) {
      console.log("Error while validating user");
      res.send({ "message": "Error while validating user,Please Login Again", status: 500 })
    }// bar
    else
    next();
    });
  } else {
    res.send({ "status": 403, "message": "User is not Autherized to access api, Please login" })
  }
}

module.exports = router;
