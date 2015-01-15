/**
 *  dbOperation flow control
 */
var dbOperation  = require('./dbOperation');
var async = require("async");
var fs = require('fs');

var Dupli = function(data){
    for(var key in data){
        this[key] = data[key];
    }
};

var m_saveList = [];

//get individual
exports.getIndividualModel = function(projectID,user,callback){
    //model information especially about classes and relations
    var filter = {
        projectID : projectID,
        user : user,
        source : 'Class'
    }
    var modelList = {};

    dbOperation.get("conceptDiag_index",filter,function(err,docs){
        //console.log(docs);
        var classArray = [];
        docs.forEach(function(element){
            classArray.push(element.target)
        });
        //
        var classFilter = new Dupli(filter);
        classFilter.source = {"$in":classArray};
        classFilter["relation.attribute"] = "type";
        dbOperation.get("conceptDiag_edge",classFilter,function(err,docs){
            //console.log(docs);
            modelList.class = docs;
            return callback(modelList);
        })
        //
        return;
        var relationFilter = new Dupli(filter);
        relationFilter.source = {"$in":relationArray};
        dbOperation.get("conceptDiag_vertex",relationFilter,function(err,docs){
            //console.log(docs);
            mutex--;
            modelList.relation = docs;
            //此处不正确，数据过多了
            if(mutex == 0) return callback(modelList);
        })
    });
}

exports.getIndivClassInfo = function(projectID,user,className,callback){
    //class information especially about attribute
    var filter = {
        projectID : projectID,
        user : user
    }
    var classFilter = new Dupli(filter);
    classFilter["relation.attribute"] = 'class';
    classFilter.target = className;
    dbOperation.get("conceptDiag_edge",classFilter,function(err,docs){
        var relationArray = [];
        docs.forEach(function(element){
            //attribute or relation
            relationArray.push(element.source);
        });
        var relationFilter = new Dupli(filter);
        relationFilter.source = {"$in":relationArray};
        //relationFilter["relation.attribute"] = 'isAttribute';
        //relationFilter.target = '1';
        dbOperation.get("conceptDiag_edge",relationFilter,function(err,docs){
            //所有的相关项
            return callback(docs);
        })
    });
}


//get collective
exports.collective = {
    class : function(projectID,callback){
        var filter = {
            projectID : projectID,
            source : 'Class'
        }
        var collective = {};

        dbOperation.get("conceptDiag_index",filter,function(err,docs){
            //console.log(docs);
            var classArray = [];
            docs.forEach(function(element){
                classArray.push(element.target)
            });
            //
            var classFilter = new Dupli(filter);
            classFilter.source = {"$in":classArray};
            classFilter["relation.attribute"] = "type";
            dbOperation.get("conceptDiag_edge",classFilter,function(err,docs){
                //console.log(docs);
                collective.class = docs;
                return callback(collective);
            })
        });
    },
    attribute : function(projectID,className,callback){
        //class information especially about attribute
        var filter = {
            projectID : projectID
        }
        var classFilter = new Dupli(filter);
        classFilter["relation.attribute"] = 'class';
        classFilter.target = className;
        dbOperation.get("conceptDiag_edge",classFilter,function(err,docs){
            var relationArray = [];
            docs.forEach(function(element){
                //attribute or relation
                relationArray.push(element.source);
            });
            //find attribute ones
            var relationFilter = new Dupli(filter);
            relationFilter.source = {"$in":relationArray};
            relationFilter["relation.attribute"] = 'isAttribute';
            relationFilter.target = '1';
            dbOperation.get("conceptDiag_edge",relationFilter,function(err,docs){
                //find attributes
                var attributeArray = [];
                docs.forEach(function(element){
                    attributeArray.push(element.source); //direction 默认为1
                });
                var attributeFilter = new Dupli(filter);
                attributeFilter.source = {"$in":attributeArray};
                attributeFilter["relation.direction"] = '1';
                dbOperation.get("conceptDiag_edge",attributeFilter,function(err,docs){
                    return callback(docs)
                });
            })
        });
    },
    attributeProperty : function(projectID,attributeID,callback){
        //class information especially about attribute
        var filter = {
            projectID : projectID,
            source : attributeID
        }

        dbOperation.get("conceptDiag_edge",filter,function(err,docs){
            return callback(docs);
        });
    },
    relation : function(projectID,className,callback){
        var filter = {
            projectID : projectID
        }
        var classFilter = new Dupli(filter);
        classFilter["relation.attribute"] = 'class';
        classFilter.target = className;
        dbOperation.get("conceptDiag_edge",classFilter,function(err,docs){
            var relationArray = [];
            docs.forEach(function(element){
                //attribute or relation
                relationArray.push(element.source);
            });
            //find relation ones
            var relationFilter = new Dupli(filter);
            relationFilter.target = {"$in":relationArray};
            dbOperation.get("conceptDiag_index",relationFilter,function(err,docs){
                //find relationInfo
                var relationArray = [];
                docs.forEach(function(element){
                    relationArray.push(element.source); //direction 默认为1
                });
                var relationFilter = new Dupli(filter);
                relationFilter.source = {"$in":relationArray};
                dbOperation.get("conceptDiag_edge",relationFilter,function(err,docs){
                    return callback(docs)
                });
            })
        });
    },
    relationProperty : function(projectID,relationID,callback){
        var filter = {
            projectID : projectID,
            source : relationID
        }
        dbOperation.get("conceptDiag_edge",filter,function(err,docs){
            return callback(docs);
        });
    }
}

