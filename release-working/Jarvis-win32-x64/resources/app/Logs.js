const electron = require('electron')
const path = require('path')
const fs = require('fs')
const readline = require('readline');

let teste = [];

class Logs{
    constructor(){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')
        this.path = path.join(userDataPath, '/logs/renderer.log')     
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }                  
    }

    get(key){
        return this.data
    }

    delete(){
        try{
            fs.unlinkSync(this.path)
        }catch(err){
            console.log(err)
        }
    }

}

function parseDataFile(filePath, defaults){
    try{
        return fs.readFileSync(filePath, "utf8")
    }catch(err){
        return err
    }
}



module.exports = Logs