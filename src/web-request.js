chrome.webRequest.onAuthRequired.addListener(function(details){
  console.log("chrome.webRequest.onAuthRequired event has fired");
  return {
          authCredentials: {username: "ioxpCustomer_4g01_1", password: "stk@AR-4650"}
  };
},
{urls:["<all_urls>"]},
['asyncBlocking']);
