import jwt from 'jsonwebtoken';
import qs from 'querystring';
import URL from 'url';

const graderKey = `-----BEGIN RSA PRIVATE KEY-----
MIICWgIBAAKBgHrUmJmbApexhxNU//mYlWM05c9d7wg6QteK7JTrgCbVXzDfUDZF
ZhoFmO+GCK3dbeoMTNfyFrQJA7IapaCAZ+GtFWxXGMwOt9XkuoKmnvGe+OpmmVm/
W+5+XQ1cdP5NbGRVvUBZDZRTiLkrRf26lGU5W9c58/T2OgDgotq/7w+nAgMBAAEC
gYAdyXKcRYgSa13bZVCSIduQbGKSsC/oaeCNzsXis12njTUBcBZOovPIubTF2VY/
e6RNDuCPucihrlH0HhwuWRVXwe+G+645JGuWUYLnQw5DnVBN0JdxyMPAjt4k3FXM
k8NX6NadwdbpQBtvflYHzRC38PhtqTkatzJSwl1H7CmnKQJBALv9gIaEaLTxrBbc
zU/3oxZcM6/iAKQB/bxf2zVFxFB3Xj80ijQaI/5JjjPViCPEC4MUqs2n3RvNhFLQ
0jvrn7UCQQCnRGVYG08oR4dS8cg/5qXLxD1wvXaEI7d3/rbjmhpHcMTAjwQhbb5H
KFVhwgbQlXoDVNa8Tt1cehUI4f3MAXNrAkAhdSy6xDYefiSyrPmdkeVkxWQtmXuj
tPcD38uT36bg613Kwf8W5tAhIdY9Q3PHaczit3ruv0GLATjbxG6mW3lBAkA0Jx06
NXme436MHBsF4ZJ8UDmf91MGrGQ+I8s+eAQNllmieHUfPyp+4VKN4oNhcdnTRBaY
LDbU6LO6S0xo2WL1AkBNt18p/nP4D8jE06sulQ9bjy72M89IwdwztuTBWGfFP4l+
0rJvWYbdKfQwCx4fEkGt6dxL7axrh7qVySiaawCY
-----END RSA PRIVATE KEY-----`;

function getTaskParams (itemUrl) {
  return qs.parse(URL.parse(itemUrl).query);
}

function getTaskID (params) {
  return params.taskID ? params.taskID : null;
}

function algoreaFormatDate (date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;

  return (d < 10 ? '0' + d : d) + '-' + (m < 10 ? '0' + m : m) + '-' + date.getFullYear();
}

function decodeTask (token) {
  const payload = jwt.decode(token);
  if (!payload) {
    throw new Error('Task token error: unparsable token');
  }
  const params = getTaskParams(payload.itemUrl);
  const task_id = getTaskID(params);
  if (!task_id) {
    throw new Error('Task token error: taskID missing from itemUrl');
  }
  const random_seed = parseInt(payload.randomSeed, 10);
  if (!Number.isInteger(random_seed) || random_seed < 0) {
    throw new Error('Task token error: randomSeed missing or incorrect');
  }

  return {
    task_id,
    random_seed,
    hints_requested: payload.sHintsRequested,
    params,
    payload
  };
}

function decodeAnswer (token) {
  const payload = jwt.decode(token);

  return {
    ...decodeTask(token),
    value: payload.sAnswer,
  };
}

export default function makeServerApi (serverTask) {
  return function (service, action, body) {
    return new Promise(function (resolve, reject) {
      if ('taskData' === action) {
        const {task} = body;
        const params = {
          task: decodeTask(task),
        };

        serverTask.taskData(params, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      } else if ('gradeAnswer' === action) {
        const {task, answer} = body;
        const params = {
          task: decodeTask(task),
          answer: decodeAnswer(answer),
        };

        serverTask.gradeAnswer(params, null, (error, data) => {
          if (error) {
            reject(error);
          } else {
            for (let key of ['idUser', 'idItem', 'itemUrl', 'idUserAnswer']) {
              data[key] = params.answer.payload[key];
            }
            data.date = algoreaFormatDate(new Date());
            data.token = jwt.sign(data, graderKey, {algorithm: 'RS512'});
            resolve(data);
          }
        });
      } else if ('requestHint' === action) {
        const {task, request} = body;
        const params = {
          task: decodeTask(task),
          request,
        };

        serverTask.requestHint(params, (error, askedHint) => {
          if (error) {
            reject(error);
          } else {
            const payload = {askedHint: askedHint, date: algoreaFormatDate(new Date)};
            const hintToken = jwt.sign(payload, graderKey, {algorithm: 'RS512'});
            resolve({hintToken: hintToken});
          }
        });
      } else {
        reject('Unhandled action');
      }
    });
  };
}
