// import WebSocket, { WebSocketServer } from 'ws';
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
app.use(require('cookie-parser')());



// ====[NODEJS-COMPATIBLE FORM DATA IMPORT]
const FormData = require('form-data');
const PORT = process.env.PORT || 3001;
const HOLOLENS_CREDENTIALS = {
  username: 'ioxpCustomer_4g01_1',
  password: 'stk@AR-4650'
};
const cors = require("cors");
const fetch = require("node-fetch");
const { uuid } = require('uuidv4');


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
});

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
var allowlist = ['http://localhost:4200']
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
const { Server } = require("./node_modules/socket.io");

// Read SSL Key and Cert from respective SSL files
const httpsOptions = {

  key: fileSystem.readFileSync('./ssl/private.key'),
  cert: fileSystem.readFileSync('./ssl/certificate.crt'),

  // Added to resolve 'Socket Hang Up' issue, where websocket is not persisted
  agent: new https.Agent({
    keepAlive: true
  })

}

// Serve server over HTTPS at PORT 3001
const httpsServer = https.createServer(httpsOptions, app).listen(PORT);

// var ws = require('ws');

// Initialise Web Socket Server
// const webSocketServer = new ws.WebSocketServer({ port: 8080 });
io = new Server(httpsServer,{
  cors: {
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  debug: true,
  pingInterval: 100000,
  pingTimeout: 90000
});

ACTIVATE_REFRESH_DATA_LOOP = true;

var REGISTERED_DEVICES = [];
var WDP_CREDENTIALS = [];
var SOCKET_COUNT = 0;
global.START_HOLOLENS_POLL = false;
global.POLLHOLOLENSCALLRECORD = [];
CURRENT_SOCKET_ID = null;
START_SESSION_RUNTIME = 0;
END_SESSION_RUNTIME = 0;
POLLING_ROUTINE = null;
TIME_LEFT = 0;
TRIAL_STATUS = {

  timeLeft: 0,
  isActive: false

}
var LOOP_BREAK_EVENT = new EventEmitter();



// ==============================================================
//  Device Onboarding and Data Refresh-related APIs
// ==============================================================

// FE-to-BE API call: [Register Hololens]
app.post(`/register`, function(req,res){

    const flag = 'registration';

    const registeringDeviceData = {
      hostIP: req.query.hlHostAddress,
      username: req.body.username,
      password: req.body.password
    }

    // console.log("Calling /register ...", req.query);


    // [REGISTERED PROCESS V2] WIP
    // fetchHololensApisOnInit(registeringDeviceData, res, flag);
    fetchFirstBatchOfDeviceData(registeringDeviceData, res, flag);

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
// FE-to-BE API call: [Store Registered Device]
// [WEBSOCKET DEV] Store REGISTERED_DEVICES IN BACKEND for processing
// ====================================================================
app.post('/storeregistereddevices', async function(req,res){

  // console.log("-------------------------------------------------(websocket)[Store Registered Devices] Received -",req.body);

  REGISTERED_DEVICES = await req.body.data? req.body.data: [];

  // console.log("-------------------------------------------------(websocket)[Store Registered Devices] REGISTERED_DEVICES -",REGISTERED_DEVICES);

  // Store REGISTERED_DEVICES in file
  fileSystem.writeFile('./configs/REGISTERED_DEVICES.json', JSON.stringify({REGISTERED_DEVICES: req.body.data}), (err)=>{

    console.log("[Writing REGISTERED_DEVICE into File] File write - writeFile error ", err);

  });

  res.status(200).send({
    statusCode: 200,
    data: req.body,
    error: null
  });

  // refreshHololensData();



})

// [WEBSOCKET FEATURE] ====================================================
// [FE-to-BE API call: [Start Data Polling]
// [WEBSOCKET DEV] Allow FE to send START signal to trigger Poll Hololens Loop
// ========================================================================
app.post('/startdatapolling', function(req,res){

  console.log("-------------------------------------------------(websocket)[Start Data Polling] Received -",req.body);

  START_HOLOLENS_POLL = true;

  if(START_HOLOLENS_POLL){

    pollHololens()

  }

});

app.post('/stopdatapolling', function(req,res){

  console.log("-------------------------------------------------(websocket)[Stop Data Polling] Received -",req.body);

  // REGISTERED_DEVICES = req.body.data? req.body.data: [];

  // console.log("-------------------------------------------------(websocket)[Start Data Polling] REGISTERED_DEVICES -",REGISTERED_DEVICES);

  START_HOLOLENS_POLL = false;

  // Emit Loop Break event
  LOOP_BREAK_EVENT.emit("BREAK_LOOP", {
    breakLoop: true
  });

  if(!START_HOLOLENS_POLL){

    // console.log("-------------------------------------------------(websocket)[Stop Data Polling] KILLING PROCESS -", process.pid);

    clearInterval(POLLING_ROUTINE);

    return res.status(200).send({
      statusCode: 200,
      data: req.body,
      error: null
    });

  }

});

// [TRIAL RUNTIME TIMER - KIV (UNUSED)] ====================================================
// [FE-to-BE API call: Start Polling
// [START TIMER] Allow FE to send START signal to trigger Poll Hololens Loop
// =========================================================================
app.post('/startruntimetimer',function(req,res){

  START_RUNTIME_TIMER = req.body?.startRuntimeTimer;

  if(START_RUNTIME_TIMER){

    START_SESSION_RUNTIME = performance.now();

    res.status(200).send({
      statusCode: 200
    });

  }else{

    res.status(403).send({
      statusCode: 403
    });

  }


});

app.post('/stopruntimetimer',function(req,res){

  START_RUNTIME_TIMER = req.body?.startRuntimeTimer;

  if(!START_RUNTIME_TIMER){

    END_SESSION_RUNTIME = performance.now();

  }

  if(START_SESSION_RUNTIME > 0){

    try{

      const sessionRuntime = END_SESSION_RUNTIME - START_SESSION_RUNTIME;
      console.log("[Runtime Timer] SESSION RUNTIME - ", sessionRuntime);


      // Write session runtime to file;
      fileSystem.writeFile('trial.txt', sessionRuntime.toString(), (err)=>{

        console.log("[Runtime Timer] File write - writeFile error ", err);

        if (err){

          res.status(403).send({
            statusCode: 403
          });

        }else{

          res.status(200).send({
            statusCode: 200
          });

        }

      });


    }catch(err){

      console.log("[Runtime Timer] File write - parent catch error ", err);

    }

  }

});

// [WEBSOCKET FEATURE]===============================================
// Socket-related events
// ==================================================================
app.post('/joinroom',function(req,res){

  console.log("[STANDALONE LIVESTREAM TESTBED] Request Body", req.body)

  requestJoiningOfStandaloneLiveStreamRoom(req,res);

})


// [WEBSOCKET FEATURE]===============================================
// Socket-related events
// ==================================================================
io.on('connection', (socket)=>{

  console.log("[WEBSOCKET] Initial Transport - ", socket.conn.transport.name);
  CURRENT_SOCKET_ID = process.pid;
  console.log("[WEBSOCKET] Current Socket ID - ", CURRENT_SOCKET_ID);

  // Increases Socket Count on connection
  SOCKET_COUNT++;
  console.log("[WEBSOCKET] Connection detected - SOCKET_COUNT", SOCKET_COUNT);

  socket.conn.once("upgrade", () => {
    // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
    console.log("[WEBSOCKET] Upgraded transport", socket.conn.transport.name); // prints "websocket"
  });

  // =============
  // Socket Error Event
  // =============
  socket.on('error', console.error);

  // =============
  // Socket Data Event
  // =============
  socket.on('message', function message(data){

    console.log("[WEBSOCKET] Connection detected - SOCKET_COUNT", SOCKET_COUNT);
    console.log("-------------------------------------------------(websocket) Connection request received from Frontend", data);

  });

  socket

  // =============
  // Trial Status Event
  // =============
  socket.on('trialstatus', async function message(data){

    console.log("[Runtime Timer] Connection detected - SOCKET_COUNT", SOCKET_COUNT);
    console.log("-------------------------------------------------(Runtime Timer) Message received from Frontend", data);

    // [Trial Timer] If runtimeDuration exist, take session duration and subtract
    //               from remaining trial duration in trial.json
    if(data?.runtimeDuration !== undefined){

      // Read session runtime from Trial Config JSON;
      try{

        const trialConfig = await JSON.parse(fileSystem.readFileSync('./configs/trial.json', 'utf8'));
        console.log("[Runtime Timer] trialConfig",trialConfig);
        TIME_LEFT = Number(trialConfig?.timeLeft) - Number(data?.runtimeDuration);

        console.log("[Runtime Timer] data?.runtimeDuration",data?.runtimeDuration);
        console.log("[Runtime Timer] TIME_LEFT",TIME_LEFT);

        // Update trial properties
        TRIAL_STATUS = {

          timeLeft: TIME_LEFT,
          isActive: TIME_LEFT > 0? true: false

        }

      }catch(e){

        if(e instanceof SyntaxError){


        }

      }


      // Update JSON File
      fileSystem.writeFile('./configs/trial.json', JSON.stringify(TRIAL_STATUS), (err)=>{

        console.log("[Runtime Timer] File write - writeFile error ", err);

      });

      if(!(TRIAL_STATUS.isActive)){

        socket.emit('trialstatus',TRIAL_STATUS);

      }

    }


  });

  // =============
  // (WIP) Frontend-initialised Disconnect Event
  // =============
  socket.on('frontend disconnect', function message(data){

    console.log("[WEBSOCKET DISCONNECT] Message received:", data);

    socket.disconnect();

    SOCKET_COUNT--;

  });

  // =============
  // Socket Disconnecting Event
  // =============
  socket.on('disconnecting',(reason)=>{

    console.log("-------------------------------------------------(websocket) WEBSOCKET DISCONNECTING... ", reason);

  });

  // =============
  // Socket Disconnect Event
  // =============
  socket.on('disconnect',(reason)=>{

    console.log("-------------------------------------------------(websocket) WEBSOCKET DISCONNECTED", reason);
    console.log("-------------------------------------------------(websocket) KILLING PROCESS BY PID...");
    // socket.connect();
    // process.kill(CURRENT_SOCKET_ID);
    socket.disconnect();


    // Minus Socket Count;
    SOCKET_COUNT--;

    console.log("[WEBSOCKET] Disconnection detected - SOCKET_COUNT", SOCKET_COUNT);

  });


});





// ==============================================================
//  Network-related APIs
// ==============================================================
app.post('/getwifiinfo', function(req,res){

  const flag = 'get-wifi-info';

  getWifiProfiles(req,res,flag);

});

app.delete('/deletewifiprofile', function(req,res){

  const flag = 'delete-wifi-profile';

  console.log("[/deletewifiprofile] - req.query",req.query);


  deleteWifiProfile(req,res,flag);

});

app.post('/getwifinetworks', function(req,res){

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


      return res.send([batteryLifeResult, powerStatusResult]);


}

// [WEB SOCKET DEV]===========================================
// An internal method between backend and HoloLensthat retrieves
// latest hololens data
// ===========================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollHololens(){

  var i = 0;

  // Clear Interval to ensure any existing setIntervals are stopped
  clearInterval(POLLING_ROUTINE);


  POLLING_ROUTINE = setInterval(async ()=>{

  // [25/03] STOP HERE:
  //  1. Check if client disconnect from FE is sent
  //  2. I think Websocket should live away from the device panel components
  //    - Maybe in a service or a web worker
  //  3. I also think that websocket data should be a service
  // while(START_HOLOLENS_POLL){


    console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] START_HOLOLENS_POLL', START_HOLOLENS_POLL);
    console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] PROCESS ID', process.pid);
    console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] LOOP COUNTER', i++);

    // ==============================================================================
    // [Commented] Attempted to break loop using Event Emitter, but does not work
    // ==============================================================================
    // LOOP_BREAK_EVENT.on("BREAK_LOOP", async (data)=>{

    //   console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] LOOP BREAK EVENT. START_HOLOLENS_POLL', START_HOLOLENS_POLL);
    //   console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] LOOP BREAK EVENT. data', data);

    //   if(data?.breakLoop){


    //     START_HOLOLENS_POLL = false;

    //     return;

    //   }

    // });

    // if(!START_HOLOLENS_POLL){

    //   POLLHOLOLENSCALLRECORD.pop();
    //   console.log('==============================[WEBSOCKETDEV][REFRESHHOLOLENSDATA] LOOP BREAK. START_HOLOLENS_POLL', START_HOLOLENS_POLL);
    //   // POLLHOLOLENSCALLRECORD.pop();

    //   break;

    // }

    await sleep(8000).then(()=>console.log("[Poll HoloLens] [WEBSOCKET DEV] Sleep over, re-commence latest data refresh..."));


    var cancelRequestBatteryLife = new AbortController();
    var cancelRequestPowerStatus = new AbortController();

    console.log('[Poll HoloLens] REGISTERED_DEVICES', REGISTERED_DEVICES);

    if(REGISTERED_DEVICES == []){

      var retrievedRegisteredDevices = await JSON.parse(fileSystem.readFileSync('./configs/trial.json', 'utf8'));
      console.log("[Poll HoloLens] retrievedRegisteredDevices", retrievedRegisteredDevices);
      REGISTERED_DEVICES = retrievedRegisteredDevices?.REGISTERED_DEVICES;

    }


    // --------------------------------------------------
    // Iterate each HoloLens to get latest battery life and power status data
    // --------------------------------------------------
    for(index in REGISTERED_DEVICES){

      if(!REGISTERED_DEVICES[index]){

        console.log("[Poll HoloLens] REGISTERED_DEVICES undefined - probably caused by delete device profile")

        return;

      }


      // console.log(`[${index}][WEBSOCKET DEV][${REGISTERED_DEVICES[index]?.username}][Entered REFRESHHOLOLENSDATA(...)]`);
      console.log(`${index}[WEBSOCKET DEV][${REGISTERED_DEVICES[index]?.deviceName}][Entered REFRESHHOLOLENSDATA(...)]`);


      const headers = new Headers({

        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${REGISTERED_DEVICES[index]?.username}:${REGISTERED_DEVICES[index]?.password}`).toString('base64')}`

      });


      var responseObject = {

        lastUpdated: null,
        errorMessage: null,
        id: REGISTERED_DEVICES[index].id,
        hostIP: REGISTERED_DEVICES[index].hostIP,
        deviceName: REGISTERED_DEVICES[index].deviceName,
        isOnline: REGISTERED_DEVICES[index].isOnline,
        battLife: REGISTERED_DEVICES[index].battLife,
        isCharging: REGISTERED_DEVICES[index].isCharging,
        isRegistered: REGISTERED_DEVICES[index].isRegistered,
        lowPowerState: REGISTERED_DEVICES[index].lowPowerState,
        lowPowerStateAvailable: REGISTERED_DEVICES[index].lowPowerStateAvailable,
        effectiveHttpRequestCount: null,
        username: REGISTERED_DEVICES[index].username,
        password: REGISTERED_DEVICES[index].password

      }


      const cancelRequestBatteryLifeTimeout =
        setTimeout(()=>{

          cancelRequestBatteryLife.abort();

          console.log("[WEBSOCKET DEV] ABORTED API 2", hlHostAddress);
          cancelRequestBatteryLife = new AbortController();

          // A little test to verify that AbortController kicks in in 5s
          var endTime= new Date();
          timeElapsed = endTime - startTime;
          console.log("[WEBSOCKET DEV] API 2 Time Elapse: ", timeElapsed);

          // Update responseObject
          responseObject["lastUpdated"] = new Date().toLocaleString("en-gb", {timeZone: "Asia/Kuala_Lumpur"}).toString();
          responseObject["errorMessage"] = "API Aborted - Response takes too long";

          var index = REGISTERED_DEVICES.findIndex((registeredHololens)=> {

            return registeredHololens.id === responseObject.id
              || registeredHololens.hostIP === responseObject.hostIP;

          });

          if(REGISTERED_DEVICES[index]?.isOnline ||
            REGISTERED_DEVICES[index]?.isOnline === undefined){

            responseObject["isOnline"] = false;

          }

          REGISTERED_DEVICES[index] = responseObject;

          return io.send(responseObject);

        }, 5000);

      const cancelRequestPowerStatusTimeout =
        setTimeout(()=>{

          // cancelRequest.abort();
          cancelRequestPowerStatus.abort();
          console.log("[WEBSOCKET DEV] ABORTED API 3", hlHostAddress);
          cancelRequestPowerStatus = new AbortController();


          // A little test to verify that AbortController kicks in in 5s
          var endTime= new Date();
          timeElapsed = endTime - startTime;
          console.log("[WEBSOCKET DEV] API 3 Time Elapse: ", timeElapsed);

          // Update responseObject
          responseObject["lastUpdated"] = new Date().toLocaleString("en-gb", {timeZone: "Asia/Kuala_Lumpur"}).toString();
          responseObject["errorMessage"] = "API Aborted - Response takes too long";


          // REGISTERED_DEVICES[index] = responseObject;

          var index = REGISTERED_DEVICES.findIndex((registeredHololens)=> {

            return registeredHololens.id === responseObject.id
              || registeredHololens.hostIP === responseObject.hostIP;

          });

          if(REGISTERED_DEVICES[index].isOnline){

            responseObject["isOnline"] = false;

          }

          REGISTERED_DEVICES[index] = responseObject;

          return io.send(responseObject);


        }, 5000);

      var hlHostAddress = await REGISTERED_DEVICES[index].hostIP;
      console.log(`${index}[WEBSOCKET DEV][${REGISTERED_DEVICES[index]?.deviceName}][Entered REFRESHHOLOLENSDATA(...)]`);

      var startTime = new Date();
      console.time("Poll Hololens");


      // =============================================================
      // API 2 - {AcOnline: bool, BatteryPresent: bool, Charging: 1, MaximumCapacity: number, RemainingCapacity: number}
      // =============================================================
      var batteryAndPowerStatusResult = await fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[1].api,{
        method: "GET",
        mode: "cors",
        headers: headers,
        signal: cancelRequestBatteryLife.signal
      })
      .then(async httpResponse => {

          // console.log("WS - Battery Life - (Then 1) - Raw Response - ", httpResponse);
          // console.log("WS - Battery Life - (Then 1) - Raw Response (Request URL) - ", httpResponse.url);
          const requestURLHostIP = httpResponse.url.split("/")[2];

          // ========================================================================================
          // Some HTTP Response OK may be false positives.
          //
          // Eg: Due to the asynchronous nature of API calls
          //       Current index may receive data that belongs to other index
          //       This may be because the delays in receiving response for the prev
          //       index flows over to the current. Time taken to receive response may take too long
          //       that by the time it arrives, loop has already moved to the next index
          // ========================================================================================
          if(httpResponse.ok){

            // To weed out false positives updates, only parse httpResponse if Request URL IP equals to
            // current index IP. Otherwise, throw Error and proceed to catch block
            if(requestURLHostIP === REGISTERED_DEVICES[index].hostIP){

              console.log("WS - Battery Life - (Then 1) - HTTP Response OK - ", REGISTERED_DEVICES[index]);
              return await httpResponse.json();

            }else{

              // console.log("WS - Battery Life - (Then 1) - HTTP Response Failed - This Device IP - ", REGISTERED_DEVICES[index].hostIP);
              // console.log("WS - Battery Life - (Then 1) - HTTP Response Failed - Conflicting IP - ", requestURLHostIP);
              throw new fetch.FetchError("HTTP Response leaked to current index!");

            }


          }else{

            console.log("WS - Battery Life - (Then 1) - HTTP Response Failed - ", REGISTERED_DEVICES[index]);
            console.log("WS - Battery Life - (Then 1) - httpResponse.json()? - ", await httpResponse.json());
            return await httpResponse.json();

          }
      })
      .then(async (data) => {

        console.log("WS - Battery Life - (Then 2) - Data - ", data);

        responseObject = {

          lastUpdated: new Date().toLocaleString("en-gb", {timeZone: "Asia/Kuala_Lumpur"}).toString(),
          errorMessage: null,
          id: REGISTERED_DEVICES[index].id? REGISTERED_DEVICES[index].id: null,
          hostIP: REGISTERED_DEVICES[index].hostIP? REGISTERED_DEVICES[index].hostIP: null,
          deviceName: REGISTERED_DEVICES[index].deviceName? REGISTERED_DEVICES[index].deviceName: null,
          isOnline: true,
          battLife: Math.floor(data?.RemainingCapacity / data?.MaximumCapacity * 100) >= 100? 100: Math.floor(data?.RemainingCapacity / data?.MaximumCapacity * 100),
          isCharging: data?.Charging? true: false,
          isRegistered: true,
          lowPowerState: null,
          lowPowerStateAvailable: null,
          effectiveHttpRequestCount: null,
          username: REGISTERED_DEVICES[index].username? REGISTERED_DEVICES[index].username: null,
          password: REGISTERED_DEVICES[index].password? REGISTERED_DEVICES[index].password: null

        }

        // console.log("WS - Battery Life - (Then 2) - Data - ", responseObject);
        // console.log("WS - Battery Life - (Then 2) - Returning Power Status API Request");

        // [Next API] Call the next API (Power Status) once previous API result (battLife and isCharging) is parsed into responseObject var
        return await fetch("http://" + hlHostAddress + HOLOLENS_ESSENTIAL_APIS[2].api,{
          method: "GET",
          mode: "cors",
          headers: headers,
          signal: cancelRequestPowerStatus.signal
        });

      })
      .then(async httpResponse => {

        console.log("httpResponse ================", httpResponse);

          if(httpResponse.ok){

            // console.log("WS - Power Status - (Then 3) - HTTP Response OK - ", REGISTERED_DEVICES[index]);
            return await httpResponse.json();

          }else{

            // console.log("WS - Power Status - (Then 3) - HTTP Response Failed - ", REGISTERED_DEVICES[index]);
            return await httpResponse.json();

          }

      })
      .then(async data => {

          console.log("WS - Power Status - (Then 4) - HTTP Response OK -  data", data);

          // Update remaining props based on received data from power status API
          responseObject["lowPowerState"] = data?.LowPowerState;
          responseObject["lowPowerStateAvailable"] = data?.LowPowerStateAvailable;

          // Update latest device data in local REGISTERED_DEVICES
          // [NOTE] To replace linear search with better ones
          var index = REGISTERED_DEVICES.findIndex((registeredHololens)=>{

            return registeredHololens.id === responseObject.id;

          });

          // console.log("WS - Power Status - (Then 4) - index found?", index);

          // If index is found, update existing element (of object)
          if(index > -1){

            // REGISTERED_DEVICES[index].lowPowerState = responseObject.lowPowerState;
            // REGISTERED_DEVICES[index].lowPowerStateAvailable = responseObject.lowPowerStateAvailable;
            REGISTERED_DEVICES[index] = responseObject;

          }else{

            // Push new hololens data into REGISTERED_DEVICES
            REGISTERED_DEVICES.push(responseObject);

          }

          // console.log("WS - Power Status - (Then 4) - responseObject", responseObject);

          return responseObject;

      })
      .then(async responseObject =>{


        console.log("WS - Power Status - (Then 5) - responseObject before socket send", responseObject);

        await io.send(responseObject);

      })
      .catch(async (error) => {

        // 18/03====================================
        // SET UP ONLINE -> OFFLINE COMPARATOR HERE
        // ---- If REGISTERED_DEVICE[index].isOnline
        // ----   Set isOnline false
        // ----   Send responseObject back to Frontend to trigger offline status
        // 18/03====================================
        if(error instanceof fetch.FetchError){

          console.log("WS - Power Status - (CATCH) - error - ", error);
          // console.log("WS - Power Status - (CATCH) - Check REGISTERED_DEVICE - ", REGISTERED_DEVICES);

          // Update responseObject
          responseObject["lastUpdated"] = new Date().toLocaleString("en-gb", {timeZone: "Asia/Kuala_Lumpur"}).toString();
          responseObject["errorMessage"] = error;

          // Find index of this current element
          // Why must find index? Index cease to exist in catch block
          // Thus, need to re-obtain index via findIndex
          var index = REGISTERED_DEVICES.findIndex((registeredHololens)=> {

            return registeredHololens.id === responseObject.id
            || registeredHololens.hostIP === responseObject.hostIP;

          });

          console.log("WS - Power Status - (CATCH) - Check index - ", index);

          // If index exists
          if(index > -1){

            // ========================================================
            // [RESOLVE FOR ARRAY ELEMENT DATA LEAK]
            // What is the cause? When current device receive response
            //                    that belongs to other device
            // Note: If this device becomes online from a leak,
            //       retain its previous power state
            // =========================================================
            if(REGISTERED_DEVICES[index].isOnline){

              if(error.toString().includes("HTTP Response leaked to current index!")){

                responseObject["isOnline"] = REGISTERED_DEVICES[index].isOnline;

              }else{

                responseObject["isOnline"] = false;

              }

            }

            REGISTERED_DEVICES[index] = responseObject;

            return await io.send(responseObject);

          }else{

            // Send Server Error
            res.status(500).send({
              statusCode: 500,
              error: 'Server Error - Undefined Index in REGISTERED_DEVICES',
            });

          }


        }

        // var index = REGISTERED_DEVICES.findIndex((registeredHololens)=>{

        //   return registeredHololens.id === responseObject.id;

        // });


        // // If previous HoloLens state is Online, getting error implies no-response from
        // // HoloLens, thereby is identified as offline
        // if(REGISTERED_DEVICES[index]?.isOnline){

        //   responseObject = {

        //     lastUpdated: new Date().toLocaleString("en-gb", {timeZone: "Asia/Kuala_Lumpur"}).toString(),
        //     errorMessage: error,
        //     id: REGISTERED_DEVICES[index].id,
        //     hostIP: REGISTERED_DEVICES[index].hostIP,
        //     deviceName: REGISTERED_DEVICES[index].deviceName,
        //     isOnline: false,
        //     battLife: REGISTERED_DEVICES[index].battLife,
        //     isCharging: false,
        //     isRegistered: true,
        //     lowPowerState: false,
        //     lowPowerStateAvailable: false,
        //     effectiveHttpRequestCount: null,
        //     username: REGISTERED_DEVICES[index].username,
        //     password: REGISTERED_DEVICES[index].password


        //   }

        //   REGISTERED_DEVICES[index] = responseObject;

        //   io.send(responseObject);

        // }

        // REGISTERED_DEVICES[index] = responseObject;

        // io.send(responseObject);

      })
      .finally(()=>{

        // io.send(responseObject);

        clearTimeout(cancelRequestPowerStatusTimeout);
        clearTimeout(cancelRequestBatteryLifeTimeout);
        console.timeEnd("Poll Hololens");


      });

    }



  // } <========= Closing bracket while loop

  },10000);

};

