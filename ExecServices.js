const electron = require('electron')
const { exec } = require('child_process');
const path = require('path')
const fs = require('fs')

class ExecServices{

    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'services.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
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



module.exports = ExecServices