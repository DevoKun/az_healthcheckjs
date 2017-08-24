#!/usr/bin/env node

const fs                    = require('fs')

const STATUS_OK             = 0
const STATUS_WARNING        = 1
const STATUS_CRITICAL       = 2
const STATUS_UNKNOWN        = 3

const STATUS_OK_TXT         = 'OK'
const STATUS_WARNING_TXT    = 'WARNING'
const STATUS_CRITICAL_TXT   = 'CRITICAL'
const STATUS_UNKNOWN_TXT    = 'UNKNOWN'

var azHealthcheckStatus     = STATUS_OK
var azHealthcheckStatus_txt = STATUS_OK_TXT


//
// Determine which config file to use.
//
var check_mk_service_name = 'az_healthcheck'

var configFileName        = 'asdfaz_healthcheck.json'
var configFilePath        = '/etc/'
var statusFile            = '/var/run/az_healthcheck_status.json'
var configFileStatus      = ''
var configFilePathAndName = (configFilePath + configFileName)
if (fs.existsSync(configFilePathAndName)) {
} else {
  configFilePathAndName = process.cwd() + '/' + configFileName

  if (fs.existsSync(configFilePathAndName)) {
  } else {
    configFilePathAndName = './' + configFileName

    if (fs.existsSync(configFilePathAndName)) {
      console.log(`    found config file`)
    } else {
      configFilePathAndName = undefined
    } // if 3

  } // if 2

} // if 1



//
// Load Config
//
if (fs.existsSync(configFilePathAndName)) {

  var conf = require(configFilePathAndName)

  if (conf.hasOwnProperty('statusFile')) {
    statusFile = conf['statusFile']
  } // if

  if (conf.hasOwnProperty('check_mk_service_name')) {
    check_mk_service_name = conf['check_mk_service_name']
  } // if




} else { // if fs.existsSync(configFilename)

  configFileStatus=`config file does not exist. Using defaults.`

} // if




//
// Load Status File
//
// {"statusCode":"503","statusText":"unhealthy"}
//
if (fs.existsSync(process.cwd() + '/' + statusFile)) {
	var status = require(process.cwd() + '/' + statusFile)


	if (`${status['statusCode']}` == '200') {
		azHealthcheckStatus     = STATUS_OK
		azHealthcheckStatus_txt = STATUS_OK_TXT
	} else {
		azHealthcheckStatus     = STATUS_CRITICAL
		azHealthcheckStatus_txt = STATUS_CRITICAL_TXT
	} // if else

	/* *******************************************
			Status (Nagios Code)
			    0 = OK
			    1 = WARNING
			    2 = CRITICAL
			    3 = UNKNOWN

			Item-Name (underscore_separated_words)

			Performance-data
					varname=value;warn;crit;min;max|varname=value;warn;crit;min;max

			Check-output
	******************************************* */

	console.log(`${azHealthcheckStatus} ${check_mk_service_name} ` + // check name
							`statusCode=${status['statusCode']} ` +              // perfdata
							`- ${azHealthcheckStatus_txt} ` +                    // check output
							`${status['statusText']}`)

} else {
	console.log(`${STATUS_UNKNOWN} ${check_mk_service_name} ` + // check name
					`- ` +                                              // perfdata
					`- ${STATUS_UNKNOWN_TXT} ` +                        // check output
					`Status file (${statusFile}) not found. ${configFileStatus}`)
}





