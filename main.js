const { app, Menu, ipcMain, dialog, globalShortcut  } = require('electron')
const path = require('path')
const Alert = require('electron-alert');
const MainWindow = require('./MainWindow')
const Store = require('./Store')
const StoreTasks = require('./StoreTasks')
const StoreServices = require('./StoreServices')
const ExecTask = require('./ExecTask')
const ExecServices = require('./ExecServices')
const Logs = require('./Logs')
const AppTray = require("./AppTray");

// Set env
process.env.NODE_ENV = 'production'

const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let mainWindow
let tray

const store = new Store({
  configName: 'user-settings',
  defaults: {
    cpusettings: {
      cpuOverload: 80,
      alertFrequency: 5,
      cpuEmail: 'mariocelso@customdata.com.br',
      sendEmail: 1
    },
    logsettings:{
      logEmail: 'mariocelso@customdata.com.br',
      alertFrequency: '10',
      makeLog: 1,
      sendLog: 1
    }
  }
})

let resettask = null;
let exectask = new ExecTask();
exectask.schedTask()

let resetservice = null;
let execservices = new ExecServices();
execservices.servicesTask()



function createMainWindow() {
  mainWindow = new MainWindow('./app/index.html', isDev)
}

app.on('ready', () => {
  createMainWindow()
    mainWindow.webContents.on('dom-ready', ()=> {
    mainWindow.webContents.send('cpusettings:get', store.get('cpusettings'))
    mainWindow.webContents.send('logsettings:get', store.get('logsettings'))
    let logs = new Logs('/logs/renderer.log');
    mainWindow.webContents.send('renderlogtext:get', logs.get('data'))
    logs = new Logs('/logs/main.log');
    mainWindow.webContents.send('processlogtext:get', logs.get('data'))
    const storetasks = new StoreTasks();
    mainWindow.webContents.send('tasks:get', storetasks.get())    
    const storeservices = new StoreServices();
    mainWindow.webContents.send('services:get', storeservices.get())     
    mainWindow.on('close', function(event) {      
        event.preventDefault();
        mainWindow.hide()      
    });
    mainWindow.on('minimize',function(event){
      event.preventDefault();
        mainWindow.hide();
    });
  })

  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  const icon = path.join(__dirname, 'assets', 'icons', 'jarvis-info.png')
  tray = new AppTray(icon, mainWindow)

})

const menu = [
  ...(isMac ? [{ role: 'appMenu' }] : []),
  {
    role: 'fileMenu',
  },
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
]


//SET CPU SETTINGS
ipcMain.on('cpusettings:set', (e, value) => {
  store.set('cpusettings', value)
  mainWindow.webContents.send('cpusettings:get', store.get('cpusettings'))
})
//======================================



//SET LOG SETTINGS
ipcMain.on('logsettings:set', (e, value) => {
  store.set('logsettings', value)
  mainWindow.webContents.send('logsettings:get', store.get('logsettings'))
})

//Set logs 
ipcMain.on('renderlogtext:set', (e, value) => {
  const logs = new Logs('/logs/renderer.log');
  mainWindow.webContents.send('renderlogtext:get', logs.get('data'))
})

ipcMain.on('processlogtext:set', (e, value) => {
  const logs = new Logs('/logs/main.log');
  mainWindow.webContents.send('processlogtext:get', logs.get('data'))
})
//======================================


//TASKS 

//Set task 
ipcMain.on('tasks:set', (e, value) => {
  const storetasks = new StoreTasks();
  storetasks.set(value)
  mainWindow.webContents.send('tasks:get', storetasks.get())
})

//Remove task
ipcMain.on('removetasks:set', (e, value) => {
  const storetasks = new StoreTasks();
  storetasks.delete(value)
  removeTaskInstance(value['proc'])
  resettask = null
  resettask = new ExecTask()
  resettask.schedTask()
  mainWindow.webContents.send('tasks:get', storetasks.get())
})

//Reset task 
ipcMain.on('resettask:set', (e, value) => {
  removeTaskInstance(value['proc'])
  resettask = null
  resettask = new ExecTask()
  resettask.schedTask()
})

function removeTaskInstance(proc){
  if(exectask == null){
    resettask.stopTasks(proc)
  }else{
    exectask.stopTasks(proc)
    exectask = null 
  }  
}
//======================================



//SERVIÇOS

//Set service 
ipcMain.on('services:set', (e, value) => {
  const storeservices = new StoreServices();
  storeservices.set(value)
  mainWindow.webContents.send('services:get', storeservices.get())
})

//Remove service
ipcMain.on('removeservices:set', (e, value) => {
  const storeservices = new StoreServices();
  storeservices.delete(value)
  removeServiceInstance(value['serviceName'])
  resetservice = null
  resetservice = new ExecServices()
  resetservice.servicesTask()
  mainWindow.webContents.send('services:get', storeservices.get())
})

//Reset services 
ipcMain.on('resetservices:set', (e, value) => {
  removeServiceInstance(value['serviceName'])
  resetservice = null
  resetservice = new ExecServices()
  resetservice.servicesTask()
})

function removeServiceInstance(serviceName){
  if(execservices == null){
    resetservice.stopServices(serviceName)
  }else{
    execservices.stopServices(serviceName)
    execservices = null 
  }  
}
//======================================



//MINIMIZAR / MAXIMIZAR


ipcMain.on('min:set', (e, value) => {
  mainWindow.hide() 
})

ipcMain.on('max:set', (e, value) => {
  if(mainWindow.isMaximized()){
    mainWindow.unmaximize()
  }else{
    mainWindow.maximize()    
  }
  
})


app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})


app.on('will-quit', () => {
  console.log('will-quit')
})

app.on('quit', () => {
  console.log('quit')
})


app.on('before-quit', (e) => {
  e.preventDefault()
  
  let alert = new Alert();

  let swalOptions = {
    title: "Deseja fechar o Jarvis?",
    input: 'password',
    inputAttributes: {
      autocapitalize: 'off'
    },
    howCancelButton: true,
    confirmButtonText: 'Confirmar',
    showLoaderOnConfirm: true,
    text: "Insira a senha de encerramento",
    type: "warning",
    showCancelButton: true,
    allowOutsideClick: () => !Swal.isLoading()
  };


  let promise = alert.fireFrameless(swalOptions, null, true, false);
  promise.then((result) => {
    if(result.value == 'z2291755@'){
      app.exit()
    }else if(result.dismiss == 'cancel'){
    }else{
      alert = new Alert()
      alert.fireFrameless({
        type: 'error',
        title: 'Oops...',
        text: 'Senha incorreta!'
      }, null, true, false);
    }
  })

})

app.allowRendererProcessReuse = true
