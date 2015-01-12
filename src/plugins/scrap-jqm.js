var _Scrap = catrequire("cat.common.scrap"),
    _codeutils = catrequire("cat.code.utils"),
    _scraputils = require("./utils/Utils"),
    _delayManagerUtils =  require("./utils/DelayManagerUtils");

var tipNum = 1;
module.exports = function () {

    return {

        init: function (config) {

            /**
             * Annotation for jqm library
             *
             *  properties:
             *  name    - jqm
             *  single  - false
             *  singleton - 1[default -1]
             *  $type   - js
             */
            _Scrap.add({name: "jqm",
                single: false,

                func: function (config) {

                    var jqmRows,
                        me = this,
                        tempCommand,

                        generate = function (jqmRow) {

                            var jqm;

                            jqmRow = _codeutils.prepareCode(jqmRow);

                            if (jqmRow && jqmRow.join) {
                                jqm = jqmRow.join("\n");
                            } else {
                                jqm = jqmRow;
                            }

                            if (jqm) {
                                var match = _scraputils.generate({
                                    api: "scrollTo",
                                    apiname: "scrollTo",
                                    exp: jqm
                                });


                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "scrollToWithRapper",
                                        apiname: "scrollToWithRapper",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "tap",
                                        apiname: "tap",
                                        exp: jqm
                                    });
                                }


                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "clickRef",
                                        apiname: "clickRef",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "click",
                                        apiname: "click",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "clickButton",
                                        apiname: "clickButton",
                                        exp: jqm
                                    });
                                }


                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "setCheck",
                                        apiname: "setCheck",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "slide",
                                        apiname: "slide",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "setText",
                                        apiname: "setText",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "checkRadio",
                                        apiname: "checkRadio",
                                        exp: jqm
                                    });
                                }


                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "scrollTop",
                                        apiname: "scrollTop",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "collapsible",
                                        apiname: "collapsible",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "selectMenu",
                                        apiname: "selectMenu",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "selectTab",
                                        apiname: "selectTab",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "swipeItemRight",
                                        apiname: "swipeItemRight",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "swipeItemLeft",
                                        apiname: "swipeItemLeft",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "swipePageRight",
                                        apiname: "swipePageRight",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "swipePageLeft",
                                        apiname: "swipePageLeft",
                                        exp: jqm
                                    });
                                }

                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "backClick",
                                        apiname: "backClick",
                                        exp: jqm
                                    });
                                }
                                if (!match) {
                                    match = _scraputils.generate({
                                        api: "searchInListView",
                                        apiname: "searchInListView",
                                        exp: jqm
                                    });
                                }


                                if (match) {

                                    tempCommand = [
                                        '_cat.core.plugin("jqm").actions.',
                                        match
                                    ];

                                    return tempCommand.join("");
                                }
                            }

                            return undefined;
                        },
                        scrapConf = me.config,
                        scrap = scrapConf,
                        dm;

                    jqmRows = this.get("jqm");
                    
                    dm = new _delayManagerUtils({
                        scrap: me
                    });

                    if (jqmRows) {

                        dm.add({
                            rows:jqmRows,
                            args: [
                                "scrapName: 'jqm'"
                            ],
                            type: "jqm"

                        }, function(row) {
                            return generate(row);
                        });
                    }

                    dm.dispose();
                }
            });

            config.emitter.emit("job.done", {status: "done"});

        },

        apply: function () {

        },

        getType: function () {
            return "scrap-jqm";
        }
    };

};