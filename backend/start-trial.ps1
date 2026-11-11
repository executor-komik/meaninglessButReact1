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
}

& $environmentPython -m pip install --disable-pip-version-check -r (Join-Path $backendDirectory 'requirements.txt')

$backendProcess = Start-Process `
  -FilePath $environmentPython `
  -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') `
  -WorkingDirectory $backendDirectory `
  -PassThru `
  -NoNewWindow

try {
  Set-Location $repositoryDirectory
  npm.cmd run dev -- --host 127.0.0.1
} finally {
  if (-not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }
}