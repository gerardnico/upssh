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

const dotEnvPath = path.join(__dirname, '.', '.env');

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


const client = new SftpClient('upload-test');

console.log("Trying to connect")
client.connect(config)
    .then(async () => {
        console.log("Connected")
        const from = path.join(__dirname, '.');
        const to = process.env.UPSSH_TARGET_PATH;
        const name = path.basename(process.env.UPSSH_TARGET_PATH)
        const toBackup = process.env.UPSSH_BACKUP_PATH + client.remotePathSep + name + '_' + (new Date()).toISOString();
        console.log("Move the directory ("+to+") to ("+toBackup+")");
        await client.rename(to,toBackup)
        console.log("Upload the directory ("+to+") to ("+toBackup+")");
        await uploadDir(from, from, to);
    })
    .finally(()=> {
        client.end()
        console.log("Disconnected");
        console.log("Bye")
        process.exit(0);
    })
    .catch (err => {
        console.log(`main error: ${err.message}`)
        throw new Error(err);
    });

console.error("Unknown error")
process.exit(1);