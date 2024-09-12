import { MongoClient } from 'mongodb';
import fs, { constants } from 'fs';
import inquirer from 'inquirer';

import dbNames from './dbNames.js';

/** mongodb config */
const config = {
	local: {
		dbOptions: {
			// useNewUrlParser: true,
			// useUnifiedTopology: true,
			auth: {
				username: '',
				password: '',
			},
		},
		dbUri: 'mongodb://localhost:27017/HC_App_local_data',
		dbName: 'HC_App_local_data',
	}
};

const configEnv = 'local';
const { dbOptions, dbUri, dbName } = config[configEnv];
let dbClient = null;

async function connectDB() {
	try {
		const client = new MongoClient(dbUri, dbOptions);
		await client.connect();
		const db = client.db(dbName);
		console.log('db connect success...');
		return { client, db };
	} catch (err) {
		console.log('part1 err', err.stack);
		throw new Error('db connect fail...');
	}
}

async function renameFile() {
	for await(const name of dbNames) {
		fs.rename(`./data/${name}.txt`, `./data/${name}.json`, () => {
			console.log('====== rename file', name);
		});
	}
}

async function importData({ db }) {
	for await(const name of dbNames) {
    const collection = db.collection(name);
    const relativePath = `./data/${name}.json`;

    try {
			// 檢查檔案是否存在
      await fs.accessSync(relativePath, fs.constants.R_OK);
      // 取得資料
			const fileContent = await fs.readFileSync(relativePath);
      const saveData = JSON.parse(fileContent);
			console.log(`${name} data`, saveData.length);
			// 如果有資料就寫入
      if (saveData.length > 0) {
        console.log(`====== insert ${name} data start ======`);
        await collection.insertMany(saveData); // Insert data
        console.log(`====== insert ${name} data end ======`);
      }
    } catch (err) {
      console.log(`Error with file ${name}:`, err);
    }
  }
}

async function removeData({ db }) {
	for await(const name of dbNames) {
		const collection = db.collection(name);
		const relativePath = `./data/${name}.json`;
		try {
			// 檢查檔案是否存在
			await fs.accessSync(relativePath, constants.R_OK);
			// 取得資料
			const fileContent = await fs.readFileSync(relativePath); // Read file asynchronously
			const saveData = JSON.parse(fileContent);
			console.log(`${name} data`, saveData.length);
			// 如果有資料就刪除
			if (saveData.length > 0) {
        // remove data
					console.log(`====== remove ${name} data start ======`);
					await collection.deleteMany();
					console.log(`====== remove ${name} data end ======`);
      }
		} catch (error) {
			console.log('error', error);
		}
	}
}

async function main() {
	const { client, db } = await connectDB();
	dbClient = client;

	// 設定選擇指令
	const answers = await inquirer.prompt([
		{
			type: 'list',
			name: 'command',
			message: '請選擇指令：',
			choices: ['insert', 'remove']
		}
	]);
	const selectedCommand = answers.command;
	console.log(`====== start ${selectedCommand} ======`);

	// 根據選擇的指令執行對應的動作
	switch(selectedCommand) {
		// 新增資料
		case 'insert':
			await renameFile();
			await importData({ db });
			break;
		// 刪除資料
		case 'remove':
			await removeData({ db });
			break;
		default:
			break;
	}

	await client.close();
	console.log('====== db connect close ======');
}

main()
	.catch(err => {
		console.log('main err.stack', err.stack);
		if (!!dbClient) {
			dbClient.close();
		}
	});
