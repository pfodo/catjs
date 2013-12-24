var _catglobal = catrequire("cat.global"),
    _log = _catglobal.log(),
    _path = require("path"),
    _props = catrequire("cat.props"),
    _basePlugin = catrequire("cat.plugin.base"),
    _utils = catrequire("cat.utils"),
    _spawn = catrequire("cat.plugin.spawn"),
    _fs = require("fs.extra"),
    _typedas = require("typedas"),
    _bower = require('bower'),
    _jsutils = require("js.utils");

module.exports = _basePlugin.ext(function () {

    function _Concat() {

        // save the content per file type
        this.concats = {};
        // map the static names
        this.names = {};

        /**
         * Note: Only one name can be set per type
         *
         * @param key
         * @param value
         */
        this.putName = function(key, value) {
            this.names[key] = value;
        };

        this.getName = function(key) {
            return this.names[key];
        };

        this.add = function(key, concat) {
            if (!this.concats[key]) {
                this.concats[key] = [];
            }

            this.concats[key].push(concat);
        }

        this.get = function(key) {
            return this.concats[key];
        }

        this.all = function() {
            var result = [],
                key;

            for (key in this.concats) {
                if (this.concats.hasOwnProperty(key)) {
                    result.push({
                        key: key,
                        value: this.get(key)
                    });
                }
            }

            return result;
        }
    }

    var _emitter,
        _global,
        _data,
        _internalConfig,
        _project,
        _me = this,
        concatenated = new _Concat();


    return {

        /**
         *  Initial plugin function
         *
         * @param config The configuration:
         *          data - The configuration data
         *          emitter - The emitter reference
         *          global - The global data configuration
         *          internalConfig - CAT internal configuration
         */
        init: function (config) {


            var project = (config.internalConfig ? config.internalConfig.getProject() : undefined),
                imports,
                action,
                wipe = false,
                extensionParams,
                errors = ["[libraries plugin] No valid configuration"],
                manifestFileName = "manifest.json",
                manifestLib = _path.join(global.catlibs, manifestFileName),
                catProjectLib,
                catProjectLibName,
                library, mode,
                workPath,
                libWorkPath,
                manifest,
                libraries,
                slot = 0,
                envinfo;

            if (_fs.existsSync(manifestLib)) {
                manifest = _fs.readFileSync(manifestLib, "utf8");
            }

            function _copyResource() {


                if (!catProjectLib) {
                    _log.error(_props.get("cat.error.config.missing").format("[libraries ext]", "lib"));
                    return undefined;
                }
                var from,
                    artifact = library[mode];

                /**
                 * Copy resource synchronously
                 *
                 * @param item The artifact file name
                 * @param base The base path
                 * @private
                 */
                function _copy(base, item) {

                    function _getExtension(filename) {
                        var ext = _path.extname(filename||'').split('.');
                        return ext[ext.length - 1];
                    }

                    var content, filetype, basename,
                        itemName,
                        staticnames = ('static-names' in library ? library["static-names"] : undefined);


                    // copy the library to the current cat project
                    try {
                        // copy dev
                        if (item) {

                            itemName = (_typedas.isObject(item) && ("name" in item) ? item.name : item);
                            from = (base ? _path.join(libWorkPath, base, itemName) : _path.join(libWorkPath, itemName));

                            /* Copy all of the artifacts to the project's library
                                to = _path.join(catProjectLib, item);
                                _utils.copySync(from, to); */

                            // concatenation
                            content = _fs.readFileSync(from, "utf8");
                            if (content) {

                                filetype = _getExtension(from);
                                basename = _path.basename(from);

                                if (filetype) {
                                    concatenated.add(filetype, content);
                                    if (_jsutils.Object.contains(staticnames, basename)) {
                                        concatenated.putName(filetype, basename);
                                    }
                                }
                            }


                        } else {
                            _log.warning(_props.get("cat.plugin.libraries.config.missing").format("[libraries ext]", library.name));
                        }
                    } catch (e) {
                        _log.error(_props.get("cat.file.copy.failed").format("[libraries]", from, e))
                    }
                }

                if (artifact && _typedas.isArray(artifact)) {
                    artifact.forEach(function (item) {
                        // copy artifacts
                        _copy((library.base || undefined), item);
                    });
                }
            }

            function _exec() {

                var actions = {},
                    process1,
                    targetManifestPath = _path.join(catProjectLib, manifestFileName),
                    doImport = false,
                    concatsByType;

                function _copydone() {

                    _copyResource();
                    _exec();

                }

                library = libraries[slot];


                if (imports && library){
                    if (_typedas.isArray(imports)) {
                        doImport = _utils.contains(imports, library.name);
                    } else {
                        // we are installing all libraries ignore the import stuff
                        doImport = true;
                    }
                }

                libWorkPath = (library ? _path.join(workPath, library.name) : undefined);

                // copy the manifest file
                try {
                    if (_fs.existsSync(manifestLib) && _fs.existsSync(targetManifestPath)) {
                        _utils.copySync(manifestLib, targetManifestPath);
                    }
                } catch (e) {
                    _log.error(_props.get("cat.file.copy.failed").format("[libraries]", targetManifestPath, e))
                }

                actions.install = function () {

                    var bowerConfig = {cwd: workPath};

                    if (library.install === "static") {

                        _copydone();


                    } else if (library.install === "internal") {

                        function _installLibs(lib, mode) {

                            function __installLib(data) {

                                if (!data) {
                                    return undefined;
                                }

                                var src = data.src,
                                    type = data.type,
                                    path = data.path,
                                    name = data.name,
                                    funcs = {
                                        "_baseCopy": function(config) {
                                            var src = config.src,
                                                path = config.path,
                                                name = config.name,
                                                content = config.content;

                                            if (src) {
                                                src = _utils.globmatch({src: src});

                                                src.forEach(function(item) {
                                                    if (item) {
                                                        _utils.copySync(item, _path.join(path, name));
                                                    }
                                                });
                                            } else if (content) {
                                                _fs.writeFileSync(_path.join(path, name), content);
                                            }
                                        },

                                        "json": function(config) {

                                            var parse = ('parse' in config ? config.parse : undefined),
                                                src = "src" in config && config.src,
                                                path = config.path,
                                                name = config.name;

                                            if (src) {
                                                src = _utils.globmatch({src: src});

                                                src.forEach(function(item) {
                                                    var content,
                                                        lcontent;

                                                    if (item) {
                                                        content = _fs.readFileSync(item, "utf8");
                                                        if (content) {
                                                            // parse content..
                                                            if (parse) {
                                                                lcontent = _jsutils.Template.template({
                                                                    content: content,
                                                                    data: {
                                                                        project: project
                                                                    }
                                                                });
                                                            }

                                                            funcs._baseCopy({
                                                                content: lcontent,
                                                                name: name,
                                                                path: path
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        },

                                        "css": function(config) {

                                            funcs._baseCopy(config);
                                        },

                                        "js" : function(config) {

                                            var src = config.src,
                                                path = config.path,
                                                name = config.name;

                                            jsutils.dev({
                                                src: src,
                                                out:{
                                                    name: name,
                                                    path: path
                                                },
                                                jshint: {
                                                    opt: {
                                                        "evil": true,
                                                        "strict": false,
                                                        "curly": true,
                                                        "eqeqeq": true,
                                                        "immed": false,
                                                        "latedef": true,
                                                        "newcap": false,
                                                        "noarg": true,
                                                        "sub": true,
                                                        "undef": true,
                                                        "boss": true,
                                                        "eqnull": true,
                                                        "node": true,
                                                        "es5": false
                                                    },
                                                    "globals": {
                                                        XMLHttpRequest: true,
                                                        document: true,
                                                        _cat: true,
                                                        chai: true
                                                    }
                                                }
                                            });
                                        }
                                    };

                                if (!src || !type || !path || !name) {
                                    _log.error("[CAT libraries install] Not valid argument(s) 'src' \ 'type' \ 'path' \ 'name' ")
                                }

                                resolvedSrcs = [];
                                src.forEach(function(item) {
                                    resolvedSrcs.push(_path.join(libWorkPath, item));
                                });

                                data.src = resolvedSrcs;
                                funcs[type].call(this, data);


                            }

                            var jsutils = _jsutils.Task,
                                src,
                                resolvedSrcs = [],
                                targetPath = library.base,
                                libData;

                            // init
                            // TODO TBD ... DEV is hard coded
                            if (mode in library && library[mode]) {
                                libData = library[mode];
                                targetPath = _path.join(libWorkPath, targetPath);
                                if (targetPath) {
                                    // create internal project library folder if not exists
                                    if (!_fs.existsSync(targetPath)) {
                                        _fs.mkdirpSync(targetPath);
                                    }
                                }

                                if (_typedas.isArray(libData)) {
                                    libData.forEach(function(data) {
                                        data.path = targetPath;
                                        __installLib(data);
                                    });

                                    _copydone();

                                } else {
                                    _log.error("[CAT libraries install] library's dev property should be of 'Array' type");

                                }
                            }

                        }

                         _installLibs(library, "dev");


                    } else if (library.install === "bower") {

                        if (!_utils.isWindows()) {
                            _bower.commands.install([library.name], {}, bowerConfig)
                                .on('end', function (installed) {
                                    _log.info('[bower] library ' + library.name + ' Installed');
                                    _copydone();
                                });

                        } else {
                            /* on windows we have an issue related to git <> bower
                             thus we are running custom spawn
                             */
                            process1 = _spawn().spawn({
                                command: "bowerutils.bat",
                                args: ["install", library.name],
                                options: bowerConfig,
                                emitter: _emitter
                            });

                            process1.on('close', function (code) {
                                if (code !== 0) {
                                    _log.info('[spawn close] exited with code ' + code);
                                } else {
                                    _log.info('[bower] library ' + library.name + ' Installed');
                                    _copydone();
                                }
                            });
                        }
                    }
                };


                actions.clean = function () {
                    var path = library.base;

                    if (library.install === "internal") {
                        path = _path.join(libWorkPath, path);
                        _utils.deleteSync(path);
                        _exec()
                    } else if (library.install === "bower") {
                        _utils.deleteSync(_path.join(workPath, library.name));
                        _exec();
                    }
                };


                actions.build = function() {
                    _copydone();
                };

                slot++;
                if (slot > libraries.length) {

                    // create project's library folder if not exists
                    if (!_fs.existsSync(catProjectLib)) {
                        _fs.mkdirSync(catProjectLib);
                    }

                    // concat artifact files
                    concatsByType = concatenated.all();

                    concatsByType.forEach(function(concatItem) {
                        var contentValue,
                            catProjectLibTarget,
                            filename, staticname;

                        if (concatItem) {
                            if (concatItem.value.length > 0) {
                                catProjectLibTarget = catProjectLib;


                                staticname = concatenated.getName(concatItem.key);
                                contentValue = concatItem.value.join("");
                                // set the static name if found or else generate the name according to the project env
                                filename = (staticname ? staticname : [catProjectLibName, ".", concatItem.key].join(""));

                                _fs.writeFileSync(_path.join(catProjectLibTarget, filename), contentValue)
                            }
                        }
                    });

                    if (_emitter) {
                        _emitter.emit("job.done", {status: "done"});
                    }

                    return undefined;
                }

                if ( doImport && actions[action]) {
                    actions[action].call(this);
                } else {
                    _exec();
                }

            }

            if (!config) {
                _log.error(errors[1]);
                _me.setDisabled(true);
            }

            _emitter = config.emitter;
            _global = config.global;
            _data = config.data;
            _internalConfig = config.internalConfig;
            _project = (_internalConfig ? _internalConfig.getProject() : undefined);

            // initial data binding to 'this'
            _me.dataInit(_data);
            extensionParams = _data.data;

            imports = (extensionParams.imports || "*");
            action = extensionParams.action;
            wipe = ((extensionParams.wipe === "true") ? true : false);

            if (config && extensionParams) {

                // prepare libraries
                if (manifest) {

                    manifest = JSON.parse(manifest);


                    libraries = manifest.libraries;
                    mode = manifest.mode;


                    if (_project) {
                        catProjectLib = manifest.out.folder;
                        catProjectLibName = manifest.out.name;

                        workPath = _path.join(cathome, _project.getInfo("libraries").path);
                    }

                    if (libraries &&
                        _typedas.isArray(libraries)) {

                        if (libraries.length > 0) {
                            _exec();
                        }
                    }
                }

            }
        },

        /**
         * Validate the plugin
         *
         *      dependencies {Array} The array of the supported dependencies types
         *
         * @returns {{dependencies: Array}}
         */
        validate: function() {
            return { dependencies: ["manager"]}
        }

    }

});