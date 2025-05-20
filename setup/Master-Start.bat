:: Backend - API Proxy without SSL cert
:: docker run -p 3001:3001 -d mdm-app/api-proxy-3001:v1
:: docker run -p 3002:3002 -d mdm-app/api-proxy-3002:v1

:: Backend - Deploy API Proxies with SSL for HTTPS implementation
:: docker run -p 3001:3001 -d mdm-app/api-proxy-3001-https:v1
:: docker run -p 3002:3002 -d mdm-app/api-proxy-3002-https:v1

:: Backend - Deploy API Proxies with SSL and Websockets for HTTPS implementation
docker run -p 3001:3001 -d mdm-app/api-proxy-websocket-3001:latest

:: Frontend - Deploy Angular
ng serve

pause
