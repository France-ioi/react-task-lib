import jwt from 'jsonwebtoken';

// Code extracted from miniPlatform.js
function TaskToken(data, key) {
  this.data = data
  this.data.sHintsRequested = "[]";
  this.key = key

  const query = document.location.search.replace(/(^\?)/, '').split("&").map(function (n) {
    return n = n.split("="), this[n[0]] = n[1], this
  }.bind({}))[0];
  this.queryToken = query.sToken;

  this.addHintRequest = function (hint_params, callback) {
    try {
      hint_params = jwt.decode(hint_params).askedHint;
    } catch (e) {
    }
    var hintsReq = JSON.parse(this.data.sHintsRequested);
    var exists = hintsReq.find(function (h) {
      return h == hint_params;
    });
    if (!exists) {
      hintsReq.push(hint_params);
      this.data.sHintsRequested = JSON.stringify(hintsReq);
    }
    return this.get(callback);
  }

  this.update = function (newData, callback) {
    for (var key in newData) {
      this.data[key] = newData[key];
    }
  }

  this.getToken = function (data, callback) {
    var res = jwt.sign(data, this.key)
    if (callback) {
      // imitate async req
      setTimeout(function () {
        callback(res)
      }, 0);
    }
    return res;
  }

  this.get = function (callback) {
    if (jwt.isDummy && this.queryToken) {
      var token = this.queryToken;
      if (callback) {
        // imitate async req
        setTimeout(function () {
          callback(token)
        }, 0);
      }
      return token;
    }
    return this.getToken(this.data, callback);
  }

  this.getAnswerToken = function (answer, callback) {
    var answerData = {};
    for (var key in this.data) {
      answerData[key] = this.data[key];
    }
    answerData.sAnswer = answer;
    return this.getToken(answerData, callback);
  }
}

function generateTokenUrl(options) {
  delete options[''];
  const params = new URLSearchParams(options);
  const stringified = params.toString();

  return window.location.origin + window.location.pathname + (stringified ? '?' + stringified : '');
}

export {
  TaskToken,
  generateTokenUrl,
}
