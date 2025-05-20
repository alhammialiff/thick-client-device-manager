// ==========================================================
// TO UPDATE PROXY-2 WEBSOCKET (3002) AFTER PROXY-1 (3001) IS DEVELOPED
// 1. Copy-paste
// 2. Change global var PORT to 3002
// ==========================================================

var ws = require('ws');

// Initialise Web Socket Server
const webSocketServer = new ws.WebSocketServer({ port: 8081 });

const express = require("express");

// ====03/10: INCREASED MAXLISTENER TO 15]
const {
  setMaxListeners,
  EventEmitter,
} = require('node:events');

const target = new EventTarget();
const emitter = new EventEmitter();

setMaxListeners(15, target, emitter);

const app = express();

// ====[NODEJS-COMPATIBLE FORM DATA IMPORT]
const FormData = require('form-data');
const PORT = process.env.PORT || 3002;
const HOLOLENS_CREDENTIALS = {
  username: 'ioxpCustomer_4g01_1',
  password: 'stk@AR-4650'
}
const cors = require("cors");
const fetch = require("node-fetch");


// ====[MULTER PACKAGE IMPORT AND CONFIGS]
const multer = require("multer");
// const upload = multer({dest: __dirname + "/uploads"});
const multerStorage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,"uploads");
    },
    filename: (req,file,cb)=>{
        const extensionFormat = file.mimetype.split("/")[1];
        console.log("In Multer's Diskstorage - file: ", file);
        // cb(null, `${file.fieldname}.${extensionFormat}`)
        cb(null, file.originalname)
        console.log("In Multer's Diskstorage - concat file: ", `${file.fieldname}.${extensionFormat}`);
    }
});
const upload = multer({
    storage: multerStorage
})

const fileSystem = require('fs');
app.use(cors());
app.use(express.raw({
    limit: "200mb"
}));
app.use(express.urlencoded({ extended: true }));
app.use(upload.single('package'));
app.use(express.json());



var csrfToken= '';


// ========================================================
// ESSENTIAL APIS - Used in every polling of HoloLens Data
// ========================================================
const HOLOLENS_ESSENTIAL_APIS = [
    {
        name: 'Get Hololens Apps',
        // api: 'http://172.16.2.20/api/app/packagemanager/packages',
        api: `/api/app/packagemanager/packages`
    },
    {
        name: 'Get Battery Life',
        api:`/api/power/battery`
    },
    {
        name: 'Get Power State Info.',
        api: `/api/power/state`
    },
    {
        name: 'Computer Name',
        api: `/api/os/machinename`
    },
    {
        name: 'Get File Info',
        api: `/api/filesystem/apps/file`
    }


];

hlStreamToStop = '';
abortController = new AbortController();

// ==========================
// CORS SETTING
// ==========================
var allowlist = ['http://localhost:4200'];
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

// ==========================
// HTTPS MODULE
// ==========================
const https = require('https');

// Read SSL Key and Cert from respective SSL files
const httpsOptions = {

  key: fileSystem.readFileSync('./ssl/private.key'),
  cert: fileSystem.readFileSync('./ssl/certificate.crt')

}

// Serve server over HTTPS at PORT 3002
https.createServer(httpsOptions, app).listen(PORT);




// ==============================================================
//  Device Onboarding and Data Refresh-related APIs
// ==============================================================

// FE-to-BE API call: [Register Hololens]
app.get(`/register`, function(req,res){

    const flag = 'registration';

    // console.log("Calling /register ...", req.query);

    fetchHololensApisOnInit(req.query, res, flag);

});

// FE-to-BE API call: [INitial Hololens Data Load]
app.get(`/initload`, function(req,res){

    const flag = 'device-data-load'

    // console.log("Calling /initload ...", req.query);

    fetchHololensApisOnInit(req.query, res, flag);

});

// FE-to-BE API call: [Refresh Hololens Data]
app.get(`/refresh`, function(req,res){

    const flag = 'refresh'

    fetchHololensApiOnSteadyState(req.query, res, flag);

});



// ==============================================================
//  HL2 App-related APIs
// ==============================================================

// FE-to-BE API call: [Install Hololens App] (with multer's middleware to point to our file)
app.post(`/api/app/packagemanager/package`, upload.single("package"),function(req, res){

    // console.log("In app.post() install app - req.body",req.body);
    // console.log("In app.post() install app - req.file",req.file);
    // console.log("In app.post() install app - req.query",req.query);

    installHLApp(req,res);

    // return res.json({status: "Files received"});

});

// FE-to-BE API call: [Delete Hololens App]
app.delete(`/api/app/packagemanager/package`, function(req,res){

    uninstallHLApp(req,res);

})

// [KIV] FE-to-BE API call: [Refresh Hololens Data]
app.get(`/getinstalledapps`, function(req,res){

  const flag = 'get-installed-apps'

  // console.log("Calling /devicedataload ...", req.query);

  fetchHololensInstalledApps(req, res, flag);

});

// [KIV] FE-to-BE API call: [Play Hololens Data]
app.post('/playapp', function(req,res){

  const flag = 'play-app';
  // console.log("[/playapp] req.query", req.query);
  playHololensApp(req, res, flag);

});

// [KIV] FE-to-BE API call: [Stop Hololens Data]
app.delete('/stopapp', function(req,res){

  const flag = 'stop-app';
  // console.log("[/stopapp] req.query", req.query);
  stopHololensApp(req, res, flag);

});



// ==============================================================
//  Power-related Remote Controls
// ==============================================================

// FE-to-BE API call: [Restart app]
app.post(`/api/control/restart`,function(req, res){

  const flag = 'restart-app';

  setTimeout(()=>{
      restartHL(req,res, flag);
  },2000);

});

// FE-to-BE API call: [Shutdown app]
app.post(`/api/control/shutdown`,function(req, res){

  const flag = 'shutdown-app';

  setTimeout(()=>{
      shutdownHL(req,res, flag);
  },2000);

});

// FE-to-BE API call: [Get File Info from HL filesystem]
app.get('/api/filesystem/apps/file', function(req,res){

  getAppFileInfo(req,res);

});

// [WEBSOCKET DEV] ====================================================
// [WIP] FE-to-BE API call: [Store Registered Device]
// Store REGISTERED_DEVICES IN BACKEND for processing
// ====================================================================
app.post('/storeregistereddevices', function(req,res){

  console.log("-------------------------------------------------(websocket)[Store Registered Devices] Received -",req.body);

  return res.status(200).send({
    statusCode: 200,
    data: req.body,
    error: null
  });

})



