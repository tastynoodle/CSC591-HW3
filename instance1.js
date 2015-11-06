var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})

///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next) 
{
	client.lpush("mylist", req.url);
	client.ltrim("mylist", 0, 4);

	next(); // Passing the request to the next handler in the stack.
});

app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body) // form fields
   console.log(req.files) // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		client.lpush("myimg", img);
	  		console.log(img);
		});
	}

   res.status(204).end()
}]);

app.get('/get', function(req, res) {
	client.get("key", function(err,value){ res.send(value); });
})

app.get('/set', function(req, res){
	client.set("key","this message will self-destruct in 10 seconds");
	client.expire("key",10);
	res.send("set key successfully.");
	res.end();
})

app.get('/recent', function(req,res){
	client.lrange("mylist", 0, 4, function(error, items){
		res.send(items.join('<br>'));
	})
});

app.get('/meow', function(req, res) {
	res.writeHead(200, {'content-type':'text/html'});
	var image = client.lrange("myimg", 0, 0, function(error, items){
		if (error) throw error
		if( items.length == 0 )
			res.end();

		items.forEach(function (imagedata) 
		{
			client.lpop("myimg");
   			res.write("<h1>\n<img src='data:my_pic.jpg;base64," + imagedata + "'/>");
   			res.end();
		});
	})
})

app.get('/', function(req, res) {
	res.send("Hello, this is instance1.");
})

var args = process.argv.slice(2);
var port = args[0];

// HTTP SERVER
var server = app.listen(port, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
