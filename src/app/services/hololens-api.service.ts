import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpParams,  } from '@angular/common/http';

import { Observable, Subscription, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
// import { Credentials } from 'src/shared/credentials';
import { Buffer } from 'buffer';
import { DevicesService } from './devices.service';
import { Device } from '../models/device.model';

@Injectable({
  providedIn: 'root'
})
export class HololensAPIService {

  data!: Subscription;
  httpHeaders: any;

  Credentials = {
    username: 'ioxpCustomer_4g01_1',
    password: 'stk@AR-4650'
  }

  // [Test] Backend Proxy Server URL
  // SINGLE SERVER
  backendUrl: string = 'https://localhost:3001';

  // DUPLICATE SERVERS FOR REDUNDANCY
  // backendUrl: string[] = [
  //   'https://localhost:3001',
  //   'httpS://localhost:3002',
  // ];

  // 21/11/23: STOP HEREEEEEEE
  randomisedIndex: number = Math.floor(Math.random()*2);

  constructor(private http: HttpClient) { }

  ngOnInit() {
  }

  // randomisedIndex = ():number => {
  //   return Math.floor(Math.random()*2);
  // };


  getBatteryLife(): Observable<any>{
    // Store header and payload in vars
    this.httpHeaders = new HttpHeaders({
      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    });

    // return this.http.get(`${this.backendUrl[Math.floor(Math.random()*2)]}/api/power/battery`, {headers: this.httpHeaders});
    return this.http.get(`${this.backendUrl}/api/power/battery`, {headers: this.httpHeaders});

  }

  // [KIV] To delete once Web Worker has been evaluated to be stable
  getInstalledApps(hlHostAddress: any): Observable<any>{

    var httpHeaders ={
      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    }

    const httpOptions = {
      headers: httpHeaders,
      // params: httpParams
    }

    console.log("In Hololens API Service - getInstalledApps - hlHostAddress", hlHostAddress);

    return this.http.get(`${this.backendUrl}/getinstalledapps?hlHostAddress=${hlHostAddress}`, httpOptions)
      .pipe(
        timeout(30000),
        catchError(error => error)
    );

  }

  // This function fetches an array of API responses from backend proxy and returns
  registerHololens(registeringDeviceData: any): Observable<any> {


    var httpHeaders ={
      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',p
      // 'sec-fetch-site': 'same-origin',

    }

    const httpOptions = {
      headers: httpHeaders,
      // params: httpParams
    }

    const httpBody = {

      username: registeringDeviceData.username,
      password: registeringDeviceData.password,

    }

    console.log("In Hololens API Service - registeringDeviceData: ", registeringDeviceData);

    return this.http.post(`${this.backendUrl}/register?hlHostAddress=${registeringDeviceData?.hostIP}`,
      httpBody,
      httpOptions)
      .pipe(
        timeout(30000),
        catchError(error => error)
    );

  }

  // This function fetches an array of API responses from backend proxy and returns
  fetchLatestHLData(hlAddress: any): Observable<any> {

    var httpHeaders = {

      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'rejectUnauthorized': 'false'
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    }

    const httpOptions = {
      headers: httpHeaders,
      // params: httpParams
    }

    return this.http.get<any[]>(`${this.backendUrl}/refresh?hlHostAddress=${hlAddress}`, httpOptions)
    .pipe(catchError(error => {

      console.log("Hololens API - [Refresh Error] - error msg: ",error);

      return throwError(()=> error);

    }));

  }

  fetchHLDataOnSteadyState(hlAddress:any): Observable<any>{

    var httpHeaders = {

      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    }

    const httpOptions = {
      headers: httpHeaders,
      // params: httpParams
    }



    return this.http.get<any[]>(`${this.backendUrl}/refresh?hlHostAddress=${hlAddress}`, httpOptions)
      .pipe(catchError(error => {

        console.log("Hololens API - [Refresh Error] - error msg: ",error);

        return throwError(()=> error);

      }));

  }

  installHLApp(hlAppFile: any, hlAddress:any): Observable<any>{

    console.log('In installHLApp() - hlAppFile -', hlAppFile);
    console.log('In installHLApp() - hlAddress -', hlAddress);

    // Parse hlAppFile to get rid of filepath (Parsed filename is in index 1)
    // var parsedHlAppFile = hlFileName.split("C:\\fakepath\\");
    // console.log("In installHLApp() - hlFileName (parsed) - ",hlFileName);

    // [HTTP Header configs here]
    var httpHeaders =
    {

      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    }

    // [HTTP Body]
    var formData: any = new FormData();
    // formData.append('package', hlAppFile);
    formData.append('package', hlAppFile, hlAppFile.name);
    console.log("typeof formData -", typeof formData);
    // console.log("formData -", JSON.stringify(formData));

    // [Debug]
    for(var [key,value] of formData.entries()){

      console.log("Key:", key);
      console.log("Value:", value);

    }

    var httpBody = {
      "package": hlAppFile
    }

    // [HTTP Params]
    var httpParams = new HttpParams();
    httpParams.set('package',hlAppFile.name);

    const httpOptions = {
      headers: httpHeaders,
      params: httpParams
    }

    console.log("In Battery life service - httpBody -", formData);

    // this.http.post(this.backendUrl[Math.floor(Math.random()*2)] + `/api/app/packagemanager/packages?package=ITEWest_AssessmentMockUp_1.0.0.0_ARM.appx`, null)
    // return this.http.post(this.backendUrl[Math.floor(Math.random()*2)] + `/api/app/packagemanager/package?package=` + hlFileName.name,
    return this.http.post(`${this.backendUrl}/api/app/packagemanager/package?package=${hlAppFile.name}&host=${hlAddress}`,
      formData,
      httpOptions)
      .pipe(catchError(error => error));

  }

  uninstallHLApp(packageFullName: any, hlAddress: any):Observable<any>{

    // [TEST FOR FUTURE SCALE-UP DEV]
    // var hlAddress = '172.16.2.25';

    // [HTTP Header]
    var httpHeaders =
    {
      // 'Accept': '*/*',
      // 'Accept-Encoding': 'gzip, deflate',
      // 'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      // 'Host': '172.16.2.20',
      // 'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
      // 'Accept':'*/*',
      // 'Accept-Encoding':'gzip, deflate, br',
      // 'Connection': 'keep-alive',
      // 'Referer': 'http://172.16.2.20/',
      // 'X-Requested-With': 'XMLHttpRequest',
      // 'Content-Type': 'multipart/form-data',
      // 'Access-Control-Allow-Origin': '*'
      // 'sec-fetch-mode': 'cors',
      // 'sec-fetch-site': 'same-origin',

    }

    // [HTTP Params]
    var httpParams = new HttpParams();
    httpParams.set('package',packageFullName);

    const httpOptions = {
      headers: httpHeaders,
      params: httpParams
    }

    // [Next Steps] To

    console.log("HttpParams", packageFullName);

    return this.http.delete(`${this.backendUrl}/api/app/packagemanager/package?package=${packageFullName}&host=${hlAddress}`, httpOptions)
      .pipe(catchError(error => error));

  }

  startMixedRealityCapture(hlAddress: any): Observable<any>{

    var httpHeaders =
    {
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
    };

    var httpOptions = {
      headers: httpHeaders
    };

    console.log('Hololens API - startMixedRealityCapture()');

    return this.http.get<any[]>(`${this.backendUrl}/startmrc?host=${hlAddress}`, httpOptions)
      .pipe(catchError(error => error));

  }

  restartHL(hlAddress: any): Observable<any>{

    console.log('Hololens API - restartHL()');

    // this.http.post(this.backendUrl[Math.floor(Math.random()*2)] + `/api/app/packagemanager/packages?package=ITEWest_AssessmentMockUp_1.0.0.0_ARM.appx`, null)
    return this.http.post(`${this.backendUrl}/api/control/restart?host=${hlAddress}`, null)
      .pipe(catchError(error => error));

  }

  shutdownHL(hlAddress: any): Observable<any>{

    console.log('Hololens API - shutdownHL()');

    // this.http.post(this.backendUrl[Math.floor(Math.random()*2)] + `/api/app/packagemanager/packages?package=ITEWest_AssessmentMockUp_1.0.0.0_ARM.appx`, null)
    return this.http.post(`${this.backendUrl}/api/control/shutdown?host=${hlAddress}`, null)
      .pipe(catchError(error => error));

  }

  playHLApp(hlAddress: any, encodedPRAID: any, encodedPackageFullName: any): Observable<any>{

    return this.http.post(`${this.backendUrl}/playapp?host=${hlAddress}&praid=${encodedPRAID}&package=${encodedPackageFullName}`, null)
      .pipe(catchError(error => error));


  }

  stopHLApp(hlAddress: any, encodedPackageFullName: any): Observable<any>{

    // Ref: http://172.16.2.103/api/taskmanager/app?package=V2luZ0FydF8xLjAuMjkuMF9hcm02NF9fcHpxM3hwNzZteGFmZw%3D%3D
    return this.http.delete(`${this.backendUrl}/stopapp?host=${hlAddress}&package=${encodedPackageFullName}`)
      .pipe(catchError(error => error));

  }

  getWifiProfiles(selectedDeviceData: any):Observable<any>{

    var httpHeaders =
    {
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
    };

    var httpOptions = {
      headers: httpHeaders
    };

    var httpBody = {

      hostIP: selectedDeviceData.hostIP,
      username: selectedDeviceData.username,
      password: selectedDeviceData.password

    }

    return this.http.post(`${this.backendUrl}/getwifiinfo?host=${selectedDeviceData.hostIP}`, httpBody)
      .pipe(catchError(error => error));

  }

  deleteWifiProfile(deviceWifiData: any):Observable<any>{

    var { hlAddress, GUID, wifiProfileName } = deviceWifiData;

    var httpHeaders =
    {
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
    };

    var httpOptions = {
      headers: httpHeaders
    };

    console.log("Hololens API - deleteWifiProfile - hlAddress ", hlAddress);
    console.log("Hololens API - deleteWifiProfile - hostIP ", wifiProfileName);


    return this.http.delete(`${this.backendUrl}/deletewifiprofile?host=${hlAddress}&wifiprofilename=${wifiProfileName}&guid=${GUID}`, httpOptions)
      .pipe(catchError(error => error));

  }

  getWifiNetworks(deviceWifiData: any):Observable<any>{

    // var { hlAddress, GUID } = deviceWifiData;


    var httpHeaders =
    {
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
    };

    var httpOptions = {
      headers: httpHeaders
    };

    var httpBody = deviceWifiData;

    return this.http.post(`${this.backendUrl}/getwifinetworks?host=${deviceWifiData?.hostIP}&guid=${deviceWifiData?.GUID}`, httpBody)
      .pipe(catchError(error => error));

  }

  connectWifi(networkData: any):Observable<any>{

    var { hlAddress,
          op,
          GUID,
          SSID,
          key,
          createProfile
        } = networkData;

    console.log("Hololens API - connectWifi() - networkData", networkData);

    var httpHeaders =
    {
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
    };

    var httpOptions = {
      headers: httpHeaders
    };

    return this.http.post(`${this.backendUrl}/connectwifi?host=${hlAddress}&guid=${GUID}&op=${op}&SSID=${SSID}&key=${key}&createProfile=${createProfile? 'yes':'no'}`, httpOptions)
      .pipe(catchError(error => error));

  }

  // ================================================================
  // (WEBSOCKET DEV) Send Registered Devices to Backend for storage
  // ================================================================
  storeRegisteredDevice(REGISTERED_DEVICES: Device[]):Observable<any>{

    console.log("(websocket)[Hololens API] [Store Registered Devices] REGISTERED_DEVICES", REGISTERED_DEVICES);

    var httpHeaders = new HttpHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type':'application/json'
    });

    var httpOptions = {

      headers: httpHeaders

    };

    var httpBody = {

      data: REGISTERED_DEVICES

    };

    console.log("(websocket)[Hololens API] [Store Registered Devices] httpBody", httpBody);

    return this.http.post(`${this.backendUrl}/storeregistereddevices`,
      httpBody,
      httpOptions)
      .pipe(catchError(error => error));

  }

  // =================================================================================
  // (WEBSOCKET DEV) Send START signal to Backend to trigger Hololens Polling routine
  // =================================================================================
  startDataPolling():Observable<any>{

    // console.log("(websocket)[Hololens API] [Start Data Polling] REGISTERED_DEVICES", REGISTERED_DEVICES);

    var httpHeaders = new HttpHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type':'application/json'
    });

    var httpOptions = {

      headers: httpHeaders

    };

    var httpBody = {

      startPolling: true

    };

    console.log("(websocket)[Hololens API] [Start Data Polling] httpBody", httpBody);

    return this.http.post(`${this.backendUrl}/startdatapolling`,
      httpBody,
      httpOptions)
      .pipe(catchError(error => error));

  }

  // =================================================================================
  // (WEBSOCKET DEV) Send STOP signal to Backend to trigger Hololens Polling routine
  // =================================================================================
  stopDataPolling(sourceComponent:string):Observable<any>{

    // console.log("(websocket)[Hololens API] [Start Data Polling] REGISTERED_DEVICES", REGISTERED_DEVICES);

    var httpHeaders = new HttpHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type':'application/json'
    });

    var httpOptions = {

      headers: httpHeaders

    };

    var httpBody = {
      sourceComponent: sourceComponent,
      startPolling: false

    };

    console.log("(websocket)[Hololens API] [Stop Data Polling] httpBody", httpBody);

    return this.http.post(`${this.backendUrl}/stopdatapolling`,
      httpBody,
      httpOptions)
      .pipe(catchError(error => error));

  }

  // =================================================================================
  // (JESSEN'S STANDALONE LIVE STREAM DEV)
  // Perform HTTP Post via observable to start requesting of video stream data
  // =================================================================================
  requestJoiningOfStandaloneLiveStreamRoom = ():Observable<any> => {

    var httpHeaders = new HttpHeaders({
      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type':'application/json'
    });

    var httpOptions = {

      headers: httpHeaders

    };

    // Prepare data for HTTP Body
    var httpBody = {

      // Static declaration of IP Addr. for now:
      sourceIPAddress: '172.16.2.99',

      // HoloLens IP
      hololensIP: 'TO POPULATE LATER ONCE APP IS BUILT AND TESTABLE',

      // Static string for now:
      roomName: 'TestRoom'

    };

    console.log("(websocket)[Hololens API] [Stop Data Polling] httpBody", httpBody);

    // Return HTTPClient Observable to caller
    return this.http.post(`${this.backendUrl}/joinroom`,
      httpBody,
      httpOptions)
      .pipe(catchError(error => throwError(error)));

  }



  // =================================================================================
  // (START RUNTIME TIMER - KIV) Send START signal to Backend to trigger trial timer
  // =================================================================================
  // startRuntimeTimer():Observable<any>{

  //   // console.log("(websocket)[Hololens API] [Start Data Polling] REGISTERED_DEVICES", REGISTERED_DEVICES);

  //   var httpHeaders = new HttpHeaders({
  //     'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
  //     'Content-Type':'application/json'
  //   });

  //   var httpOptions = {

  //     headers: httpHeaders

  //   };

  //   var httpBody = {

  //     startRuntimeTimer: true

  //   };

  //   console.log("(trial timer)[Hololens API] [Stop Data Polling] httpBody", httpBody);

  //   return this.http.post(`${this.backendUrl}/startruntimetimer`,
  //     httpBody,
  //     httpOptions)
  //     .pipe(catchError(error => error));

  // }

  // =================================================================================
  // (STOP RUNTIME TIMER - KIV) Send START signal to Backend to trigger trial timer
  // =================================================================================
  // stopRuntimeTimer():Observable<any>{

  //   // console.log("(websocket)[Hololens API] [Start Data Polling] REGISTERED_DEVICES", REGISTERED_DEVICES);

  //   var httpHeaders = new HttpHeaders({
  //     'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
  //     'Content-Type':'application/json'
  //   });

  //   var httpOptions = {

  //     headers: httpHeaders

  //   };

  //   var httpBody = {

  //     startRuntimeTimer: false

  //   };

  //   console.log("(websocket)[Hololens API] [Stop Data Polling] httpBody", httpBody);

  //   return this.http.post(`${this.backendUrl}/stopruntimetimer`,
  //     httpBody,
  //     httpOptions)
  //     .pipe(catchError(error => error));

  // }

}