// ==============================================================
//  Network-related APIs
// ==============================================================
app.get('/getwifiinfo', function(req,res){

  const flag = 'get-wifi-info';

  getWifiProfiles(req,res,flag);

});

app.delete('/deletewifiprofile', function(req,res){

  const flag = 'delete-wifi-profile';

  console.log("[/deletewifiprofile] - req.query",req.query);


  deleteWifiProfile(req,res,flag);

});

app.get('/getwifinetworks', function(req,res){

  const flag = 'get-wifi-network';

  getWifiNetworks(req,res,flag);

});

app.post('/connectwifi', function(req,res){

  const flag = 'connect-wifi-network';

  connectWifi(req,res,flag);

});

// ==============================================================
//  [SHELVED] Mixed Reality Capture-related APIs
// ==============================================================
// [KIV] FE-to-BE API call: Fetching video chunks is successful, but video cannot be played psuedo real-time however (playback only)
app.get('/api/start-video-stream', function(req,res){

  const flag = 'Start MRC Live';

  console.log("In app.get() start vid stream - req.body",req.body);
  console.log("In app.get() start vid stream - req.file",req.file);
  console.log("In app.get() start vid stream - req.query",req.query);

  startVideoStream(req, res);

});

// [KIV] FE-to-BE API call: Fetching video chunks is successful, but video cannot be played psuedo real-time however (playback only)
app.post('/api/stop-video-stream', function(req,res){

  console.log("In app.post() stop vid stream - req.body",req.body);
  console.log("In app.post() stop vid stream - req.file",req.file);
  console.log("In app.post() stop vid stream - req.query",req.query);

  stopVideoStream(req, res);

});

// [KIV] FE-to-BE API call: Fetching video chunks is successful, but video cannot be played psuedo real-time however (playback only)
app.get('/startmrc', cors(corsOptionsDelegate), function(req,res){

    const flag = 'Start MRC Live';
    console.log("[GET MRC START] - req.body",req.body);
    console.log("[GET MRC START] - req.file",req.file);
    console.log("[GET MRC START] - req.query",req.query);

    res.append("Access-Control-Allow-Origin", "*");
    res.append("Access-Control-Allow-Headers",
                    "Origin, X-Requested-With, Content-Type, Accept");

    startMixedRealityCapture(req.query,res,flag);

});

// Estalish backend server connection at port 3001
// app.listen(PORT, () => {
//     console.log("Proxy started at ", PORT);
// });


// ===========================================================
// Serves to fetching existing installed apps in HL
// ===========================================================
async function fetchHololensInstalledApps(req, res, flag){

  var cancelRequestInstalledApps = new AbortController();

  var cancelRequestInstalledAppsTimeout = setTimeout(()=>{

    cancelRequestInstalledApps.abort();
    console.log("ABORT INSTALLED APP APIS");
    cancelRequestInstalledApps = new AbortController();

  },20000);

  const requestHeader = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    "X-CSRF-TOKEN": csrfToken
  };

  const result = await fetch(new URL("http://" + req.query.hlHostAddress + HOLOLENS_ESSENTIAL_APIS[0].api),
    {
      method: "GET",
      mode: "cors",
      headers: requestHeader,
      signal: cancelRequestInstalledApps.signal
      // Added to test next week (11/07)
    })
    .then(response => {
      // console.log("prinitng headers");
      // console.log(res);
        // console.log(res.headers['content-encoding']);

        csrfToken = response.headers.get('set-cookie').slice(11,);

        // console.log("CSRF-Token:",response.headers.get('set-cookie'));
        // console.log(res.headers.server);
        // console.log(res.headers[0].server);
        if(response.ok){

          console.log(`(${flag}) - API 1 - SUCCESS`)

          return response.json();

        }else{

          console.log(`(${flag}) - API 1 - FAILURE`)
          return 'Unsuccessful'

        }
    })
    .then(data => {

      // console.log("FetchWDPAPI - API 1 - data", data);

      // [RESPONSE TO RETURN] Create a new object and append apiCall prop. into response
      let httpResponse = {
        hololensIP: req.query.hlHostAddress,
        timestamp: new Date(),
        fetchType: flag,
        fetchSuccess: true,
        errorMessage: null,
        apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
        csrfToken: csrfToken,
        ...data
      }

      // console.log("newObject:", newObject);

      return httpResponse;

    })
    .catch(error => {

      console.log('[API #1 ERROR]', error);

      let errorMessage = {
        timestamp: new Date(),
        fetchType: flag,
        fetchSuccess: false,
        errorMessage: error
      }

      return errorMessage;

    })
    .finally(()=>{
      clearTimeout(cancelRequestInstalledAppsTimeout);
    });

    return res.send(result);

}

// ===========================================================
// Serves to perform remote restart on HL
// ===========================================================
async function restartHL(req, res, flag){

    console.log("[Restart][Entered restartHL()]");

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
        "X-CSRF-TOKEN": csrfToken
    };

    // API Call #1
    // await fetch(`https://172.16.2.20/api/app/packagemanager/package?package=ITEWestAssessmentMockUp_1.0.0.0_arm__pzq3xp76mxafg`,{
    //     method: "DELETE",
    //     mode: "cors",
    //     headers: headers
    // })
    var result = await fetch(`http://${req.query.host}/api/control/restart`,{
        method: "POST",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {

        console.log('[Restart][Success][${req.query.host}] Hololens restart - httpResponse', httpResponse);

        if(httpResponse.status === 200){
            console.log(`[Restart][Success][${req.query.host}] Hololens restarted`);

            return true;

        }else{

            console.log(`[Restart][Failed][${req.query.host}] Installing not successful`);
            return false;

        }

    })
    .then(data => {

      let responseObject = {

        hololensIP: req.query.hlHostAddress,
        timestamp: new Date(),
        fetchType: flag,
        success: data,
        errorMessage: null,
        apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
        csrfToken: csrfToken

      }

      return responseObject;

    })
    .catch(error => {

      console.log('ERROR:', error)

      let errorObject = {

        hololensIP: req.query.hlHostAddress,
        timestamp: new Date(),
        fetchType: flag,
        success: false,
        errorMessage: null,
        apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
        csrfToken: csrfToken

      }

      return errorObject;

    });

    return res.send(result);

}


