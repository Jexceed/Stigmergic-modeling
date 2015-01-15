/**
 * generate from model Tree into model graph (edge and vertex)
 */
var dbOperationControl  = require('./dbOperationControl');
var ObjectID = require("mongodb").ObjectID;

//获得的数据
DataSet = function(dataSet) {
    for(var key in dataSet){
        this[key] = dataSet[key];
    }
};


/*
//prototype
    var dataSet = {
        projectID :"",
        collection :"",
        type:"",
        source : "",
        target:"",
        relation:{
            direction:"",
            attribute:""
        },
        user:""
    };
*/

exports.test = function(icd){
    this.icdInfoNormalize(icd);
    //dbOperationControl.getData({});
    //dbOperationControl.getIndividualModel(ObjectID("53300bb73b2fd2644e000001"),"jiangsfls@163.com",function(docs){console.log(docs)});
    //dbOperationControl.getIndivClassInfo(ObjectID("53300bb73b2fd2644e000001"),"jiangsfls@163.com",'Department',function(docs){console.log(docs)});
    /*
    //dbOperationControl.getIndivClass(ObjectID("53300bb73b2fd2644e000001"),"jiangsfls@163.com",'Department',function(docs){console.log(docs)});
    //dbOperationControl.getIndivRelation(ObjectID("53300bb73b2fd2644e000001"),"jiangsfls@163.com",['331d17cb90a5379e28437-338ab7bbd1e1537190b5a8067a860f0553f69b2f7f'],function(docs){console.log(docs)});
    */
}

exports.icdInfoNormalize = function(icd){
    var dateSetBase = {};
    dateSetBase.projectID = icd.ccd_id;
    dateSetBase.user = icd.user;
    //console.log(dateSetBase.user);
    generateClass(dateSetBase,icd);
    generateRelation(dateSetBase,icd);

}

generateClass = function(dateSetBase, icd){
    for(var classID in icd.class){
        //save the class information
        for(var className in icd.class[classID].name){
            break;
        }
        for(var attributeID in icd.class[classID].attribute){
            //一个attribute
            var dataSet = new DataSet(dateSetBase);
            dataSet.source = attributeID;
            //dataSet.type = 'association';
            dataSet.collection = "conceptDiag_edge";
            //对于className
            var newDataSet = new DataSet(dataSet);
            newDataSet.target = className;
            newDataSet.relation = {};
            newDataSet.relation.direction = '0';
            newDataSet.relation.attribute = 'class';
            //console.log(newDataSet);
            dbOperationControl.saveData(newDataSet,function(err,doc){})
            //对于记录一个attribute
            var newDataSet = new DataSet(dataSet);
            newDataSet.target = '1';
            newDataSet.relation = {};
            newDataSet.relation.direction = '1';
            newDataSet.relation.attribute = 'isAttribute';
            //console.log(newDataSet);
            dbOperationControl.saveData(newDataSet,function(err,doc){})

            for(var key in icd.class[classID].attribute[attributeID]){
                if(key === '_nor') continue;
                for(var value in icd.class[classID].attribute[attributeID][key]){
                    var newDataSet = new DataSet(dataSet);
                    newDataSet.target = value;
                    newDataSet.relation = {};
                    newDataSet.relation.direction = '1';
                    if(key === 'name') key = 'role';
                    if(key === 'type') key = 'class';
                    newDataSet.relation.attribute = key;
                    //console.log(newDataSet);
                    dbOperationControl.saveData(newDataSet,function(err,doc){})
                    //break;//test
                }
            }
            //break;//test
        }

        //save the index of class (help to find the classes in the database)
        var dataSet = new DataSet(dateSetBase);
        dataSet.collection = "conceptDiag_index";
        dataSet.source = 'Class';
        var newDataSet = new DataSet(dataSet);
        newDataSet.target = className;
        newDataSet.relation = {};
        newDataSet.relation.direction = '';
        newDataSet.relation.attribute = 'instance';
        dbOperationControl.saveData(newDataSet,function(err,doc){})
        //save the type of Class
        var dataSet = new DataSet(dateSetBase);
        dataSet.collection = "conceptDiag_edge";
        dataSet.source = className;
        var newDataSet = new DataSet(dataSet);
        newDataSet.target = 'normal';
        newDataSet.relation = {};
        newDataSet.relation.direction = '';
        newDataSet.relation.attribute = 'type';
        dbOperationControl.saveData(newDataSet,function(err,doc){})
        //save class vertex
        var dataSet = new DataSet(dateSetBase);
        dataSet.collection = "conceptDiag_vertex";
        dataSet.id = className;
        var newDataSet = new DataSet(dataSet);
        newDataSet.name = className;
        dbOperationControl.saveData(newDataSet,function(err,doc){})
        //break;//test
    }
}

