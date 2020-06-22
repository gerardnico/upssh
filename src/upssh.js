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

// An gitignore implementation to not upload the ignored files
/**
 *
 * @type {{Ignore: Ignore} | ignore}
 */
const ignore = require('ignore');
const ig = ignore()
    .add(fs.readFileSync('.gitignore').toString())
    .add(".git")
    .add(fs.readFileSync('.upssh-ignore').toString());


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
const SftpClient = require('ssh2-sftp-client');
const dotenvPath = path.join(__dirname, '.', '.env');
require('dotenv').config({ path: dotenvPath });
const config = {
    host: process.env.UPSSH_SFTP_SERVER,
    username: process.env.UPSSH_SFTP_USER,
    password: process.env.UPSSH_SFTP_PASSWORD,
    port: process.env.UPSSH_SFTP_PORT || 22
};
const client = new SftpClient('upload-test');


client.connect(config)
    .then(async () => {
        const from = path.join(__dirname, '.');
        const to = process.env.UPSSH_TARGET_PATH;
        const name = path.basename(process.env.UPSSH_TARGET_PATH)
        const toBackup = process.env.UPSSH_BACKUP_PATH + client.remotePathSep + name + '_' + (new Date()).toISOString();
        await client.rename(to,toBackup)
        await uploadDir(from, from, to);
    })
    .finally(()=> client.end())
    .catch (err => {
        console.log(`main error: ${err.message}`)
        throw new Error(err);
    });