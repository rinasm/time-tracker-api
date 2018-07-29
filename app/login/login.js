var mysql = require('../config/mysqlconfig.js');
var jwt = require('jsonwebtoken'); 
var jwtconfig = require('../config/jwtconfig.js');
var utils = require('../common/utils.js');
var bcrypt = require('bcrypt-nodejs');

var generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

var validPassword = function(password, passwordrecv) {
    return bcrypt.compareSync(password, passwordrecv);
};

var getUser = function(userjson, callback){
    if ('type' in userjson && userjson.type == 'in.intellicar.issues.user.localuser'){
	if ('username' in userjson && 'password' in userjson){
	    var getUserQuery = " select * from issuetracker.users where users.username = ?";
	    mysql.getmysqlconnandrun(callback, mysql.queryErrSucc(getUserQuery, [userjson.username], function(err){
		callback(err, null, "Error while Querying");
	    }, function(userres){
		if (userres != null && userres.length == 1 ){
		    var i = 0;
		    if ("password" in userres[i] && validPassword(userjson.password, userres[i].password)){
			return callback(null, {"userid":userres[i].userid, "username":userjson.username}, "User validated");
		    }else{
			return callback({"msg":"Password not valid"}, null, "Invalid Password");
		    }
		}else
		    return callback({"msg":"Username not valid"}, null, "Invalid user");
	    }));
	}else
	    return callback({"msg":"Username is required for local login"}, null, "Username not in request");
    }else{
	return callback({"msg":"Login type not specified"}, null, "Login type not in request/Not Proper");
    }
};

var getUserWithToken = function(userjson, callback){
    getUser(userjson, function(err, result, msg){
	if (err != null){
	    callback(err, result, msg);
	}else{
	    console.log(result);
	    var token = jwt.sign({"userinfo":result}, jwtconfig.secret, {"expiresIn":3600000});
	    callback(null, {"token":token, "userinfo":result}, "Token successfully generated");
	}
    });
}

var decodeToken = function(token, callback){
    if (token){
	jwt.verify(token, jwtconfig.secret, function(err, decoded) {
	    return callback(err, decoded);
	});
    }else{
	return callback({"msg":"Please give the token"}, null);
    }
};    

var verifyToken = function(req, res, next){
    console.log(req.body);
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token){
	jwt.verify(token, jwtconfig.secret, function(err, decoded) {
	    if (err) {
		return utils.authFailure('Failed to authenticate the token', res);
	    }else{
		console.log("decoded successfully");
		console.log(decoded);
		req.tokend = decoded;
		next();
	    }
	});
    }else{
	utils.authFailure("Token not found", res);
    }
};
exports.generateHash = generateHash;
exports.getUser = getUser;
exports.getUserWithToken = getUserWithToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.validPassword = validPassword;
