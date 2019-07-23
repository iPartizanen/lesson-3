const EventEmitter = require('events');

class Bank extends EventEmitter {
  constructor() {
    super();
    this.persons = [];
    this.personIdGen = 0; 

    // 2. Реализовать поддержку события add которое принимает идентификатор
    // контрагента в качестве второго аргумента и сумму зачисления в качестве третьего
    // аргумента. Событие должно добавить деньги на счёт клиенту
    this.on('add', (personId, amount) => this._add(personId, amount));

    // 3. Реализовать поддержку события get которое принимает идентификатор контрагента
    // в качестве второго аргумента и колбек функцию в качестве третьего аргумента.
    // Сallback принимает один аргумент balance, который указывает на количество денег
    // на момент генерации события.
    this.on('get', (personId, callback) => this._get(personId, callback));

    // 4. Реализовать поддержку события withdraw которое принимает идентификатор
    // контрагента в качестве второго аргумента и сумму списания в качестве третьего
    // аргумента. Событие должно списать деьги со счёта контрагента.
    this.on('withdraw', (personId, amount) => this._withdraw(personId, amount));

    // Реализовать событие send которое будет принимать идентификатор контрагента
    // который переводит деньги в качестве второго аргумента и идентификатор
    // контрагента который получает деньги в качестве третьего контрагента. В качестве
    // четвёртого аргмуента будет указана сумма перевода.
    this.on('send', (personFromId, personToId, amount) => this._send(personFromId, personToId, amount));

    // Событие changeLimit должно устанавливать новый колбек. Событие changeLimit
    // принимает идентификатор контрагента в качестве второго аргумента и колбек
    // функцию в качестве третьего аргумента.
    this.on('changeLimit', (personId, limit) => this._changeLimit(personId, limit));

    // Генерирование и обработку ошибок необходимо реализовать при помощи события error.
    this.on('error', (error) => {
      console.log(`${error.name} occured: ${error.message}`);
      process.exit(1);
    });

  };

  _generatePersonId() {
    return String(this.personIdGen++);
  }

  _getPersonIdxByName(name) {
    if (typeof name !== 'string' || !name) { 
      this.emit('error', new TypeError('Person name must be non-empty string!'))
    };
    return this.persons.findIndex((person) => person.name === name);
  }

  _getPersonIdxById(personId) {
    if (typeof personId !== 'string' || !personId) { 
      this.emit('error', new TypeError('PersonId must be non-empty string!'))
    };
    return this.persons.findIndex((person) => person.personId === personId);
  }

  // Все события должны генерировать ошибку если им передан не существующий идентификатор контрагента.
  _checkPersonExistence(personId) {
    const idx = this._getPersonIdxById(personId);
    if (idx < 0)  { 
      this.emit('error', new TypeError(`Person with id=${personID} does not exist!`))
    };
    return idx;
  }

  // _getPersonIdByName(name) {
  //   idx = this._getPersonIdxByName(name);
  //   return idx >= 0 ? this.persons[idx].personId: null;
  // }

  // 1. Реализовать метод register который будет регистрировать нового контрагента.
  // Метод возвращает идентификатор контрагента (генерируется автоматически модулем Bank).
  register ({name, balance, limit}) {

    // Метод register должен вызывать ошибку при попытке добавления двух контрагентов с одинаковыми именами.
    if (this._getPersonIdxByName(name) >= 0) { this.emit('error', new Error(`Person ${name} already exists!`)) };

    // Метод register должен вызывать ошибку при попытке добавления контрагента со
    // значением balance меньше или равным нулю.
    if (typeof balance !== 'number' || !balance) { this.emit('error', new TypeError('Balance must be a number!')) };    
    if (balance <= 0) { this.emit('error', new RangeError('Balance must have positive value!')) };     
    
    const personId = this._generatePersonId();

    this.persons.push({
      personId,
      name,
      balance,
      limit: limit ? limit : () => {}
    });

    return personId;
  };

  _add(personId, amount) {
    // Событие add должно генерировать ошибку при попытке зачислить отрицательную
    // или нулевую сумму на счёт контрагента.
    if (typeof amount !== 'number' || !amount) { this.emit('error', new TypeError('Amount must be a number!')) };    
    if (amount <= 0) { this.emit('error', new RangeError('Amount must have positive value!')) };  
   
    const idx = this._checkPersonExistence(personId);

    this.persons[idx].balance = this.persons[idx].balance + amount;
  }

  _get(personId, callback) {
    if (typeof callback !== 'function' || !callback) { this.emit('error', new TypeError('Callback must be a function!')) };    
    
    const idx = this._checkPersonExistence(personId);
 
    callback(this.persons[idx].balance);
  }

  _withdraw(personId, amount) {
    // Событие withdraw должно генерировать ошибку при попытке списать
    // отрицательную сумму со счёта контрагента.
    if (typeof amount !== 'number' || !amount) { this.emit('error', new TypeError('Amount must be a number!')) };    
    if (amount < 0) { this.emit('error', new RangeError('Amount must have non-negative value!')) };   

    const idx = this._checkPersonExistence(personId);

    // Событие withdraw должно генерировать ошибку при попытке списать сумму со
    // счёта контрагента если после списания счёт контрагента будет меньше нуля.
    const balance = this.persons[idx].balance;
    const newBalance = balance - amount;

    if (newBalance < 0) { 
      this.emit('error', new Error('Forecast balance can not be negative!')) 
    } else {
      // Checking limit
      if (this.persons[idx].limit(amount, balance, newBalance)) {
        this.persons[idx].balance = newBalance;
      } else {
        this.emit('error', new Error(`Limit error: ${this.persons[idx].limit.toString()}`));
      }
    };   

  }

  _send(personFromId, personToId, amount) {
    if (this._checkPersonExistence(personToId) >= 0) {
      this._withdraw(personFromId, amount);
      this._add(personToId, amount); 
    }
  };

  _changeLimit(personId, limit) {
    if (typeof limit !== 'function' || !limit) { this.emit('error', new TypeError('Callback must be a function!')) };    
    
    const idx = this._checkPersonExistence(personId);

    this.persons[idx].limit = limit;
  }

};
  
const bank = new Bank();

const personId = bank.register({
  name: 'Oliver White',
  balance: 700,
  limit: amount => amount < 10
});

bank.emit('withdraw', personId, 5);

bank.emit('get', personId, (amount) => {
  console.log(`I have ${amount}₴`); // I have 695₴
});

// Вариант 1
bank.emit('changeLimit', personId, (amount, currentBalance, updatedBalance) => {
  return amount < 100 && updatedBalance > 700;
});

bank.emit('withdraw', personId, 5); // Error

// Вариант 2
bank.emit('changeLimit', personId, (amount, currentBalance, updatedBalance) => {
  return amount < 100 && updatedBalance > 700 && currentBalance > 800;
});

// Вариант 3
bank.emit('changeLimit', personId, (amount, currentBalance) => {
  return currentBalance > 800;
});

// Вариант 4
bank.emit('changeLimit', personId, (amount, currentBalance, updatedBalance) => {
  return updatedBalance > 900;
});

console.log(bank.persons);
