#!/usr/bin/env node

/**
 * This script will upload the file to the server
 * The files will be overwritten.
 *
 * Based on this implementation
 * https://www.npmjs.com/package/ssh2-sftp-client#processsrcdir-dstdir--string
 */

'use strict';


const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const dotenv = require('dotenv')

// An gitignore implementation to not upload the ignored files

const ignore = require('ignore');
const ig = ignore()
    .add(".git");

const gitIgnoreFileName = '.gitignore';
const gitIgnoreFileExist = fs.existsSync(gitIgnoreFileName) && fs.lstatSync(gitIgnoreFileName).isFile();
if (gitIgnoreFileExist) {
    ig.add(fs.readFileSync(gitIgnoreFileName).toString());
    console.log("The "+gitIgnoreFileName+" file was added")
}

const upSshIgnoreFileName = '.upssh-ignore';
const upSshIgnoreFileNameExist = fs.existsSync(upSshIgnoreFileName) && fs.lstatSync(upSshIgnoreFileName).isFile();
if (upSshIgnoreFileNameExist) {
    ig.add(fs.readFileSync(upSshIgnoreFileName).toString());
    console.log("The "+upSshIgnoreFileName+" file was added")
} else {
    console.log("The "+upSshIgnoreFileName+" file was not found")
}


async function uploadDir(rootDir, srcDir, tgtDir) {
    try {

        // if the target directory does not exist, we create it
        if (!await client.exists(tgtDir)) {
            console.log("Created target directory:" + tgtDir);
            await client.mkdir(tgtDir);
        } else {
            console.log("Target directory already exists:" + tgtDir);
        }

        // Traverse local fs
        let dirEntries = fs.readdirSync(srcDir, {
            encoding: 'utf8',
            withFileTypes: true
        });
        for (let dirEntry of dirEntries) {
            if (dirEntry.isDirectory()) {
                let newSrcDir = path.join(srcDir, dirEntry.name); // Arg as string, string returned
                let relativeSrc = path.relative(rootDir, newSrcDir)
                if (!ig.ignores(relativeSrc)) {
                    let newTgtDir = tgtDir + client.remotePathSep + dirEntry.name;
                    await uploadDir(rootDir, newSrcDir, newTgtDir);
                    console.log("* process dir   : " + dirEntry.name + " (" + path.resolve(srcDir, dirEntry.name) + ")");
                } else {
                    console.log("(uploaded dir   : " + newSrcDir + ")");
                }
            } else if (dirEntry.isFile()) {
                if (ig.ignores(dirEntry.name)) {
                    console.log("(ignored file  : " + dirEntry.name + ")")
                } else {
                    let dstFile = tgtDir + client.remotePathSep + dirEntry.name;
                    let srcFile = path.join(srcDir, dirEntry.name);
                    await client.put(srcFile, dstFile); // only string as argument
                    console.log("  * uploaded file : " + srcFile + " to " + dstFile);
                }
            } else {
                console.log(`process: File ignored: ${dirEntry.name} not a regular file`);
            }
        }
    } catch (err) {
        throw new Error(err);
    }
}

// The upload

const dotEnvPath = '.env';

const fileExists = fs.existsSync(dotEnvPath) && fs.lstatSync(dotEnvPath).isFile();
if (fileExists) {
    dotenv.config({path: dotEnvPath});
} else {
    console.warn("The file ("+dotEnvPath+") was not found")
}

const config = {
    host: process.env.UPSSH_SFTP_SERVER,
    username: process.env.UPSSH_SFTP_USER,
    password: process.env.UPSSH_SFTP_PASSWORD,
    port: process.env.UPSSH_SFTP_PORT || 22
};

if (typeof config.host == 'undefined'){
    console.error("The environment variable (UPSSH_SFTP_SERVER) is undefined. Exiting")
    process.exit(1);
} else {
    console.log("Remote host was set to "+config.host+" on port "+config.port)
}

if (typeof config.username == 'undefined'){
    console.warning("The environment variable (UPSSH_SFTP_USER) is undefined")
} else {
    console.log("Remote user was set to "+config.username)
}

