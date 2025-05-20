import { WebSocketService } from './web-socket.service';
import { StatusNotificationsService } from './status-notifications.service';
import { Injectable, EventEmitter } from '@angular/core';
import { Device } from '../models/device.model';
import { v4 as uuidv4 } from 'uuid';
import { HololensAPIService } from './hololens-api.service';
import { Observable, of, Observer, shareReplay, switchMap, concatMap, delay, catchError, timeout, mergeMap, map, tap, TimeoutError, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DevicesService {

  // Array to keep data of registered devices
  REGISTERED_DEVICES: Device[] = [];

  CACHED_INSTALLED_APPS: any[] = [];

  PLAYING_APPS_RECORD: any[] = [];

  onlineHololensRecord: Device[] = [];
  numOfHololensOnline: number = 0;

  batteryLifePercentage!: any;
  observer!: Observer<any>;
  timeOutErrorCountArray: Object[] = [];
  httpRequestCount: number = 0;

  // To emit changes back to Device Panel when user performs Device Config changes in
  // DeviceConfigComponent (i.e. the pop-up dialog)
  deviceConfigChange:any = new EventEmitter();
  deviceDeregistrationEmitter: any = new EventEmitter();
  devicePowerStatusEmitter: any = new EventEmitter();
  onlineHololensCountEmitter: any = new EventEmitter();
  battLowCountEmitter: any = new EventEmitter();
  devicePanelOverlayEvent: any = new EventEmitter();
  // sortedRegisteredDevicesEmitter: any = new EventEmitter();
  deviceUpdate: any = new EventEmitter();

  constructor(private hololensAPIService: HololensAPIService,
    private statusNotificationsService: StatusNotificationsService,
    private webSocketService: WebSocketService) { }

  // =================================================================
  // - This method serves to generate ID for newly registered device and save in REGISTERED_DEVICE
  // =================================================================
  setDeviceMetaData(deviceMetaData: any): any {

    // var deviceUUID = uuidv4();
    console.log("Devices Service - setDeviceMetaData() - deviceMetaData - ", deviceMetaData);
    console.log("Devices Service - setDeviceMetaData() - uuidv4() - ", uuidv4());

    // For some reason this did not append id into existing object after a certain point
    // var prependedDeviceMetaData = {

    //   id: deviceUUID,
    //   ...deviceMetaData

    // }

    // Create an object copy and generate new Device ID for device
    var prependedDeviceMetaData = deviceMetaData;

    // [Websocket Dev] Moved id creation to backend. But for now, lets put this condition
    //                 so we won't make a mess of the existing registration process
    // If ID is assigned (now assigned at the backend)
    if(prependedDeviceMetaData.id === null ||prependedDeviceMetaData.id === undefined){

      prependedDeviceMetaData.id = uuidv4();

    }

    // Push device into Device Registry
    this.REGISTERED_DEVICES.push(prependedDeviceMetaData);

    // [130324] Store updated list of REGISTERED_DEVICES back to backend
    this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({
      next: (response:any)=>{

        console.log("[Success] Registration - REGISTERED_DEVICES has been updated", response);

      },
      error: (error:any)=>{

        console.log("[Error] Registration - Problem occured when storing REGISTERED_DEVICES back to Backend", error);

      },
      complete: ()=>{

        console.log("[Complete] Registration - Storing REGISTERED_DEVICES complete");

      }


    });

    // [WIP] Set unique (if there are duplicate entries)
    // this.checkForDuplicateEntries();

    console.log("Devices Service - setDeviceMetaData() - REGISTERED_DEVICES - ", this.REGISTERED_DEVICES);

    return prependedDeviceMetaData;

  }

  // =================================================================
  // - This method serves to update REGISTERED_DEVICE on user device config changes
  // and emit changes back to device panels
  // =================================================================
  updateDeviceMetaData = (id: any, updatedData: any)=>{

    var filteredIndex = 0;

    // Filter based on received Device ID and create a copy of Device Data
    var filteredDeviceData = this.REGISTERED_DEVICES.filter((deviceData, index) => {

      if(deviceData.id === id){

        filteredIndex = index;

      }

      return deviceData.id === id;

    })[0];

    console.log("DEVICES SERVICE - updateDeviceMetaData - filteredDeviceData",filteredDeviceData);
    console.log("DEVICES SERVICE - updateDeviceMetaData - filteredIndex",filteredIndex);
    console.log("DEVICES SERVICE - updateDeviceMetaData - id",id);
    console.log("DEVICES SERVICE - updateDeviceMetaData - - updatedData",updatedData);
    console.log("DEVICES SERVICE - updateDeviceMetaData - - filteredDeviceData keys", Object.keys(filteredDeviceData));

    // Iteratively check and update new values into filtered Device Data
    for(const [key,value] of Object.entries(updatedData)){

      if(key in filteredDeviceData){

        if(value !== "" && value !== "..."){

          filteredDeviceData[key as keyof Device] = value;

        }

      // [!!!] Temporary block to include Username and Password prop in existing Device Data
      // that is currently in constant exchange with Backend
      }else{

        if(key === 'username'){

          filteredDeviceData[key as keyof Device] = value;

        }else if(key === 'password'){

          filteredDeviceData[key as keyof Device] = value;

        }

      }

    }

    // Set updated device data inside existing REGISTERED_DEVICES and then cache it
    this.REGISTERED_DEVICES[filteredIndex] = filteredDeviceData;
    this.saveRegisteredDevicesRecordIntoLocalStorage();

    // Emit changes back to subscribed device panels
    this.deviceConfigChange.emit(filteredDeviceData);

    console.log("DEVICES SERVICE updateDeviceMetaData - (UPDATED) filteredDeviceData",filteredDeviceData);

    // return this.REGISTERED_DEVICES;

    // [08/06] TO LOOK AT THIS - TX TO DEVICE CONFIG COMP.] Store latest REGISTERED_DEVICES to backend
    this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({

      next: (response:any)=>{

        console.log("(websocket)[Store Registered Devices] - updateDeviceMetaData - response", response);

        // Emit changes back to subscribed device panels
        this.deviceConfigChange.emit(filteredDeviceData);


      },
      error: (error:any)=>{

        console.log("(websocket)[Store Registered Devices] - updateDeviceMetaData  error", error);

      },
      complete: ()=>{

        console.log("(websocket)[Store Registered Devices] - updateDeviceMetaData  Complete");

        location.reload();

      }

    });

  }

  // =================================================================
  // - This method serves to delete Device Profile by removing it from
  //  Device Registry and emit changes back to requesting component
  // =================================================================
  deleteDeviceProfile(id: any){

    console.log("DEVICES SERVICE - deleteDeviceMetaData - ", id);

    const deviceToDeregister: Device = this.REGISTERED_DEVICES.filter((deviceData: any)=> deviceData.id === id)[0];

    // Delete by filtering
    this.REGISTERED_DEVICES = this.REGISTERED_DEVICES.filter((deviceData)=> deviceData.id !== id);

    // Update cache (Local Storage)
    this.saveRegisteredDevicesRecordIntoLocalStorage();

    // Log task
    this.statusNotificationsService.logTask(deviceToDeregister, 'Device Deregistration', true);

    // Emit changes back to Devices Services
    this.deviceDeregistrationEmitter.emit(

      {
        deviceDeregister: true,
        deviceData: deviceToDeregister,
        reloadPage: true
      }

    );

    // [Websocket Dev] This is to sync up REGISTERED_DEVICES at the backend
    //                 If this is not done, the REGISTERED_DEVICE will still have
    //                 the deleted profile, and as a result, during iteration, it prompts an error
    //                 because the profile is then undefined.
    this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({

      next: (response:any)=>{

        console.log("[Success] deleteDeviceProfile - REGISTERED_DEVICES has been updated", response);

      },
      error: (error:any)=>{

        console.log("[Error] deleteDeviceProfile - Problem occured when storing REGISTERED_DEVICES back to Backend", error);

      },
      complete: ()=>{

        console.log("[Complete] deleteDeviceProfile - Storing REGISTERED_DEVICES complete");

      }

    })

  }

  // =================================================================
  // - Counts overall HTTP Request received by this App. [To utilise this
  // for periodic App Refresh (i.e for App Locking prevention)]
  // =================================================================
  setHTTPRequestCount(): void{
    console.log("Devices Services - httpRequestCount", this.httpRequestCount);
    this.httpRequestCount++;

  }

  getHTTPRequestCount(): number{
    console.log("Devices Services - httpRequestCount", this.httpRequestCount);
    return this.httpRequestCount;

  }

  // =================================================================
  // - This method serves to cache updated Device Registry into Browser's
  // Local Storage. Just another way to persist/cache App Data without a
  // proper Backend
  // =================================================================
  saveRegisteredDevicesRecordIntoLocalStorage(): void{

      const objectToSave = {
        savedData: this.REGISTERED_DEVICES
      }


      // Remove existing data from local storage
      try{

        localStorage.removeItem('REGISTERED_DEVICES');

      }catch(e){

        if(e instanceof TypeError){

          console.log("Error",e);

        }

      }

      // Add updated data into local storage
      localStorage.setItem('REGISTERED_DEVICES', JSON.stringify(objectToSave));

      console.log("Device Service - Saved Device Data to Local Storage - REGISTERED_DEVICES - ", this.REGISTERED_DEVICES);

      // Store updated REGISTERED_DEVICE to Backend
      this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({
        // this.hololensAPIService.storeRegisteredDevice(this.getRegisteredDevices()).subscribe({

          next: (response:any)=>{

            console.log("(websocket)[Store Registered Devices] saveRegisteredDevicesRecordIntoLocalStorage response", response);

          },
          error: (error:any)=>{

            console.log("(websocket)[Store Registered Devices] saveRegisteredDevicesRecordIntoLocalStorage error", error);

          },
          complete: ()=>{

            // Create 'REGISTERED_DEVICES' and run method again to ensure key is in LocalStorage
            // for later use
            console.log("(websocket)[Store Registered Devices] saveRegisteredDevicesRecordIntoLocalStorage Complete");
            // this.saveRegisteredDevicesRecordIntoLocalStorage();
            // this.retrieveRegisteredDeviceFromStorage();

          }


      });


  }

  // =================================================================
  // - This method serves to cache Installed app into Browser's
  // Local Storage. This is to eliminate slow response time on the
  // periodic device data refresh
  // =================================================================
  saveInstalledAppsRecordIntoLocalStorage(): void{

    localStorage.setItem('CACHED_INSTALLED_APPS', JSON.stringify(this.CACHED_INSTALLED_APPS));
    console.log("Device Service - Saved Device Data to Local Storage - CACHED_INSTALLED_APPS - ", this.CACHED_INSTALLED_APPS);

  }

  // =================================================================
  // - This method serves to cache currently playing HL2 App into Browser's
  // Local Storage. It serves as a reference point for stopping the App.
  // Note that we have no control over HL2 Apps that are played from external source
  // =================================================================
  savePlayingAppRecordIntoLocalStorage(): void{

    localStorage.setItem('PLAYING_APPS_RECORD', JSON.stringify(this.PLAYING_APPS_RECORD));
    console.log("Device Service - Saved Device Data to Local Storage - PLAYING_APPS_RECORD - ", this.PLAYING_APPS_RECORD);

  }

  // =================================================================
  // - This method serves to cache currently playing HL2 App into Browser's
  // Local Storage. It serves as a reference point for stopping the App.
  // Note that we have no control over HL2 Apps that are played from external source
  // =================================================================
  retrievePlayingAppRecordFromLocalStorage(): any{

    if(localStorage.length >= 1){

      var retrievedData = JSON.parse(localStorage.getItem('PLAYING_APPS_RECORD') as string);

      return retrievedData;

    }else{

      return null;

    }


  }

  // =================================================================
  // - This method serves to retrieve Device Registry from cache.
  // See saveRegisteredDevicesIntoLocalStorage(...)
  // ***Note: ONLY USE DURING INITIALIZATION. OTHERWISE, THERE WILL BE DUPLICATE
  //         ENTRIES ADDED IN REGISTERED_DEVICE RECORD (See below)
  // =================================================================
  retrieveRegisteredDeviceFromStorage = () =>{

    if(localStorage.length >= 1){

      try{

        var retrievedData: Device[] | any = localStorage.getItem('REGISTERED_DEVICES');
        console.log("[retrieveRegisteredDeviceFormStorage]", retrievedData)

        // [22/05] Previously, .push() causes false duplicates, leading to false deletion
        // Replace .push() with explicit assignment
        this.REGISTERED_DEVICES = [...JSON.parse(retrievedData)?.savedData];

        console.log("Devices Service - retrieve...FromStorage - test", JSON.parse(retrievedData));
        console.log("Devices Service - retrieve...FromStorage - this.REGISTERED_DEVICES", this.REGISTERED_DEVICES);

      }catch(e){

        // This means that Local Storage does not have 'REGISTERED_DEVICES' key stored
        if(e instanceof TypeError){

          console.log("Error: ", e);

          this.REGISTERED_DEVICES = [];

          this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({

              next: (response:any)=>{

                console.log("(websocket)[Store Registered Devices] response", response);

              },
              error: (error:any)=>{

                console.log("(websocket)[Store Registered Devices] error", error);

              },
              complete: ()=>{

                // Create 'REGISTERED_DEVICES' and run method again to ensure key is in LocalStorage
                // for later use
                console.log("[Catch Clause](websocket)[Store Registered Devices] Complete");
                this.saveRegisteredDevicesRecordIntoLocalStorage();
                this.retrieveRegisteredDeviceFromStorage();

              }


          });




        }

      }


    }

    console.log("Devices Service - retrieve - this.REGISTERED device before check for duplicate ", this.REGISTERED_DEVICES);

    // Set Device Registry to be unique (if there are duplicate entries)
    this.checkForDuplicateEntries();

    console.log("Devices Service - retrieve - this.REGISTERED device after check for duplicate ", this.REGISTERED_DEVICES);

    // ===============================================================
    // (WEBSOCKET DEV) Send Registered Devices to Backend for storage
    //  TO MODULARISE THIS INTO A SOLE FUNCTION
    // ===============================================================
    this.hololensAPIService.storeRegisteredDevice(this.REGISTERED_DEVICES).subscribe({
    // this.hololensAPIService.storeRegisteredDevice(this.getRegisteredDevices()).subscribe({

      next: (response:any)=>{

        console.log("(websocket)[Store Registered Devices] response", response);

      },
      error: (error:any)=>{

        console.log("(websocket)[Store Registered Devices] error", error);

      },
      complete: ()=>{

        console.log("(websocket)[Store Registered Devices] Complete");

      }


    })

    return this.REGISTERED_DEVICES;

  }


  // =================================================================
  // - This method is to weed out duplicate entries in REGISTERED_DEVICE
  // that might be caused by double change detection. Duplicate check is
  // performed by comparing REGISTERED_DEVICE against a comparator array (entriesToCompare).
  // On every iteration of comparison, entriesToCompare will have (n-1) elements, with
  // the current comparison element removed. This way, identical entry
  // that lies anywhere away the current index is deemed duplicate
  // =================================================================
  checkForDuplicateEntries(){

    console.log("Devices Service - checkForDuplicateEntries - REGISTERED_DEVICES (INITIAL)", this.REGISTERED_DEVICES);

    if(this.REGISTERED_DEVICES.length > 1){

      // Create copy of REGISTERED_DEVICE for below iteration
      var registeredDeviceCopy: Device[] = [...this.REGISTERED_DEVICES];

      registeredDeviceCopy.forEach((deviceData, index)=>{

        // Create copy of entriesToCompare as the array might be diff from prev iteration due to duplicate
        var entriesToCompare: Device[] = [...this.REGISTERED_DEVICES];

        // Remove current entry from comparison
        entriesToCompare.splice(index, 1);

        console.log("Devices Service - checkForDuplicateEntries - entriesToCompare: ", entriesToCompare);
        console.log("Devices Service - checkForDuplicateEntries - deviceeData: ", deviceData);

        // Iterate comparison array
        entriesToCompare.forEach((comparison,index_2)=>{

          console.log("Devices Service - checkForDuplicateEntries - comparison id ...: ", comparison);

          // If ID is the same, remove duplicate
          if(comparison.id === deviceData.id){

            console.log("Devices Service - checkForDuplicateEntries - [DUPLICATE] Removing...: ", comparison);
            this.REGISTERED_DEVICES.splice(index, 1);

          }else{

            console.log("Devices Service - checkForDuplicateEntries - [No duplicate]: ", comparison);

          }

        });

      });

    }

    console.log("Devices Service - checkForDuplicateEntries - [End of Check] Result: ", this.REGISTERED_DEVICES);

  }

  // =================================================================
  // This method returns current Device Registry to requesting component
  // =================================================================
  getRegisteredDevices = () =>{



    console.log("Devices Service - getRegisteredDevices() - ", this.REGISTERED_DEVICES);

    return this.REGISTERED_DEVICES;

  }

  // sortRegisteredDevicesByAscendingAlpha(sortedRegisteredDevices: Device[]){

  //   this.REGISTERED_DEVICES = sortedRegisteredDevices;

  //   this.sortedRegisteredDevicesEmitter.emit({
  //     sort: 'ascending',
  //     triggerRerender: true
  //   });

  // }

  // sortRegisteredDevicesByDescendingAlpha(sortedRegisteredDevices: Device[]){

  //   this.REGISTERED_DEVICES = sortedRegisteredDevices;

  //   console.log("Devices Service - sortRegisteredDevicesByDescendingAlpha() - REGISTERED_DEVICES ", this.REGISTERED_DEVICES);

  //   this.sortedRegisteredDevicesEmitter.emit({
  //     sort: 'descending',
  //     triggerRerender: true
  //   });

  // }

  // =================================================================
  // This method updates Installed Apps record. Used in refreshDeviceData(...)
  // observable to update current Installed App Record (CACHED_INSTALLED_APPS)
  // before caching into Local Storage
  // =================================================================
  updateInstalledAppsRecord(data: any){

    // If CACHED_INSTALLED_APP array is empty
    if(this.CACHED_INSTALLED_APPS.length < 1){

      this.CACHED_INSTALLED_APPS.push({

        hostIP: data.hololensIP,
        installedApps: data.InstalledPackages

      });

    }else{

      const findCache = this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === data.hololensIP);

      // If existing cache is not found
      if(findCache.length < 1){

        this.CACHED_INSTALLED_APPS.push({

          hostIP: data.hololensIP,
          installedApps: data.InstalledPackages

        });

      }else{

        try{

          // Find index of existing cache
          const index = this.CACHED_INSTALLED_APPS.findIndex(findCache[0]);

          // Update existing cache
          this.CACHED_INSTALLED_APPS[index] = {

            hostIP: data.hololensIP,
            installedApps: data.InstalledPackages

          };

        }catch(error){

          if(error instanceof TypeError){

            console.log("Devices Service - Type Error during findIndex of CACHED_INSTALLED_APPS:", error);

          }

        }

      }

    }

    console.log("Devices Service - this.CACHED_INSTALLED_APPS - ", this.CACHED_INSTALLED_APPS);

  }

  // =================================================================
  // - This method serves to get installed apps by IP Address
  //   Returns a specific device installed apps
  // =================================================================
  getInstalledApps(hlAddress: any): any[] | Observable<any>{

    console.log("Devices Service - getInstalledApps - hlAddress ", hlAddress);
    console.log("Devices Service - getInstalledApps - CACHED_INSTALLED_APPS ", this.CACHED_INSTALLED_APPS);
    console.log("Devices Service - getInstalledApps - hlAddress installed apps ", this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === hlAddress)[0]);

    // If cache exists, return cached installed apps
    if(this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === hlAddress).length > 0){

    console.log("Devices Service - getInstalledApps - get cached installed app ", this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === hlAddress)[0]);


    return this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === hlAddress)[0];

    // Otherwise, fetch installed apps
  }else{

      console.log("Devices Service - getInstalledApps - fetching installed apps");

      return this.hololensAPIService.getInstalledApps(hlAddress);

    }

  }


  // =================================================================
  // - This method serves to get all registered device installed apps
  //   Returns CACHED_INSTALLED_APPS
  // =================================================================
  getAllInstalledApps(){

    return this.CACHED_INSTALLED_APPS;

  }

  // =================================================================
  // - This method serves to refresh device data
  // - NTS: This method should only get battery life
  // =================================================================
  refreshDeviceData(deviceData: any): Observable<Device> {

    // Obtain HL Address and User-defined device name via destructuring
    const { id, hlAddress, hlDeviceName, hlComputerHostName } = deviceData;

    // Extract Device ID from its existing metadata record
    var deviceId = id;

    console.log("Devices Service - getDeviceMetaData() - id ", deviceId);

    // Append pipe switchMap to format data into Device model type and return it as an Observable
    return this.hololensAPIService.fetchHLDataOnSteadyState(hlAddress)
    .pipe(

      // Set HTTP Response timeout trigger at N ms
      // timeout(20000),

      // Increase HTTP Request Count
      map((httpResponse: any)=> {

        this.setHTTPRequestCount();

        var cacheToFind = this.CACHED_INSTALLED_APPS.filter(cache => cache.hostIP === hlAddress)[0];

        console.log("[Devices Service] cacheToFind", !cacheToFind + " " + hlAddress);

        // Invoke Web Worker to fetch Installed App
        if(!cacheToFind){

          console.log(`[Devices Service - ${hlAddress} Begin Invoking Web Worker...]`);

          if (typeof Worker !== 'undefined') {

            // Create an instance of Web Worker
            const worker = new Worker(new URL('./../app.worker', import.meta.url));

            const dataToPass = {

              data:{

                hlHostAddress: hlAddress

              }

            }

            // Pass component data to Web Worker
            worker.postMessage(dataToPass);

            // Receive data from web worker
            worker.onmessage = ({ data }) => {

              console.log("[Devices Service - Installed Apps] Response from web worker:", data);

              this.updateInstalledAppsRecord(data);
              this.saveInstalledAppsRecordIntoLocalStorage();

            };


          } else {

            // Web Workers are not supported in this environment.
            // You should add a fallback so that your program still executes correctly.

          }

        }

        return httpResponse;

      }),

      tap((httpResponse: any)=> {

        const httpCountObject = {

          hostIP: hlAddress,
          httpRequestCountToDate: this.httpRequestCount,
          httpResponse: httpResponse

        };

        console.log("Devices Service - refreshDeviceData - httpRequestCount", httpCountObject);

      }),

      // concatMap((httpResponse: any)=> of(httpResponse).pipe(delay(200))),

      switchMap((httpResponse: any) => {

        console.log("Devices Service - refreshDeviceData - HTTP Request for -- ", hlAddress);
        console.log("Devices Service - refreshDeviceData - HTTP Response -- ", httpResponse);

        // If HTTP Response is an array
        if(Array.isArray(httpResponse)){

          // If refresh data response does not have errorMessage
          // if (httpResponse[1].value?.errorMessage === null || httpResponse[1].value?.errorMessage === undefined) {
          if (httpResponse[1].errorMessage === null || httpResponse[1].errorMessage === undefined) {

            const dateNow = new Date();

            // Update batt life
            // console.log("Device Service - refreshDeviceData - HTTP Response - Remaining Cap - ", httpResponse[1].value.RemainingCapacity);
            // console.log("Device Service - refreshDeviceData - HTTP Response - Max Cap - ", httpResponse[1].value.MaximumCapacity);
            this.batteryLifePercentage
              = Math.floor((httpResponse[0].RemainingCapacity / httpResponse[0].MaximumCapacity) * 100);

            // [Weird bug resolved] HTTP response may sometime return remaining cap
            // that are higher than Max cap when batt is full - this sets a hard cap at 100%
            if(this.batteryLifePercentage > 100){

              this.batteryLifePercentage = 100;

            }

            // Create an object copy and update data based on current response
            var updatedHLData:Device = {

              lastUpdated: dateNow.toLocaleString(),
              errorMessage: null,
              id: deviceId,
              hostIP: hlAddress,
              hostComputerName: hlComputerHostName,
              deviceName: hlDeviceName,
              isOnline: true,
              battLife: this.batteryLifePercentage,
              isCharging: httpResponse[0].AcOnline,
              isRegistered: true,
              lowPowerState: httpResponse[1].LowPowerState,
              lowPowerStateAvailable: httpResponse[1].LowPowerStateAvailable,
              effectiveHttpRequestCount: this.httpRequestCount
              // installedApps: httpResponse[0].value.InstalledPackages,

            }

            // Find device metadata based on device's IP and user-defined Device Name
            // and update metadata with latest retrieved data
            this.REGISTERED_DEVICES.forEach((device, index) => {

              console.log("Devices Service - in REGISTERED_DEVICE forEach - ", index);

              if ((device.hostIP === hlAddress && device.deviceName === hlDeviceName) || device.id === id) {

                this.REGISTERED_DEVICES[index] = updatedHLData;

                // Save registered devices data in the browser
                this.saveRegisteredDevicesRecordIntoLocalStorage();

                console.log("Devices Service - in REGISTERED_DEVICE forEach - data (refreshed) ", this.REGISTERED_DEVICES);

              }

            });

            console.log("Devices Service - data (refreshed) - ", this.REGISTERED_DEVICES);

          // Otherwise, device is deemed to be offline
          }else{

            const errorMessage = httpResponse[0].errorMessage;

            console.log("Devices Service - refreshDeviceData - [Response But Error] - errorMessage", errorMessage);

            if(errorMessage.errno === "ETIMEDOUT"){

              throw new Error(`HTTP Request ${hlAddress}: ${errorMessage.errno}`);

            }

          }

        }

        console.log("Devices Service - [Return] filtered REGISTERED_DEVICES", this.REGISTERED_DEVICES.filter((device)=> device.id === id)[0]);

        return of(this.REGISTERED_DEVICES.filter((device)=> device.id === id)[0]);

      }),

      catchError((error: any) => {

        console.log(`Devices Service - in catchError - timeoutError() in fetch Refresh - ${hlAddress}`);
        const dateNow = new Date()

        // this.setTimeoutCounter(deviceId);

        const httpCountObject = {

          hostIP: hlAddress,
          httpRequestCountToDate: this.httpRequestCount,
          httpResponse: null,
          error: error

        };

        console.log("Devices Service - refreshDeviceData - timeout error - httpRequestCount", httpCountObject);


        // Set registered device to offline
        this.REGISTERED_DEVICES.forEach((device, index)=>{

          // If requested device ID exist in REGISTERED_DEVICE registry
          if(device.id === id){

            // Object copy
            var objectCopy = this.REGISTERED_DEVICES[index];

            // Set REGISTERED_DEVICE copy values -
            // Update/mutate registered device registry with isOnline, isCharging set to false
            objectCopy.id = deviceId;
            objectCopy.isOnline = false;
            objectCopy.isCharging = false;
            objectCopy.deviceName = hlDeviceName;
            objectCopy.hostIP = hlAddress;
            objectCopy.isRegistered = true;
            objectCopy.errorMessage = error;
            objectCopy.effectiveHttpRequestCount = this.httpRequestCount;

            console.log("Devices Service - in catchError - [Device might be Offline] - objectCopy.hostComputerName", objectCopy.hostComputerName);


            // Offline device will take historical data from this point on
            this.REGISTERED_DEVICES[index] = objectCopy;

          }

        });

        // Save registered devices data in the browser
        this.saveRegisteredDevicesRecordIntoLocalStorage();


        return of(this.REGISTERED_DEVICES.filter((device)=> device.id === id)[0]);

      })

    );

  }

  // =================================================================
  //  - This method serves to obtain latest incoming HL data
  // =================================================================
  getDeviceData(deviceData: any): Observable<any> {

    // Obtain HL Address and User-defined device name via destructuring
    const { id, hlAddress, hlDeviceName } = deviceData;

    // This function will run when .subscribe() is called
    const dataSubscriber = (observer: Observer<any>) => {

      observer.next(this.REGISTERED_DEVICES.filter((device) => device.id === id));
      observer.complete();

      return { unsubscribe() { } };

    };

    // Create observable with subscriber function above
    const latestIncomingData = new Observable(dataSubscriber);

    // Returns an observable of the incoming data so components may subscribe
    return latestIncomingData;

    // Filter device according to its IP and Device Name and return latest data
    // return this.REGISTERED_DEVICES.filter((device)=> device.hostIP === hlAddress && device.id === id)[0];

  }

  // =================================================================
  //  - TO WRITE DESCR.
  // =================================================================
  getAllDevicesData(): Observable<any>{

    // This function will run when .subscribe() is called
    const dataSubscriber = (observer: Observer<any>) => {

      observer.next(this.REGISTERED_DEVICES);
      observer.complete();

      return { unsubscribe() { } };

    };

    // Create observable with subscriber function above
    const latestIncomingData = new Observable(dataSubscriber);

    // Returns an observable of the incoming data so components may subscribe
    return latestIncomingData;

  }

  // =================================================================
  // - This method serves to push hololens power status to a storage array
  // and emit any status change during runtime
  // =================================================================
  // pushToOnlineHololensRecord(deviceData: Device): void{

  //       // If Hololens Online Record is empty (i.e new run-time)
  //       if(this.onlineHololensRecord.length < 1){

  //         console.log("Devices Services - In pushToOnlineHololensRecord - onlineHololensRecord empty, pushing online device data... ");

  //         // If REGISTERED_DEVICES is not empty (i.e cache exist in browser)
  //         if(this.REGISTERED_DEVICES.length > 0){

  //           // Take cached device data first
  //           this.onlineHololensRecord = this.REGISTERED_DEVICES;

  //           // Count how many online devices in cached device data and update count
  //           this.onlineHololensRecord.forEach((device)=>{

  //             if(device.isOnline){

  //               this.numOfHololensOnline++;

  //             }

  //           });


  //         // Otherwise, this signifies new access to app (no cache present)
  //         }else{

  //           // Push online record
  //           this.onlineHololensRecord.push(deviceData);
  //           this.numOfHololensOnline++;

  //         }

  //         this.devicePowerStatusEmitter.emit(this.onlineHololensRecord);
  //         // this.onlineHololensCountEmitter.emit(this.numOfHololensOnline);


  //       }else{

  //         // Find device online status data in existing array
  //         // var deviceFound = this.onlineHololensRecord.find((deviceData)=>dataFromDevicePanel.id === deviceData.id);
  //         // console.log("Devices Services - In pushToOnlineHololensRecord - deviceFound - ", deviceFound);

  //         // if(deviceFound){

  //         // Filter existing online HL record based on received HL status change update
  //         const filteredOnlineHololens = this.onlineHololensRecord.filter((onlineHololens)=>{

  //           return onlineHololens.id === deviceData.id;

  //         });

  //         // console.log("Devices Services - In pushToOnlineHololensRecord - filteredOnlineHololens - ", filteredOnlineHololens);
  //         console.log("Devices Services - In pushToOnlineHololensRecord - this.onlineHololensRecord - ", this.onlineHololensRecord);

  //         // If there filtering returns a result
  //         if(filteredOnlineHololens.length === 1){


  //           // console.log("Devices Services - In pushToOnlineHololensRecord - existing status - ", this.onlineHololensRecord[0]);
  //           console.log("Devices Services - In pushToOnlineHololensRecord - status update for ", deviceData.hostIP);
  //           console.log("Devices Services - In pushToOnlineHololensRecord - existing status - ", deviceData);
  //           console.log("Devices Services - In pushToOnlineHololensRecord - current status - ", filteredOnlineHololens[0]);

  //           // If existing hololens state is different than its newly emitted online status
  //           if(filteredOnlineHololens[0].isOnline !== deviceData.isOnline){

  //             console.log("Devices Services - In pushToOnlineHololensRecord - isOnline value has changed - ", this.onlineHololensRecord[0]);

  //             // Set new state
  //             filteredOnlineHololens[0].isOnline = deviceData.isOnline;

  //             // If hololens shows online
  //             if(filteredOnlineHololens[0].isOnline && !filteredOnlineHololens[0].lowPowerState){

  //               this.numOfHololensOnline++;
  //               console.log("Devices Services - In pushToOnlineHololensRecord - isOnline value has changed - counter increased ", this.numOfHololensOnline);

  //             }else{

  //               // [15/08] asdasdasdasdasd
  //               this.numOfHololensOnline--;
  //               console.log("Devices Services - In pushToOnlineHololensRecord - isOnline value has changed - counter decreased ", this.numOfHololensOnline);

  //             }

  //             // Replace current index with new value
  //             const index = this.onlineHololensRecord.indexOf(filteredOnlineHololens[0])
  //             this.onlineHololensRecord[index] = deviceData;

  //             this.devicePowerStatusEmitter.emit(this.onlineHololensRecord);

  //           // [TO REWORK CONDITIONS 12/09]
  //           }else{

  //             // If lowPowerState (Sleep Mode) has changed
  //             if(filteredOnlineHololens[0].isOnline){

  //               if(filteredOnlineHololens[0].lowPowerState !== deviceData.lowPowerState){

  //                 // Replace current index with new value
  //                 const index = this.onlineHololensRecord.indexOf(filteredOnlineHololens[0]);
  //                 this.onlineHololensRecord[index] = deviceData;
  //                 this.devicePowerStatusEmitter.emit(this.onlineHololensRecord);

  //                 if(filteredOnlineHololens[0].lowPowerState){

  //                   this.numOfHololensOnline--;

  //                 }


  //               }

  //             }


  //           }

  //         // Otherwise, filtering is empty signifying it's a new record
  //         }else{

  //           // Push new online status record and increase Hololens Online count
  //           this.onlineHololensRecord.push(deviceData);

  //           console.log("Devices Services - In pushToOnlineHololensRecord - filteredOnlineHololens returns empty (add new record) - numOfHololensOnline ", this.numOfHololensOnline);

  //           // If new record isOnline prop is true
  //           if(this.onlineHololensRecord[this.onlineHololensRecord.length-1].isOnline){

  //             // sdasdasdaasdasdasdasdasdasdasdadad

  //             // Increase Hololens online counter
  //             this.numOfHololensOnline++;
  //             console.log("Devices Services - In pushToOnlineHololensRecord - filteredOnlineHololens returns empty (add new record) - counter increased ", this.numOfHololensOnline);
  //             // this.changeDetectorRef.detectChanges();

  //           }else{

  //             // [15/08] sadassadasdasdasdasdasdasdasdsadasdasdasdasdasd
  //             this.numOfHololensOnline--;

  //           }


  //         }

  //           // console.log("Devices Services - In pushToOnlineHololensRecord - filteredOnlineHololens returns empty (add new record) - numOfHololensOnline ", this.numOfHololensOnline);
  //           // this.changeDetectorRef.detectChanges();
  //           // console.log("Devices Services - In pushToOnlineHololensRecord - (updated) onlineHololensRecord - ", this.onlineHololensRecord);

  //           // this.onlineHololensPercentage = (this.numOfHololensOnline / this.devicesToRegister.length) * 100;
  //           // console.log("Devices Services - In pushToOnlineHololensRecord - (updated) onlineHololensPercentage - ", this.onlineHololensPercentage);

  //         // }




  //       }

  //       // Emit updated Online HL Count to requesting components
  //       this.onlineHololensCountEmitter.emit(this.numOfHololensOnline);

  // }

  // =================================================================
  // - This method serves to check for no. of hololens currently online
  // At the moment, method is invoked during ngDoCheck() in Overview
  // =================================================================
  getHololensOnlineCount(): number{

    var onlineCount = 0;

    this.REGISTERED_DEVICES.forEach((deviceData: Device) =>{

      if(deviceData.isOnline && !deviceData.lowPowerState){

        onlineCount++;

      }

    });

    return onlineCount;

  }

  getBatteryLowCount(): number{

    var battLowCount = 0;

    this.REGISTERED_DEVICES.forEach((deviceData: Device) =>{

      if(deviceData.battLife !== null || deviceData.battLife !== undefined){

        if(deviceData.battLife < 25 && (deviceData.isOnline && !deviceData.lowPowerState)){

          battLowCount++;

        }

      }

    });

    return battLowCount;

  }

  playHololensApp(hlAddress:any, encodedPRAID:any, encodedPackageFullName: any): Observable<any>{

    return this.hololensAPIService.playHLApp(hlAddress, encodedPRAID, encodedPackageFullName);

  }

  // =================================================================
  // - This method serves to save latest playing app into record (PLAYING_APPS_RECORD)
  // and cache it in Local Storage
  // =================================================================
  savePlayingAppIntoRecord(playingAppRecord: {id: string, hostIP: string, deviceName: string, appFullName: string}){

    var index: number | null = 0;

    // If record is empty, push
    if(this.PLAYING_APPS_RECORD.length < 1){


      this.PLAYING_APPS_RECORD.push(playingAppRecord);

    // Otherwise, find existing record by ID. If ID is obtained, get index.
    // Else, push new playingAppRecord
    }else{

      console.log("Devices Service - savePlayingAppIntoRecord - ", playingAppRecord);

      this.PLAYING_APPS_RECORD.forEach((existingDevicePlayingAppRecord)=>{

        // If record is found, getindex
        if(existingDevicePlayingAppRecord.id === playingAppRecord.id){

          index = this.PLAYING_APPS_RECORD.indexOf(playingAppRecord);

        }else{

          this.PLAYING_APPS_RECORD.push(playingAppRecord);

          index = null;

        }


      });

      // If index is obtained from above, update existing record with new playing app info
      if(index !== null){

        this.PLAYING_APPS_RECORD[index] = playingAppRecord;

      }

    }

    // Cache latest update into Local Storage
    this.savePlayingAppRecordIntoLocalStorage();

  }

  removeStoppedAppFromRecord(id: string){

    var prunedRecord = this.PLAYING_APPS_RECORD.filter((existingDevicePlayingAppRecord)=> existingDevicePlayingAppRecord.id !== id);
    this.PLAYING_APPS_RECORD = prunedRecord;
    this.savePlayingAppRecordIntoLocalStorage();

  }

  getPlayingAppRecord(){

    if(this.PLAYING_APPS_RECORD.length < 1){

      var retrievedData = this.retrievePlayingAppRecordFromLocalStorage();

      return retrievedData;

    }else{

      return this.PLAYING_APPS_RECORD;

    }

  }

  // [25/09 WIP]
  getPlayingAppRecordById(id: any){

    if(this.PLAYING_APPS_RECORD.length < 1){

      this.PLAYING_APPS_RECORD = this.retrievePlayingAppRecordFromLocalStorage();

    }

    return this.PLAYING_APPS_RECORD.filter((existingDevicePlayingAppRecord: any)=> existingDevicePlayingAppRecord.id === id)[0];

  }

  broadcastOverlayEvent(broadcastMessage: any){


    this.devicePanelOverlayEvent.emit(broadcastMessage);

  }

  listenToDeviceDataChange(){

    console.log("[DEVICES SERVICES] listenToDeviceDataChange - Invoked");

    this.webSocketService.connectSocket();

    this.webSocketService.receiveStatus().subscribe({

      next: (response: any)=>{

        console.log("[DEVICES SERVICES] listenToDeviceDataChange - ", response);
        this.deviceUpdate.emit(response);

        if(this.REGISTERED_DEVICES.length > 1){

          this.REGISTERED_DEVICES.forEach((device, index)=>{

            if(device.id === response?.id && device.deviceName === response?.deviceName){

              this.REGISTERED_DEVICES[index] = response;

              this.saveRegisteredDevicesRecordIntoLocalStorage();

            }

          });


        }


      },
      error: (error)=>{


      },
      complete: ()=>{

        console.log("[DEVICES SERVICES] listenToDeviceDataChange - Websocket listen ended");

      }


    })

  }

  unsubscribeToDeviceDataChange(){

    this.webSocketService.disconnectSocket();

  }

}
