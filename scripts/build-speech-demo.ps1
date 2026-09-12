$ErrorActionPreference = 'Stop'
$outputDirectory = Join-Path $PSScriptRoot '../public/speech-demo'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$voice = New-Object -ComObject SAPI.SpVoice
$voices = $voice.GetVoices()
for ($i = 0; $i -lt $voices.Count; $i++) {
  if ($voices.Item($i).GetDescription() -match 'Helena') { $voice.Voice = $voices.Item($i); break }
}
$voice.Rate = -1
$lines = [ordered]@{
  phrase = 'Hola. Estas son tres maneras de animar una boca. Podemos hablar, hacer gestos y volver al silencio.'
  A = 'a'; E = 'e'; I = 'i'; O = 'o'; U = 'u'; M = 'mmm'; F = 'fff'
}
foreach ($entry in $lines.GetEnumerator()) {
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format.Type = 22
  $stream.Open((Join-Path $outputDirectory ($entry.Key + '.wav')), 3, $false)
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak($entry.Value)
  $stream.Close()
}
Write-Output ('Audio escrito a archivos con ' + $voice.Voice.GetDescription())
