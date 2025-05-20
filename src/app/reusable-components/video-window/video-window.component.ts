import { WebSocketService } from './../../services/web-socket.service';
import { BrowserAgentResolverService } from './../../services/browser-agent-resolver.service';
import { HttpClient } from '@angular/common/http';
import { DevicesService } from 'src/app/services/devices.service';
import { VideoStreamService } from './../../services/video-stream.service';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Blob } from 'buffer';

@Component({
  selector: 'app-video-window',
  templateUrl: './video-window.component.html',
  styleUrls: ['./video-window.component.scss'],
})
export class VideoWindowComponent {
  @ViewChild('mrcStreamer') mrcStreamer!: ElementRef;
  id: any = '';
  hostIP: any = '';
  playingHololensApp: any = '';
  notification: string = '';
  deviceName: any = '';
  videoURL: any = '';
  videoBlob!: Blob;
  videoStreamerData: any = 'null';
  windowHasClosed: boolean = false;
  data: any = {};
  showHeaderFlag: boolean = true;
  browserAgent: string = '';
  isPlaying: boolean = false;
  reloadEventBroadcastChannel = new BroadcastChannel('MRC_VideoWindow_Reload_Channel');
  activeBroadcastChannel = new BroadcastChannel('MRC_VideoWindow_Active_Channel');

  constructor(
    private router: ActivatedRoute,
    public videoStreamService: VideoStreamService,
    private devicesService: DevicesService,
    private changeDetectorRef: ChangeDetectorRef,
    private httpClient:HttpClient,
    private browserAgentResolverService:BrowserAgentResolverService,
    private webSocketService: WebSocketService
  ) {



  }

  ngOnInit() {

    try {

      // Get Browser Agent
      // Why? Because in chrome and edge, URL concatenated with Basic Auth credentials doesn't work
      //      The auth pop-up dialog still appears. In this case, chrome.webRequest API will be used for chrome.
      //      To find similar API for edge so that population of credential pop-up may be automated
      this.browserAgent = this.browserAgentResolverService.detectBrowserAgent();

      // Listen to message event from MDM App
      window.addEventListener('message', (event) => {
        // Obtain data that is sent by MDM App if event exists
        if (event.data.dataToPass) {

          this.id = event.data.dataToPass.id;
          this.hostIP = event.data.dataToPass.hostIP;
          this.playingHololensApp = event.data.dataToPass.playingHololensApp;

          // [WIP] To store credentials in .env file
          // this.videoURL = event.data.dataToPass.videoURL;
          // http://ioxpCustomer_4g01_1:stk@AR-4650@192.168.10.175/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false
          this.videoURL = `http://${this.hostIP}/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false`;

          console.log("Video Window - videoURL - ", this.videoURL);

          this.deviceName = event.data.dataToPass.deviceName;
          console.log('Video Window - Event Data', event.data);

          if (this.deviceName !== '') {

            this.notification = `${this.deviceName} live streaming from main window stopped, resuming live stream from video window`;

          } else {

            console.log(this.deviceName);

            this.notification = `Error: Please close and re-open this video window from the main window again`;

          }

          // this.fetchStreamSource();

        }
      });

      // Set broadcast flag videoWindowIsActive to true
      this.activeBroadcastChannel.postMessage({
        videoWindowIsActive: true
      });



      // Listen to any reload event
      this.reloadEventBroadcastChannel.onmessage = (event) => {

        console.log("Video Window - broadcastChannel - ", event);

        // If message contains 'reload'
        if(event.data?.reload){

            // Close video window
            window.close();

        }

      }

      this.videoStreamService.gridStreamEmitter.subscribe((emittedData)=>{

        console.log("[Constructor] emittedData - ", emittedData);

      });

    } catch (error) {

      // To capture specific errors after E2E is scaffolded and run

    }

  }

  ngAfterViewInit(){

    setTimeout(()=>{
      console.log("Play Video...")
      this.loadAndStandbyPlayVideo();

    },2000);

  }

  ngOnDestroy(){

    // this.closeVideoWindow();

  }

