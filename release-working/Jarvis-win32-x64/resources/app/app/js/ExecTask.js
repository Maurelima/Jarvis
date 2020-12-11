const electron = require('electron')
const path = require('path')
const fs = require('fs')

class ExecTask{

    constructor(options){
        const userDataPath = (electron.app || electron.remote.app).getPath('userData')

        this.path = path.join(userDataPath, 'tasks.json')
        if (fs.existsSync(this.path)) {
            this.data = parseDataFile(this.path)
        }   

        console.log(this.data)
    }

    teste(){

    }

}

module.exports = ExecTask