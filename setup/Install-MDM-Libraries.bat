cd..
echo =====1. INSTALLING MDM APP LIBRARIES=====
call npm install
echo =====2. INSTALLING ANGULAR COMMAND LINE INTERFACE=====
call npm install -g @angular/cli@15.0.4
echo =====3. NAVIGATING TO DOCKER FOLDER=====
cd proxy
echo =====4. DOCKERIZING API PROXY BACKEND=====
call docker build -t mdm-app/api-proxy-websocket-3001:latest .
pause
