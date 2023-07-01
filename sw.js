const CACHE_VERSION = 'v1';
const CACHE_NAME = `${registration.scope}!${CACHE_VERSION}`;
const MESSAGE_STATE = {
    CLAIM: 'claim',
    NOTIFICATION_REQ: 'notification_req',
    TEST: 'test'

};

// キャッシュするファイルをセットする
const urlsToCache = [
    '.',
    'js/main.js',
    'sw.js',
    'index.html',
    'icon.png',
    'favicon.ico'
];

self.onmessage = (message) => {
    console.log(message);
    switch (message.data.action) {
        case MESSAGE_STATE.CLAIM:
            self.clients.claim();
            break;
        case MESSAGE_STATE.NOTIFICATION_REQ:
            console.log("test");
            let time = 0;
            let id = setInterval(() => {
                time++;
                if (time > 10) {

                    self.registration.getNotifications({ tag: "vibration-sample" })
                        .then((notifications) => {
                            notifications.map((notification) => {

                                notification.close();

                            });
                            clearInterval(id);
                        });
                }
                else {
                    self.registration.showNotification('バイブレーションの例2', {
                        body: `タイム${time}`,
                        icon: './icon.png',
                        vibrate: [200, 100, 200, 100, 200, 100, 200],
                        tag: 'vibration-sample',
                        actions: [
                            {
                                action: 'action1',
                                title: 'title 1',
                                icon: './notification/icon.png'
                            }
                        ]
                    })
                }
            }, 1000);
            break;
        case MESSAGE_STATE.TEST:
            let arr = [];
            CombiRecursion(7, 0, 37, [], arr);

            message.source.postMessage(arr.length);

            break;
    }
};


/**
 * 組み合わせ再帰処理
 * @function 
 * @param {number} a_num 開始番号
 * @param {number} a_start_num 終了番号
 * @param {number} a_max 最大値
 * @param {number} a_add_arr 作製中パターン追加用配列
 * @param {number[Int8Array]} a_push_arr 完成パターンン追加用配列
 * @returns 
 */
function CombiRecursion(a_num, a_start_num, a_max, a_add_arr, a_push_arr) {
	if (a_num == 0) {
		a_push_arr.push(new Int8Array(a_add_arr));
		return;
	}

	let max = a_max - a_num + 1;

	for (let ii = a_start_num; ii < max; ii++) {
		let arr = a_add_arr.concat();
		arr.push(ii + 1);

		CombiRecursion(a_num - 1, ii + 1, a_max, arr, a_push_arr);
	}
};


self.addEventListener('notificationclick', (event) => {
    event.preventDefault();
    return event.waitUntil(clients.matchAll({
        type: "window"
    }).then((clientList) => {
        
        event.notification.close();
        for (const client of clientList) {
            //if ('focus' in client)
                return client.focus();
        }
    }));

    //clients.openWindow('https://www.google.com/')
});

self.addEventListener('install', (event) => {
    console.log("install");
    event.waitUntil(
        // キャッシュを開く
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(cache);
                // 指定されたファイルをキャッシュに追加する
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log("activate");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return cacheNames.filter((cacheName) => {
                // このスコープに所属していて且つCACHE_NAMEではないキャッシュを探す
                return cacheName.startsWith(`${registration.scope}!`) &&
                    cacheName !== CACHE_NAME;
            });
        }).then((cachesToDelete) => {
            return Promise.all(cachesToDelete.map((cacheName) => {
                // いらないキャッシュを削除する
                return caches.delete(cacheName);
            }));
        })
    );
});

self.addEventListener('fetch', (event) => {
    console.log("fetch");
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュ内に該当レスポンスがあれば、それを返す
                if (response) {
                    return response;
                }

                // 重要：リクエストを clone する。リクエストは Stream なので
                // 一度しか処理できない。ここではキャッシュ用、fetch 用と2回
                // 必要なので、リクエストは clone しないといけない
                let fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            // キャッシュする必要のないタイプのレスポンスならそのまま返す
                            return response;
                        }

                        // 重要：レスポンスを clone する。レスポンスは Stream で
                        // ブラウザ用とキャッシュ用の2回必要。なので clone して
                        // 2つの Stream があるようにする
                        let responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});
