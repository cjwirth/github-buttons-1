
var fs = require('fs');
var path = require('path');
var execFile = require('child_process').execFile;

var express = require('express');
var marked = require('marked');

var app = express();
var home = process.env.HOME;
var phantomDir = home + '/app-root/data/phantomjs';

// expiration of button cache
var expire = 3600000; // 1 hour
var ip = process.env.OPENSHIFT_NODEJS_IP || "localhost";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

// With Openshift, I have restrictions...
var phantomOptions = {
    port: 15000,
    hostname: ip,
    path: "~/app-root/data/phantomjs/bin/"
};

app.get('/', function (req, res) {
    fs.readFile('README.md', 'utf8', function(err, data){
        if (!err) res.send(200, marked(data));
        else res.send(404, "Not Found");
    });
});

app.get('/stars/:user([a-z0-9-_]+)/:repo([a-z0-9-_]+)', function(req, res){

    var user = req.params.user,
        repo = req.params.repo;

    var url = "http://ghbtns.com/github-btn.html?user=" + user + "&repo=" + repo + "&type=watch&count=true";
    var filename = user + "-" + repo + ".png";
    var output = path.join(__dirname, filename);

    if (fs.existsSync(output)) {
        var stat = fs.statSync(output);
        var now = new Date().getTime();

        if (now < stat.mtime.getTime() + expire) {
            res.sendfile(output);
            return
        }
    }

    var phantomjs = path.join(phantomDir, "bin", "phantomjs");
    var args = [
        path.join(__dirname,'rasterize.js'),
        url,
        output
    ];

    execFile(phantomjs, args, {}, function(error, stdout, stderr) {
        console.log('Finished Running For URL: ' + url);
        if (error) {
            console.log('Error loading: ' + error);
        }
        if (stdout) {
            console.log("STDOUT: "+stdout);
        }
        if (stderr) {
            console.log("STDERR: "+stderr);
        }

        if (error) {
            res.send(500, "Failed to generate the button");
        } else {
            res.sendfile(output);
        }
    });
});
 
console.log("Trying on ip: " + ip + ":" + port);
var server = app.listen(port, ip, function() {
    console.log('Listening on port %d', server.address().port);
});