// ===========================================================
// Serves to perform remote shutdown on HL
// ===========================================================
async function shutdownHL(req,res){
    var shutdownResponse;
    console.log("[Entered shutdownHL(...)]");

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
        "X-CSRF-TOKEN": csrfToken
    };

    // API Call #1
    // await fetch(`https://172.16.2.20/api/app/packagemanager/package?package=ITEWestAssessmentMockUp_1.0.0.0_arm__pzq3xp76mxafg`,{
    //     method: "DELETE",
    //     mode: "cors",
    //     headers: headers
    // })
    var result = await fetch(`http://${req.query.host}/api/control/shutdown`,{
        method: "POST",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {

        if(httpResponse.ok){

            console.log(`[Shutdown][${req.query.host}][Success] Hololens Shutting down...`);

            shutdownResponse = {
                timestamp: new Date(),
                hostIP: req.query.host,
                shutdownSuccess: true,
                status: httpResponse.ok
            }

        }else{

            console.log(`[Shutdown][${req.query.host}][Failed] Shutdown not successful`);

            shutdownResponse = {
              timestamp: new Date(),
              hostIP: req.query.host,
              shutdownSuccess: false,
              status: httpResponse
          }

        }

        return shutdownResponse;

    })
    .then(data =>{

      return data;

    })
    .catch(error => {

      console.log(`[Shutdown][${req.query.host}][ERROR]`);

      var errorObject = {

        timestamp: new Date(),
        hostIP: req.query.host,
        shutdownSuccess: false,
        ...error

      }

      return errorObject;

    });

    return res.send(result);

}

// ===========================================================
// This method serves to perform app installation
// ===========================================================
async function installHLApp(req, res){

    // [DEBUG MESSAGES] ===================
    // console.log("Request from front-end - req", req);
    // console.log("Request from front-end - req.query", req.query);
    // console.log("Request from front-end - req.body", req.body);
    console.log(`[installHLApp()][${req.query.host}] - csrfToken:`);
    // console.log("In installHPApp() - bodyData (after append param)", bodyData);
    // ====================================


    // HTTP Header with Fetch's Header instance
    const httpHeader = new Headers({
        // "Content-Type": "multipart/form-data",
        // "Content-Type" : "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
        // "X-CSRF-Token": csrfToken,
        "Cookie": `CSRF-Token=${csrfToken}`
        // "cookie": csrfToken
    });

    // [DEBUG MESSAGES] ===================
    // console.log("Install HL App - HTTP header:", httpHeader);
    // console.log("Install HL App - req.file.originalname:", req.file.originalname);
    // console.log("Install HL App - typeof req.header:", typeof req.header);
    // console.log("Install HL App - typeof req.file.originalname:", typeof req.file.originalname);
    console.log("[Install HL App][req.body]:", req.body);
    // console.log("Install HL App - typeof req.body:", typeof req.body);
    // console.log("Install HL App - req.file:", req.file);
    // console.log("Install HL App - typeof req.file:", typeof req.file);
    console.log("[Install HL App][req.file.path]", req.file.path);
    console.log("[Install HL App][full path]", __dirname + '\\' + req.file.path);
    // ====================================

    // Instantiate Form Data object
    var formData = new FormData();

    // Create a Readable Stream from HL App
    var hlByteFile = fileSystem.readFileSync(req.file.path);

    // Append Readable Stream into Form Data instance
    formData.append('package',hlByteFile, {
        contentType: 'multipart/form-data',
        name: 'package',
        filename: req.file.originalname
    });

    // Invoke a modularised function to proceed with HTTP POST
    postAppToHL(req,res,httpHeader,formData);


}

// ===========================================================
// This method serves to uninstall app
// ===========================================================
async function uninstallHLApp(req, res){

  var cancelRequestAppUninstallation = new AbortController();

  var cancelRequestAppUninstallationTimeout = setTimeout(()=>{

    cancelRequestAppUninstallation.abort();
    console.log("[[ABORT UNINSTALL APP APIS]]");
    cancelRequestAppUninstallation = new AbortController();

  },20000);

  var responseObject;

    // console.log("Request from front-end - req", req);
    console.log("Request from front-end - req.query", req.query);
    console.log("[Entered uninstallHLApp()] - csrfToken:", csrfToken);

    // HTTP Header with Fetch's Header instance
    const httpHeader = new Headers({
        // "Content-Type": "multipart/form-data",
        // "Content-Type" : "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
        // "X-CSRF-Token": csrfToken,
        "Cookie": `CSRF-Token=${csrfToken}`
        // "cookie": csrfToken
    });

    // Fetch POST uninstall
    // console.log("Inside uninstallHLApp - req", req);

    var result = await fetch(`http://${req.query.host}/api/app/packagemanager/package?package=${req.query.package}`,{
        method: "DELETE",
        mode: "cors",
        headers: httpHeader,
        signal: cancelRequestAppUninstallation.signal
    })
    .then((httpResponse)=>{

        console.log(`[UNINSTALL APP][${req.query.host}][httpResponse.statusText]`);
        console.log(httpResponse.statusText);

        if(httpResponse.statusText === "OK"){

          console.log(`[UNINSTALL APP][${req.query.host}][SUCCESS]`);

          responseObject = {

            timestamp: new Date(),
            hostIP: req.query.host,
            uninstallAppSuccess: true,
            response: httpResponse.statusText

          }

        }else{

          responseObject = {

            timestamp: new Date(),
            hostIP: req.query.host,
            uninstallAppSuccess: false,
            response: httpResponse.statusText

          }

          console.log(`[UNINSTALL APP][${req.query.host}][FAILED]`);

        }

        return responseObject;


    })
    .then((data)=>{
        console.log(`[UNINSTALL APP][${req.query.host}]`);
        console.log("[UNINSTALL APP][data]", data);

        return data;

    })
    .catch((err)=>{

      var errorObject = {

        timestamp: new Date(),
        encodedPackageFullName: req.query.praid,
        hostIP: req.query.host,
        playAppSuccess: false,
        ...err

      }

      return errorObject;

    })
    .finally(()=>{

      clearTimeout(cancelRequestAppUninstallationTimeout);

    });

    return res.send(result);

}

