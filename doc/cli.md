## Cli development on Node


## About
This is just development documentation aimed to developers.

## Bin declaration

  * The declaration of the command line script is done in the `bin property`
  
     * [npm](https://docs.npmjs.com/files/package.json#bin)
     * [yarn](https://classic.yarnpkg.com/en/docs/package-json/#toc-bin)
     
  * You can also add a [man page](https://docs.npmjs.com/files/package.json#man)
  
  * Install it locally

```dos
yarn global add file:%cd%
REM or
yarn refresh
``` 
```txt
yarn global v1.22.4
[1/4] Resolving packages...
[2/4] Fetching packages...
info fsevents@1.2.9: The platform "win32" is incompatible with this module.
info "fsevents@1.2.9" is an optional dependency and failed compatibility check. Excluding it from installation.
[3/4] Linking dependencies...
[4/4] Building fresh packages...
success Installed "upssh@1.0.0" with binaries:
      - upssh
Done in 8.75s.
```

## Ref

  * [package_global](https://datacadamia.com/web/javascript/package/package_global)