generateRelation = function(dateSetBase, icd){
    for(var relationOuterID in icd.relation){
        //save the relation information
        for(var relationName in icd.relation[relationOuterID].name){
            relationName = relationName.split("-");
            break;
        }
        for(var relationType in icd.relation[relationOuterID]){
            var type = 'Association';
            switch (relationType){
                case 'generalization':
                    type = 'Generalization';
                case 'association':
                case 'composition':
                case 'aggregation':
                    break;
                default :
                    continue;
                    break;
            }
            for(var relationInnerID in icd.relation[relationOuterID][relationType]){
                for(var order in icd.relation[relationOuterID][relationType][relationInnerID].order){
                    var dataSet = new DataSet(dateSetBase);
                    dataSet.source = relationOuterID+relationInnerID;
                    //dataSet.type = type;
                    dataSet.collection = "conceptDiag_edge";
                    var keyList = icd.relation[relationOuterID][relationType][relationInnerID].order[order];
                    generateRelationFurther(dataSet,relationName,keyList,order);
                }

                //save the index of relation (help to find the relations in the database)
                var dataSet = new DataSet(dateSetBase);
                dataSet.collection = "conceptDiag_index";
                dataSet.source = type;
                dataSet.target = relationOuterID+relationInnerID;
                dataSet.relation = {};
                dataSet.relation.direction = '';
                dataSet.relation.attribute = 'instance';
                dbOperationControl.saveData(dataSet,function(err,doc){})
                //save class vertex
                var dataSet = new DataSet(dateSetBase);
                dataSet.collection = "conceptDiag_vertex";
                dataSet.source = relationOuterID+relationInnerID;
                dataSet.name = "";
                dbOperationControl.saveData(dataSet,function(err,doc){})
                //break;//test
            }
            //break;//test
        }
        //break;//test
    }
}


generateRelationFurther = function(dataSet,relationName,keyList,order){
    //help to generate further information
    var relationM=[];
    var relationR=[];

    for(var key in keyList["multiplicity1"]){
        relationM.push(key);
    }
    for(var key in keyList["multiplicity2"]){
        relationM.push(key);
    }
    for(var key in keyList["role1"]){
        relationR.push(key);
    }
    for(var key in keyList["role2"]){
        relationR.push(key);
    }

    var newDataSet = new DataSet(dataSet);

    newDataSet.target = relationName[order%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '0';
    newDataSet.relation.attribute = 'class';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})


    newDataSet.target = relationM[order%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '0';
    newDataSet.relation.attribute = 'multiplicity';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})


    newDataSet.target = relationR[order%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '0';
    newDataSet.relation.attribute = 'role';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})


    newDataSet.target = relationName[(order+1)%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '1';
    newDataSet.relation.attribute = 'class';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})


    newDataSet.target = relationM[(order+1)%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '1';
    newDataSet.relation.attribute = 'multiplicity';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})


    newDataSet.target = relationR[(order+1)%2];
    newDataSet.relation = {};
    newDataSet.relation.direction = '1';
    newDataSet.relation.attribute = 'role';
    //console.log(newDataSet);
    dbOperationControl.saveData(newDataSet,function(err,doc){})
}