// ===========================================================
// This function serves to perform Fetch POST of HL App File to HL
// File has already been packed and ready for sending over HTTP at this point
// ===========================================================
async function postAppToHL(req, res, httpHeader, formData){

  // [DEBUG] To check what is inside formData object
  // for(var [key,value] of formData.entries()){
  //     console.log("Key",key);
  //     console.log("Value", value);
  // }

  var cancelRequestAppInstallation = new AbortController();

  var cancelRequestAppInstallationTimeout = setTimeout(()=>{

    cancelRequestAppInstallation.abort();
    console.log("[[ABORT UNINSTALL APP APIS]]");
    cancelRequestAppInstallation = new AbortController();

  },20000);

  var responseObject;

  console.log("[INSTALL APP IN PROGRESS][postAppToHL] - req.query - ", req.query);
  console.log("[INSTALL APP IN PROGRESS][postAppToHL] - formData - ", formData);
  console.log("[INSTALL APP IN PROGRESS][postAppToHL] - finalized HTTP Header - ", httpHeader);

  // Retrieve HL original file name
  // Reason: When this server receives HL App File, the name has been tokenized and saved
  //         in a staging folder (i.e /uploads)
  hlFileName = req.file.originalname;

  var result = await fetch(`http://${req.query.host}/api/app/packagemanager/package?package=${req.query.package}`,{
      method: "POST",
      mode: "cors",
      headers: httpHeader,
      // body: req.body
      body:formData,
      signal: cancelRequestAppInstallation.signal
      // redirect: 'follow'
  })
  .then(httpResponse => {

      console.log('[INSTALL APP IN PROGRESS][SUCCESS] status', httpResponse.status);
      console.log('[INSTALL APP IN PROGRESS][SUCCESS] HttpStatusCode', httpResponse.HttpStatusCode);
      console.log('[INSTALL APP IN PROGRESS][SUCCESS] statusText', httpResponse.statusText);

      if(httpResponse.status === 202 || httpResponse.statusText === 'OK'){

          console.log(`[INSTALL APP IN PROGRESS][${req.query.host}]}`)
          console.log('[INSTALL APP IN PROGRESS][SUCCESS]', httpResponse);
          // return res.text("successful");
          // return res.json({response: `Installation successful`});

          // Create responseObject for successful installation
          responseObject = {
            timestamp: new Date(),
            hostIP: req.query.host,
            installSuccess: true
          }

      }else{

          console.log('[INSTALL APP IN PROGRESS][FAILED]', httpResponse);

          // Create responseObject for failed installation
          responseObject = {
            timestamp: new Date(),
            hostIP: req.query.host,
            installSuccess: false
          }

      }

      // return responseObject;
      return httpResponse.json();

  })
  .then(jsonData=>{

    console.log('[INSTALL APP IN PROGRESS][JSONDATA]', jsonData);

    return responseObject;

  })
  .catch(error => {

    console.log('[INSTALL APP IN PROGRESS][ERROR]:', error);

    errorObject = {
      timestamp: new Date(),
      hostIP: req.query.host,
      installSuccess: false,
      error: error.message
    }


    // return res.status(400).send(error.message);

    return errorObject;

  })
  .finally(()=>{

    clearTimeout(cancelRequestAppInstallationTimeout);

  });

  // console.log("Installation result-----------------", res.json());
  res.send(result);

}

// ===========================================================
// Send a signal to play HL2 App
// Requires App PRAID
// ===========================================================
async function playHololensApp(req, res, flag){


  var responseObject = {};


  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  console.log("[Play App][Entered playHololensApp(...)]");

  // Perform POST fetch to request HL2 App start
  var result = await fetch(`http://${req.query.host}/api/taskmanager/app?appid=${req.query.praid}&package=${req.query.packageFullName}`,{
    method: "POST",
    mode: "cors",
    headers: httpHeader
  })
  .then((httpResponse)=>{

    console.log(`[Play App][${req.query.host}]`);
    console.log("Backend - playHololensApp(...) - HTTP Response - ", httpResponse.status);

    if(httpResponse.status === 200){

      console.log(`[Play App][${req.query.host}][SUCCESS]`);
      console.log("[Play App][Response] - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        encodedPackageFullName: req.query.praid,
        hostIP: req.query.host,
        playAppSuccess: true

      }

    }else{

      console.log(`[Play App][${req.query.host}][FAILED]`);
      console.log("[Play App][Response] ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        encodedPackageFullName: req.query.praid,
        hostIP: req.query.host,
        playAppSuccess: false

      }

    }

    return responseObject;

  })
  .then((data)=> {

    console.log(`[Play App][${req.query.host}][data]`);

    return data;

  })
  .catch(error=> {

    console.log(`[Play App][${req.query.host}][ERROR]`);


    var errorObject = {

      timestamp: new Date(),
      playAppSuccess: false,
      ...error

    }

    return errorObject;

  });

  return res.send(result);


}

