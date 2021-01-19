const electron = require('electron')
const path = require('path')
const fs = require('fs')

class StoreServices{
    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, options)
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   
    }

    get(){
        return this.data
    }

    set(val){
            fs.writeFileSync(this.path, JSON.stringify(val))
          
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