var mysql = require('mysql');
var Q = require('q');

var connectionconfig = {
    'connectionLimit' : 20,
    'host': 'localhost',
    'user': 'toor',
    'password': 'Toor@123',
    'database': 'timetrackerdb',
    'debug':false
    //'multipleStatements': true
};

var mysqlpool  = mysql.createPool(connectionconfig);

// This will try to get the mysql connection 
// Input: callback, functionifconnectionsuccessful(signature : (connection, callback))
// 1. If SUCCESS, call your funcafterconnection with (connection, callback)
// 2. If FAILURE, call your callback function with (err, null, msg)
// Returns: none
var getmysqlconnandrun = function(callback, funcafterconnection){
    mysqlpool.getConnection(function(err, connection) {
	if (err){
            callback(err, null, "Connection to mysql failed");
	}else
	    funcafterconnection(connection, callback);
    });
};

// This is a helper function which can be used to run a query along with its argument
// Input: querytorun, queryarg
// Returns: a function(signature: (connection, callback)) 
// Returned function => this function when called with (connection, callback) runs the mysql query 
// 1. if SUCCESS calls your callback(null, results, succmsg)
// 2. if FAILURE calls your callback(err, null, failmsg)
// This function can be usually passed to the above function as an argument value funcafterconnection
var queryReturn = function(queryToRun, queryArg){
    return function(connection, callback){
	var sqlquery = connection.query(queryToRun, queryArg, function(err, results){
            connection.release();
            if (err)
		callback(err, null, "Query Run Error");
            else
                callback(null, results, "Query ran successfully");
	});
	console.log(sqlquery.sql); 
    };
};

// This is a helper function to run mysql query again
// Input: querytorun, queryarg, functobecalledwhenerror, functobecalledwhensuccess
// Returns: a function(signature: (connection, callback)) 
// Returned function => this function when called with (connection, callback) runs the mysql query 
// 1. if SUCCESS calls your errfunc with error object
// 2. if FAILURE calls your succfunc with results
var queryErrSucc = function(queryToRun, queryArg, errfunc, succfunc){
    return function(connection, callback){
	var sqlquery = connection.query(queryToRun, queryArg, function(err, results){
            connection.release();
	    console.log(err);
            if (err)
		errfunc(err);
            else
                succfunc(results);
	});
	console.log(sqlquery.sql); 
    };
};

// This is a helper function to run mysql query again
// Input: querytorun, queryarg, mapperfunction
// Returns: a function(signature: (connection, callback)) 
// Returned function => this function when called with (connection, callback) runs the mysql query 
// 1. if SUCCESS calls your callback(null, mapperfuncoutput.results, succmsg) , after applying your mapper function over the results
// 2. if FAILURE calls your callback(err, null, failmsg)
var queryReturnUDF = function(queryToRun, queryArg, userudf){
    return function(connection, callback){
        var sqlquery = connection.query(queryToRun, queryArg, function(err, results){
            connection.release();
            if (err)
		callback(err, null, "Query Execution failed");
            else{
                var resmapped = userudf(results);
		callback(resmapped.err, resmapped.results, "Query ran successfully");
            }
            console.log(sqlquery.sql);
	});
    };
};

// This is a wrapper function to handle transaction error, with a custom error msg
// Input: errmsg
// Returns: a function(signature:(errobj)), when you call this returned function with error object, it will fail the transaction and call the failure handler with the input error msg
var transError = function(errmsg){
    return function(err){
	return transErrorR(err, errmsg);
    }
}

// This is a wrapper function to handle transaction error, with a custom error msg
// Input: errorobj, errmsg
// Returns: [true, err, errmsg]
// Function which is using this function will interpret the first field true as error happened, second item as erroboj, thrid item is errmsg
var transErrorR = function(err, errmsg){
    return [true, err, errmsg];
}

