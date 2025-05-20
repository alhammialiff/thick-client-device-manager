import { HololensAPIService } from 'src/app/services/hololens-api.service';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent {


  joinRoomResponse: string = "";

  constructor(private hololensAPIService: HololensAPIService){}


  ngOnInit(){




  }

  ngAfterViewInit(){


  }

  // ======================================================
  // Callback to initialize sending of API Request back to Backend
  // [Note] Should send Source IP Address and Room Name as a start
  // ======================================================
  onClick = () => {

    this.hololensAPIService.requestJoiningOfStandaloneLiveStreamRoom().subscribe({

      next: (httpResponse: any) => {

        console.log("[TEST COMPONENT] httpResponse: ", httpResponse);

        this.joinRoomResponse = httpResponse?.message? httpResponse.message: "No valid response";

      },
      error: (error: HttpErrorResponse) => {

        console.log("[TEST COMPONENT] error: ", error?.error);

        this.joinRoomResponse = `HTTP Response Error: ${error?.error.status}. ` + error?.error.message;

      },
      complete: () => {

        console.log("[TEST COMPONENT] complete ");

      }


    });


  }

}
