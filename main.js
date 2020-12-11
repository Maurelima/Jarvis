// const express = require('express');
// const server = express();
// server.use(express.json())
const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const log = require('electron-log')
const Store = require('./Store')
const StoreTasks = require('./StoreTasks')
const ExecTask = require('./ExecTask')
const Logs = require('./Logs')
const { exec } = require('node-os-utils')

// const log = require('electron-log');

// Set env
process.env.NODE_ENV = 'production'
// let oldtag = process.env.path;
// console.log(oldtag)

const isDev = process.env.NODE_ENV !== 'development' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let mainWindow

const store = new Store({
  configName: 'user-settings',
  defaults: {
    cpusettings: {
      cpuOverload: 80,
      alertFrequency: 5,
      cpuEmail: 'maurelima@gmail.com',
      sendEmail: 1
    },
    logsettings:{
      logEmail: 'maurelima@gmail.com',
      alertFrequency: '10',
      makeLog: 1,
      sendLog: 1
    }
  }
})

let resettask = null;
let exectask = new ExecTask();
exectask.testeTask()



function createMainWindow() {
  // server.use('/',()=>{});
  // server.listen(3000, () => {
  //   const exectask = new ExecTask();
  //   exectask.testeTask()
  // });

  mainWindow = new BrowserWindow({
    frame: false,
    title: 'APP NAME',
    width: isDev ? 800 : 500,
    height: 600,
    icon: './assets/icons/jarvis-info.png',
    resizable: isDev ? true : true,
    backgroundColor: 'black',
    webPreferences: {
      nodeIntegration: true,
    },
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile('./app/index.html')
}

app.on('ready', () => {
  createMainWindow()

  mainWindow.webContents.on('dom-ready', ()=> {
    mainWindow.webContents.send('cpusettings:get', store.get('cpusettings'))
    mainWindow.webContents.send('logsettings:get', store.get('logsettings'))
    const logs = new Logs();
    mainWindow.webContents.send('legtext:get', logs.get('data'))
    const storetasks = new StoreTasks();
    mainWindow.webContents.send('tasks:get', storetasks.get())    
  })


  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)
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

//Set cpu settings 
ipcMain.on('cpusettings:set', (e, value) => {
  store.set('cpusettings', value)
  mainWindow.webContents.send('cpusettings:get', store.get('cpusettings'))
})

//Set log settings 
ipcMain.on('logsettings:set', (e, value) => {
  store.set('logsettings', value)
  mainWindow.webContents.send('logsettings:get', store.get('logsettings'))
})

//Set logs 
ipcMain.on('legtext:set', (e, value) => {
  const logs = new Logs();
  mainWindow.webContents.send('legtext:get', logs.get('data'))
})

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
  removeInstance(value['proc'])
  resettask = null
  resettask = new ExecTask()
  resettask.testeTask()
  mainWindow.webContents.send('tasks:get', storetasks.get())
})

//Reset task 
ipcMain.on('resettask:set', (e, value) => {
  removeInstance(value['proc'])
  resettask = null
  resettask = new ExecTask()
  resettask.testeTask()
})

function removeInstance(proc){
  if(exectask == null){
    resettask.stopTasks(proc)
  }else{
    exectask.stopTasks(proc)
    exectask = null 
  }  
}


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

app.allowRendererProcessReuse = true