// ===========================================================
// Serve to send a stop signal to currently playing HL2 App
// But of course, this only works on HL2 Apps that are started
// by HoloHub
// ===========================================================
async function stopHololensApp(req, res, flag){

  var responseObject = {}

  console.log("Backend - stopHololensApp(...) - Package - packageFullName - ", req.query.package);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.query.host}/api/taskmanager/app?package=${req.query.package}`,{
    method: "DELETE",
    mode: "cors",
    headers: httpHeader
  })
  .then((httpResponse)=>{

    if(httpResponse.status === 200){

      console.log("Backend - stopHololensApp(...) - [SUCCESS] httpResponse - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        encodedPackageFullName: req.query.package,
        hostIP: req.query.host,
        stopAppSuccess: true

      }


    }else{

      console.log("Backend - stopHololensApp(...) - [FAILED] httpResponse.ok - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        encodedPackageFullName: req.query.package,
        hostIP: req.query.host,
        stopAppSuccess: false,

      }

    }

    return responseObject;

  })
  .then((data)=> {
    console.log("Backend - stopHololensApp(...) - [FAILED] data - ", data);

    return data;

  })
  .catch(error=> console.log(error));

  return res.send(result);


}

// ===========================================================
// Fetch Windows Device Portal APIs
// This function performs multiple asynchronous API calls
// concurrently, set with AbortController
// ===========================================================
async function fetchHololensApiOnSteadyState(reqQuery, res, flag){

    var fetchResponse = {};
    var cancelRequestBatteryLife = new AbortController();
    var cancelRequestPowerStatus = new AbortController();

    const cancelRequestBatteryLifeTimeout =
      setTimeout(()=>{

        cancelRequestBatteryLife.abort();
        // cancelRequest2.abort();

        console.log("ABORTED API 2", hlHostAddress);
        cancelRequestBatteryLife = new AbortController();

        // A little test to verify that AbortController kicks in in 5s
        var endTime= new Date();
        timeElapsed = endTime - startTime;
        console.log("API 2 Time Elapse: ", timeElapsed);
        // res.send.statusText(408);
        res.statusCode = 408;

      }, 5000);

    const cancelRequestPowerStatusTimeout =
      setTimeout(()=>{

        // cancelRequest.abort();
        cancelRequestPowerStatus.abort();
        console.log("ABORTED API 3", hlHostAddress);
        cancelRequestPowerStatus = new AbortController();


        // A little test to verify that AbortController kicks in in 5s
        var endTime= new Date();
        timeElapsed = endTime - startTime;
        console.log("API 3 Time Elapse: ", timeElapsed);
        res.statusCode = 408;


      }, 5000);

    var hlHostAddress = reqQuery.hlHostAddress;
    console.log(`[${hlHostAddress}][Entered fetchWdpApiOnSteadyState(...)]`);

    const headers = new Headers({

        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`

    });

      // ==================================================
      // EXISTING API CALL VIA PROMISE.ALL
      // Issue: Using Promise.All delegates the HL to return EETIMEDOUT.
      //        This takes a long time as pending request is left hanging
      //        until HL returns a EETIMEDOUT response
      // ==================================================
      // [To refactor into forEach later] Initiate multiple Promises to perform multiple API calls
      // try{

      //   // const results = await Promise.allSettled([
      //   const results = await Promise.all([

      //     // [API Call #2]
      //     fetch("http://" + hlHostAddress + informativeApis[1].api,{
      //       method: "GET",
      //       mode: "cors",
      //       headers: headers,
      //       signal: cancelRequest.signal
      //     })
      //     .then(httpResponse => {

      //         if(httpResponse.ok){

      //           console.log(`[${flag}][${hlHostAddress}] - GET BATTERY LIFE - SUCCESS`)
      //           return httpResponse.json();

      //         }else{

      //           console.log(`[${flag}][${hlHostAddress}] - GET BATTERY LIFE - FAILURE`)
      //           return 'Unsuccessful';

      //         }
      //     })
      //     .then(data => {

      //         // Create a new object and append apiCall prop. into response
      //         let responseObject = {
      //             timestamp: new Date(),
      //             fetchType: flag,
      //             fetchSuccess: true,
      //             errorMessage: null,
      //             apiCall: informativeApis[1].name,
      //             ...data
      //         }

      //         // console.log("GET BATTERY LIFE - SUCCESS - response", responseObject);

      //         return responseObject;
      //     })
      //     .catch(error => {

      //         console.log(`[${flag}][${hlHostAddress}][API #2 ERROR]`);

      //         let errorObject = {
      //             timestamp: new Date(),
      //             fetchType: flag,
      //             fetchSuccess: false,
      //             errorMessage: error
      //         }

      //         return errorObject;

      //     })
      //     .finally(
      //       // clearTimeout(timeoutId)
      //       // resetAbortTimer(timeoutId)
      //     ),

      //     // [API Call #3]
      //     fetch("http://" + hlHostAddress + informativeApis[2].api,{
      //         method: "GET",
      //         mode: "cors",
      //         headers: headers,
      //         signal: cancelRequest2.signal
      //     })
      //     .then(res => {

      //         if(res.ok){
      //             console.log(`[${flag}][${hlHostAddress}] - API 3 - SUCCESS`)
      //             return res.json()
      //         }else{
      //             console.log(`[${flag}][${hlHostAddress}] - API 3 - FAILURE`)
      //             return 'Unsuccessful'
      //         }

      //     })
      //     .then(data => {

      //         // Create a new object and append apiCall prop. into response
      //         let responseObject = {
      //             timestamp: new Date(),
      //             fetchType: flag,
      //             fetchSuccess: true,
      //             errorMessage: null,
      //             apiCall: informativeApis[2].name,
      //             ...data
      //         }

      //         return responseObject;

      //     })
      //     .catch(error => {

      //         console.log(`[${flag}][${hlHostAddress}][API #3 ERROR]`)

      //         let errorObject = {
      //             timestamp: new Date(),
      //             fetchType: flag,
      //             fetchSuccess: false,
      //             errorMessage: error
      //         }

      //         return errorObject;

      //     })
      //     .finally(
      //       // clearTimeout(timeoutId)
      //       // resetAbortTimer(timeoutId)
      //     )

      //   ]);



      //   setTimeout(()=> {

      //     // console.log(`[${flag}][${hlHostAddress}][fetchWdpApiOnSteadyState(...)]`);

      //   }, 500);

      //   return res.send(results);

      // }catch(e){

      //   console.log(`[${flag}][${hlHostAddress}] - API Fetch Error - ${e}`);

      //   return res.status(408).send({
      //       status: 408,
      //       message: {
      //           error: e
      //       }
      //   });

      // }
      // finally{

      //   // console.log(`[${flag}][${hlHostAddress}][fetchWdpApiOnSteadyState(...)] Entered finally block`);

      //   // cancelRequest = new AbortController();

      // }

        // ==================================================
      // INDIVIDUAL FETCH WITH ABORT CONTROLLER TEST
      // Enhancement to Promise.All().
      // ==================================================
      var startTime = new Date();
      var batteryLifeResult = await fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[1].api,{
        method: "GET",
        mode: "cors",
        headers: headers,
        signal: cancelRequestBatteryLife.signal
      })
      .then(httpResponse => {

          if(httpResponse.ok){

            console.log(`[${flag}][${hlHostAddress}] - API 2 - SUCCESS`)
            return httpResponse.json();

          }else{

            console.log(`[${flag}][${hlHostAddress}] - API 2 - FAILURE`)
            return httpResponse.json();

          }
      })
      .then(data => {

          // Create a new object and append apiCall prop. into response
          let responseObject = {
            hostIP: hlHostAddress,
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: true,
            errorMessage: null,
            apiCall: HOLOLENS_ESSENTIAL_APIS[1].name,
            ...data
          }

          console.log("API 2 - SUCCESS - pushing to fetchResponseArray", responseObject);
          // fetchResponseArray.push(responseObject);

          return responseObject;
      })
      .catch(error => {

          console.log(`[${flag}][${hlHostAddress}][API #2 ERROR]`);

          let errorObject = {
              hostIP: hlHostAddress,
              timestamp: new Date(),
              fetchType: flag,
              fetchSuccess: false,
              errorMessage: error
          }

          return errorObject;

      })
      .finally(()=>{

        clearTimeout(cancelRequestBatteryLifeTimeout);

      })

        // clearTimeout(timeoutId)
        // resetAbortTimer(timeoutId)


      var powerStatusResult = await fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[2].api,{
        method: "GET",
        mode: "cors",
        headers: headers,
        signal: cancelRequestPowerStatus.signal
      })
      .then(httpResponse => {
          if(httpResponse.ok){
              console.log(`[${flag}][${hlHostAddress}] - API 3 - SUCCESS`)
              return httpResponse.json();
          }else{
              console.log(`[${flag}][${hlHostAddress}] - API 3 - FAILURE`)
              return httpResponse.json();
          }
      })
      .then(data => {

          // Create a new object and append apiCall prop. into response
          let responseObject = {
              hostIP: hlHostAddress,
              timestamp: new Date(),
              fetchType: flag,
              fetchSuccess: true,
              errorMessage: null,
              apiCall: HOLOLENS_ESSENTIAL_APIS[2].name,
              ...data
          }

          console.log("API 3 - SUCCESS - pushing to fetchResponseArray", responseObject);
          // fetchResponseArray.push(responseObject);
          return responseObject;

      })
      .catch(error => {

          console.log(`[${flag}][${hlHostAddress}][API #3 ERROR]`)

          let errorObject = {
              hostIP: hlHostAddress,
              timestamp: new Date(),
              fetchType: flag,
              fetchSuccess: false,
              errorMessage: error
          }

          return errorObject;

      })
      .finally(()=>{

        // clearTimeout(timeoutId)
        // resetAbortTimer(timeoutId)
        clearTimeout(cancelRequestPowerStatusTimeout);

      }


      )



      // setTimeout(()=>{

      //   cancelRequest.abort();
      //   // cancelRequest2.abort();

      //   console.log("ABORTED API 2", hlHostAddress);
      //   // cancelRequest = new AbortController();

      // }, 10000);

      // setTimeout(()=>{

      //   // cancelRequest.abort();
      //   cancelRequest2.abort();
      //   console.log("ABORTED API 3",  hlHostAddress);
      //   // cancelRequest2 = new AbortController();

      // }, 10000);

      return res.send([batteryLifeResult, powerStatusResult]);



    // }catch(e){

    //     console.log("Error Type:", e);
    //     // console.log("Erroneous response:", res);

    //     if(e instanceof ReferenceError){
    //         // console.log(`Fetch Error, printing response for examination - ${atteryLifeResponse.json()}`)
    //     }

    //     return null;

    // }

}

