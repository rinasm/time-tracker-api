/**
 * Created by roshan on 14/2/17.
 */
module.exports = function(app, console) {
    var ticket = require('./ticket.js');
    var utils = require('../common/utils.js');
    var login = require('../login/login.js');

    app.post('/api/ticket/createticket', login.verifyToken, ticket.verifycreateticketapiargs, function (req, res) {
        ticket.createTicket(req, utils.generalCallback(res));
    });
};
