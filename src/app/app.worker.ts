/// <reference lib="webworker" />


import { Buffer } from 'buffer';

// [Working Reference]
// addEventListener('message', ({ data }) => {
//   const response = `worker response to ${data}`;
//   console.log("[Web Worker] response - data", data);
//   postMessage(dummyFunction(data));
// });

// [Web Worker - Get Installed App in Background]
addEventListener('message', ({ data }) => {

  const response = {

    response: getInstalledApps(data.data.hlHostAddress)

  }

  console.log("[Web Worker] response - data", response);

});

const Credentials = {
  username: 'ioxpCustomer_4g01_1',
  password: 'stk@AR-4650'
}

const backendUrl: string = 'https://localhost:3001';

// const backendUrl: string[] = ['https://localhost:3001',
//                               'https://localhost:3002'];

// [PERFORMANCE REFACTOR] Move API calls here so that they run on a separate thread than the UI
function dummyFunction(mrcUrl: string): Object{
  console.log("[Web Worker] mrcUrl - ", mrcUrl);

  return {
    message: mrcUrl
  }

}

async function getInstalledApps(hlHostAddress: any): Promise<any>{

  var httpHeaders ={
    // 'Accept': '*/*',
    // 'Accept-Encoding': 'gzip, deflate',
    // 'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': 'Basic ' + Buffer.from(`${Credentials.username}:${Credentials.password}`).toString('base64'),
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

  console.log("[web Worker] - getInstalledApps - hlHostAddress", hlHostAddress);

  // Perform HTTP Request on backend to get installed apps
  // const httpResponse = await fetch(backendUrl[Math.floor(Math.random()*2)] +'/getinstalledapps?hlHostAddress='+hlHostAddress)
  const httpResponse = await fetch(backendUrl +'/getinstalledapps?hlHostAddress='+hlHostAddress)
    .then((response)=>{

      if(response.ok){

        console.log("[Web Worker - Response OK] ", response);

        return response.json();

      }else{

        console.log("[Web Worker - Response Failed] ", response);

        return 'Unsuccessful'

      }

    })
    .then(jsonData => {

      const appendedObject = {

        hololensIP: hlHostAddress,
        timestamp: new Date(),
        fetchType: '[Web Worker] Get Installed Apps',
        fetchSuccess: true,
        errorMessage: null,
        apiCall: '/getinstalledapps',
        ...jsonData

      }

      console.log("[Web Worker - Response JSON OK] ", appendedObject);

      return appendedObject;

    })
    .catch(error => {

      console.log('[Web Worker - Error Caught during Fetch Req]', error);

      const errorMessage = {

        timestamp: new Date(),
        fetchType: '[Web Worker] Get Installed Apps',
        fetchSuccess: false,
        errorMessage: error

      }

      return errorMessage;

    });

    console.log("[Web Worker - Outside of fetch] ", httpResponse);

    postMessage(httpResponse);

    return httpResponse;


}
