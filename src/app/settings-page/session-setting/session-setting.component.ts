import { DevicesService } from 'src/app/services/devices.service';
import { SettingsService } from 'src/app/services/settings.service';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-session-setting',
  templateUrl: './session-setting.component.html',
  styleUrls: ['./session-setting.component.scss']
})
export class SessionSettingComponent {

  loadSessionDataForm: FormGroup = new FormGroup({

    sessionFilePath: new FormControl('')

  });

  loadSessionData: { sessionFilePath: any } = {

    sessionFilePath: null

  }

  @ViewChild('backupSessionConfigAnchorElement') backupSessionConfigAnchorElement!: ElementRef;
  @ViewChild('loadSessionConfigInputElement') loadSessionConfigInputElement!: ElementRef;

  downloadObject: string | null = null;

  constructor(private settingsService: SettingsService,
    private devicesService: DevicesService
  ){}

  ngOnInit(){


  }

  ngAfterViewInit(){

    this.loadSessionDataForm.valueChanges.subscribe((selectedFile)=>{

      console.log("[Session Setting Component] onLoadSession - ", selectedFile?.sessionFilePath);

      this.loadSessionData = selectedFile;

    });


  }

  // ========================================================
  // Function to handle manual backup of Session Config Data
  // ========================================================
  onBackupSession = () =>{

    console.log("[Session Setting Component] onBackupSession");

    // STOP HERE - Got a WARNING: sanitizing unsafe URL value
    this.settingsService.backupSessionConfigToFile()
      .then(async (ioResponse)=>{

        console.log("[Session Setting Component] downloadObject", ioResponse);

        // this.downloadObject = ioResponse;

        this.backupSessionConfigAnchorElement.nativeElement.href = await ioResponse?.fileUrl;
        this.backupSessionConfigAnchorElement.nativeElement.download = await ioResponse?.fileName;
        this.backupSessionConfigAnchorElement.nativeElement.click();


      })
      .catch((error)=> {

        console.log("[Session Settings Component - Download File Promise - Error", error);

        this.downloadObject = null;

      });

  }

  // ========================================================
  // Function to handle manual loading of Session Config Data
  // ========================================================
  onLoadSession = async () => {

    console.log("[Session Setting Component] this.loadSessionConfigInputElement", this.loadSessionConfigInputElement.nativeElement.files[0]);
    // this.loadSessionConfigInputElement.nativeElement

    // Extract file from 'files' property in File Uploader element
    var selectedFile = this.loadSessionConfigInputElement.nativeElement.files[0];

    // Instantiate File Reader;
    var fileReader = new FileReader();

    // Read selected Session Config Data
    await fileReader.readAsText(selectedFile);

    // When onload event is triggered, invoke below
    fileReader.onload = function(){

      // Parse Session Config Data as string
      const sessionData = JSON.parse(fileReader.result as string);
      console.log(sessionData);

      // readOutput = fileReader.result;

      // Iterate each property in Session Config Data
      for(var property in sessionData){

        console.log(property);

        console.log("JSON.stringify Session Data", JSON.stringify(sessionData[property]));

        // Set each property into localstorage
        localStorage.setItem(`${property}`,JSON.stringify(sessionData[property]));

      }

      // Give it a few seconds before reloading config
      setTimeout(()=>{

        console.log("[SESSION DATA LOADED] RESTARTING APP...");

        const absoluteURL =
            new URL("http://localhost:4200/started/overview")

        window.location.href = absoluteURL.href;

      },2000);

    }

  }

}
