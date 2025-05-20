import { DevicesService } from 'src/app/services/devices.service';
import { Injectable, EventEmitter } from '@angular/core';
import { BehaviorSubject, Observable, catchError } from 'rxjs';
import { VideoStream } from '../models/video-stream';
import { HololensAPIService } from './hololens-api.service';
import { Device } from '../models/device.model';
import { HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Buffer } from 'buffer';


@Injectable({
  providedIn: 'root'
})
export class VideoStreamService {

  DEVICE_VIDEO_METADATA: BehaviorSubject<VideoStream>[] = [];
  httpHeaders: any;

  Credentials = {
    username: 'ioxpCustomer_4g01_1',
    password: 'stk@AR-4650'
  }

  hostIP: string = '';

  backendUrl: string = 'http://localhost:3001';
  gridStreamEmitter = new EventEmitter();
  videoWindowHasClosedEmitter = new EventEmitter();



  constructor(private devicesService: DevicesService,
      private hololensAPIService: HololensAPIService,
      private http: HttpClient) { }

  setVideoStreamerData(){

    var registeredDevice: Device[] = [];

    console.log("[VS Service] this.DEVICE_VIDEO_METADATA", this.DEVICE_VIDEO_METADATA);
    console.log("[VS Service] this.devicesService.REGISTERED_DEVICES", this.devicesService.REGISTERED_DEVICES);

    // [Page refreshed check] Check if REGISTERED_DEVICES array is not empty
    // (this means user was from Overview Page)
    if(this.devicesService.REGISTERED_DEVICES.length > 0){

      registeredDevice = this.devicesService.REGISTERED_DEVICES;

    // Otherwise, user was previously from MRC Page and refreshed back to the same page
    }else{

      registeredDevice = this.devicesService.retrieveRegisteredDeviceFromStorage()

    }

    // Append Video Stream-related Behaviour Subject to create data stream for each device
    // [28032024] REFACTOR - to replace Behavior Subject with event emitter wired with Websocket polls
    registeredDevice.forEach((device)=>{

      var videoStreamData$ = new BehaviorSubject<VideoStream>({

        playStream: false,
        hlVideoStreamingUrl: '',
        deviceData: {

          id: device.id,
          deviceName: device.deviceName,
          hostIP: device.hostIP,
          isOnline: device.isOnline,
          isRegistered: device.isRegistered,
          isCharging: device.isCharging,
          battLife: device.battLife,
          lowPowerState: device.lowPowerState,
          lowPowerStateAvailable: device.lowPowerStateAvailable

        },
        isLoading: false

      });

      // Push Behavior Subject into array
      // [28032024] REFACTOR - to push REGISTERED_DEVICES with hlVideoStreamingUrl instead
      this.DEVICE_VIDEO_METADATA.push(videoStreamData$);

    });

  }

  getVideoStreamerDataById(id: string){

    // Filter array of behavior subject by ID
    var videoStreamerData = this.DEVICE_VIDEO_METADATA.filter(device => device.value.deviceData.id === id)[0];

    // Return behavior subject
    return videoStreamerData;

  }

  // 25/07 Stop here
  // How to retain data in MRC Page upon page refresh?
  // Local storage -> Fetch all data based on existing registered device in LS - return back to caller
  getAllVideoStreamerData(){

    // this.hololensAPIService.fetchLatestHLData().subscribe((httpResponse)=>{

    //   console.log("Video Stream Service - getAllVideoStreamerData - httpResponse", httpResponse);

    // })

    // If metadata array is empty
    if(this.devicesService.REGISTERED_DEVICES.length < 1 || this.DEVICE_VIDEO_METADATA.length < 1){

      this.setVideoStreamerData();

    }

    console.log("VS Service - DEVICE_VIDEO_METADATA - ", this.DEVICE_VIDEO_METADATA);

    return this.DEVICE_VIDEO_METADATA;

  }

  getHttpVideoStream(hostIP: string): Observable<any>{

    this.httpHeaders = new HttpHeaders({

      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'

    });

    return this.http.get(`${this.backendUrl}/api/start-video-stream?host=${hostIP}`,
      {
        headers: this.httpHeaders,
        responseType: 'arraybuffer'
      });

  }

  endHttpVideoStream(hostIP: string): Observable<any>{

    this.httpHeaders = new HttpHeaders({

      'Authorization': 'Basic ' + Buffer.from(`${this.Credentials.username}:${this.Credentials.password}`).toString('base64'),
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'

    });

    return this.http.post(`${this.backendUrl}/api/stop-video-stream?host=${hostIP}`,
      {
        signal: 'STOP'
      },
      {
        headers: this.httpHeaders
      }
    );

  }

  emitVideoWindowCloseEvent = (dataToPass: any)=>{


    console.log("Video Stream Service - emitVideoWindowCloseEvent - dataToPass", dataToPass);


    this.videoWindowHasClosedEmitter.emit(dataToPass);

  }

  // ==============================================
  // Serves to broadcast devices that are selected for Grid Stream
  // ==============================================
  broadcastGridStreamCommencement(devicesToStream: any){

    console.log("Video Stream Service - broadcastGridStreamCommencement - devicesToStream", devicesToStream);
    this.gridStreamEmitter.emit(devicesToStream);

  }

}
