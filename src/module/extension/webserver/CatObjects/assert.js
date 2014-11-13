var _jmr = require("test-model-reporter"),
    _global = catrequire("cat.global"),
    _log = _global.log(),
    _reportCreator = {},
    _catcli = (catrequire ? catrequire("cat.cli") : null),
    _fs = require("fs"),
    _checkIfAlive,
    _testconfig,
    _colors,
    _colorsArray = ['blue', 'yellow', 'cyan', 'magenta', 'grey', 'green'],
    _colorCell = {},
    _colorIndex = -1,
    _useragent = require('express-useragent');


/**
 * Get color index
 *
 * @param id {String} The id of the running test
 * @returns {*}
 */
function getColorIndex(id) {

    if (id !== undefined && typeof _colorCell[id] !== "undefined") {
        return _colorCell[id];
    }

    _colorIndex++;
    if (_colorIndex > _colorsArray.length - 1) {
        _colorIndex = 0;
    }

    if (id !== undefined) {
        _colorCell[id] = _colorIndex;
    }
    return _colorIndex;
}

/**
 * Remove the color from the pool according to the test id
 */
function deleteColor(id) {

    if (id !== undefined && typeof _colorCell[id] !== "undefined") {
        delete _colorCell[id];
    }

}

/**
 * Initial settings
 * - Loading colors module
 * - Loading cat configuration
 */
function init() {

    // set test color
    _colors = require('colors');

    // read configuration
    var path = require("path"),
        configPath,
        data,
        project, sourceFolder;

    if (_catcli) {
        project = _catcli.getProject();
        if (project) {
            try {
                sourceFolder = project.getInfo("source");
                configPath = path.join(sourceFolder, "/config/cat.json");
            } catch (e) {
                _log.error("[CAT server (assert module)] Failed to load cat.json test project, No CAT test project is available.", e);
            }
        } else {
            _log.error("[CAT server (assert module)] Failed to load cat.json test project, No CAT project is available.");
        }
    }

    data = _fs.readFileSync(configPath, 'utf8');
    _testconfig = JSON.parse(data);

}

function isManagerRunMode() {
    return (_testconfig["run-mode"] === "tests");
}

function readTestConfig(scenario) {

    var i, testConfigMap = {},
        scenarios, currentScenario, currentTests,
        size;

    if (isManagerRunMode()) {

        if (!scenario) {
            _log.warning("[CAT] Current scenario argument is required for run-mode: tests ");
        }

        //scenarios
        scenarios = _testconfig.scenarios;
        if (scenarios) {
            currentScenario = scenarios[scenario];
            if (currentScenario) {
                currentTests = currentScenario.tests;

                if (currentTests) {
                    size = currentTests.length;
                    for (i = 0; i < size; i++) {
                        currentTests[i].wasRun = false;
                        testConfigMap[currentTests[i].name] = currentTests[i];
                    }
                } else {
                    _log.warning("[CAT] No valid tests was found for scenario '" + scenario + "' ");
                }

            } else {
                _log.warning("[CAT] No valid test scenario '" + scenario + "' was found");
            }
        }
    }

    return testConfigMap;
}

/**
 * Report Entity
 *
 * @param filename The test's file name
 * @param id The id of the test
 * @param scenario The current scenario
 * @param status The status of the test ["Start" | "End"]
 * @constructor
 */
function ReportCreator(config) {

    this.init(config);
}


ReportCreator.prototype.init = function (config) {

    var status = config.status;

    this._name = config.name;
    this._ua = config.ua;
    this._id = config.id;
    this._status = 0;
    this._fileName = config.filename;
    if (status && status !== "Start" && status != "End") {
        this._testConfigMap = readTestConfig(config.scenario);
    }
    this._hasFailed = false;
    this._testsuite = _jmr.create({
        type: "model.testsuite",
        data: {
            name: this.getTitle(),
            id: this._id
        }
    });
};

ReportCreator.prototype.reset = function () {

    this._status = 0;
    this._hasFailed = false;
    this._testsuite = _jmr.create({
        type: "model.testsuite",
        data: {
            name: this.getTitle(),
            id: this._id
        }
    });
};

ReportCreator.prototype.validate = function () {


};

ReportCreator.prototype.getTestConfigMap = function () {
    return this._testConfigMap;
};

ReportCreator.prototype.getTitle = function() {
    var ua = this._ua, uainfo;
    
    uainfo = (ua ? [" ", this._name, " ", ua.Browser, " " , ua.Version, " " , ua.OS, " "].join("") : "");
    
    return uainfo;
};

