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
    console.log("The " + gitIgnoreFileName + " file was added")
}

const upSshIgnoreFileName = '.upssh-ignore';
const upSshIgnoreFileNameExist = fs.existsSync(upSshIgnoreFileName) && fs.lstatSync(upSshIgnoreFileName).isFile();
if (upSshIgnoreFileNameExist) {
    ig.add(fs.readFileSync(upSshIgnoreFileName).toString());
    console.log("The " + upSshIgnoreFileName + " file was added")
} else {
    console.log("The " + upSshIgnoreFileName + " file was not found")
}

async function uploadDir(srcDir, tgtDir) {
    await recursiveUploadDir(srcDir, srcDir, tgtDir)
}

/**
 * A recursive function that upload all files of a directory
 *
 * In the first call, `rootDir` is equal to `srcDir`
 * Then internally for each directory, the function will call itself
 *
 * @param rootDir - the directory to upload
 * @param srcDir - the local directory to upload
 * @param tgtDir - the remote directory
 * @return {Promise<void>}
 */
async function recursiveUploadDir(rootDir, srcDir, tgtDir) {
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
                    await recursiveUploadDir(rootDir, newSrcDir, newTgtDir);
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

const dotEnvPath = path.resolve(path.join('.', '.env'));

const fileExists = fs.existsSync(dotEnvPath) && fs.lstatSync(dotEnvPath).isFile();
if (fileExists) {
    dotenv.config({path: dotEnvPath});
} else {
    console.warn("The file (" + dotEnvPath + ") was not found")
}

/**
 * Data Verification is done after
 * @type {{password: string, port: string | number, host: string, username: string}}
 */
const config = {
    host: process.env.UPSSH_SFTP_SERVER,
    username: process.env.UPSSH_SFTP_USER,
    password: process.env.UPSSH_SFTP_PASSWORD,
    port: process.env.UPSSH_SFTP_PORT || 22
};

if (typeof config.host == 'undefined') {
    console.error("The environment variable (UPSSH_SFTP_SERVER) is undefined. Exiting")
    process.exit(1);
} else {
    console.log("Remote host was set to " + config.host + " on port " + config.port)
}

if (typeof config.username == 'undefined') {
    console.warning("The environment variable (UPSSH_SFTP_USER) is undefined")
} else {
    console.log("Remote user was set to " + config.username)
}

if (typeof config.password == 'undefined') {
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

/**
 * The tasks to execute
 * @type {*[]}
 */
let tasksToExecute = [];

/**
 * The remote working directory
 */
let remoteWorkingDirectory;

/**
 * The property name
 *
 *
 */
const sourcePropertyName = "source";
const targetPropertyName = "target";
const namePropertyName = "name";
const backupPropertyName = "backup";
const tasksPropertyName = "tasks";
const remoteWorkingDirectoryPropertyName = "rwd";

/**
 * If the whole current directory need to be uploaded,
 * the target path may be set as an environment variable
 * @type {string}
 * If no environment variable, you get an undefined
 */
const targetPath = process.env.UPSSH_TARGET_PATH;
if (typeof targetPath != "undefined") {

    /**
     * If we know the target, the deployment name
     * is the name of the target
     */
    deploymentName = path.basename(process.env.UPSSH_TARGET_PATH);

    /**
     * One task
     */
    let task = {};
    task[sourcePropertyName] = lwd;
    task[targetPropertyName] = targetPath;
    tasksToExecute.push(task);
}

/**
 * The remote backup path
 * @type {string}
 */
let backup = process.env.UPSSH_BACKUP_PATH;
if (typeof backup != "undefined") {
    console.log("A backup path was found in the environment variable (UPSSH_BACKUP_PATH): " + backup)
} else {
    console.log("A backup path was not found in the environment variable (UPSSH_BACKUP_PATH)")
}


/**
 * Play file processing
 * @type {string}
 */
let playFile = path.join(lwd, '.', 'upssh.json');
if (fs.existsSync(playFile) && fs.lstatSync(playFile).isFile()) {
    console.log(`A play file file was found (${playFile})`)
    if (tasksToExecute.length > 0) {
        console.error("You cannot run `upssh` with an environment variable and a play file");
        console.error(`   * We found a target path (${targetPath}) in the environment variable (UPSSH_TARGET_PATH)`);
        console.error(`   * We found also the play file (${playFile})`);
        console.error(`Possible solution: move your environment variable (UPSSH_TARGET_PATH) in your play file (${playFile})`);
        process.exit(1);
    }
    let jsonString = fs.readFileSync(playFile).toString();
    let playObj = JSON.parse(jsonString);
    if (playObj.hasOwnProperty(namePropertyName)) {
        deploymentName = playObj[namePropertyName];
        console.log(`A deployment name property (${namePropertyName}) was found in the play file`)
    }
    if (playObj.hasOwnProperty(backupPropertyName)) {
        backup = playObj[backupPropertyName];
        console.log(`A backup path was found in the play file: ${backup}`);
    }
    if (playObj.hasOwnProperty(remoteWorkingDirectoryPropertyName)) {
        remoteWorkingDirectory = playObj[remoteWorkingDirectoryPropertyName];
        console.log(`A remote working directory was found in the play file: ${remoteWorkingDirectory}`);
    }
    if (playObj.hasOwnProperty(tasksPropertyName)) {
        let jsonTasks = playObj[tasksPropertyName];
        if (!Array.isArray(tasksToExecute)) {
            console.error(`The tasks property does not define an array (${tasksToExecute})`);
            process.exit(1);
        }
        console.log(`A list of tasks was found in the play file with ${tasksToExecute.length} tasks`)
        /**
         * Tasks validation
         */
        for (const [index, task] of jsonTasks.entries()) {

            console.log(`Validating the source of the task (${index})`);
            let absolutePathSource;
            if (!task.hasOwnProperty(sourcePropertyName)) {
                console.error(`The task (${index}) does not have a '${sourcePropertyName}' property`);
                process.exit(1);
            } else {
                absolutePathSource = task[sourcePropertyName];
                if (!path.isAbsolute(absolutePathSource)) {
                    absolutePathSource = path.resolve(path.join(lwd, absolutePathSource));
                }
                if (!(fs.existsSync(absolutePathSource) && fs.lstatSync(absolutePathSource).isDirectory())) {
                    console.error(`The source (${absolutePathSource}) is not a directory or does not exist`);
                    process.exit(1);
                }
            }
            if (!task.hasOwnProperty(targetPropertyName)) {
                console.error(`The task (${index}) does not have a '${targetPropertyName}' property`);
                process.exit(1);
            }

            let taskToExecute = {};
            taskToExecute[sourcePropertyName] = absolutePathSource;
            taskToExecute[targetPropertyName] = task[targetPropertyName];
            tasksToExecute.push(taskToExecute);
        }
    }
}

/**
 * The backup path is mandatory
 */
if (typeof backup == "undefined") {
    console.error("The remote backup path is not defined");
    console.error("Possible solution: set it in the environment variable (UPSSH_BACKUP_PATH) or in the `backup` property of a play file (" + playFile + ")");
    process.exit(1);
}


async function processDeployment() {

    await client.connect(config)

    /**
     * The backup directory
     * @type {string}
     */
    const backupHome = backup + client.remotePathSep + deploymentName + '_' + (new Date()).toISOString();
    if (tasksToExecute.length > 1) {
        let exists = await client.exists(backupHome);
        if (!exists) {
            await client.mkdir(backupHome, true);
            console.log(`Backup home directory (${backupHome}) created`);
        }
    }

    /**
     * Validate the target path and
     * create the backup location
     * Absolute target path validation happens in the client
     * because the path separator may not be the same if ran on windows
     */

    for (const [index, task] of tasksToExecute.entries()) {
        let target = task[targetPropertyName];
        console.log(`Validating the target (${target}) of the task (${index})`);

        if (!path.isAbsolute(target)) {
            if (typeof remoteWorkingDirectory == "undefined") {
                console.error(`The target path (${target}) is relative, the remote working directory property (${remoteWorkingDirectoryPropertyName}) should then be set`)
                process.exit(1);
            }
            let absoluteTarget = [remoteWorkingDirectory, target].join(client.remotePathSep);
            task[targetPropertyName] = absoluteTarget;
            /**
             * If this is more than one, the backup location is relative to the backup home
             * otherwise, this is the backup location
             */
            if (tasksToExecute.length > 1) {
                task[backupPropertyName] = [backupHome, target].join(client.remotePathSep);
            } else {
                task[backupPropertyName] = backupHome;
            }
        } else {
            task[targetPropertyName] = target;
            /**
             * If this is more than one, the backup location is relative to the backup home
             * otherwise, this is the backup location
             */
            if (tasksToExecute.length > 1) {
                let baseName = path.basename(target)
                task[backupPropertyName] = [backupHome, baseName].join(client.remotePathSep);
            } else {
                task[backupPropertyName] = backupHome;
            }
        }
        let targetExists = await client.exists(task[targetPropertyName]);
        if (!targetExists) {
            throw new Error(`The target path ${task[targetPropertyName]} does not exist`)
        }
    }


    console.log("Connected")


    /**
     * Executing the tasks
     */
    for (const [index, task] of tasksToExecute.entries()) {
        console.log("Executing the task (" + index + ")");

        let sourcePath = task[sourcePropertyName];
        let targetPath = task[targetPropertyName];
        let backupPath = task[backupPropertyName];

        if (client.exists(targetPath)) {
            console.log("  * Backup: Move the directory (" + targetPath + ") to (" + backupPath + ")");
            await client.rename(targetPath, backupPath);
        } else {
            console.log("  * Backup: The target directory (" + targetPath + ") does not exist and was not moved");
        }

        console.log("  * Upload: Upload the directory (" + sourcePath + ") to (" + targetPath + ")");
        await uploadDir(sourcePath, targetPath);
    }

    await client.end();


}

/**
 * The client
 * @type {SftpClient}
 */
const client = new SftpClient('upssh');
console.log("Trying to connect to " + config.host);

processDeployment()
    .catch(err => {
        console.error(`An error has occurred ${err}`);
        process.exit(1);
    })
    .finally(() => {
        console.log("Disconnected");
        console.log("Bye")
        process.exit(0);
    });