// ===========================================================
// Fetch Windows Device Portal APIs
// This function performs multiple asynchronous API calls concurrently
// ===========================================================
async function fetchHololensApisOnInit(reqQuery, res, flag){

  var hlHostAddress = reqQuery.hlHostAddress;

  console.log("REGISTER - hostIP to register", hlHostAddress);

  const headers = new Headers({
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`
  });

  // [To refactor into forEach later] Initiate multiple Promises to perform multiple API calls
  var results = await Promise.allSettled([

    // =================================================
    // [API Call #1]
    // =================================================
    fetch(new URL("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[0].api),
    {
      method: "GET",
      mode: "cors",
      headers: headers,
      // Added to test next week (11/07)
    })
    .then(httpResponse => {

      csrfToken = httpResponse.headers.get('set-cookie').slice(11,);

      if(httpResponse.status === 200){

        console.log(`[${flag}][${hlHostAddress}] - API 1 - SUCCESS`)

        return httpResponse.json();

      }else{

        console.log(`[${flag}][${hlHostAddress}] - API 1 - FAILURE`)
        return httpResponse.json();


      }

    })
    .then(data => {

      console.log(`[${flag}][${hlHostAddress}]`);
      console.log('[API 1 - JSON Response]',data);

      // Create a new object and append apiCall prop. into response
      let responseObject = {

          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
          csrfToken: csrfToken,
          ...data

        }

        return responseObject;

    })
    .catch(error => {

      console.log(`[${flag}][${hlHostAddress}]`);
      console.log('[API #1 ERROR]', error);

      let errorObject = {
        timestamp: new Date(),
        fetchType: flag,
        fetchSuccess: false,
        errorMessage: error
      }

      return errorObject;

    }),

    // =================================================
    // [API Call #2]
    // =================================================
    fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[1].api,{
      method: "GET",
      mode: "cors",
      headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hlHostAddress}] - GET BATTERY LIFE - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hlHostAddress}] - GET BATTERY LIFE - FAILURE`)
            return httpResponse.json();
        }
    })
    .then(data => {


        console.log('[API 2 - JSON Response]',data);

        // Create a new object and append apiCall prop. into response
        let responseObject = {
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: true,
            errorMessage: null,
            apiCall: HOLOLENS_ESSENTIAL_APIS[1].name,
            ...data
        }

        console.log(`[${flag}][${hlHostAddress}] GET BATTERY LIFE - SUCCESS - response`);

        return responseObject;
    })
    .catch(error => {

        console.log('[API #2 ERROR]', error);

        let errorObject = {
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: false,
            errorMessage: error
        }

        return errorObject;

    }),

    // =================================================
    // [API Call #3]
    // =================================================
    fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[2].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hlHostAddress}] - API 3 - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hlHostAddress}] - API 3 - FAILURE`)
            return httpResponse.json();
        }
    })
    .then(data => {

      console.log('[API 3 - JSON Response]',data);


      // Create a new object and append apiCall prop. into response
      let responseObject = {
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[2].name,
          ...data
      }

      return responseObject;

    })
    .catch(error => {

        console.log(`[${flag}][${hlHostAddress}][API #3 ERROR]`);
        console.log("[ERROR RESPONSE] ", error);

        let errorMessage = {
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: false,
            errorMessage: error
        }

        return errorMessage;

    }),

    // =================================================
    // [API Call #4]
    // =================================================
    fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[3].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {

        if(httpResponse.status === 200){

          console.log(`[${flag}][${hlHostAddress}] - API 4 - SUCCESS`)
          return httpResponse.json();

        }else{

          console.log(`[${flag}][${hlHostAddress}] - API 4 - FAILURE`)
          return httpResponse.json();

        }

    })
    .then(data => {

        // Create a new object and append apiCall prop. into response
        let responseObject = {

          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[3].name,
          ...data

        }

        return responseObject;

    })
    .catch(error => {

        console.log('[API #4 ERROR]', error);

        let errorMessage = {
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: false,
            errorMessage: error
        }

        return errorMessage;

    })

  ]);

  return res.send(results);

}

