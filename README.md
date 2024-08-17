> [!WARNING]
> This is an early project, expect breaking changes everywhere.

Initially made this for my SMP, but I'm uploading it for anyone that wants to use it or anything.

Current features:
- Storing and searching stuff in a storage.
- Going to places.

Adding more stuff in the future, don't worry.

## Usage

Rename `config.json.example` to `config.json` and modify it to your needs:

| Setting | Description |
| ------- | ----------- |
| authType | How your bot authenticates. Available options: microsoft, mojang _(deprecated)_, offline. |
| offlineUsername | Username used by the bot when login. This is only used for offline mode. |
| initialPos.onSpawn | Walk to the initial position on spawn. |
| initialPos.coords | Resting position for the bot after spawning or finishing actions. |
| server.host | IP of the server to connect. |
| server.port | Port of the server to connect. |
| server.version | Version of the server to connect. You can set this to any version supported officially by [Mineflayer](https://github.com/PrismarineJS/mineflayer). |
| chat.lang | Specify language file for chat messages. Available options: en, es.
| chat.onLogin | List of messages to chat after logging in. |
| chat.sleepTime | Wait time between messages on ticks. |
| validStorageChests | Region of storage to get and put items. Currently only 1, more in the future. Has two parameters, "corner1" and "corner2".|

```bash
npm install
node index.js
```

Whisper to the bot any command you want with /w.

Available commands:
- `find <item>`: Search for items in the storage and drop them.
- `deposit`: Deposit all items on the bot's inventory in the storage.
- `stop`: Stop anything the bot is doing.
- `savepos`: Change the initial position to current bot position.
- `goto <x> <y> <z>`: Set goal to said position.
- `tossall`: Drop all items on the bot's inventory to the floor.

## Demo

https://github.com/user-attachments/assets/2d269c9f-db2f-4bdd-ba7b-acf65936e9f3
