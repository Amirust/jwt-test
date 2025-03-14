## JWT Test job

Для запуска
```shell
npm install
npm start:dev
```
И так же для енв
```shell
cp .env.example .env
```

<br>
Все тестирование проводилось с помощью юнит тестов

## Роуты
`/api/auth/payload` - Возвращает пейлоад<br>
`/api/auth/verify` - Проверяет подписанный клиентом пейлоад<br>
`/api/auth/refresh` - Возвращает новый токен

## Принцип работы
Клиент шлёт запрос на `/api/auth/payload` и получает пейлоад, который он подписывает EVM токенами и отправляет на `/api/auth/verify` для проверки вместе с публичным ключом. Если проверка прошла успешно, то клиент получает новый токен в куках, а его кошелек сохраняется для рефреша.<br>
Рефреш смотрит есть ли юзер в массиве кошельков (добавляется после верифи) и если есть, то возвращает новый токен.

## Запросы
Тут юзаю клаудфлейровский формат запросов:
```typescript
interface Response<T> {
  ok: boolean;
  result: T; // DTO
  errors: ResponseError[];
}
```

## Как проверить что всё работает
С помощью тестов, пишем сначала
```shell
npm test
```
а дальше, для полных е2е тестов
```shell
npm run test:e2e
```
Ну или запускайте сами и тестируйте.<br>
Для генерации ключей использовалась либа ether.<br>
```typescript
import { ethers } from 'ethers';

const wallet = ethers.Wallet.createRandom();

const payloadResponse = await fetch('http://localhost:3000/api/auth/payload');
const data = await payloadResponse.json();

const notSignedData = data.result;
const signedData = await wallet.signMessage(ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(notSignedData))));
const publicKey = wallet.publicKey;

const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    notSignedData,
    signedData,
    publicKey,
  }),
}); // Получаем дальше с куков новый токен
```

## Если тестите постманом или браузером
Не забудьте прописать в енв `CORS_ORIGIN` чтобы куки правильно ставились, бек уже настроен так, чтобы все работало