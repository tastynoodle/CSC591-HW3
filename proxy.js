var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})

var instance1 = 'http://127.0.0.1:3000';
var instance2  = 'http://127.0.0.1:3001';

var infrastructure =
{
  setup: function()
  {
    // Proxy.
    client.lpush('instances', instance1);
    client.lpush('instances', instance2);
    client.ltrim('instances', 0, 1);

    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      client.rpoplpush('instances', 'instances', function(err, des){
              proxy.web( req, res, {target: des } );
      })
    });
    server.listen(8080);

    // Launch green slice
    exec('forever start instance1.js 3000', function(err, out, code) 
    {
      console.log("attempting to launch instance1");
      if (err instanceof Error)
            throw err;
      if( err )
      {
        console.error( err );
      }
    });

    // Launch blue slice
    exec('forever start instance2.js 3001', function(err, out, code) 
    {
      console.log("attempting to launch instance2");
      if (err instanceof Error)
        throw err;
      if( err )
      {
        console.error( err );
      }
    });

//setTimeout
//var options = 
//{
//  url: "http://localhost:8080",
//};
//request(options, function (error, res, body) {

  },

  teardown: function()
  {
    exec('forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  },
}

infrastructure.setup();

// Make sure to clean up.
process.on('exit', function(){infrastructure.teardown();} );
process.on('SIGINT', function(){infrastructure.teardown();} );
process.on('uncaughtException', function(err){
  console.error(err);
  infrastructure.teardown();} );