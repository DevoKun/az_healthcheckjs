#!/usr/bin/env node


/*

  Install the AZ Healthchecker on the frontend host which connects to the ELB.

  If *any* of the backend hosts has an issue: 
    return a 500 http code so the instance is removed from the ELB.

*/



var http    = require('http');
var fs      = require('fs');

/* npm install request */
var request = require('request');



//
// Defaults
//
var port           = 3000;
var hosts          = {"tomcat7": {"name":"tomcat7","url":"http://0.0.0.0:8080/"}, "http": {"name":"http","url":"http://0.0.0.0:80/"} };
var azStatusCode   = 200;
var azStatusText   = 'healthy';
var checkInterval  = 3000;
//var statusFile     = '/var/run/azh.status';
var statusFile     = 'azh.status';
var configFilename = '/etc/azh.json';

//
// Load Config
//
if (fs.existsSync(configFilename)) {
  var conf = require();

  if (conf.hasOwnProperty('port')) {
    port = conf['port'];
  } // if

  if (conf.hasOwnProperty('hosts')) {
    hosts = conf['hosts'];
  } // if

  if (conf.hasOwnProperty('checkInterval')) {
    checkInterval = conf['checkInterval'];
  } // if

  if (conf.hasOwnProperty('statusFile')) {
    statusFile = conf['statusFile'];
  } // if

} else { // if fs.existsSync(configFilename)
  console.log(`config file (${configFilename}) does not exist. Using defaults.`)
} // if



/* **************************** */

const requestHandler = (req, res) => {  
  //console.log(req.url)
  
  res.writeHead(azStatusCode,{'Content-Type': 'text/json'});
  var hostsJson = JSON.stringify(hosts);
  res.write(`{"statusCode": "${azStatusCode}","status": "${azStatusText}","hosts": ${hostsJson}}`);
  
  //hosts.forEach(function(host) {
  /*
  Object.keys(hosts).forEach(function(key) { 
    var host = hosts[key];
    res.write(`{"name":"${host.name}", "status": "${host.statusCode}", "url":"${host.url}"}`);
  }) // hosts.forEach function
  res.write(']}');
  */
  res.end();

} // requestHandler



const server = http.createServer(requestHandler)

server.listen(port, (err) => {  

  if (err) {
    return console.log(`unable to start http server on ${port}`, err)
  } // if


  console.log(`server is listening on ${port}`)
}) // server.listen








/* **************************** */



setInterval(function(){ 

  console.log(`\nwaiting ${checkInterval} seconds and then checking host statuses...`);
  
  
  azStatusCode = 200;
  azStatusText = 'healthy';
  
  


  //console.log("\n\nhosts: %j\n\n", hosts)
  
  //hosts.forEach(function(host) { 
  Object.keys(hosts).forEach(function(key) { 

    var host = hosts[key];

    //console.log("\n\nhost:\n%j\n\n", host)
    //console.log("\n\n... nameO:", host.name)
    //console.log("\n\n... name :", host['name'])
    //console.log("\n\n... name0:", host[0]['name'])
    //console.log("\n\n... name1:", host[1]['name'])

    console.log(`  * testing host (${host.name}): ${host.url}`);

    var httpCode  = 200;
    var startTime = (new Date()).getTime();
    request(host.url, function (error, response, body) {

      if (!error && response.statusCode == 200) {
        //console.log(body);
        httpCode     = 200;
        azStatusCode = 200;
        //console.log("\n200-host: %j\n", hosts[key])
        hosts[key].statusCode = response.statusCode
      } else {
        //console.log(error.code)
        httpCode     = 500;
        azStatusCode = 500;
        azStatusText = 'unhealthy';
        //console.log("\n500-host: %j\n", hosts[key])
        var errorCode = error.code;
        //if (error.code == 'ECONNREFUSED') {errorCode = ""}
        //if (error.code == 'ETIMEDOUT') {errorCode = ""}
        if (error.connect == true) {errorCode = "${errorCode} (ECONNTIMEDOUT)"}
        hosts[key].statusCode = error.code
      } // if
      var stopTime     = (new Date()).getTime();
      var responseTime = stopTime - startTime;
      hosts[key].responseTime = responseTime;

      //console.log(`1-httpCode: ${httpCode}`)
    }); // request
  

    //console.log(`2-${httpCode}: ${host.url}`);
  
    //hosts.host.statusCode = httpCode;


  }) // hosts.forEach

  fs.writeFile(statusFile, `${azStatusCode}:${azStatusText}`, function(err) {
    if(err) { return console.log(err); }
    console.log(`  * wrote status: [${azStatusCode}:${azStatusText}] to log file: ${statusFile}`);
  }); // fs.writeFile



}, checkInterval); // setInterval

