// [COMMENTED] Example of web worker
// if (typeof Worker !== 'undefined') {
//   // Create a new
//   const worker = new Worker(new URL('./../../app.worker', import.meta.url));

//   // console.log("Video Streamer - streamVideo() -  mrcStreamer: ", mrcStreamer);

//   const dataToPass = {

//     data:{

//       hlStreamingUrl: this.hlStreamingUrl,
//       videoElement: JSON.parse(JSON.stringify(this.mrcStreamer.nativeElement))

//     }

//   }

//   // Pass component data to Web Worker
//   worker.postMessage(dataToPass);

//   // Receive data from web worker
//   worker.onmessage = ({ data }) => {

//     console.log("[Video Streamer] Response from web worker:", data);

//   };


// } else {

//   // Web Workers are not supported in this environment.
//   // You should add a fallback so that your program still executes correctly.

// }



//   [WIP] Stream Video From Http Request =========================================
//   async startHttpVideoStream(){

//     var playStream = false;

//     console.log("Video Streamer - startHttpVideoStream - ");

//     this.mrcStreamer2.nativeElement.src = this.url;
//     // this.mrcStreamerSource.nativeElement.src = this.url;
//     this.changeDetectorRef.detectChanges();

//     this.mrcStreamer2.nativeElement.play().then(()=>{

//       console.log("[MRC Stream] Playing...");

//     })


//     const mediaSource = new MediaSource();
//     this.mrcStreamer2.nativeElement.src = URL.createObjectURL(mediaSource);
//     this.changeDetectorRef.detectChanges();
//     ======= [KIV] Video only plays after user clicks play the second time
//     mediaSource.addEventListener('sourceopen',()=>{

//       const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');


//       // ===== VID STREAMING VIA FETCH API & READABLE STREAM [UNCOMMENT TO SEE]
//       //   Discoveries: Cannot stream while readable stream is still open
//       //   Why: Because Blob URL, which is needed in <video>'s src prop., are only defined once readable stream ends
//       //        That means, if user clicks play, vid data stream is established,
//              but blobURL will only be available when user hits stops,
//       fetch(`http://localhost:3001/api/start-video-stream?host=${this.hostIP}`)
//         .then((response)=> {

//           const reader = response.body?.getReader();
//           return new ReadableStream({

//             // Readable Stream constructor - start()
//             start(controller) {


//               return pump();

//               function wait(milliseconds: any) {
//                 // console.log("Enqueued, waiting...");
//                 return new Promise(resolve => setTimeout(resolve, milliseconds));
//               }


//               // Pump function:
//               //    What it does:
//               //        Enqueue chunks into our video data stream
//               function pump(): any {



//                 // Return recursive pump if reading is not yet completed
//                 return reader?.read()
//                   .then(function(this:VideoStreamerComponent, { done, value }) {

//                     // When no more data needs to be consumed, close the stream
//                     if (done) {
//                       controller.close();
//                       return;
//                     }


//                     // Enqueue the next data chunk into our target stream
//                     controller.enqueue(value);

//                     pump();

//                   });

//               }

//             },

//           });
//         })
//         .then((stream)=>{

//           // this.mrcStreamer2.nativeElement.load();

//           console.log("Video Streamer - 1 Fetch - ", mediaSource.readyState);

//           return new Response(stream);

//         })
//         .then((response)=>{

//           console.log("Video Streamer - 2 Fetch - ");

//           return response.blob();


//         })
//         .then((blob)=>{

//           console.log("Blob - blob.arrayBuffer", blob.arrayBuffer().then(buff => buff));

//           // sourceBuffer.appendBuffer(await blob.arrayBuffer().then(buff => buff));

//           // sourceBuffer.addEventListener("updatestart",()=>{

//           //   console.log("Buffering - updatestart....");

//           // })

//           // sourceBuffer.addEventListener("updateend",()=>{

//           //   console.log("Buffering - updateend....");

//           //   mediaSource.endOfStream();

//           //   this.mrcStreamer2.nativeElement.play()
//           //   .then(()=>{

//           //     console.log("PLAYING......", sourceBuffer);

//           //   })


//           // })

//           this.mrcStreamer2.nativeElement.src = URL.createObjectURL(blob);

//           // this.mrcStreamer2.nativeElement.load();
//           this.changeDetectorRef.detectChanges();

//           this.mrcStreamer2.nativeElement.play()
//             .then(()=>{
//               console.log("Playing....")
//             });

//         })


//       // ==== STOP HERE!!!
//       // Tried to perform video streaming by retrieving data chunks and form buffers via Readable Stream but cant
//       // Below is a redundant fetch call, where we call the API proxy, but when fetch is resolved, we are playing
//       // stream via direct HL url, essentially doing the same thing twice.
//       // To continue finding ways to find alternative (and optimised way) to HL vid streaming
//   }

//   stopHttpVideoStream(){

//     this.videoStreamService.endHttpVideoStream(this.hostIP).subscribe({

//       next: (response)=>{

//         console.log("[Success] End Video Stream - ", response);

//       },
//       error: (error)=>{

//         console.log("[Error] End Video Stream Http Response - ", error);

//       },
//       complete: ()=>{

//         console.log("[Complete] End Video Stream Http Response - ");

//       }

//     });

//   }