exports.class = {
    add : function(projectID,className,user){
        var dateSetBase = {
            projectID: projectID,
            user: user
        };
        //index
        var dataSet = new Dupli(dateSetBase);
        dataSet.collection = "conceptDiag_index";
        dataSet.source = 'Class';
        var newDataSet = new Dupli(dataSet);
        newDataSet.target = className;
        newDataSet.relation = {};
        newDataSet.relation.direction = '';
        newDataSet.relation.attribute = 'instance';
        this.saveData(newDataSet,function(err,doc){})
        //save class vertex
        var dataSet = new Dupli(dateSetBase);
        dataSet.collection = "conceptDiag_vertex";
        dataSet.id = className;
        var newDataSet = new DataSet(dataSet);
        newDataSet.name = className;
        this.saveData(newDataSet,function(err,doc){})
        //save the type of Class
        var dataSet = new Dupli(dateSetBase);
        dataSet.collection = "conceptDiag_edge";
        dataSet.source = className;
        var newDataSet = new Dupli(dataSet);
        newDataSet.target = 'normal';
        newDataSet.relation = {};
        newDataSet.relation.direction = '';
        newDataSet.relation.attribute = 'type';
        this.saveData(newDataSet,function(err,doc){})
    },
    delete: function(){

    },
    revise:function(){

    }
}

exports.attribute = {
    add : function(){

    },
    delete: function(){

    },
    revise:function(){

    }
}

exports.attributeProperty = {
    add : function(){

    },
    delete: function(){

    },
    revise:function(){

    }
}

exports.relation = {
    add : function(){

    },
    delete: function(){

    },
    revise:function(){

    }
}

exports.relationProperty = {
    add : function(){

    },
    delete: function(){

    },
    revise:function(){

    }
}




//just for test
exports.getData = function(){
    dbOperation.get("conceptDiag_edge",{},function(err,docs){
        fs.writeFile('./graphInfo.csv',"",'utf-8',function(){})
        var docString;
        for(var i=0;i<docs.length;i++){
            if(docs[i].target == "&default") continue;

            docString = docs[i].source+",";
            docString += docs[i].target+",,,,";
            var opaque = (docs[i].user.length-1)*10;
            docString += opaque+"\r\n";
            fs.appendFile('./graphInfo.csv',docString,'utf-8',function(){})
        }
    })
}

exports.saveData = function(dataSet,callback){
    //console.log(dataSet.user);
    var newSet = new Dupli(dataSet);
    if(m_saveList.length === 0){
        //console.log("new");
        m_saveList.push(newSet);
        saveFlow();
    }else{
        m_saveList.push(newSet);
    }
}

var saveFlow = function(){
    async.series([
        function(callback){
            if(m_saveList.length === 0)  return callback(null,null);

            //var dataSet = m_saveList.pop();
            var dataSet = m_saveList[0];
            //var collectionName = "conceptDiag_edge";
            var collectionName = dataSet.collection;
            var user = dataSet.user;
            delete dataSet.collection;
            delete dataSet.user;

            var filter = new Dupli(dataSet);
            dbOperation.get(collectionName,filter,function(err,docs){
                if(docs.length === 0){
                    dataSet.user = [user];
                    dbOperation.create(collectionName,filter,dataSet,function(err,doc){
                        //console.log("dbOperation.create")
                        return callback(err,doc);
                    });
                }else{
                    dataSet = {};
                    dataSet["user"] = user;
                    //console.log(dataSet);
                    dbOperation.update(collectionName,filter,{"$addToSet": dataSet},function(err,doc){
                        //console.log("dbOperation.update")
                        return callback(err,doc);
                    });
                }
            })
        }
    ],function(err, results){
        //可能次数已经输出但是没有进行xxx
        m_saveList.shift();
        if(m_saveList.length != 0) saveFlow();
    });
}