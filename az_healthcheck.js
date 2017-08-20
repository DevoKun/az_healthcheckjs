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
var hosts          = [ [{"name":"tomcat7","url":"http://0.0.0.0:8080/"}], [{"name":"hello","url":"world"}] ];
var azStatusCode   = 200;
var azStatusText   = 'healthy';
var checkInterval  = 3000;
var statusFile     = '/var/run/azh.status';
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
  console.log(req.url)
  
  res.writeHead(azStatusCode,{'Content-Type': 'text/json'});
  res.write(`{'status': azStatusText}`);
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

function httpHealthCheck(error, response, body) {

  if (!error && response.statusCode == 200) {
    console.log(body);
    return 200;
  } else {
    return 500;
  } // if
  
} // function






/* **************************** */



setInterval(function(){ 

  console.log(`checking host status every ${checkInterval}`);
  
  
  azStatusCode = 200;
  azStatusText = 'healthy';
  
  
  
  hosts.forEach(function(host){ 

    console.log(`testing host (${host.name}): ${host.url}`);

    var httpCode = request(host, httpHealthCheck);
  
    if (httpCode == 500) {
      azStatusCode = httpCode;
      azStatusText = 'unhealthy';
    } // if httpCode

    console.log(`${httpCode}: ${host.url}`);
  
    hosts.host.statusCode = httpCode;


  }) // hosts.forEach

  fs.writeFile(statusFile, `${azStatuscode}:${azStatusText}`, function(err) {
    if(err) { return console.log(err); }
    console.log(`Wrote status: [${azStatuscode}:${azStatusText}] to log file: ${statusFile}`);
  }); // fs.writeFile



}, checkInterval); // setInterval

