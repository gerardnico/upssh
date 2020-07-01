# upssh.json

# About
`.upssh.json` is a file used to define more than one tasks.

## Example

```json
{
   "name": "project",  
   "backup": "/backup/path",
   "rwd": "/opt/www/website",
   "tasks": [
      {
       "source": "subdir",
       "target": "/full/path/to"
      },
      {
       "source": "subdir2",
       "target": "/full/path/to2"
      }
   ]
}
```

where:

  * `name` is an identifier for the deployment. It's used to create the backup directory.
  * `backup` is a remote location where all backup will be stored. This is a root directory meaning that for each deployment a child backup directory will be created
  * `rwd` is the remote working directory. If the remote `target` path is relative, this directory will be used to calculate the absolute path.
  * `tasks` is a collection of upload task with:
    * a `source` relative path to the local working directory.
    * a `target` relative or absolute path