  @HostListener('window:load', ['$event'])
  listenToMainWindowMessageChannel = () =>{

    console.log("[DOM Load Event] listenToMainWindowMessageChannel Invoked");



    // Listen to message event from MDM App
    window.addEventListener('message', (event) => {
      // Obtain data that is sent by MDM App if event exists
      if (event.data.dataToPass) {

        this.id = event.data.dataToPass.id;
        this.hostIP = event.data.dataToPass.hostIP;
        this.playingHololensApp = event.data.dataToPass.playingHololensApp;

        // [WIP] To store credentials in .env file
        // this.videoURL = event.data.dataToPass.videoURL;
        // http://ioxpCustomer_4g01_1:stk@AR-4650@192.168.10.175/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false
        this.videoURL = `http://${this.hostIP}/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false`;

        console.log("Video Window - videoURL - ", this.videoURL);

        this.deviceName = event.data.dataToPass.deviceName;
        console.log('Video Window - Event Data', event.data);

        if (this.deviceName !== '') {

          this.notification = `${this.deviceName} live streaming from main window stopped, resuming live stream from video window`;

        } else {

          console.log(this.deviceName);

          this.notification = `Error: Please close and re-open this video window from the main window again`;

        }

        // this.fetchStreamSource();

      }
    });

  }

  loadAndStandbyPlayVideo = ()=>{

    try{

      console.log("Video URL - ", this.videoURL);
      this.mrcStreamer.nativeElement.muted = true;
      this.mrcStreamer.nativeElement.src = this.videoURL;

      this.mrcStreamer.nativeElement.load();

      this.changeDetectorRef.detectChanges();

    }catch(e){

      console.log("[Video Window] loadAndStandbyPlayVideo - error - ", e);
      if(e instanceof TypeError){

        // Check for device
        console.log("[Video Window] Device IP", this.hostIP);

      }

    }


  }

  reloadVideo() {

    this.notification = `Calibrating stream, please wait`;

    try{

      this.mrcStreamer.nativeElement.load();

    }catch(error){

      console.log("[Captured Error] [Calibrate Window] error", error);

    }

  }

  videoOnPlayingHandler(event: any){

    this.notification = 'Streaming...';

    // Set video playing flag to true
    this.isPlaying = true;
    console.log("Video Window - isPlaying - ", this.isPlaying);

  }

  videoOnLoadedDataHandler(event: any){

    this.notification = 'Loaded...';

    console.log("Video Window - onLoadedDataHandler - data loaded");

    this.mrcStreamer.nativeElement.play();

  }

  videoSuspendedHandler(event: any){

    console.log("Video Window - onLoadedDataHandler - video suspended");


    this.mrcStreamer.nativeElement
      .load();

  }

  @HostListener('window:beforeunload',['$event'])
  closeVideoWindow() {

    this.windowHasClosed = true;

    const dataToPass = {

      hostIP: this.hostIP,
      id: this.id,
      deviceName: this.deviceName,
      windowHasClosed: this.windowHasClosed,

    };

    this.videoStreamService.emitVideoWindowCloseEvent(dataToPass);

    // console.log('window.parent', window.parent);

    // Send windowClosed message back to MDM App
    window.opener.postMessage({dataToPass}, 'http://localhost:4200/started/mixed-reality-capture');


    // Close Window (1s buffer so that postMessage is able to be sent)
    setTimeout(() => {

      window.close();

    }, 5000);

  }

  displayHeader(){

    this.showHeaderFlag = true;
    console.log('Mouse in - showHeaderFlag - ', this.showHeaderFlag);


  }

  hideHeader(){

    this.showHeaderFlag = false;
    console.log('Mouse out (hide header) - showHeaderFlag - ', this.showHeaderFlag);

  }

  // [IMPORTANT NOTE 26/12/2023]
  // Serves to auto-reload revealed video window that was hidden
  // To enable this function and refactor it to make it work with Video Window
  @HostListener('document:visibilitychange',['$event'])
  visibilitychange(){

    if(document.hidden){

      // this.mrcStreamer.nativeElement.pause();
      console.log("Page hidden!!");

    }else{

      console.log("Page shown!! isPlaying", this.isPlaying);

      console.log("Page shown!! Reloading page to reset video...", this.isPlaying);
      console.log("Page shown!! Reloaded", this.isPlaying);
      // console.log("Page shown!! Reloaded - videoWindowIsOpened", this.videoWindowIsOpened);

      if(this.browserAgent === 'firefox'){

        // this.mrcStreamer.nativeElement.load();

      }

      // console.log("Page shown - this.mrcStreamer.nativeElement.seekable", this.mrcStreamer.nativeElement.seekable);
      this.changeDetectorRef.detectChanges();

      // Trigger reload via restarting of angular lifecycle
      this.ngOnInit();
      this.ngAfterViewInit();
      this.notification = 'Reloading stream...'
      this.loadAndStandbyPlayVideo();

      console.log("Page shown!!");

    }

  }

}