ReportCreator.prototype.addTestCase = function (config) {
    var failure,
        result,
        logmessage,
        output, symbol,
        me = this, isjunit, isconsole,
        testName, status, phantomStatus, message, reports, error, id;

    testName = config.testName;
    status = config.status;
    phantomStatus = config.phantomStatus;
    message = config.message;
    reports = config.reports;
    error = config.error;
    id = config.id;


    isjunit = (reports["junit"] === 1);
    isconsole = (reports["console"] === 1);

    function _printTest2Console(msg) {
        var message, title;
        
        if (isconsole) {
            title = me.getTitle();
            message = ["[" , id , "] ", title, msg].join("");
            
            console.info(message.current);
            _log.info(message);
        }
    }

    function _createTestCase() {
        var testCase = _jmr.create({
            type: "model.testcase",
            data: {
                time: (new Date()).toUTCString()
            }
        });
        testCase.set("name", phantomStatus + testName);

        if (status === 'failure') {
            result = _jmr.create({
                type: "model.failure",
                data: {
                    message: message,
                    type: status
                }
            });
            testCase.add(result);
        }

        return testCase;
    }

    function _writeTestCase() {

        me._testsuite.add(_createTestCase());
        output = me._testsuite.compile();
        if (_fs.existsSync(me._fileName)) {
            _fs.unlinkSync(me._fileName);
        }
        _jmr.write(me._fileName, output);
    }

    // set console color
    _colors.setTheme({'current': _colorsArray[getColorIndex(id)]});

    if (this._testConfigMap && isManagerRunMode()) {
        if (this._testConfigMap[testName]) {
            this._testConfigMap[testName].wasRun = true;
        }
    }

    if (status !== 'End' && status !== 'Start') {

        if (isjunit) {
            _writeTestCase();
        }

        symbol = status === 'failure' ? '✖' : '✓';
        if (status === 'failure') {
            this._hasFailed = true;
        }

        logmessage = symbol + "Test " + testName + " " + message;
        _printTest2Console(logmessage);


    } else {

        if (status === 'End') {
            if (error) {
                _colors.setTheme({'current': "red"});
                result = "Test end with error: " + error;
                result = "======== Test End - " + result + " ========";

            } else {
                result = this._hasFailed ? "failed" : "succeeded";
                result = "======== Test End - " + result + " ========";
            }

            // print to console the test info
            _printTest2Console(result);

            // delete the color on test end
            deleteColor(id);

            this._status = 0;

        } else if (status === 'Start') {

            if (this._status === 1) {
                // todo call end.. fail the test!!!

                result = "======== Test End - Aborted ========";
                // print to console the test info
                _printTest2Console(result);

                // delete the color on test end
                deleteColor(id);
            }

            this.reset();
            this._status = 1;
            result = "======== Test Start  ========";

            // print to console the test info
            _printTest2Console(result);

        }

    }
};


if (_jmr === undefined) {
    _log.info("Test Unit Reporter is not supported, consider adding it to the .catproject dependencies");
}


// Initialization
init();


exports.result = function (req, res) {

    function _userAgent(req) {

        var source = req.headers['user-agent'],
            us;
        if (source) {
            us = _useragent.parse(source);
        }

        return us;
    }

    var query = req.query,
        testName = query.testName,
        message = query.message,
        error = query.error,
        status = query.status,
        reports = query.reports,
        scenario = query.scenario,
        reportType = query.type,
        hasPhantom = query.hasPhantom,
        id = query.id,
        name = (query.name || "NA"), 
        file, checkIfAliveTimeout = (_testconfig["test-failure-timeout"] || 30) * 1000,
        reportsArr = [],
        reportKey,
        testConfigMap,
        key, ua = _userAgent(req);

    if (reports) {
        reportsArr = reports.split(",");
        reports = {};
        reportsArr.forEach(function (report) {
            if (report) {
                reports[report] = 1;
            }
        });

    }

    clearTimeout(_checkIfAlive);

    // TODO Session validation for end the test and start a new one...
    if (status !== 'End') {

        _checkIfAlive = setTimeout(function () {
            if (_reportCreator == {}) {
                _reportCreator['notest'] = new ReportCreator({
                    filename: "notestname.xml",
                    id: 'notest',
                    scenario: scenario,
                    ua: ua,
                    name: name
                });
                _log.info("[CAT] No asserts received, probably a network problem, failing the rest of the tests ");

            } else {
                _log.info("[CAT] Tests stopped reporting, probably a network problem, failing the rest of the tests");
            }

            for (reportKey in _reportCreator) {
                testConfigMap = _reportCreator[reportKey].getTestConfigMap();

                for (key in testConfigMap) {
                    _log.info(testConfigMap[key]);
                    if (!testConfigMap[key].wasRun) {
                        _reportCreator[reportKey].addTestCase({testName: testConfigMap[key].name, status: 'failure', phantomStatus: '', message: 'failed due to network issue', reports: reports, error: error, id: id});
                    }
                }
            }

        }, checkIfAliveTimeout);
    }

    _log.info("requesting " + testName + message + status);
    res.setHeader('Content-Type', 'text/javascript;charset=UTF-8');
    res.send({"testName": testName, "message": message, "status": status});


    var phantomStatus = (hasPhantom === "true" ? "phantom" : "");
    file = "./" + reportType + "-" + phantomStatus + id + ".xml";

    if (!_reportCreator[id]) {
        _reportCreator[id] = new ReportCreator({
            filename: file,
            id: (reportType + id),
            scenario: scenario,
            status: status,
            ua: ua,
            name: name
        });
    }

    _reportCreator[id].addTestCase({testName: testName, status: status, phantomStatus: phantomStatus, message: message, reports: reports, error: error, id: id});
};

