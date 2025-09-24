# Vector Code Map Generator

GitHub Action для створення векторних ембедінгів вашого коду для використання з AI інструментами.

```uses: forproxyband/vector-code-map@v1.0.4```

## Опис

Ця GitHub Action сканує вихідний код вашого репозиторію та створює векторні ембедінги коду за допомогою OpenAI API. Ембедінги зберігаються у векторній базі даних ChromaDB для подальшого використання з AI помічниками, інструментами пошуку коду та іншими застосунками, що потребують розуміння вашої кодової бази.

## Можливості

- Два режими сканування: повний (весь репозиторій) або інкрементальний (тільки змінені файли)
- Інтеграція з ChromaDB для зберігання векторних ембедінгів
- Підтримка різних типів авторизації для захищених баз даних
- Налаштування фільтрації для включення/виключення певних файлів
- Використання OpenAI API для генерації високоякісних ембедінгів

## Використання

### Базове використання

```yaml
name: Update Vector Code Map

on:
  push:
    branches: [ main ]

jobs:
  update-vector-map:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Update Vector Code Map
        uses: forproxyband/vector-code-map@v1.0.4
        with:
          mode: 'diff'
          chroma_host: ${{ secrets.CHROMA_HOST }}
          chroma_collection: ${{ secrets.CHROMA_COLLECTION }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Повні налаштування

```yaml
name: Update Vector Code Map

on:
  push:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      mode:
        description: 'Scan mode (full/diff)'
        required: true
        default: 'diff'

jobs:
  update-vector-map:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Update Vector Code Map
        uses: forproxyband/vector-code-map@v1.0.4
        with:
          # Базові налаштування
          mode: ${{ github.event_name == 'workflow_dispatch' && github.event.inputs.mode || 'diff' }}
          
          # Налаштування ChromaDB
          db_type: 'chromadb'
          chroma_host: ${{ secrets.CHROMA_HOST }}
          chroma_port: '8000'
          chroma_collection: ${{ secrets.CHROMA_COLLECTION }}
          
          # Налаштування авторизації ChromaDB
          chroma_auth_enabled: 'true'
          chroma_auth_type: 'basic'  # 'basic', 'token', 'api_key'
          chroma_auth_credentials: ${{ secrets.CHROMA_AUTH_CREDENTIALS }}
          chroma_ssl_enabled: 'true'
          
          # Налаштування OpenAI
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          openai_model: 'text-embedding-3-small'
          
          # Налаштування фільтрації файлів
          file_extensions: '.js,.ts,.jsx,.tsx,.html,.css,.md,.txt'
          exclude_patterns: 'node_modules/**,dist/**,.git/**'
```

## Входи (Inputs)

| Ім'я | Опис | Обов'язковий | За замовчуванням |
|------|------|-------------|------------------|
| `mode` | Режим сканування: 'full' (повний) або 'diff' (тільки змінені файли) | Так | `full` |
| `db_type` | Тип векторної бази даних | Так | `chromadb` |
| `chroma_host` | Адреса сервера ChromaDB | Так | - |
| `chroma_port` | Порт сервера ChromaDB | Ні | `8000` |
| `chroma_collection` | Назва колекції в ChromaDB | Так | - |
| `chroma_auth_enabled` | Увімкнути авторизацію для ChromaDB | Ні | `false` |
| `chroma_auth_type` | Тип авторизації для ChromaDB (basic, token, api_key) | Ні | `basic` |
| `chroma_auth_credentials` | Облікові дані для авторизації | Ні | - |
| `chroma_ssl_enabled` | Увімкнути SSL/TLS для з'єднання з ChromaDB | Ні | `false` |
| `openai_api_key` | API ключ OpenAI для генерації ембедінгів | Так | - |
| `openai_model` | Модель OpenAI для ембедінгів | Ні | `text-embedding-3-small` |
| `file_extensions` | Список розширень файлів для включення (через кому) | Ні | `.js,.ts,.jsx,.tsx,.html,.css,.md,.txt` |
| `exclude_patterns` | Патерни для виключення файлів (glob формат) | Ні | `node_modules/**,dist/**,.git/**` |

## Секрети

Для безпечного використання цієї GitHub Action, вам потрібно налаштувати такі секрети:

- `CHROMA_HOST`: URL-адреса вашого сервера ChromaDB
- `CHROMA_COLLECTION`: Назва колекції в ChromaDB
- `CHROMA_AUTH_CREDENTIALS`: Облікові дані для авторизації (формат залежить від типу авторизації)
- `OPENAI_API_KEY`: Ваш API ключ OpenAI

## Ліцензія

MIT
