---
# pawrrtal-126i
title: Create pydantic-settings config module
status: completed
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:27Z
updated_at: 2026-02-28T09:00:30Z
parent: pawrrtal-pva0
---

Create backend/app/core/config.py with Settings class. Replace hardcoded values in db.py and users.py. Add pydantic-settings dependency.

## Summary of Changes

- Created  with a  class
- Fields:  (default SQLite),  (required), ANDROID_HOME=/Users/octaviantocan/Library/Android/sdk
ANTHROPIC_API_KEY=
BUN_INSTALL=/Users/octaviantocan/.bun
COMMAND_MODE=unix2003
FZF_DEFAULT_COMMAND=rg --files --hidden --glob "!.git/*"
HOME=/Users/octaviantocan
JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home
LANG=C.UTF-8
LESS=-R
LOGNAME=octaviantocan
LSCOLORS=Gxfxcxdxbxegedabagacad
LS_COLORS=di=1;36:ln=35:so=32:pi=33:ex=31:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43
LaunchInstanceID=93FBA134-A355-4849-8D17-1C464EFCAB1A
NDK_HOME=/Users/octaviantocan/Library/Android/sdk/ndk/29.0.14206865
OLDPWD=/Volumes/Crucial X10/Projects/pawrrtal
OSLogRateLimit=64
PAGER=less
PATH=/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:/opt/homebrew/opt/ruby/bin:/Users/octaviantocan/.bun/bin:/Users/octaviantocan/.local/bin:/Library/Frameworks/Python.framework/Versions/3.14/bin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/opt/pmk/env/global/bin:/Library/Apple/usr/bin:/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:/Users/octaviantocan/.bun/bin:/Users/octaviantocan/.local/bin:/Library/Frameworks/Python.framework/Versions/3.14/bin:/Users/octaviantocan/Library/pnpm:/Users/octaviantocan/.cargo/bin:/Users/octaviantocan/Library/Android/sdk/platform-tools:/Users/octaviantocan/Library/Android/sdk/cmdline-tools/latest/bin:/Users/octaviantocan/Library/Android/sdk/platform-tools:/Users/octaviantocan/Library/Android/sdk/cmdline-tools/latest/bin
PNPM_HOME=/Users/octaviantocan/Library/pnpm
PWD=/Volumes/Crucial X10/Projects/pawrrtal
SECURITYSESSIONID=186b8
SHELL=/bin/zsh
SHLVL=2
SSH_AUTH_SOCK=/private/tmp/com.apple.launchd.FMuNNUN9sr/Listeners
STARSHIP_SESSION_KEY=6761751194472738
STARSHIP_SHELL=zsh
TMPDIR=/tmp/claude
USER=octaviantocan
XPC_FLAGS=0x0
XPC_SERVICE_NAME=0
ZED_ENVIRONMENT=worktree-shell
ZSH=/Users/octaviantocan/.oh-my-zsh
__CFBundleIdentifier=dev.zed.Zed
__CF_USER_TEXT_ENCODING=0x1F5:0x0:0x0
CLAUDE_AGENT_SDK_VERSION=0.2.62
CLAUDE_CODE_ENTRYPOINT=sdk-ts
COREPACK_ENABLE_AUTO_PIN=0
NoDefaultCurrentDirectoryInExePath=1
OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta
GIT_EDITOR=true
CLAUDECODE=1
CLAUDE_CODE_TMPDIR=/tmp/claude-501
TMPPREFIX=/tmp/claude-501/zsh
SANDBOX_RUNTIME=1
NO_PROXY=localhost,127.0.0.1,::1,*.local,.local,169.254.0.0/16,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
no_proxy=localhost,127.0.0.1,::1,*.local,.local,169.254.0.0/16,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
HTTP_PROXY=http://localhost:58706
HTTPS_PROXY=http://localhost:58706
http_proxy=http://localhost:58706
https_proxy=http://localhost:58706
ALL_PROXY=socks5h://localhost:58707
all_proxy=socks5h://localhost:58707
GIT_SSH_COMMAND=ssh -o ProxyCommand='nc -X 5 -x localhost:58707 %h %p'
FTP_PROXY=socks5h://localhost:58707
ftp_proxy=socks5h://localhost:58707
RSYNC_PROXY=localhost:58707
DOCKER_HTTP_PROXY=http://localhost:58706
DOCKER_HTTPS_PROXY=http://localhost:58706
CLOUDSDK_PROXY_TYPE=https
CLOUDSDK_PROXY_ADDRESS=localhost
CLOUDSDK_PROXY_PORT=58706
GRPC_PROXY=socks5h://localhost:58707
grpc_proxy=socks5h://localhost:58707
_=/usr/bin/env (default 'dev')
- Added  convenience property
- Configured  with  file loading, UTF-8 encoding, and
- Added  to
- Replaced hardcoded  in  with
- Replaced manual  +  guard in  with
- Replaced  in  with
- Removed  and  imports from

## Summary of Changes

- Created backend/app/core/config.py with a Settings(BaseSettings) class
- Fields: db_url (default SQLite), auth_secret (required), env (default 'dev')
- Added is_production convenience property
- Configured SettingsConfigDict with .env file loading, UTF-8 encoding, and extra='ignore'
- Added pydantic-settings>=2.12.0 to backend/pyproject.toml
- Replaced hardcoded DATABASE_URL in db.py with settings.db_url
- Replaced manual os.environ.get + RuntimeError guard in users.py with settings.auth_secret
- Replaced os.environ.get('ENV') in users.py with settings.is_production
- Removed dotenv and os imports from users.py
