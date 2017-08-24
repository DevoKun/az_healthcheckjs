#!/usr/bin/env node


/*

  Install the AZ Healthchecker on the frontend host which connects to the ELB.

  If *any* of the backend hosts has an issue: 
    return a 503 http code so the instance is removed from the ELB.

*/



const http    = require('http')
const fs      = require('fs')

/* npm install request */
const request = require('request')



//
// Defaults
//
var port           = 3000
var hosts          = {"tomcat7": {"name":"tomcat7","url":"http://0.0.0.0:8080/"}, "http": {"name":"http","url":"http://0.0.0.0:80/"} }
var browserAgent   = "azHealthcheckJs"

var azStatusCode   = 404
var azStatusText   = 'healthy'
var checkInterval  = 3000
//var statusFile     = '/var/run/azh.status'
var statusFile     = 'azh.status'
var dots           = '............................................'

//
// Determine which config file to use.
//
var configFileName = 'az_healthcheck.json'
var configFilePath = '/etc/'

var configFilePathAndName = (configFilePath + configFileName)
console.log(`... looking for config file: [${configFilePathAndName}]`)
if (fs.existsSync(configFilePathAndName)) {
  console.log(`    found config file at system level: ${configFilePath}`)
} else {
  console.log(`    not found.`)
  configFilePathAndName = process.cwd() + '/' + configFileName
  console.log(`... looking for config file: [${configFilePathAndName}]`)

  if (fs.existsSync(configFilePathAndName)) {
    console.log(`    found config file`)
  } else {
    console.log(`    not found.`)
    configFilePathAndName = './' + configFileName
    console.log(`... looking for config file: [${configFilePathAndName}]`)

    if (fs.existsSync(configFilePathAndName)) {
      console.log(`    found config file`)
    } else {
      console.log(`    could not find config file. Using built-in defaults.`)
      configFilePathAndName = undefined
    } // if 3

  } // if 2

} // if 1

//
// Load Config
//
if (fs.existsSync(configFilePathAndName)) {
  console.log(`config file: (${configFilePathAndName}).`)

  var conf = require(configFilePathAndName)

  if (conf.hasOwnProperty('port')) {
    port = conf['port']
  } // if

  if (conf.hasOwnProperty('hosts')) {
    hosts = conf['hosts']
  } // if

  if (conf.hasOwnProperty('checkInterval')) {
    checkInterval = conf['checkInterval']
  } // if

  if (conf.hasOwnProperty('statusFile')) {
    statusFile = conf['statusFile']
  } // if

  if (conf.hasOwnProperty('browserAgent')) {
    browserAgent = conf['browserAgent']
  } // if

} else { // if fs.existsSync(configFilename)
  console.log(`config file does not exist. Using defaults.`)
} // if



/* **************************** */

const requestHandler = (req, res) => {
  
  res.writeHead(azStatusCode,{'Content-Type': 'text/json'})
  var hostsJson = JSON.stringify(hosts)
  res.write(`{"statusCode": "${azStatusCode}","status": "${azStatusText}","hosts": ${hostsJson}}`)
  res.end()

} // requestHandler



const server = http.createServer(requestHandler)

server.listen(port, (err) => {  

  if (err) {
    return console.log(`unable to start http server on ${port}`, err)
  } // if

  console.log(`server is listening on ${port}`)
}) // server.listen








/* **************************** */



function writeAzStatusFile(statusCode='299', statusText='unknown') {

  console.log(`  * writing status....................: [${statusCode}:${statusText}] to log file: ${statusFile}`)
  fs.writeFile(statusFile, `{"statusCode":"${statusCode}","statusText":"${statusText}"}`, function(err) {
    if(err) {
      return console.log(err)
    } else {
      console.log(`  * wrote status......................: [${azStatusCode}:${azStatusText}] to log file: ${statusFile}`)
    } // if err
  }); // fs.writeFile

} // function writeAzStatusFile




setInterval(function(){ 

  console.log(`\nwaiting ${checkInterval} seconds and then checking host statuses...`)
  
  azStatusCode = 200
  azStatusText = 'healthy'
  
  Object.keys(hosts).forEach(function(key) { 

    var host = hosts[key]

    console.log(`  * testing host (${host.name})` + dots.substring(1, (20-host.name.length)) + `: ${host.url}`)

    //
    // add user agent string if not customized in config
    //
    if (host.headers == undefined) {
      host.headers = {'User-Agent': browserAgent, "X-Browser-Agent": browserAgent}
    } else if (host.headers['User-Agent'] == undefined) {
      host.headers['User-Agent'] = browserAgent
    } else if (host.headers['X-Browser-Agent'] == undefined) {
      host.headers["X-Browser-Agent"] = browserAgent
    } // if

    var startTime = (new Date()).getTime()
    request({url:host.url, headers:host.headers}, function (error, response, body) {

      if (!error && response.statusCode == 200) {
        hosts[key].statusCode = "200 (${response.statusCode})"
        console.log(`  * good state on ${key}, AZ health is: [${azStatusCode}:${azStatusText}]`)
        if ( (key == Object.keys(hosts)[Object.keys(hosts).length - 1]) &&
             (azStatusCode == 200) ) {
          writeAzStatusFile(azStatusCode, azStatusText)
        } // if last key in hosts object
      } else {
        azStatusCode  = 503
        azStatusText  = 'unhealthy'
        var errorCode = error.code
        //if (error.code == 'ECONNREFUSED') {errorCode = ""}
        //if (error.code == 'ETIMEDOUT') {errorCode = ""}
        if (error.connect == true) {errorCode = "${errorCode} (ECONNTIMEDOUT)"}
        hosts[key].statusCode = errorCode
        console.log(`  * bad state on ${key}, setting AZ health: [${azStatusCode}:${azStatusText}]`)
        writeAzStatusFile(azStatusCode, azStatusText)
      } // if
      var stopTime     = (new Date()).getTime()
      var responseTime = stopTime - startTime
      hosts[key].responseTime = responseTime

    }); // request
  

  })






}, checkInterval); // setInterval

