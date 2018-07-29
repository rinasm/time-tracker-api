/**
 * Created by roshan on 14/2/17.
 */
var mysql = require('../config/mysqlconfig.js');
var utils = require('../common/utils.js');

exports.verifycreateticketapiargs = function (req, res, next) {
    var isallkeys = utils.checkallkeys(req.body, ['subject', 'description', 'compid']);
    if (!isallkeys[0])
        utils.failReply(req.body, "key no found " + isallkeys[1], res);
    else
        next()
};

// Create a new Ticket entry in the ticket table, later someone has to go and update the other columns in that row
// This will create a insertid which will be later used for the updates
var createTicketQuery = function (queryid, queryargs) {
    return [
        queryid, 'insert into issuetracker.ticket(subject, description, compid , createdby, created_at, state) values (?, ?, ?, ?, ?, "CREATED")',
        function (results) {
            var currTime = new Date().getTime();
            queryargs.push(currTime);
            return queryargs;
        }, mysql.transError("Ticket Create Query Failed"), function (results, resultq) {
            if (resultq && "insertId" in resultq) {
                resultq.ticketid = 't_' + resultq['insertId'];
                results.userid = queryargs[3];
                results.compid = queryargs[2];
                results.ticketid = 't_' + resultq['insertId'];
                return [false, resultq, "Ticket Entry created successfully"];
            } else
                mysql.transErrorR(resultq, "Ticket Entry inserted id not found");
        }
    ];
};

// This should be always called AFTER create ticket query and you should pass the queryid in to this function
// This will basically add the entry ticketid,
var updateTicketQuery = function (queryid, parentQueryid) {
    return [
        queryid, 'update issuetracker.ticket set ticketid = ? where id = ?', function (results) {
            var insertid = results[parentQueryid][1]['insertId'];
            var ticketid = results[parentQueryid][1]['ticketid'];
            return [ticketid, insertid]
        }, mysql.transError("Ticket Update Query Failed"), function (results, resultq) {
            if (resultq && resultq.affectedRows > 0) {
                return [false, resultq, "Ticketid update successful"];
            } else
                mysql.transErrorR(resultq, "Ticketid update failed");
        }
    ]
};

// This should be always called AFTER create ticket query and you should pass the queryid in to this function
// This will basically add the entry ticketid,
var changeTicketStateQuery = function (queryid, parentQueryid) {
    return [
        queryid, 'insert into  issuetracker.ticketstate (ticketid, state, changedby, changed_at) values(?, "CREATED", ?, ?)', function (results) {
            return [results.ticketid, results.userid, new Date().getTime()]
        }, mysql.transError("Change TicketState Query Failed"), function (results, resultq) {
            if (resultq && resultq.affectedRows > 0) {
                return [false, resultq, "TicketState change successful"];
            } else
                mysql.transErrorR(resultq, "TicketState change failed");
        }
    ]
};

// This should be always called AFTER update ticket query
// This will basically add the entry to role table with view permission and edit permission to this token user
var createRole = function (queryid, parentQueryid) {
    return [
        queryid, 'insert into issuetracker.role(userid_groupid, viewflag, editflag, compid, ticketid) values (?, 1, 1, ?, ?)', function (results) {
            var userid = results.userid;
            var compid = results.compid;
            var ticketid = results.ticketid;
            return [userid, compid, ticketid];
        }, mysql.transError("Create Role Query Failed"), function(results, resultq) {
            if (resultq && resultq.affectedRows > 0)
                return [false, resultq, "Create role successful"];
            else
                mysql.transError(resultq, "Create role failed");
        }
    ]
};

// This will give a list of queries which will create an entry in the component table
var createTicketQueries = function (queryargs) {
    var listofqueries = [];
    listofqueries.push(createTicketQuery('CreateTicket', queryargs));
    listofqueries.push(updateTicketQuery('UpdateTicket', 'CreateTicket'));
    listofqueries.push(changeTicketStateQuery('ChangeState', 'CreateTicket'));
    listofqueries.push(createRole("CreateRole", "ChangeState"));
    return listofqueries;
};

exports.createTicket = function (req, callback) {
    mysql.getmysqlconnandruntran(function(err, data, msg){
        // console.log(err, data, msg);
        return callback(err, data, msg);
    }, createTicketQueries([req.body.subject, req.body.description, req.body.compid, req.tokend.userinfo.userid]));
};

// This will assign ticket to a user
exports.assignTicket = function (req, res) {
    var querystr = "update issuetracker.ticket set assignedto = ?, assigned_at = ? where ticketid = ? ";

    mysql.getmysqlconnandrun(function (err, data, msg) {
        if (!err) {
            if (data.length == 0)
                msg = "assign ticket query failed";
            utils.succReply(data, msg, res);
        }
        else
            utils.failReply(err, msg, res);
    }, mysql.queryReturn(querystr, [req.body.userid, new Date().getTime(), req.body.ticketid]));
};

// This will return all the tickets created by token user
exports.getMyTickets = function (req, res) {
    var querystr = "select subject, ticketid, state, description from issuetracker.ticket where createdby = ? ";

    mysql.getmysqlconnandrun(function (err, data, msg) {
        if (!err) {
            if (data.length == 0)
                msg = "no tickets";
            utils.succReply(data, msg, res);
        }
        else
            utils.failReply(err, msg, res);
    }, mysql.queryReturn(querystr, [req.tokend.userinfo.userid]));
};
