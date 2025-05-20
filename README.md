# Thick Client Device Manager

## About

HoloLens 2 comes with a browser-based manager Windows Device Portal (WDP). User may access WDP by its local IP Address to enable remote controls on operating HoloLens 2 (HL2). 

Operations that can be performed from WDP are:
1. Restart HoloLens 2
2. Install Apps
3. Live Preview of HoloLens in operation
4. Record and Screen Capture HoloLens view

### Problem Statement
The biggest limitation in HoloLens 2 in typical operation is that the Live Preview only serves the connecting HoloLens. Often, HoloLens 2 are used in a fleet (Eg. multiplayer mode).

Hence, this works aimed to provide a Mobile Device Management system to attain one-to-many HoloLens 2 control and management, 

### Goals
* Concurrent Multiplayer Live Streams (like a 2x2 or 2x1 split screen).
* Remote Controls (Restart, Joining WiFi Network, Remote Installation of HoloLens 2 Apps)
* Status Monitoring (Battery Life, Online/Offline/Sleep Statuses) 

### Operating Environment
The operating environment of Thick Client Device Manager (TCDM) is made as such -:
* TCDM and HL2 withing a siloed local network (this is to allow TCDM to perform API requests to HoloLens 2)
* TCDM (frontend and proxy backend) are hosted on the same hardware, giving rise to its thick client characteristics

### Compatibility
This app is only made for HoloLens 2 only. 

## Running TCDM in development environment

### Developments: Installing Angular Environment and Express.js Backend Proxy
* ```npm i``` - Run this in tcdm-app/ (Angular Frontend Env.), tcdm-app/proxy (Express.js Backend Proxy 1) and tcdm-app/proxy-2 (Express.js Backend Experimental Proxy 2)
* Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### App Usage: Running App

#### Requirements
* `Docker Engine`: This is required to run the API Proxy Backend of TCDM App.

#### How to Run
1. Run `/setup/Install-MDM-Libraries.bat` to install app dependencies and create a Docker Container for app's API Proxy Backend
2. Run `/setup/Master-Start.bat` to run all Docker Container and TCDM Web Client
3. Open browser of choice (Chrome and Edge are compatible ones) and run `localhost:4200`

## Reference
### Windows Device Portal Core API Reference
https://learn.microsoft.com/en-us/windows/uwp/debug-test-perf/device-portal-api-core



**- Alhammi Aliff**
