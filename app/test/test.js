/**
 * Created by roshan on 13/2/17.
 */
var mysql = require('../config/mysqlconfig.js');
var utils = require('../common/utils.js');

exports.verifyassignroleapiargs = function (req, res, next) {
    var isallkeys = utils.checkallkeys(req.body, ['id', 'viewflag', 'editflag', 'compid', 'ticketid']);
    if (!isallkeys[0])
        utils.failReply(req.body, "key no found " + isallkeys[1], res);
    else
        next()
};

exports.getTicket = function(req, res, next) {
    var listofqueries = [];
    listofqueries.push(getTicketQuery('ticketdetails', 't_1'));
    listofqueries.push(getComentQuery('comments', 't_1'));
    listofqueries.push(getState('states', 't_1'));
    mysql.getmysqlconnandrunpar(function (err, data, msg) {
        console.log("QUERIES RETURNED");
        console.log(err);
        console.log(data);
        console.log(msg);
        req['data'] = {"err": err, "data": data, "msg": msg};
        next();
    }, listofqueries);
};


// This will return the query to check the user has view permission
var getTicketQuery = function (queryid, ticketid) {
    var query = "select ticket.subject, ticket.description, ticket.compid, comp.compname, ticket.created_at, users.username as createdby, ticket.state " +
        "from issuetracker.ticket, users, components comp where ticketid = ? and comp.compid = ticket.compid and users.userid = ticket.createdby";
    var isallowedqueryarg = [ticketid];
    return [queryid, query, isallowedqueryarg];
};
// This will return the query to check the user has view permission
var getComentQuery = function (queryid, ticketid) {
    var query = "select * from issuetracker.ticketinfo where ticketid = ?";
    var isallowedqueryarg = [ticketid];
    return [queryid, query, isallowedqueryarg];
};
// This will return the query to check the user has view permission
var getState = function (queryid, ticketid) {
    var query = "select * from issuetracker.ticketstate where ticketid = ? order by changed_at desc";
    var isallowedqueryarg = [ticketid];
    return [queryid, query, isallowedqueryarg];
};

var allpermreqnonempty = function () {
    console.log('allperm');
    return function (req, res, next) {
        if ("data" in req) {
            console.log('------------------', req.data)
        }
        next();
    }
};

getTicket();