// ===========================================================
// This function serves to obtain existing WiFi profiles in HL2
// ===========================================================
async function getWifiProfiles(req, res, flag){

  var responseObject = {};

  // console.log("Backend - getWifiInfo(...) - Package - packageFullName - ", req.query.package);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.query.host}/api/wifi/interfaces`,{
    method: "GET",
    mode: "cors",
    headers: httpHeader
  })
  .then((httpResponse)=>{

    if(httpResponse.status === 200){

      console.log("Backend - getWifiInfo(...) - [SUCCESS] httpResponse - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        wifiInfo: null,
        hostIP: req.query.host,
        fetchSuccess: true

      }


    }else{

      console.log("Backend - getWifiInfo(...) - [FAILED] httpResponse.ok - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        wifiInfo: null,
        hostIP: req.query.host,
        fetchSuccess: false,

      }

    }

    return httpResponse.json();

  })
  .then((data)=> {

    responseObject = {

      timestamp: new Date(),
      wifiInfo: data,
      hostIP: req.query.host,
      fetchSuccess: true

    }

    console.log("Backend - getWifiInfo(...) - JSON data - ", data);

    return responseObject;

  })
  .catch(error=> {

    console.log(error);

    responseObject = {

      timestamp: new Date(),
      wifiInfo: null,
      hostIP: req.query.host,
      fetchSuccess: false,
      error: error

    }

    return responseObject

  });

  return res.send(result);

}


// ===========================================================
// This function serves to delete existing WiFi profiles in HL2
// ===========================================================
async function deleteWifiProfile(req, res, flag){

  var responseObject = {};

  console.log("Backend - deleteWifiProfile(...) - req.query - ", req.query);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.query.host}/api/wifi/profile?interface=${req.query.guid}&profile=${req.query.wifiprofilename}`,{
    method: "DELETE",
    mode: "cors",
    headers: httpHeader
  })
  .then((httpResponse)=>{

    if(httpResponse.status === 200){

      console.log("Backend - deleteWifiProfile(...) - [SUCCESS] httpResponse - ", httpResponse);
      // console.log("Backend - deleteWifiProfile(...) - [SUCCESS] httpResponse.json() - ", httpResponse.json());

      responseObject = {

        timestamp: new Date(),
        wifiInfo: null,
        hostIP: req.query.host,
        deleteSuccess: true

      }


    }else{

      console.log("Backend - deleteWifiProfile(...) - [FAILED] httpResponse.ok - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        wifiInfo: null,
        hostIP: req.query.host,
        deleteSuccess: false,

      }

    }

    return responseObject;

  })
  .then((data)=> {

    // responseObject = {

    //   timestamp: new Date(),
    //   wifiInfo: data,
    //   hostIP: req.query.host,
    //   deleteSuccess: true

    // }

    console.log("Backend - deleteWifiProfile(...) - JSON data - ", data);

    return responseObject;

  })
  .catch(error=> console.log(error));

  return res.send(result);


}

// ===========================================================
// This function serves to obtain currently available WiFi networks
// ===========================================================
async function getWifiNetworks(req, res, flag){

  var responseObject = {};

  console.log("Backend - getWifiNetworks(...) - Package - packageFullName - ", req.query.package);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.query.host}/api/wifi/networks?interface=${req.query.guid}`,{
    method: "GET",
    mode: "cors",
    headers: httpHeader
  })
  .then((httpResponse)=>{

    if(httpResponse.status === 200){

      console.log("Backend - getWifiNetworks(...) - [SUCCESS] httpResponse - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        availableNetworks: null,
        hostIP: req.query.host,
        fetchSuccess: true

      }


    }else{

      console.log("Backend - getWifiNetworks(...) - [FAILED] httpResponse.ok - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        availableNetworks: null,
        hostIP: req.query.host,
        fetchSuccess: false,

      }

    }

    return httpResponse.json();

  })
  .then((data)=> {

    responseObject = {

      timestamp: new Date(),
      ...data,
      hostIP: req.query.host,
      fetchSuccess: true

    }

    console.log("Backend - getWifiNetworks(...) - JSON data - ", data);

    return responseObject;

  })
  .catch(error=> console.log(error));

  return res.send(result);


}

// ===========================================================
// Connect to available WiFi
// Note: Can only connect to existing WiFi networks that
//       has been saved as WiFi profiles
// ===========================================================
async function connectWifi(req, res, flag){

  var responseObject = {};


  console.log("Backend - connectWifi(...) - req.query - ", req.query);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // [Commented] Can't connect to new WiFi network that HL hasn't saved as a Wifi profile
  var result = await fetch(`http://${req.query.host}/api/wifi/network?interface=${req.query.guid}&op=${req.query.op}&ssid=${req.query.SSID}&key=${req.query.key}&createprofile=${req.query.createProfile}`,{
  // var result = await fetch(`http://${req.query.host}/api/wifi/network?interface=${req.query.guid}&profile=${req.query.SSID}&op=${req.query.op}`,{

    method: "POST",
    mode: "cors",
    headers: httpHeader

  })
  .then((httpResponse)=>{

    if(httpResponse.status === 200){

      console.log("Backend - connectWifi(...) - [SUCCESS] httpResponse - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        network: req.query.SSID,
        hostIP: req.query.host,
        connectSuccess: true

      }


    }else{

      console.log("Backend - connectWifi(...) - [FAILED] httpResponse.ok - ", httpResponse);

      responseObject = {

        timestamp: new Date(),
        network: req.query.SSID,
        hostIP: req.query.host,
        connectSuccess: false,

      }

    }

    return responseObject;

  })
  .then((data)=> {

    // responseObject = {

    //   timestamp: new Date(),
    //   ...data,
    //   hostIP: req.query.host,
    //   connectSuccess: true

    // }

    console.log("Backend - connectWifi(...) - JSON data - ", data);

    return responseObject;

  })
  .catch(error=> {

    if(error instanceof fetch.FetchError){

      responseObject = {

        timestamp: new Date(),
        network: req.query.SSID,
        hostIP: req.query.host,
        connectSuccess: true,
        reason: error

      }

    }else{

      responseObject = {

        timestamp: new Date(),
        network: req.query.SSID,
        hostIP: req.query.host,
        connectSuccess: false,
        reason: error

      }

    }

    console.log("[Connect WIFI] Error  - ", error)

    return responseObject;

  });

  return res.send(result);

}











