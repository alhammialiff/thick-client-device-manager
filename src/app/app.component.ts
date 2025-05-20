import { HololensAPIService } from './services/hololens-api.service';
import { Socket } from 'ngx-socket-io';
import { WebSocketService } from './services/web-socket.service';
import { Component, HostListener } from '@angular/core';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { TrialStatusService } from './services/trial-status.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'unified-hololens-manager';

  START_SESSION_TIMER = 0;
  END_SESSION_TIMER = 0;
  TRIAL_EXPIRED:boolean = false;

  constructor(private webSocketService: WebSocketService,
    private hololensAPIService: HololensAPIService,
    private router: Router,
    private trialStatusService: TrialStatusService){}

  ngOnInit(){

    // this.START_SESSION_TIMER = 0;

  }

  ngOnDestroy(){

    this.webSocketService.sendMessageToBackend('frontend disconnect','Frontend Disconnecting');
    this.webSocketService.disconnectSocket();

  }

  // ===========================================================================
  // [Load DOM Event] Handles system runtime message such as Trial Status
  //                  Method auto triggers on document load event
  // ===========================================================================
  @HostListener('window:load', ['$event'])
  beforeRootAppOnLoadHandler = (event:any) => {
    console.log("[App Component - beforeRootAppOnLoadHandler]");


    this.START_SESSION_TIMER = 0;

    // Send initial session timing over websocket and obtain
    // latest Trial Status from backend
    this.webSocketService.sendTrialStatusMessageToBackend({

      runtimeDuration: this.START_SESSION_TIMER,
      source: 'beforeRootAppOnLoadHandler'

    });

    // Listen to trial socket channel
    this.webSocketService.listenToTrialStatusMessage().subscribe({

      next: (response: any)=>{

        console.log("[App Component - Websocket] Receive Trial Message - response", response);

        // Store latests trial activation status in root component variable

        // If Trial Active is false (implying expiry), redirect to trial expired page
        if(!(response?.isActive)){

          this.trialStatusService.setTrialExpiry();
          this.TRIAL_EXPIRED = this.trialStatusService.getTrialStatus();
          this.router.navigate(["/trialexpired"]);

        }

        // this.TRIAL_EXPIRED = !(response?.isActive)? true:false;
        console.log("TRIAL EXPIRED", this.TRIAL_EXPIRED);

      },
      error: (error: any)=>{

        console.log("[App Component - Websocket] Receive Trial Message - error", error);

      },
      complete: ()=>{

        console.log("[App Component - Websocket] Receive Trial Message - complete");

      },

    });

  }

  // ===========================================================================
  // [Before Load DOM Event] Handles system runtime message such as Trial Status
  //                         Method auto triggers on before document unload event
  // ===========================================================================
  @HostListener('window:beforeunload', ['$event'])
  beforeRootAppOnUnloadHandler = (event:any) => {

    this.END_SESSION_TIMER = performance.now();

    this.hololensAPIService.stopDataPolling('app-component').subscribe({

      next: (response)=>{

        console.log("[App Root] Polling Stopped");
        // this.webSocketService.disconnectSocket();

      },
      error: (error)=>{

        console.log("[App Root] Polling Stopped Error: ", error);

      },
      complete: ()=>{

        console.log("[App Root] Polling Stopped Compelte");

      }

    });

    console.log("[App Root] TRIAL EXPIRED (before unload)", this.TRIAL_EXPIRED);

    // If trial has expired, send zero to stop calculating time elapsed
    // Otherwise send session duration
    var duration = !this.TRIAL_EXPIRED? Number(this.END_SESSION_TIMER - this.START_SESSION_TIMER): 0;

    // [Note] Can create timer service and send time back to backend, instead of backend calculating
    this.webSocketService.sendTrialStatusMessageToBackend({

      // If trial is expired, return 0, otherwise return session duration
      runtimeDuration: duration,
      source: 'beforeRootAppOnUnloadHandler'

    });


  }

}

