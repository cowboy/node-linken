# linken

> like `npm link` but maybe easier or something.

```
Instead of linking in-development projects globally (npm link), then linking
them into another project (npm link projectname), just link them directly to
the other project with explicit symlinks.

Usage: linken dest [dest [...]] --src somepath [--src somepath [...]]

     --src  Directory containing one or more in-development projects. These
            projects are linked into the dest projects node_modules dirs.
  --unlink  Instead of linking, unlink.
   --debug  A lot more output.
    --help  This help screen.
 --version  The version.

An example: linken /dev/repos/*/ --src /dev/repos

Link any "src" repos (subdirectories of /dev/repos) into each project matched
by /dev/repos/*/. In this case, every subdirectory of /dev/repos.

This would also work: cd /dev/repos; linken */ --src .
```

## why?
[SO MANY REPOS](https://github.com/gruntjs)

## revision history
0.2.1 - 2014-05-09 - Falls back to infinity for version range if none specified.
0.2.0 - 2012-10-10 - Now resolves module version conflicts. Works as a lib. Unit tests. Yay.
0.1.0 - 2012-10-09 - Initial release.