// ===========================================================
// [SHELVED FOR LEARNING] Supposed to serve as an API proxy call
// to start HL2 MRC Live Stream by returning video chunks back to FE
// but the chunks could only be processed as a playback video at FE (i.e Blob URL)
// ===========================================================
async function startMixedRealityCapture(reqQuery, res, flag){

  var hlHostAddress = reqQuery.host;
  var startMRCResponse;

  const headers = new Headers({
    "Content-Type": "application/json",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`
  });

  try{

    startMRCResponse = await fetch(`http://${hlHostAddress}/api/holographic/stream/live_high.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true`,
      {
        method: 'GET',
        mode: 'cors',
        headers: headers

      })
      .then(response => {

        let videoData;

        if(response.ok){

          console.log(`[Mixed Reality Capture] Commencing @ ${hlHostAddress}`);
          console.log("[Mixed Reality Capture] Raw data response", response.headers);

          // Instantiate Form Data object
          var formData = new FormData();

          // ====[FS MODULE READ FILE SYNC TEST]
          // Create a Readable Stream from HL App
          // var hlByteFile = fileSystem.readFileSync(req.file.path);
          // var hlBlob = new Blob([hlByteFile]);

          // Append Readable Stream into Form Data instance
          videoData = {
            video: response,
            name: 'mrc-video-stream',
            success: true
          }
          // formData.append('video',res.value, 'mrcvideostream');

          // return videoData;

        }else{

          videoData = {
            video: response,
            name: 'mrc-video-stream',
            success: false
          }

          console.log(`[Mixed Reality Capture RESP BUT ERROR] Commence failed @ ${hlHostAddress}`);
          // return `Commence recording @ ${hlHostAddress} failed`;

        }

        return videoData;

      })
      .then(data => {

        // Create a new object and append apiCall prop. into response
        let responseObject = {
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[1].name,
          data: data,
          url: `http://${hlHostAddress}/api/holographic/stream/live_high.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true`
        }

        console.log("[Mixed Reality Capture] Parsed Response", responseObject);

        // return responseObject;
        return `http://${hlHostAddress}/api/holographic/stream/live_high.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true`;


      })
      .catch(error => {

        console.log('[Mixed Reality Capture ERROR]', error);

        let errorMessage = {
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: false,
          errorMessage: error,
          url: `http://${hlHostAddress}/api/holographic/stream/live_high.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true`
        }

        // return errorMessage;
        return `http://${hlHostAddress}/api/holographic/stream/live_high.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true`;


      });

      // return res.send(startMRCResponse);
      res.header("Access-Control-Allow-Origin", "http://localhost:4200");
      return res.status(200).send(startMRCResponse);

  }catch(error){

    console.log('[Mixed Reality Capture ERROR]', error);

        let errorMessage = {
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: false,
          errorMessage: error
        }

    return errorMessage;

  }

}


// ===========================================================
// [SHELVED FOR LEARNING] This method serves to request
//  and relay video chunks from HL Mixed Reality Capture API
// ===========================================================
async function startVideoStream(req, res){

  var appendedResponse;

  // Var to store signal value
  const abortSignal = abortController.signal;

  const requestHeader = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${Buffer.from(`${HOLOLENS_CREDENTIALS.username}:${HOLOLENS_CREDENTIALS.password}`).toString('base64')}`,
    "X-CSRF-TOKEN": csrfToken
  };

  // Set Response Header to pass back to front-end
  // const responseHeader = {
  //   "Content-Type": "video/mp4"
  // };

  // http://"+device.hostIP+"/api/holographic/stream/live_low.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true
  await fetch("http://"+req.query.host+"/api/holographic/stream/live_low.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true",{
    method: "GET",
    mode: "cors",
    headers: requestHeader,

    // Link abort signal to this HTTP request
    signal: abortSignal

  })
  .then((response) => {

    // Calculate video chunk size
    // const VIDEO_CHUNK_SIZE = 10 ** 6;
    // const START_CHUNK = Number(range.replace(/\D/g, ""));
    // const END_CHUNK = Math.min(start + VIDEO_CHUNK_SIZE, videoSize);

    if(response.ok){

      console.log(`[Success] ${req.query.host} Video stream data retrieved.`);
      console.log("[Vid Stream Response]", response.body);

      return response.body;

    }else{

      console.log(`[Failed] ${req.query.host} Video stream data NOT retrieved.`);

    }


  })

  // Read body and parse it into chunks before sending it back to front-end
  .then((body)=>{


    body.on('readable', ()=>{

      var chunk;

      while( null !== (chunk = body.read())){

        console.log("[CHUNK]==========",chunk);
        // const stream = fileSystem.createReadStream(chunk);
        // stream.pipe(res);
        res.status(206).write(chunk);
        // req.pipe(res);

      }


    });

    body.on('end',()=>{

      res.end();

    });




  })
  .catch(error => res.status(400).send(error));


  // return res.send(appendedResponse);




}


// ===========================================================
// [SHELVED FOR LEARNING] Supposed to serve as an API proxy call
// to stop HL2 MRC Live Stream by returning video chunks back to FE
// but the chunks could only be processed as a playback video at FE (i.e Blob URL)
// ===========================================================
async function stopVideoStream(req, res){

  // Obtain HL IP
  hlStreamToStop = req.query.host;

  if(abortController){

    // Trigger abort
    abortController.abort();
    console.log(`[Video Stream] Stopping ${hlStreamToStop}...`);
    console.log("[Abort Signal] On Video Stream - ", abortController.signal);


  }

  // Instantiate new AbortController after signal is emitted so that
  // vid can be played again after stopping at front-end
  abortController = new AbortController();

}

// ===========================================================
// [SHELVED FOR LATER DEV] Was used as a dummy API test bed
// ===========================================================
async function getAppFileInfo(req, res){

    let dummy1, dummy2, dummy3;

    fetch(`http://${hlHostAddress}/api/filesystem/apps/files?knownfolderid=${dummy1}&packagefullname=${dummy2}&path=${dummy3}`,
            {
                method: "GET",
                mode: "cors",
                headers: headers
            })
            .then(res => {
                // console.log("prinitng headers");
                // console.log(res);
                // console.log(res.headers['content-encoding']);

                // csrfToken = res.headers.get('set-cookie').slice(11,);

                // console.log("CSRF-Token:",res.headers.get('set-cookie'));
                // console.log(res.headers.server);
                // console.log(res.headers[0].server);
                if(res.ok){

                    console.log('API 1 - SUCCESS')
                    return res.json();

                }else{

                    console.log('API 1- Not Successful')
                    return 'Unsuccessful'

                }
            })
            .then(data => {

                // Create a new object and append apiCall prop. into response
                let newObject = {
                    apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
                    csrfToken: csrfToken,
                    ...data
                }

                // console.log("newObject:", newObject);

                return newObject;
            })
            .catch(error => console.log('ERROR', error))

}

