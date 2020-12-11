const path = require('path')
const { ipcRenderer } = require('electron')
const osu = require('node-os-utils')
const log = require('electron-log')
const nodemailer = require('nodemailer');
const fs = require('fs')
const cpu = osu.cpu
const mem = osu.mem
const os = osu.os

let cpuOverload
let alertFrequency
let logEmail
let logFrequency
let makeLog
let sendLog

//Get Settings & Values
ipcRenderer.on('cpusettings:get', (e, settings) => {
    cpuOverload = +settings.cpuOverload
    alertFrequency = +settings.alertFrequency
})
ipcRenderer.on('logsettings:get', (e, settings) => {
    logFrequency = +settings.alertFrequency
    logEmail = +settings.logEmail
    makeLog = +settings.makeLog
    sendLog = +settings.sendLog
})



// Run every 2 seconds
setInterval(() =>{
    //cpu usage 
    cpu.usage().then(info => {
        document.getElementById('cpu-usage').innerHTML = info + '<small> %</small>'

        document.getElementById('cpu-progress').style.width = info + '%'

        //make red if overload
        if(info >= cpuOverload){
            //progress bar
            document.getElementById('cpu-progress').classList.remove('bg-info')
            document.getElementById('cpu-progress').classList.add('bg-danger')
            //icon
            document.getElementById('cpu-icon').classList.remove('bg-info')
            document.getElementById('cpu-icon').classList.add('bg-danger')
        }else{
            //progress bar
            document.getElementById('cpu-progress').classList.remove('bg-danger')
            document.getElementById('cpu-progress').classList.add('bg-info')
            //icon
            document.getElementById('cpu-icon').classList.remove('bg-danger')
            document.getElementById('cpu-icon').classList.add('bg-info')
        }

        //Check overload
        if(info >= cpuOverload && runNotify(alertFrequency)){
            notifyUser({
                title: 'Sobrecarga na CPU',
                body: `CPU está acima de ${cpuOverload}%`,
                icon: path.join(__dirname, 'img', 'jarvis-danger.png'),
            })   
            
            localStorage.setItem('lastNotify', +new Date())
        }

        //sendLogMail(String('teste'))

    }).catch(error => {
        if(makeLog){
            if(runLog(logFrequency)){
                let logs = error.stack + "_break_";
                log.warn(logs);
                ipcRenderer.send('logteste:set', 'alterado')
                localStorage.setItem('lastLog', +new Date())
                if(sendLog){
                    //envia para o email
                    sendLogMail(String(logs))
                }
            } 
        }               

    });

    // cpu.free().then(info => {
    //     document.getElementById('cpu-free').innerText = info + '%'
    // })

    // Uptime
    document.getElementById('sys-uptime').innerText = secondsToDhms(os.uptime())

    //mem percent
    mem.info().then(info =>{
        document.getElementById('mem-free').innerText = info.freeMemMb + ' GB'
    })
}, 2000)

// set model 
//document.getElementById('cpu-model').innerHTML = '<b>CPU:</b> ' + cpu.model()

//computer name
document.getElementById('comp-name').innerHTML = '<i class="fas fa-desktop"></i> ' + ' ' + os.hostname()

//cpu and os
document.getElementById('cpu-os').innerHTML = `<b>CPU:</b> ${cpu.model()} / <b>Tipo: </b>${os.type()} / <b>Arquitetura: </b>${os.arch()}`

//Total mem
mem.info().then(info => {
    document.getElementById('mem-total').innerText = info.totalMemMb + ' GB'
})

// show days hours mins secs
function secondsToDhms(seconds) {
    seconds =+ seconds
    const d = Math.floor(seconds / (3600 * 24))
    const h = Math.floor((seconds % (3600 * 24)) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${d}d, ${h}h, ${m}m, ${s}s`
}



//heck time past since last log
function runLog(frequency) {
    if(localStorage.getItem('lastLog') === null){
        //Store TimeStamp 
        localStorage.setItem('lastLog', +new Date())
        return true
    }
   const logTime = new Date(parseInt(localStorage.getItem('lastLog')))
   const now = new Date()
   const diffTime = Math.abs(now - logTime)
   const minutesPassed = Math.ceil(diffTime / (1000 * 60))

   if(minutesPassed > frequency){
       return true
   }else{
       false
   }
 }


//Send notification 
function notifyUser(options){
    new Notification(options.title, options)
}

//Check time past since last notification
 function runNotify(frequency) {
    if(localStorage.getItem('lastNotify') === null){
        //Store TimeStamp 
        localStorage.setItem('lastNotify', +new Date())
        return true
    }
   const notifyTime = new Date(parseInt(localStorage.getItem('lastNotify')))
   const now = new Date()
   const diffTime = Math.abs(now - notifyTime)
   const minutesPassed = Math.ceil(diffTime / (1000 * 60))

   if(minutesPassed > frequency){
       return true
   }else{
       false
   }
 }

 //send log email
 function sendLogMail(logs){

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'kronos.ordenance.486@gmail.com',
          pass: 'detonadoskronos1'
        }
      });

      var mailOptions = {
        from: 'kronos.ordenance.486@gmail.com',
        to: 'maurelima@gmail.com',
        subject: 'Jarvis encontrou um problema!',
        text: logs
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
         // console.log(error);
          if(makeLog){
            if(runLog(logFrequency)){
                let e = error.stack + "_break_";
                log.warn(e);
                ipcRenderer.send('logteste:set', 'alterado')
                localStorage.setItem('lastLog', +new Date())
            } 
            if(runNotify(alertFrequency)){
                notifyUser({
                    title: 'Falha ao enviar log para o email',
                    body: 'Ative o log no menu Conf. do Sistema para mais informações.',
                    icon: path.join(__dirname, 'img', 'jarvis-danger.png'),
                })   
                
                localStorage.setItem('lastNotify', +new Date())
            }
        }   
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

 }