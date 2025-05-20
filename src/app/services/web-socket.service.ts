import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private webSocket: Socket;

  constructor() {

    this.webSocket = new Socket({
      url: "https://localhost:3001/"
    });

  }

  connectSocket(){

    console.log("[Websocket Service] Connect");

    this.webSocket.emit(`message`,'Connection Request');

  }

  reconnectSocket(){

    console.log("[Websocket Service] Connect");

    this.webSocket.emit(`connection`);

  }

  sendMessageToBackend(topic: string,message: any){

    this.webSocket.emit('message',message);

  }

  sendTrialStatusMessageToBackend(message: any){

    this.webSocket.emit('trialstatus',message);

  }

  receiveStatus(){

    return this.webSocket.fromEvent(`message`);

  }

  listenToTrialStatusMessage(){

    return this.webSocket.fromEvent(`trialstatus`);

  }

  disconnectSocket(){

    this.webSocket.emit('frontend disconnect','Client disconnecting');

    console.log("[DISCONNECTING SOCKET]");

    this.webSocket.disconnect(true);

  }

}
