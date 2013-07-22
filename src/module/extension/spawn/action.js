var _fs = require('fs.extra'),
    _path = require('path'),
    _global = catrequire("cat.global"),
    _log = _global.log(),
    _process = require('child_process');

/**
 * Spawn extension for CAT
 *
 * @type {module.exports}
 */
module.exports = function () {

    var _grunt,
        _project,
        _emitter,

        /**
         * Apply the clean extension
         *
         * @param config
         *      command - command to run
         *      options - spawn options
         */
        _apply = function (config) {

            _emitter.emit("spawn.exec", {spawn: _process.spawn});

        },

        /**
         * Plugin initialization
         *
         * @param config The passed arguments
         *          project - The project configuration object
         *          grunt - The grunt handle
         *          emitter - The emitter handle
         *
         * @param ext The extension properties
         */
            _init = function (config, ext) {

            function _init() {

                if (!config) {
                    return undefined;
                }
                _emitter = config.emitter;
                _grunt = (config.grunt || undefined);
                _project = (config.project || undefined);

                _log.info("[spawn] Initialized");
                if (_grunt) {
                    _log("[spawn] Grunt supported");
                }
            }

            _init();

        };

    return {

        init: _init,

        apply: _apply
    };
}();