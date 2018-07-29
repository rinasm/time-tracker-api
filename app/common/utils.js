exports.succReply = function(data, msg, res){
    res.status(200).send({"status":"SUCCESS", "data":data, "err": null, "msg":msg});
};

exports.failReply = function(data, msg, res){
    res.status(400).send({"status":"FAILURE", "err":data, "data": null, "msg":msg});
};

exports.forbidReply = function(data, msg, res){
    res.status(403).send({"status":"FAILURE", "err":data, "data": null, "msg":msg});
};

exports.authFailure = function(msg, res){
    res.status(401).send({"status":"FAILURE", "data":null, "err":{}, "msg":msg});
};

exports.generalCallback = function(res){
    return function(err, data, msg){
	if (err)
	    exports.failReply(err, msg, res);
	else
	    exports.succReply(data, msg, res);
    };
};
	    
exports.checkallkeys = function(reqobj, reqkeys){
    for (var i in reqkeys)
	if (!(reqkeys[i] in reqobj))
	    return [false, reqkeys[i]];
    return [true, null];
}