if (typeof config.password == 'undefined'){
    console.warning("The environment variable (UPSSH_SFTP_PASSWORD) is undefined")
} else {
    console.log("A password was found")
}

// Building the variable / environment

/**
 * The local working directory
 * @type {string}
 */
const lwd = '.';

/**
 * The deployment name is by default
 * the name of the current local directory
 */
let deploymentName = path.basename(path.join(lwd));
let tasks = [];

/**
 * If the whole current directory need to be uploaded,
 * the target path may be set as an environment variable
 * @type {string}
 */
const targetPath = process.env.UPSSH_TARGET_PATH;
if (typeof targetPath != "undefined"){

    /**
     * If we know the target, the deployment name
     * is the name of the target
     */
    deploymentName = path.basename(process.env.UPSSH_TARGET_PATH);

    /**
     * One task
     */
    tasks.push({
        "source": lwd,
        "target": targetPath
    })
}

/**
 * The remote backup path
 * @type {string}
 */
let backup = process.env.UPSSH_BACKUP_PATH;
if (typeof backup != "undefined"){
    console.log("A backup path was found in the environment variable (UPSSH_BACKUP_PATH): "+backup)
} else {
    console.log("A backup path was not found in the environment variable (UPSSH_BACKUP_PATH)")
}

let playFile =  path.join(lwd, '.', 'upssh.json');
if (fs.existsSync(playFile) && fs.lstatSync(playFile).isFile()){
    console.log("A play file file was found ("+playFile+')')
    if (tasks.length>0){
        console.error("You cannot run `upssh` with environment variable and a play file");
        console.error("   * We found a target path ("+targetPath+") in the environment variable (UPSSH_TARGET_PATH)");
        console.error("   * We found also the play file ("+playFile+")");
        console.error("Possible solution: move your environment variable (UPSSH_TARGET_PATH) in your play file ("+playFile+")");
        process.exit(1);
    }
    let playObj = JSON.parse(playFile);
    if ("name" in playObj){
        deploymentName = playObj["name"];
        console.log("A deployment name was found in the play file: "+name)
    }
    if ("backup" in playObj){
        backup = playObj["backup"];
        console.log("A backup path was found in the play file: "+backup)
    }
    if ("tasks" in playObj){
        tasks = playObj["tasks"];
        if (!Array.isArray(tasks)){
            console.error("The tasks property does not define an array ("+tasks+")");
            process.exit(1);
        }
        console.log("A list of tasks was found in the play file with "+tasks.length+" tasks")
        /**
         * Tasks validation
         */
        for (const [index, task] of tasks.entries()) {
            console.log("Validating the ("+index+") tasks");
            Object.keys(task)
            if (!task.hasOwnProperty("source")){
                console.error("The task ("+index+") does not have a source property");
                process.exit(1);
            }
            if (!task.hasOwnProperty("target")){
                console.error("The task ("+index+") does not have a target property");
                process.exit(1);
            }
        }
    }
}

/**
 * The backup path is mandatory
 */
if (typeof backup == "undefined"){
    console.error("The remote backup path is not defined");
    console.error("Possible solution: set it in the environment variable (UPSSH_BACKUP_PATH) or in the `backup` property of a play file ("+playFile+")");
    process.exit(1);
}

/**
 * The client
 * @type {SftpClient}
 */

const client = new SftpClient('upssh');

console.log("Trying to connect")
client.connect(config)
    .then(async () => {

        console.log("Connected")

        /**
         * The backup directory
         * @type {string}
         */
        const toBackup = backup + client.remotePathSep + deploymentName + '_' + (new Date()).toISOString();

        console.log("Move the directory ("+targetPath+") to ("+toBackup+")");
        await client.rename(targetPath,toBackup)
        console.log("Upload the directory ("+lwd+") to ("+targetPath+")");
        await uploadDir(lwd, lwd, targetPath);
    })
    .finally(()=> {
        client.end()
        console.log("Disconnected");
        console.log("Bye")
        process.exit(0);
    })
    .catch (err => {
        console.error(`main error: ${err.message}`)
        throw new Error(err);
    });