// This is a function which will run the list of queries PARALLELY
// THIS IS NOT TRANSACTION, Queries can fail independently, NO ROLLBACK will happen
// Input: callbackinp, listofqueries
// This function calls connection.query for all the queries in the listofqueries and returns the results through the callback
// list of queries format => [[queryid, querysql, queryarg],...] queryid => the results of this particular query will be under queryid key
// If ALL SUCCESS, callback will be called with (null, resultobj, succmsg); resultobj => {"queryid1":[resultforthisquery", "queryid2":[]}
// Even if one FAILS, callback will be called with ({"errs":errobj}, null, failmsg);
var getmysqlconnandrunpar = function(callbackinp, listofqueries){
    getmysqlconnandrun(callbackinp, function(connection, callback){
	var queryReturn = [];
	var promises = [];
	for(eachidx in listofqueries){
	    var queryid = listofqueries[eachidx][0];
	    var querysql = listofqueries[eachidx][1];
	    var queryarg = listofqueries[eachidx][2];
	    var queryDefered = Q.defer();
	    var queryrun = connection.query(querysql, queryarg, queryDefered.makeNodeResolver());
	    console.log(queryrun.sql);
	    listofqueries[eachidx].push(queryDefered);
	    queryReturn.push(listofqueries[eachidx]);
	    promises.push(queryDefered.promise);
	}
	var temp = Q.allSettled(promises).then(function(results){
	    var resultObj = {};
	    var allSuccess = true;
	    console.log(results);
	    for(eachidx in results){
		var nextResult = results[eachidx];
		if (nextResult.state == "fulfilled")
		    resultObj[listofqueries[eachidx][0]] = nextResult.value[0];
		else{
		    resultObj[listofqueries[eachidx][0]] = nextResult.reason;
		    allSuccess = false;
		}
	    }
	    connection.release();
	    console.log("Connection Released");
	    console.log(allSuccess);
	    if(allSuccess)
		callback(null, resultObj, "All queries ran successfully");
	    else{
		callback({"errs":resultObj}, null, "Atleast one query failed");
	    }
	});
    });
};


// This is a function which will run the list of queries in TRANSACTION
// THIS IS A TRANSACTION, Queries can fail independently, so even if one query fails the whole sequence of queries will be rolled back
// Input: callbackinp, listofqueries
// This function calls connection.query for all the queries in the listofqueries in sequence and returns the results through the callback
// list of queries format => [[queryid, querysql, queryarg, failfunc, succfunc],...] queryid => the results of this particular query will be under queryid key
// failfunc => will be called to check if we get error object in the query callback, and then we check if it actually an error
// succfunc => will be called when mysql error obj is NULL, this can also fail the transaction if it returns [true,. ,.]
// The above function should return [shouldifailtransaction, result if succ else errobj, succmsg if succ else errmsg]
// If ALL SUCCESS, callback will be called with (null, resultobj, succmsg); resultobj => {"queryid1":[resultforthisquery", "queryid2":[]}
// Even if one FAILS, callback will be called with ({"errs":errobj}, null, failmsg) and the transaction would have been rolled back
var getmysqlconnandruntran = function(callbackinp, listofqueries){
    getmysqlconnandrun(callbackinp, function(connection, callback){
        connection.beginTransaction(function(err) {
            if (err)
				callback(err, null, "Begin transaction failed");

            var errs = {};
	    	var results = {};
            var failTransaction = function(failmsg){
                connection.rollback(function(){
                    connection.release();
		    		callback({"errs":errs, "results":results}, null, failmsg);
                });
            };
            var succTransaction = function(succmsg){
                connection.commit(function(err){
                    if (err)
                        return failTransaction("Failed while committing");
                    connection.release();
		    		callback(null, results, succmsg);
                });
            };

	    var runQueryWithIDX  = function(eachidx){
		var queryid = listofqueries[eachidx][0];
		var eachsql = listofqueries[eachidx][1];
		var queryarg = listofqueries[eachidx][2];
		var failfunc = listofqueries[eachidx][3];
		var succfunc = listofqueries[eachidx][4];
		var queryargres = queryarg(results);
		if (queryargres == null)
		    return failTransaction("Query argument has returned as null");
		console.log("########");
		console.log(eachidx);
		console.log(queryargres);
		console.log(queryid);
		var mysqlqueryran = connection.query(eachsql, queryargres, function(errq, resultq){
		    var udferrsucc = errq?failfunc(errq):succfunc(results, resultq);
		    console.log(eachidx);
		    console.log(udferrsucc);
		    if (udferrsucc[0])
			errs[queryid] = udferrsucc;
		    else
			results[queryid] = udferrsucc;
		    if (udferrsucc[0])
			return failTransaction(udferrsucc[2]);
		    else if (eachidx < (listofqueries.length -1))
			return runQueryWithIDX(eachidx+1);
		    else
			return succTransaction(udferrsucc[2]);
		});
		console.log(mysqlqueryran.sql);
	    };
	    runQueryWithIDX(0);
        });
    });
};


exports.connection = connectionconfig;
exports.mysqlpool = mysqlpool;
exports.getmysqlconnandrun = getmysqlconnandrun;
exports.queryReturn = queryReturn;
exports.queryReturnUDF = queryReturnUDF;
exports.queryErrSucc = queryErrSucc;
exports.getmysqlconnandruntran = getmysqlconnandruntran;
exports.getmysqlconnandrunpar = getmysqlconnandrunpar;
exports.transError = transError;
exports.transErrorR = transErrorR;
