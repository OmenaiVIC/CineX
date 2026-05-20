$ErrorActionPreference = "Stop"
$proc = Start-Process -FilePath "node" -ArgumentList "src/index.js" -PassThru -NoNewWindow
Start-Sleep 3

$tests = @(
  @{Method="GET"; Uri="http://localhost:3001/health"; Body=$null},
  @{Method="GET"; Uri="http://localhost:3001/api/user-settings/ST1TEST"; Body=$null},
  @{Method="GET"; Uri="http://localhost:3001/api/feed/global"; Body=$null},
  @{Method="POST"; Uri="http://localhost:3001/api/ai/summary"; Body='{"address":"ST1TEST"}'}
)

foreach ($t in $tests) {
  try {
    if ($t.Body) {
      $r = Invoke-WebRequest -Method $t.Method -Uri $t.Uri -Body $t.Body -ContentType "application/json" -UseBasicParsing
    } else {
      $r = Invoke-WebRequest -Method $t.Method -Uri $t.Uri -UseBasicParsing
    }
    Write-Host "OK $($t.Uri): $($r.StatusCode) $($r.Content)"
  } catch {
    $res = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
    Write-Host "ERR $($t.Uri): $($res.StatusCode.value__) $($reader.ReadToEnd())"
  }
}

$proc.Kill()
Remove-Item test-routes.ps1
