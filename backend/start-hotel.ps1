$ErrorActionPreference = 'Stop'

$backendDirectory = $PSScriptRoot
$repositoryDirectory = (Resolve-Path (Join-Path $backendDirectory '..')).Path
$environmentDirectory = Join-Path $backendDirectory '.venv'
$environmentPython = Join-Path $environmentDirectory 'Scripts\python.exe'

if (-not (Test-Path $environmentPython)) {
  $pythonCandidates = @()
  $uvPythonRoot = Join-Path $env:APPDATA 'uv\python'
  if (Test-Path $uvPythonRoot) {
    $pythonCandidates += Get-ChildItem -Path $uvPythonRoot -Directory -Filter 'cpython-*' -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName 'python.exe' } |
      Where-Object { Test-Path $_ } |
      ForEach-Object { Get-Item $_ }
  }
  $pythonCandidates += Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Programs\Python') -Directory -Filter 'Python3*' -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName 'python.exe' } |
    Where-Object { Test-Path $_ } |
    ForEach-Object { Get-Item $_ }
  $basePython = $pythonCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1

  if ($basePython) {
    & $basePython.FullName -m venv $environmentDirectory
  } else {
    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if (-not $launcher) {
      throw 'Install Python 3.10 or newer, then run this script again.'
    }
    & $launcher.Source -3 -m venv $environmentDirectory
  }
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not create the hotel app Python environment.'
  }
}

& $environmentPython -m pip install --disable-pip-version-check -r (Join-Path $backendDirectory 'requirements.txt')
if ($LASTEXITCODE -ne 0) {
  throw 'Could not install the hotel app backend dependencies.'
}

$backendProcess = Start-Process `
  -FilePath $environmentPython `
  -ArgumentList @('-m', 'uvicorn', 'app.hotel_main:app', '--host', '127.0.0.1', '--port', '8000') `
  -WorkingDirectory $backendDirectory `
  -PassThru `
  -NoNewWindow

try {
  $backendReady = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if ($backendProcess.HasExited) {
      throw 'The hotel API stopped before it became ready. Check the backend startup output.'
    }
    try {
      $healthResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 2
      if ($healthResponse.StatusCode -eq 200) {
        $backendReady = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $backendReady) {
    throw 'The hotel API did not become ready within 30 seconds.'
  }

  Set-Location $repositoryDirectory
  npm.cmd run dev -- --host 127.0.0.1
} finally {
  if (-not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }
}
