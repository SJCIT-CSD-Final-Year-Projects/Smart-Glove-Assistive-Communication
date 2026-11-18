param(
  [int]$Finger = 1,
  [string]$BaseUrl = "https://gloves-proj.smartglove-skibui.workers.dev",
  [string]$DeviceKey = ""
)

if (-not $DeviceKey) {
  Write-Host "Usage example:" -ForegroundColor Yellow
  Write-Host '.\scripts\test-event.ps1 -Finger 2 -DeviceKey "YOUR_DEVICE_API_KEY"'
  exit 1
}

$headers = @{
  "X-API-Key" = $DeviceKey
  "Content-Type" = "application/json"
}

$body = @{
  device_id = "GLOVE_001"
  finger = $Finger
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "$BaseUrl/api/event" `
  -Method Post `
  -Headers $headers `
  -Body $body | ConvertTo-Json -Depth 10
