for /f "tokens=5" %%a in ('
	netstat -noa ^| findstr :"4200"
') do if not "%%a"=="0" taskkill /PID %%a /F
 