[CmdletBinding()]
param(
    [ValidateSet('Create', 'CopyBase64', 'Fingerprint')]
    [string]$Mode = 'Create',
    [string]$SigningDirectory = (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'FFOS-Signing'),
    [string]$KeyAlias = 'ffos-release',
    [string]$KeytoolPath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')
$signingRoot = [IO.Path]::GetFullPath($SigningDirectory).TrimEnd('\', '/')
if ($signingRoot -eq $repositoryRoot -or
    $signingRoot.StartsWith($repositoryRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choose a signing directory outside the repository.'
}
# Reject existing junction/symlink ancestors so secrets cannot be redirected into Git.
$ancestor = $signingRoot
while ($ancestor) {
    if (Test-Path -LiteralPath $ancestor) {
        $entry = Get-Item -LiteralPath $ancestor -Force
        if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw 'The signing directory must not have a junction or symlink ancestor.'
        }
    }
    $parent = [IO.Directory]::GetParent($ancestor)
    $ancestor = if ($parent) { $parent.FullName } else { $null }
}

$keystore = Join-Path $signingRoot 'ffos-release.jks'
$certificate = Join-Path $signingRoot 'ffos-release.pem'

if ($Mode -eq 'CopyBase64') {
    if (-not (Test-Path -LiteralPath $keystore -PathType Leaf)) {
        throw 'No keystore found. Create it first; never copy a test/debug key as the release key.'
    }
    Set-Clipboard -Value ([Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore)))
    Write-Host 'Encrypted keystore Base64 copied. Paste only into FFOS_KEYSTORE_BASE64 in GitHub Actions secrets.'
    Write-Host 'After saving the secret, clear the clipboard with: Set-Clipboard -Value ""'
    return
}

if (-not $KeytoolPath) {
    $installedKeytool = Get-Command keytool -ErrorAction SilentlyContinue
    if ($installedKeytool) {
        $KeytoolPath = $installedKeytool.Source
    } else {
        $portableRoot = Join-Path $repositoryRoot 'node_modules/.tmp/ffos-signing-tools/jdk21'
        if (Test-Path -LiteralPath $portableRoot) {
            $portableKeytool = @(Get-ChildItem -LiteralPath $portableRoot -Filter keytool.exe -Recurse)
            if ($portableKeytool.Count -eq 1) { $KeytoolPath = $portableKeytool[0].FullName }
        }
    }
}
if (-not $KeytoolPath -or -not (Test-Path -LiteralPath $KeytoolPath -PathType Leaf)) {
    throw 'JDK keytool is unavailable. Install Temurin JDK 21 or pass -KeytoolPath with its absolute path.'
}

if ($Mode -eq 'Create') {
    if ((Test-Path -LiteralPath $keystore) -or (Test-Path -LiteralPath $certificate)) {
        throw 'Signing files already exist. They will not be overwritten; use Fingerprint or CopyBase64.'
    }
    New-Item -ItemType Directory -Path $signingRoot -Force | Out-Null
    Write-Host "Key location: $keystore"
    Write-Host "Alias: $KeyAlias"
    Write-Host 'Enter the keystore password and a separate key password directly in keytool.'
    Write-Host 'Passwords are hidden; do not type them in chat or as command-line arguments.'
    & $KeytoolPath -genkeypair -storetype JKS -keystore $keystore -alias $KeyAlias `
        -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=FFOS'
    if ($LASTEXITCODE -ne 0) { throw 'Key creation failed. Inspect the local result before retrying.' }
}

if (-not (Test-Path -LiteralPath $keystore -PathType Leaf)) { throw 'No keystore found.' }
if (-not (Test-Path -LiteralPath $certificate -PathType Leaf)) {
    # Export the public certificate only; keytool prompts for the keystore password.
    & $KeytoolPath -exportcert -rfc -storetype JKS -keystore $keystore -alias $KeyAlias -file $certificate
    if ($LASTEXITCODE -ne 0) { throw 'Public certificate export failed; the keystore must be preserved.' }
}
& $KeytoolPath -printcert -file $certificate
if ($LASTEXITCODE -ne 0) { throw 'Certificate inspection failed.' }
Write-Host 'The certificate and SHA256 fingerprint are public; the JKS file and passwords are private.'
Write-Host 'Back up the JKS outside this computer and save both passwords in your password manager.'
Write-Host 'Do not replace or regenerate this key for later FFOS releases.'
