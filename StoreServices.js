const electron = require('electron')
const path = require('path')
const fs = require('fs')

class StoreServices{
    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'services.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   
    }

    get(){
        return this.data
    }

    set(val){
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
            if(val['_id'] == 0){
                let maxId = Math.max.apply(Math, this.data.map(function(o) { return o._id; }))
                if(maxId == '-Infinity') {
                    maxId = 0
                }
                val['_id'] = maxId + 1
                this.data.push(val)
                fs.writeFileSync(this.path, JSON.stringify(this.data))
            }else{
                let newArray =  this.data.filter(function(el) {
                    return el._id != val['_id'];
                });
                this.data = newArray
                newArray.push(val)
                fs.writeFileSync(this.path, JSON.stringify(newArray))
            }

        }else{
            val['_id'] = "1"
            let tasks = [val]
            fs.writeFileSync(this.path, JSON.stringify(tasks))
        }   
    }

    delete(val){
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
            let newArray =  this.data.filter(function(el) {
                return el._id != val['_id'];
            });
            this.data = newArray
            fs.writeFileSync(this.path, JSON.stringify(newArray))
        }
    }
}

function parseDataFile(filePath, defaults){
    try{
        return JSON.parse(fs.readFileSync(filePath))
    }catch(err){
        return defaults
    }
}

module.exports = StoreServices