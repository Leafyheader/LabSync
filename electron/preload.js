const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Printer APIs
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printContent: (options) => ipcRenderer.invoke('print-content', options),
  printToPrinter: (printerName, html) => ipcRenderer.invoke('print-to-printer', printerName, html),
  getStoredPrinter: () => ipcRenderer.invoke('get-stored-printer'),
  storePrinter: (printerName) => ipcRenderer.invoke('store-printer', printerName),
  
  // System APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window APIs
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
});
