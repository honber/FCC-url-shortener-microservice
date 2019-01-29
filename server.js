'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var cors = require('cors');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

mongoose.connect(process.env.MONGO_URI);

var Schema = mongoose.Schema;
var urlSchema = new Schema({
  original_url: String,
  short_url: Number
})

var NewUrl = mongoose.model('NewUrl', urlSchema);

app.use(bodyParser.urlencoded({extended: true}));

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

function findAvailableShortUrl(arrayOfshortUrls){
  let lastIndex = arrayOfshortUrls.length - 1;
  let largestElementOfArray = arrayOfshortUrls.sort((a, b)=>{return a-b})[lastIndex];
  
  for(var i=1; i<=largestElementOfArray; i++){
    if(arrayOfshortUrls.indexOf(i) === -1){
      return i;
    }
  }
  return i;
}

function checkIfUrlAlreadyExistsInDB(url){
  NewUrl.find({original_url: url}, function(err, response){
    return response;
  })
}


app.post('/api/shorturl/new', function(req, res){
  let addressToValidate = req.body.url; 
  const HTTPS_PREFIX = '^https://';
  if (!addressToValidate.match(HTTPS_PREFIX)){
    addressToValidate = 'https://' + addressToValidate;
  }
  
  request(addressToValidate , function (error, response, body) {
    if(error){
      console.log('Error: '+ error);
      res.json({"error":"invalid URL"});
    }
    else if(response.statusCode >= 200 && response.statusCode <= 202 || response.statusCode == 202 || 
       response.statusCode == 301 || response.statusCode == 302 || response.statusCode == 401 || response.statusCode == 403){
            
      console.log(addressToValidate + ' is alive; statusCode: ' + response.statusCode);
      NewUrl.find({original_url: req.body.url}, function(err, response){
        const urlCheckedInDB = response;
              
        if(urlCheckedInDB.length === 0){
          console.log('URL does not exists in DB yet');
          NewUrl.find({}, function(err, response){
          return response
          })            
          .then(function(data){
            return findAvailableShortUrl(data.map((element)=>{return element.short_url}));    
          })
          .then(function(valueForShortUrl){
            let nextUrl = new NewUrl({original_url: req.body.url, short_url: valueForShortUrl});
            nextUrl.save(function(err, response, next){
              res.json({"original_url": req.body.url, "short_url": valueForShortUrl})
            })
          })
          .catch(function(err){
            console.log(err);
          }); 
        }
        else{
          console.log('already exists');
          res.json({"original_url": req.body.url, "short_url": urlCheckedInDB[0].short_url});
        }            
      })     
    }
    else{
      console.log(addressToValidate + ' is dead; statusCode: ' + response.statusCode);
      res.json({"error":"invalid URL"});
    }
  })       
});  

app.get('/api/shorturl/:url', function(req, res){
  var urlToFindInDB = parseInt(req.params.url);
  NewUrl.find({short_url: urlToFindInDB}, function(err, response){   
    if(err){
      console.log(err)
    }
    else if(response.length === 0){
      res.json({"error":"No short url found for given input"})
    }
    else {
      const HTTPS_PREFIX = '^https://';
      let urlToRedirect = response[0].original_url;
      if (!urlToRedirect.match(HTTPS_PREFIX)){
        urlToRedirect = 'https://' + urlToRedirect;
      }
      console.log('Short URL ' + response[0].original_url + ' was found in DB');
      res.redirect(urlToRedirect);
    }  
  })
})


app.get('/find', function(req, res){
  NewUrl.find({}, function(err, response){
    if(err){
      console.log(err);
    }
    else{
      res.json(response);
    }
  });
})

app.get('/remove', function(req,res){
  NewUrl.remove({}, function(err, response){
    if(err){
      console.log(err);
    }
    else{
      res.send('All records removed from DB');
    }                              
  })
})


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});