// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');

let serviceInputField = document.getElementById('id_service');
let characteristicInputField = document.getElementById('id_characteristic');
let applyButton= document.getElementById('apply_button');

let serviceUuid = "0000180d-0000-1000-8000-00805f9b34fb";//"00002a38-0000-1000-8000-00805f9b34fb";//'0000180f-0000-1000-8000-00805f9b34fb';//0xFF02;//0x181A;

let characteristicUuid = "00002a38-0000-1000-8000-00805f9b34fb";//'00002a19-0000-1000-8000-00805f9b34fb';//0xFF02;//0x181A;



// Подключение к устройству при нажатии на кнопку Connect
connectButton.addEventListener('click', function() {
  connect();
});

// Отключение от устройства при нажатии на кнопку Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

applyButton.addEventListener('click', function() {
  serviceUuid=serviceInputField.value;
  characteristicUuid=characteristicInputField.value;
});


// Обработка события отправки формы
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send(inputField.value); // Отправить содержимое текстового поля
  inputField.value = '';  // Обнулить текстовое поле
  inputField.focus();     // Вернуть фокус на текстовое поле
});

// Кэш объекта выбранного устройства
let deviceCache = null;

// Кэш объекта характеристики
let characteristicCache = null;

// Промежуточный буфер для входящих данных
let readBuffer = '';

// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
    //  then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  
  log('Version 32');

  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
  //acceptAllDevices: true,
 // optionalServices: ['battery_service'] // Необходимо для последующего доступа к службе.
 // optionalServices: ['00001802-0000-1000-8000-00805f9b34fb','0000180f-0000-1000-8000-00805f9b34fb' , '0000fff0-0000-1000-8000-00805f9b34fb']
   
 //filters: [{services: ['00001800-0000-1000-8000-00805f9b34fb']}],

     filters: [{
    //   //services: ['Health Thermometer Service'],
       name: 'NC150 BT'
     },{name: 'Galaxy Buds2 (2A46) LE'}],

   //optionalServices: ['Health Thermometer Service'] // Необходимо для последующего доступа к службе.
  // optionalServices: [0x1809] // Необходимо для последующего доступа к службе.
      optionalServices: ['00001800-0000-1000-8000-00805f9b34fb',serviceUuid,'health_thermometer']
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;
      ///  deviceCache.addEventListener('gattserverdisconnected',handleDisconnection);

        return deviceCache;
      });
}

// Обработчик разъединения
function handleDisconnection(event)
{
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) 
{
  if (device.gatt.connected && characteristicCache) 
  {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');

       // let uuidName= BluetoothUUID.getService("health_thermometer");

      //  log("Health Thermometer Service: " +uuidName);

       // const serviceTermometer = await server.getPrimaryService('health_thermometer');
        //return server.getPrimaryService(0xFFE0);
      //  return server.getPrimaryService('00001800-0000-1000-8000-00805f9b34fb');
        return server.getPrimaryService(serviceUuid);
      }).
      then(service => {
        log('Service found, getting characteristic...');

      //  return service.getCharacteristic(0xFFE1);

       // return service.getCharacteristic('00002a00-0000-1000-8000-00805f9b34fb');
        return service.getCharacteristic(characteristicUuid);
      }).
      then(characteristic => {
        log('Characteristic found ! ');
        let uuidObtained=characteristic.uuid;
        log(uuidObtained);
        characteristicCache = characteristic;

       // return characteristicCache;

        return characteristic.readValue();
    })
    .then(value => {
        log('Value found, print...');
        log(value);
        log("value.byteLength: " +value.byteLength);
    if(value.byteLength==1)
      {
          let valueBits = value.getUint8(0);
          log("valueBits: " +valueBits);
      }

        this.isLoader = false;
        let decoder = new TextDecoder('utf-8');
        log(decoder.decode(value));
    })
    .catch(error => {
        this.isLoader = false;
        this.errorMessage = error.message;
    });

}

// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}

// Получение данных
function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value);

  for (let c of value) {
    if (c === '\n') {
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

// Обработка полученных данных
function receive(data) {
  log(data, 'in');
}

// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}

// Отправить данные подключенному устройству
function send(data) {
  data = String(data);

  if (!data || !characteristicCache) {
    return;
  }

  data += '\n';

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicCache, data);
  }

  log(data, 'out');
}

// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}
