# UpSsh - Deploy remotely via SSH

## About

`upssh` is a command line that deploys remotely via SSH with the following steps:
  
  * Move the replaced directory to a backup location with a timestamp
  * Upload the current / working directory

## Features

  * Ignore files defined in `.ignore` and `.upssh-ignore`

## Getting Started

  * Install `upssh` globally

```bash
yarn add -g upssh 
```
  
  * Go to the project directory to deploy

```bash
cd directory/To/Deploy
```

  * Copy the [.env.dist](.env.dist) file properties to a `.env` file 
  * Set the `UPSSH` env values correctly
```dotenv
UPSSH_SFTP_SERVER=hostname
UPSSH_SFTP_USER=user
UPSSH_SFTP_PASSWORD=pwd
UPSSH_SFTP_PORT=22
# If you have only one remote repository
# otherwise you can also create a play upssh.json
# Where the data is uploaded
UPSSH_TARGET_PATH=/path/to/
# Where the actual directory is moved
UPSSH_BACKUP_PATH=/backup/path
```
  * Add your env file in an `ignore` file (to not upload it)
  * Optionally, use a play [upssh.json](doc/upssh-json.md) if you want to upload only subdirectories 
  * Execute `upssh`
```bash
upssh
```
Example of output
```text
The .gitignore file was added
The .upssh-ignore file was not found
Remote host was set to example.com on port 22
Remote user was set to www-data
A password was found
Trying to connect
Connected
Move the directory (/opt/www/app) to (/opt/www/backup/app_2020-06-23T11:01:11.955Z)
Upload the directory (.) to (/opt/www/app)
Created target directory:/opt/www/app
(ignored file  : .env)
(uploaded dir   : .git)
  * uploaded file : .gitignore to /opt/www/app/.gitignore
  * uploaded file : action.php to /opt/www/app/action.php
Created target directory:/opt/www/app/conf
  * uploaded file : conf\default.php to /opt/www/app/conf/default.php
  * uploaded file : conf\metadata.php to /opt/www/app/conf/metadata.php
* process dir   : conf (D:\app\conf)
Created target directory:/opt/www/app/lang
Created target directory:/opt/www/app/lang/en
  * uploaded file : lang\en\settings.php to /opt/www/app/lang/en/settings.php
* process dir   : en (D:\app\lang\en)
Created target directory:/opt/www/app/lang/ja
  * uploaded file : lang\ja\settings.php to /opt/www/app/lang/ja/settings.php
* process dir   : ja (D:\app\lang\ja)
Created target directory:/opt/www/app/lang/pl
  * uploaded file : lang\pl\settings.php to /opt/www/app/lang/pl/settings.php
* process dir   : pl (D:\app\lang\pl)
Created target directory:/opt/www/app/lang/se
  * uploaded file : lang\se\settings.php to /opt/www/app/lang/se/settings.php
* process dir   : se (D:\app\lang\se)
Created target directory:/opt/www/app/lang/zh
  * uploaded file : lang\zh\settings.php to /opt/www/app/lang/zh/settings.php
* process dir   : zh (D:\app\lang\zh)
* process dir   : lang (D:\app\lang)
  * uploaded file : plugin.info.txt to /opt/www/app/plugin.info.txt
  * uploaded file : README to /opt/www/app/README
  * uploaded file : script.js to /opt/www/app/script.js
  * uploaded file : test.html to /opt/www/app/test.html
Disconnected
Bye
```

## Change log

  * `1.0.0` - upload of one directory only
  * `1.0.1` - introduction of a [play](doc/upssh-json.md) to upload more than one directory.

## Dev documentation

See [Dev](doc/dev.md)