// ===========================================================
// Fetch Windows Device Portal APIs
// This function performs multiple asynchronous API calls concurrently
// ===========================================================
async function fetchHololensApisOnInit(deviceData, res, flag){

  var hololensHostIP = deviceData.hostIP;
  var wdpUsername = deviceData.username;
  var wdpPassword = deviceData.password;

  console.log("REGISTER - hostIP to register", hololensHostIP);

  const headers = new Headers({
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${wdpUsername}:${wdpPassword}`).toString('base64')}`
  });

  // [To refactor into forEach later] Initiate multiple Promises to perform multiple API calls
  var results = await Promise.allSettled([

    // =================================================
    // [API Call #1]
    // =================================================
    fetch(new URL("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[0].api),
    {
      method: "GET",
      mode: "cors",
      headers: headers,
      // Added to test next week (11/07)
    })
    .then(httpResponse => {

      csrfToken = httpResponse.headers.get('set-cookie').slice(11,);

      if(httpResponse.status === 200){

        console.log(`[${flag}][${hololensHostIP}] - API 1 - SUCCESS`);

        // This if block is to cover the situation where WDP Auth Cred is incorrect
        // and url contains /IPAddressBlocked.htm
        if((httpResponse?.url).includes("IpAddressBlocked.htm")){

          let errorResponse = {

            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: false,
            errorMessage: 'Invalid Credentials'

          }

          return errorResponse;

        }


        return httpResponse.json();

      }else{

        console.log(`[${flag}][${hololensHostIP}] - API 1 - FAILURE`);
        return httpResponse.json();


      }

    })
    .then(data => {

      console.log(`[${flag}][${hololensHostIP}]`);
      console.log('[API 1 - JSON Response]',data);

      var responseObject;

      if(data?.errorMessage){

        responseObject = data;

      }else{

        // Create a new object and append apiCall prop. into response
        responseObject = {

          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
          csrfToken: csrfToken,
          ...data

        }

      }

      return responseObject;

    })
    .catch(error => {

      console.log(`[${flag}][${hololensHostIP}]`);
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
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[1].api,{
      method: "GET",
      mode: "cors",
      headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hololensHostIP}] - GET BATTERY LIFE - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hololensHostIP}] - GET BATTERY LIFE - FAILURE`)
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

        console.log(`[${flag}][${hololensHostIP}] GET BATTERY LIFE - SUCCESS - response`);

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
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[2].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hololensHostIP}] - API 3 - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hololensHostIP}] - API 3 - FAILURE`)
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

        console.log(`[${flag}][${hololensHostIP}][API #3 ERROR]`);
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
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[3].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {

        if(httpResponse.status === 200){

          console.log(`[${flag}][${hololensHostIP}] - API 4 - SUCCESS`)
          return httpResponse.json();

        }else{

          console.log(`[${flag}][${hololensHostIP}] - API 4 - FAILURE`)
          console.log(response);
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

async function fetchFirstBatchOfDeviceData(deviceData, res, flag){

  var hololensHostIP = deviceData.hostIP;
  var wdpUsername = deviceData.username;
  var wdpPassword = deviceData.password;
  var parsedDeviceData = {
    lastUpdated: null,
    errorMessage: null,
    id: uuid(),
    hostComputerName: null,
    hostIP: null,
    deviceName: null,
    isOnline: null,
    battLife: null,
    isCharging: null,
    isRegistered: null,
    lowPowerState: null,
    lowPowerStateAvailable: null,
    effectiveHttpRequestCount: null,
    installedApps: [],
    username: wdpUsername? wdpUsername: null,
    password: wdpPassword? wdpPassword: null,

  };

  console.log("REGISTER - hostIP to register", hololensHostIP);

  const headers = new Headers({
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${wdpUsername}:${wdpPassword}`).toString('base64')}`
  });

  // [To refactor into forEach later] Initiate multiple Promises to perform multiple API calls
  var results = await Promise.allSettled([

    // =================================================
    // [API Call #1] GET INSTALLED APPS
    // =================================================
    fetch(new URL("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[0].api),
    {
      method: "GET",
      mode: "cors",
      headers: headers,
      // Added to test next week (11/07)
    })
    .then(httpResponse => {

      csrfToken = httpResponse.headers.get('set-cookie').slice(11,);

      if(httpResponse.status === 200){

        console.log(`[${flag}][${hololensHostIP}] - API 1 - SUCCESS`);

        // This if block is to cover the situation where WDP Auth Cred is incorrect
        // and url contains /IPAddressBlocked.htm
        if((httpResponse?.url).includes("IpAddressBlocked.htm")){

          let errorResponse = {
            deviceId: parsedDeviceData.id,
            timestamp: new Date(),
            fetchType: flag,
            fetchSuccess: false,
            errorMessage: 'Invalid Credentials'

          }

          return errorResponse;

        }


        return httpResponse.json();

      }else{

        console.log(`[${flag}][${hololensHostIP}] - API 1 - FAILURE`);
        return httpResponse.json();


      }

    })
    .then(data => {

      console.log(`[${flag}][${hololensHostIP}]`);
      console.log('[API 1 - JSON Response]',data);

      var responseObject;

      if(data?.errorMessage){

        responseObject = data;

      }else{

        // Create a new object and append apiCall prop. into response
        responseObject = {
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: true,
          errorMessage: null,
          apiCall: HOLOLENS_ESSENTIAL_APIS[0].name,
          csrfToken: csrfToken,
          deviceId: parsedDeviceData.id,
          ...data

        }

        // Create a new object and append apiCall prop. into response
        parsedDeviceData["installedApps"] = data;

      }

      return responseObject;

    })
    .catch(error => {

      console.log(`[${flag}][${hololensHostIP}]`);
      console.log('[API #1 ERROR]', error);

      let errorObject = {
        deviceId: parsedDeviceData.id,
        timestamp: new Date(),
        fetchType: flag,
        fetchSuccess: false,
        errorMessage: error

      }

      return errorObject;

    }),

    // =================================================
    // [API Call #2] GET BATTERY LIFE
    // =================================================
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[1].api,{
      method: "GET",
      mode: "cors",
      headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hololensHostIP}] - GET BATTERY LIFE - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hololensHostIP}] - GET BATTERY LIFE - FAILURE`)
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
          deviceId: parsedDeviceData.id,
          ...data
      }

        // Parse battery life and populate into this object
        parsedDeviceData["battLife"] = Math.floor(data?.RemainingCapacity / data?.MaximumCapacity * 100);

        console.log(`[${flag}][${hololensHostIP}] GET BATTERY LIFE - SUCCESS - response`);

        return responseObject;
    })
    .catch(error => {

        console.log('[API #2 ERROR]', error);

        let errorObject = {
          deviceId: parsedDeviceData.id,
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: false,
          errorMessage: error
        }

        return errorObject;

    }),

    // =================================================
    // [API Call #3] GET POWER STATE INFO
    // =================================================
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[2].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {
        if(httpResponse.status === 200){
            console.log(`[${flag}][${hololensHostIP}] - API 3 - SUCCESS`)
            return httpResponse.json();
        }else{
            console.log(`[${flag}][${hololensHostIP}] - API 3 - FAILURE`)
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
        deviceId: parsedDeviceData.id,
        ...data
    }


      // Create a new object and append apiCall prop. into response
      parsedDeviceData["lowPowerState"] = data?.LowPowerState;
      parsedDeviceData["lowPowerStateAvailable"] = data?.LowPowerStateAvailable;

      return responseObject;

    })
    .catch(error => {

        console.log(`[${flag}][${hololensHostIP}][API #3 ERROR]`);
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
    // [API Call #4] GET OS NAME
    // =================================================
    fetch("http://" + hololensHostIP + HOLOLENS_ESSENTIAL_APIS[3].api,{
        method: "GET",
        mode: "cors",
        headers: headers
    })
    .then(httpResponse => {

        if(httpResponse.status === 200){

          console.log(`[${flag}][${hololensHostIP}] - API 4 - SUCCESS`);
          return httpResponse.json();

        }else{

          console.log(`[${flag}][${hololensHostIP}] - API 4 - FAILURE`)
          console.log(response);
          return httpResponse.json();

        }

    })
    .then(data => {

      let responseObject = {
        timestamp: new Date(),
        fetchType: flag,
        fetchSuccess: true,
        errorMessage: null,
        apiCall: HOLOLENS_ESSENTIAL_APIS[3].name,
        deviceId: parsedDeviceData.id,
        ...data

      }

      // Create a new object and append apiCall prop. into response
      parsedDeviceData["hostComputerName"] = data?.ComputerName;

      return responseObject;

    })
    .catch(error => {

        console.log('[API #4 ERROR]', error);

        let errorMessage = {
          deviceId: parsedDeviceData.id,
          timestamp: new Date(),
          fetchType: flag,
          fetchSuccess: false,
          errorMessage: error
        }

        return errorMessage;

    })

  ]);


  // If result exists
  if(results){

    // Append ID (Moved ID assignment back at the backend)
    // parsedDeviceData.id = uuid();

    console.log("[REGISTRATION PROCESS V2] parsedDeviceData----", parsedDeviceData);

    // Find index (to refactor to compare id vs id instead of deviceName once process is deemed stable)
    var index = REGISTERED_DEVICES.findIndex((registeredHololens)=>{

      return registeredHololens.deviceName === parsedDeviceData.deviceName;

    });


    // If index exists, replace it with this. Otherwise, push new device into registry
    if(index > -1){

      REGISTERED_DEVICES[index]= parsedDeviceData;

    }else{

      REGISTERED_DEVICES.push(parsedDeviceData);

    }

    console.log("[REGISTRATION PROCESS V2] REGISTERED_DEVICES after adding new device----", REGISTERED_DEVICES);


  }

  return res.send(results);

}

// ===========================================================
// This function serves to obtain existing WiFi profiles in HL2
// ===========================================================
async function getWifiProfiles(req, res, flag){

  var responseObject = {};

  console.log("Backend - getWifiInfo(...) - Package - packageFullName - ", req);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${req.body.username}:${req.body.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.body.hostIP}/api/wifi/interfaces`,{
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

  console.log("Backend - getWifiNetworks(...) - Package - packageFullName - ", req.query);

  // HTTP Header with Fetch's Header instance
  const httpHeader = new Headers({
    // "Content-Type": "multipart/form-data",
    // "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": `Basic ${Buffer.from(`${req.body.username}:${req.body.password}`).toString('base64')}`,
    // "X-CSRF-Token": csrfToken,
    "Cookie": `CSRF-Token=${csrfToken}`
    // "cookie": csrfToken
  });

  // Perform POST fetch to request HL2 App STOP
  // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
  var result = await fetch(`http://${req.body.hostIP}/api/wifi/networks?interface=${req.body.GUID}`,{
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

// ====================================================================
// [Standalone Live Stream App Prototyping]
//  This function serves to perform HTTP POST Request of Frontend
//  network information so that HoloLens App is able to store it in its
//  configs before FMETP Server establishes websocket connection
// ====================================================================
async function requestJoiningOfStandaloneLiveStreamRoom(req, res){

  // Parse HTTP Body from Frontend
  var httpBody = req.body;
  var hololensIP = req.body?.hololensIP? req.body.hololensIP: null;

  // 1. Construct request body
  try{

    // [Guarded Clause] Empty request
    if(httpBody?.sourceIPAddress === undefined && httpBody?.roomName === undefined){

      throw new Error('Empty Request');

    }

    // [Guarded Clause] If Room Name is undefined
    if(httpBody?.roomName === undefined || httpBody?.roomName.length < 1){

      throw new Error('IP is missing');

    }

    // [Guarded Clause] If Source IP Address is undefined
    if(httpBody?.sourceIPAddress === undefined || httpBody?.sourceIPAddress.length < 1){

      throw new Error('Source IP is missing');

    }

    // Populate httpBody into new object
    const requestObject = {

      sourceIPAddress: httpBody?.sourceIPAddress,
      roomName: httpBody?.roomName

    }

    console.log("[STANDALONE LIVESTREAM TESTBED] requestObject - ", requestObject);

  }catch(error){

    console.log(error.message);

    // Return error response 400 with the respective error message
    return res.status(400).json({

      status: 400,
      message: error.message

    });

  }


  // 2. Scaffold API HTTP POST Request
  try{

    // *To uncomment this when Standalone Video Stream is ready
    // Instantiate async HTTP POST Request to HoloLens
    // var result = fetch(`http://${hololensIP}:3001/joinroom`,
    //   {
    //       method: "POST",
    //       mode: "cors",
    //       headers: httpHeader,
    //       // body: req.body
    //       body:httpBody,
    //       // signal: cancelRequestAppInstallation.signal
    //       // redirect: 'follow'
    //   })
    //   .then((hololensResponse)=>{

    //     console.log("[STANDALONE LIVESTREAM TESTBED] Raw Hololens response", hololensResponse);

    //     return hololensResponse.json();

    //   })
    //   .then((data)=>{

    //     console.log("[STANDALONE LIVESTREAM TESTBED] Parsed Hololens response", data);

    //     return data;

    //   })
    //   .catch((error)=>{

    //     throw new Error(error);

    //   });

      // *1. To uncomment this when Standalone Video Stream is ready
      // *2. To refactor this to include status code (success/error) and OK message from hololens when
      //    Standalone Video Stream is ready
      // res.send(result);

      // Response test to acknowledge request received from frontend
      // * Comment this when fetch routine above is live
      res.status(200).json({

        statusCode: 200,
        message: "[STANDALONE LIVESTREAM TESTBED] Join Room Request OK. Proceed to join room."

      });

  }catch(error){

    console.log("[STANDALONE LIVESTREAM TESTBED] Bad Fetch Request", error);

    // Return bad request error
    return res.status(400).json({

      statusCode: 400,
      message: "Join Room Request NOT OK. Bad Request."

    });

  }

}

















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
