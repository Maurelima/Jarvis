const { BrowserWindow } = require('electron')

class MainWindow extends BrowserWindow{

    constructor(file, isDev){
        super({
            frame: false,
            title: 'APP NAME',
            width: isDev ? 1400 : 1400,
            height: 750,
            icon: './assets/icons/robot.png',
            resizable: isDev ? true : true,
            backgroundColor: 'black',
            webPreferences: {
              nodeIntegration: true,
            },
          })

          this.loadFile(file)

          if (isDev) {
            this.webContents.openDevTools()
          }
    }

}

module.exports = MainWindow