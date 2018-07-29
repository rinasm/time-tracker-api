/**
 * Created by roshan on 14/2/17.
 */
var mysql = require('../config/mysqlconfig.js');
var utils = require('../common/utils.js');

exports.createTrackPoint = function (req, res) {
    body = [req.body.time, req.body.userid, req.body.cat]
    var querystr = "insert into timetrackerdb.trackerpoints(time, userid, cat) values (?,?,?)";

    mysql.getmysqlconnandrun(function (err, data, msg) {
        if (!err)   utils.succReply(data, msg, res);
        else        utils.failReply(err, msg, res);
    }, mysql.queryReturn(querystr, body));
};

exports.getTrackPoint = function (req, res) {
    body = [req.body.userid]
    var querystr = "select * from timetrackerdb.trackerpoints where userid = ?";

    mysql.getmysqlconnandrun(function (err, data, msg) {
        if (!err)   utils.succReply(data, msg, res);
        else        utils.failReply(err, msg, res);
    }, mysql.queryReturn(querystr, body));
};

exports.getLastPoint = function (req, res) {
    body = [req.body.userid]
    var querystr = "select * from trackerpoints where userid = ? order by time desc limit 1";

    mysql.getmysqlconnandrun(function (err, data, msg) {
        if (!err)   utils.succReply(data, msg, res);
        else        utils.failReply(err, msg, res);
    }, mysql.queryReturn(querystr, body));
};