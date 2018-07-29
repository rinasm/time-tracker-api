/**
 * Created by roshan on 14/2/17.
 */
var tracker = require('./tracker.js');
var utils = require('../common/utils.js');

module.exports = function(app, console) {
    app.post('/api/tracker/newpoint', function (req, res) {
        tracker.createTrackPoint(req, res);
    });

    app.post('/api/tracker/getpoints', function (req, res) {
        tracker.getTrackPoint(req, res);
    });

    app.post('/api/tracker/lastpoint', function (req, res) {
        tracker.getLastPoint(req, res);
    });
};
