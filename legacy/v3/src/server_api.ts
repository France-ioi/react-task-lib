async function makeRequestLongPolling(url: URL, totalBody: any) {
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(totalBody),
  });
  if (response.status !== 200) {
    throw new Error(`Invalid response status: ${response.status}`);
  }

  return await response.json();
}

export default function makeServerApi (config) {
    return function (service, action, body) {
        return new Promise(async function (resolve, reject) {
            const url = new URL(service, config.baseUrl);
            const devel = config.devel ? {task: config.devel} : {};

            const maxTries = 30;
            let longPollingId = null;
            for (let i = 0; i < maxTries; i++) {
              try {
                let totalBody = {
                  ...body,
                  ...devel,
                  action,
                  ...(longPollingId ? {long_polling_id: longPollingId} : {}),
                };

                const result = await makeRequestLongPolling(url, totalBody);
                if (result.data?.longPolling) {
                  longPollingId = result.data?.longPollingFollowUpId;
                } else if (!result.success) {
                  reject(result.error);
                  return;
                } else {
                  resolve(result.data);
                  return;
                }
                // @ts-ignore
              } catch (e: Error) {
                reject(e.message);
                return;
              }
            }
        });
    };
}
